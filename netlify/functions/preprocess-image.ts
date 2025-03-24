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
  "Content-Type": "application/json",
};

const MODEL_VERSION =
  "ba115dfd130aeb6873124af76e0f0b6273d796883d9f184f8ad7de7ae5dad24b";
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const WEBHOOK_URL = process.env.PREPROCESS_WEBHOOK || process.env.WEBHOOK_URL;

export const handler: Handler = async (event) => {


  if (!REPLICATE_API_TOKEN) {
    console.error("Missing REPLICATE_API_TOKEN");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Replicate API token not configured" }),
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const { imageUrl, processType, shapeId, userId } = payload;

    console.log('processType:', processType)

    const baseWorkflow = {
      "10": {
        inputs: {
          image: imageUrl,
          upload: "image",
        },
        class_type: "LoadImage",
        _meta: {
          title: "Load Image",
        },
      },
      "33": {
        inputs: {
          preprocessor: "",
          image: ["10", 0],
        },
        class_type: "AIO_Preprocessor",
      },
      "15": {
        inputs: {
          images: ["33", 0],
          filename_prefix: "preprocessed",
        },
        class_type: "SaveImage",
      },
    };

    // Create a copy of the workflow
    const workflow = JSON.parse(JSON.stringify(baseWorkflow));

   
    // Modify the copy
    workflow["10"].inputs.image = imageUrl;
    workflow["33"].inputs.preprocessor =
      processType === "depth"
        ? "Zoe-DepthMapPreprocessor"
        : processType === "edge"
        ? "CannyEdgePreprocessor"
        : processType === "pose"
        ? "DWPreprocessor"
        : "DWPreprocessor";

    // Make the Replicate API call
    const requestBody = {
      version: MODEL_VERSION,
      input: {
        workflow_json: JSON.stringify(workflow),
        input_file: imageUrl,
        output_format: "png",
        output_quality: 95,
        randomise_seeds: false,
      },
      ...(WEBHOOK_URL && {
        webhook: WEBHOOK_URL,
        webhook_events_filter: ["completed"],
      }),
    };

    console.log("Replicate request body:", requestBody);

    const replicateResponse = await fetch(
      "https://api.replicate.com/v1/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );


    if (!replicateResponse.ok) {
      const errorData = await replicateResponse.json();
      console.log("Replicate error response:", errorData);
      throw new Error(errorData.detail || "Failed to start preprocessing");
    }

    const prediction = await replicateResponse.json();
    console.log("Replicate prediction response:", prediction);

    // Now we have the prediction ID from Replicate, create the Supabase record
    const now = new Date().toISOString();
    await supabase.from("preprocessed_images").insert({
      prediction_id: prediction.id,
      user_id: userId,
      shapeId,
      originalUrl: imageUrl,
      processType,
      status: "processing",
      created_at: now,
      updated_at: now, // Add this field
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ prediction }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to preprocess image",
      }),
    };
  }
};
