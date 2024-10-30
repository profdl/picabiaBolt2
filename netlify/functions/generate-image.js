const fetch = require("node-fetch");

const REPLICATE_API_TOKEN = process.env.VITE_REPLICATE_API_TOKEN;
const MODEL_VERSION =
  "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!REPLICATE_API_TOKEN) {
    console.error("Missing Replicate API token");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server configuration error" }),
    };
  }

  try {
    const {
      prompt,
      aspectRatio = "1:1",
      steps = 30,
      negativePrompt = "blurry, bad quality, distorted",
      guidanceScale = 7.5,
      scheduler = "DPMSolverMultistep",
      seed = Math.floor(Math.random() * 1000000),
    } = JSON.parse(event.body || "{}");

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Prompt is required" }),
      };
    }

    // Start the prediction with Bearer token
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          prompt,
          negative_prompt: negativePrompt,
          aspect_ratio: aspectRatio,
          steps,
          guidance_scale: guidanceScale,
          scheduler,
          seed,
        },
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      console.error("Replicate API error:", error);
      throw new Error(error.detail || "Failed to start image generation");
    }

    const prediction = await response.json();
    console.log("Prediction started:", prediction);

    // Poll for completion
    let result;
    let attempts = 0;
    const maxAttempts = 60;
    const pollInterval = 1000;

    while (attempts < maxAttempts) {
      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!pollResponse.ok) {
        throw new Error("Failed to check generation status");
      }

      result = await pollResponse.json();
      console.log("Poll status:", result.status);

      if (result.status === "succeeded") {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ imageUrl: result.output[0] }),
        };
      }

      if (result.status === "failed") {
        throw new Error(result.error || "Image generation failed");
      }

      if (result.status === "canceled") {
        throw new Error("Image generation was canceled");
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    }

    throw new Error("Image generation timed out");
  } catch (error) {
    console.error("Error generating image:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || "Failed to generate image",
      }),
    };
  }
};
