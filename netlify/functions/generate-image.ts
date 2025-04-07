import { Handler } from "@netlify/functions";
import fetch from "node-fetch";

const MODEL_VERSION =
  "ba115dfd130aeb6873124af76e0f0b6273d796883d9f184f8ad7de7ae5dad24b";
const REPLICATE_API_TOKEN =
  process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;

export const handler: Handler = async (event) => {

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    console.log("Sending request to Replicate API", {
      modelVersion: MODEL_VERSION,
      webhookUrl: process.env.WEBHOOK_URL,
      payload: payload,
    });

    const replicateResponse = await fetch(
      "https://api.replicate.com/v1/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: MODEL_VERSION,
          input: {
            workflow_json: JSON.stringify(payload.workflow_json),
            output_format: payload.outputFormat,
            output_quality: payload.outputQuality,
            randomise_seeds: payload.randomiseSeeds,
          },
          webhook: process.env.WEBHOOK_URL,
          webhook_events_filter: ["start", "output", "logs", "completed"],
        }),
      }
    );

    if (!replicateResponse.ok) {
      const errorData = await replicateResponse.json();
      throw new Error(errorData.detail || "Failed to start image generation");
    }
    const prediction = await replicateResponse.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ prediction: prediction }), // Return the full prediction object
    };
  } catch (error) {
    console.error("Error generating image:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to generate image",
      }),
    };
  }
};
