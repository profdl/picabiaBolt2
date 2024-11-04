import fetch from "node-fetch";

const REPLICATE_API_TOKEN = process.env.VITE_REPLICATE_API_TOKEN;
const MODEL_VERSION = "10990543610c5a77a268f426adb817753842697fa0fa5819dc4a396b632a5c15";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Connection": "keep-alive"
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  if (!REPLICATE_API_TOKEN) {
    console.error("Missing Replicate API token");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Image generation service is not configured" })
    };
  }

  try {
    const {
      workflow_json,
      input_file,
      output_format = 'webp',
      output_quality = 95,
      randomise_seeds = true,
      force_reset_cache = false,
      return_temp_files = false
    } = JSON.parse(event.body || '{}');

    if (!workflow_json) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Workflow JSON is required' })
      };
    }

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          workflow_json,
          input_file,
          output_format,
          output_quality,
          randomise_seeds,
          force_reset_cache,
          return_temp_files
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(error);
        errorMessage = errorJson.detail || "Failed to start image generation";
      } catch {
        errorMessage = error || "Failed to start image generation";
      }
      throw new Error(errorMessage);
    }

    const prediction = await response.json();
    console.log("Prediction started:", prediction.id);

    let result;
    let attempts = 0;
    const maxAttempts = 60;
    const pollInterval = 1000;

    while (attempts < maxAttempts) {
      console.log(`Polling attempt ${attempts + 1}/${maxAttempts}`);
      
      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Token ${REPLICATE_API_TOKEN}`
          }
        }
      );

      result = await pollResponse.json();
      console.log(`Poll status: ${result.status}`, result.output);

      if (result.status === "succeeded") {
        console.log("Generation succeeded:", result.output);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ imageUrl: result.output })
        };
      }

      if (result.status === "failed" || result.status === "canceled") {
        throw new Error(result.error || `Generation ${result.status}`);
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error("Image generation timed out");
  } catch (error) {
    console.error("Error generating image:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || "Failed to generate image"
      })
    };
  }
};