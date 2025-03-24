import { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (!REPLICATE_API_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Replicate API token not configured" }),
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const { prediction_id } = payload;

    if (!prediction_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Prediction ID is required" }),
      };
    }

    // Cancel the prediction in Replicate
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction_id}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to cancel prediction");
    }

    // Update the status in Supabase
    const { error: dbError } = await supabase
      .from("generated_images")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("prediction_id", prediction_id);

    if (dbError) throw dbError;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Error canceling generation:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to cancel generation",
      }),
    };
  }
}; 