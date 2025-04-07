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
    const { output, status, id, logs } = payload;

    console.log("Webhook data:", { status, hasOutput: !!output, id, logs });
    console.log("Full payload:", JSON.stringify(payload, null, 2));

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "No prediction ID provided",
        }),
      };
    }

    // Map Replicate status to more detailed status
    const getDetailedStatus = () => {
      switch (status) {
        case "starting":
          return "Starting generation...";
        case "start":
          return "Starting model...";
        case "processing":
        case "logs":
          return "Processing image...";
        case "output":
          return "Finalizing output...";
        case "succeeded":
          return "Completed!";
        case "completed":
          return "Completed!";
        case "failed":
          return "Generation failed";
        case "canceled":
          return "Generation canceled";
        default:
          return status;
      }
    };

    // Format logs to be more readable
    const formattedLogs = Array.isArray(logs) 
      ? logs 
      : typeof logs === 'string' 
        ? [logs]
        : payload.output?.logs || [];

    console.log("Formatted logs:", formattedLogs);

    // Update status immediately to ensure we track all status updates
    const { error: statusError } = await supabase
      .from("generated_images")
      .update({
        status: getDetailedStatus(),
        logs: formattedLogs,
        updated_at: new Date().toISOString(),
      })
      .eq("prediction_id", id);

    if (statusError) {
      console.error("Error updating status:", statusError);
      throw statusError;
    }

    // If status is failed or canceled, return early
    if (status === "failed" || status === "canceled") {
      console.log("Generation failed or was canceled, returning early");
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: { id, status }
        })
      };
    }

    if (status === "succeeded" && Array.isArray(output) && output.length > 0) {
      console.log("Processing successful output:", output);
      
      // First upload all images to Supabase storage
      const uploadPromises = output.map(async (imageUrl, index) => {
        try {
          console.log(`Processing image ${index}:`, imageUrl);
          
          // Fetch image from Replicate URL
          const response = await fetch(imageUrl);
          if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
          
          const imageBuffer = await response.arrayBuffer();
          const imageData = new Uint8Array(imageBuffer);

          // Generate unique filename
          const filename = `${id}-${index}-${Date.now()}.png`;
          console.log(`Uploading to Supabase as: ${filename}`);

          // Upload to Supabase bucket with proper content type for PNG with transparency
          const { error: uploadError } = await supabase.storage
            .from("generated-images")
            .upload(filename, imageData, {
              contentType: "image/png",
              cacheControl: "3600",
              upsert: true // Ensure we overwrite if file exists
            });

          if (uploadError) {
            console.error(`Upload error for image ${index}:`, uploadError);
            throw uploadError;
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("generated-images").getPublicUrl(filename);
          console.log(`Successfully uploaded image ${index}:`, publicUrl);

          return publicUrl;
        } catch (error) {
          console.error(`Failed to process image ${index}:`, error);
          return null;
        }
      });

      const publicUrls = await Promise.all(uploadPromises);
      const validUrls = publicUrls.filter(url => url !== null);
      console.log("Valid URLs after processing:", validUrls);

      if (validUrls.length === 0) {
        throw new Error("No images were successfully processed");
      }

      const { data: existingRecord, error: fetchError } = await supabase
        .from("generated_images")
        .select("*")
        .eq("prediction_id", id)
        .single();

      if (fetchError) {
        console.error("Error fetching existing record:", fetchError);
        throw fetchError;
      }

      console.log("Existing record:", existingRecord);

      // Check if this is a background removal workflow
      const isBackgroundRemoval = existingRecord?.prompt === "subject extraction";
      console.log("Is background removal:", isBackgroundRemoval);

      // Update only the necessary fields while preserving all other fields
      const updateData: {
        status: string;
        logs: string[];
        updated_at: string;
        generated_01?: string;
        generated_02?: string | null;
        generated_03?: string | null;
        generated_04?: string | null;
      } = {
        status: "Completed!",
        logs: formattedLogs,
        updated_at: new Date().toISOString(),
      };

      // For background removal, we only need the first image
      if (isBackgroundRemoval) {
        updateData.generated_01 = validUrls[0];
        console.log("Updating with background removal data:", updateData);
      } else {
        // For regular image generation, handle multiple outputs
        updateData.generated_01 = validUrls[0];
        updateData.generated_02 = validUrls[1] || existingRecord.generated_02 || null;
        updateData.generated_03 = validUrls[2] || existingRecord.generated_03 || null;
        updateData.generated_04 = validUrls[3] || existingRecord.generated_04 || null;
        console.log("Updating with regular generation data:", updateData);
      }

      const { error } = await supabase
        .from("generated_images")
        .update(updateData)
        .eq("prediction_id", id);

      if (error) {
        console.error("Error updating database:", error);
        throw error;
      }

      console.log("Successfully updated database with new image URLs");
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
            status: "Generation failed",
            error_message: errorMessage,
            logs: parsedBody.logs || [], // Store logs even on error
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