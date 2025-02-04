import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export const handler: Handler = async (event) => {
  console.log("Webhook received:", new Date().toISOString());

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "No webhook payload received",
        }),
      };
    }

    const payload = JSON.parse(event.body);
    const { output, status, id } = payload;

    console.log("Webhook data:", { status, hasOutput: !!output, id });

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "No prediction ID provided",
        }),
      };
    }

    // Update status immediately to ensure we track failed generations
    if (status === "failed" || status === "canceled") {
      const { error: statusError } = await supabase
        .from("generated_images")
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("prediction_id", id);

      if (statusError) throw statusError;
    }

    if (status === "succeeded" && Array.isArray(output) && output.length > 0) {
      // First upload all images to Supabase storage
      const uploadPromises = output.map(async (imageUrl, index) => {
        try {
          // Fetch image from Replicate URL
          const response = await fetch(imageUrl);
          if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
          
          const imageBuffer = await response.arrayBuffer();
          const imageData = new Uint8Array(imageBuffer);

          // Generate unique filename
          const filename = `${id}-${index}-${Date.now()}.png`;

          // Upload to Supabase bucket
          const { error: uploadError } = await supabase.storage
            .from("generated-images")
            .upload(filename, imageData, {
              contentType: "image/png",
              cacheControl: "3600",
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("generated-images").getPublicUrl(filename);

          return publicUrl;
        } catch (error) {
          console.error(`Failed to process image ${index}:`, error);
          return null;
        }
      });

      const publicUrls = await Promise.all(uploadPromises);
      const validUrls = publicUrls.filter(url => url !== null);

      if (validUrls.length === 0) {
        throw new Error("No images were successfully processed");
      }

      const { error } = await supabase
        .from("generated_images")
        .update({
          generated_01: validUrls[0],
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("prediction_id", id);

      if (error) throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Webhook processed successfully",
        data: { id, status },
      }),
    };
  } catch (error) {
    console.error("Error processing webhook:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    try {
      // Only attempt database update if we have an ID from the original payload
      const parsedBody = event.body ? JSON.parse(event.body) : null;
      if (parsedBody?.id) {
        await supabase
          .from("generated_images")
          .update({
            status: "error",
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq("prediction_id", parsedBody.id);
      }
    } catch (dbError) {
      console.error("Failed to update error state in database:", dbError);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
      }),
    };
  }
};