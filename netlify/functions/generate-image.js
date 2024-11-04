import fetch from "node-fetch";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;
const MODEL_VERSION = "10990543610c5a77a268f426adb817753842697fa0fa5819dc4a396b632a5c15";

export const handler = async (event) => {
  console.log("Received event:", event);
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
      const payload = JSON.parse(event.body || '{}');
      // Send workflow_json directly since it's already a string
      const replicateResponse = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          version: MODEL_VERSION,
          input: {
            workflow_json: payload.workflow_json,  // Already stringified
            input_file: payload.imageUrl,
            output_format: payload.outputFormat,
            output_quality: payload.outputQuality,
            randomise_seeds: payload.randomiseSeeds
          },
          webhook: process.env.WEBHOOK_URL,
          webhook_events_filter: ["completed"]
        })
      });
      

    if (!replicateResponse.ok) {
      const errorData = await replicateResponse.json();
      throw new Error(errorData.detail || "Failed to start image generation");
    }

    const prediction = await replicateResponse.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ predictionId: prediction.id })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Failed to generate image" })
    };
  }
};
