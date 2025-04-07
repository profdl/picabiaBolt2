import { StateCreator } from "zustand";
import { Shape, Position, StoreState } from "../../types";
import { ImageShape } from "../../types/shapes";
import getSubjectWorkflow from "../../lib/getSubject_workflow.json";
import { supabase } from "../../lib/supabase";
import { trimTransparentPixels } from "../../utils/imageUtils"; // We'll create this

interface SubjectGenerationSlice {
  handleGenerateSubject: (shape: Shape) => Promise<void>;
}

export const subjectGenerationSlice: StateCreator<
  StoreState & SubjectGenerationSlice,
  [],
  [],
  SubjectGenerationSlice
> = (set, get) => ({
  handleGenerateSubject: async (sourceShape) => {
    try {
      // Check if sourceShape is an ImageShape
      if (sourceShape.type !== "image") {
        throw new Error("Source shape must be an image");
      }
      const imageShape = sourceShape as ImageShape;
      if (!imageShape.imageUrl) {
        throw new Error("Source image must have a URL");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User must be authenticated");

      const workflow = JSON.parse(JSON.stringify(getSubjectWorkflow));
      workflow["14"].inputs.image = imageShape.imageUrl;

      const response = await fetch("/.netlify/functions/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_json: workflow,
          outputFormat: "png",
          outputQuality: 100,
        }),
      });

      if (!response.ok) throw new Error("Failed to process image");
      const responseData = await response.json();
      const prediction_id = responseData.prediction.id;

      // Create record before Replicate call
      const insertData = {
        id: crypto.randomUUID(),
        user_id: user.id,
        prediction_id: prediction_id,
        status: "generating",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        originalUrl: imageShape.imageUrl,
        width: Math.round(imageShape.width),
        height: Math.round(imageShape.height),
        // Add other required fields with defaults
        prompt: "subject extraction",
        aspect_ratio: `${Math.round(imageShape.width)}:${Math.round(
          imageShape.height
        )}`,
      };

      const { error: dbError } = await supabase
        .from("generated_images")
        .insert(insertData)
        .select()
        .single();

      if (dbError) throw dbError;

      // Create new shape position next to source
      const position: Position = {
        x: imageShape.position.x + imageShape.width + 20,
        y: imageShape.position.y,
      };

      // Add placeholder shape
      const placeholderShape: ImageShape = {
        id: prediction_id,
        type: "image",
        position,
        width: imageShape.width,
        height: imageShape.height,
        isUploading: true,
        imageUrl: "",
        color: "transparent",
        rotation: 0,
        model: "",
        useSettings: false,
        isEditing: false,
        depthStrength: 0.75,
        edgesStrength: 0.75,
        contentStrength: 0.75,
        poseStrength: 0.75,
        sketchStrength: 0.75,
        imagePromptStrength: 0.75,
      };

      get().addShape(placeholderShape);
      get().setSelectedShapes([prediction_id]);
      get().addGeneratingPrediction(prediction_id);

      // After creating placeholder shape
      supabase
        .channel('generated_images')
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "generated_images",
            filter: `prediction_id=eq.${prediction_id}`,
          },
          async (payload: unknown) => {
            console.log('Received webhook update:', payload);
            const typedPayload = payload as {
              new: { 
                status: string; 
                generated_01: string;
                prediction_id: string;
                error_message?: string;
              };
            };
            
            console.log('Processing update with status:', typedPayload.new.status);
            console.log('Has generated image:', !!typedPayload.new.generated_01);
            
            if ((typedPayload.new.status === "completed" || typedPayload.new.status === "Completed!") && typedPayload.new.generated_01) {
              try {
                console.log('Processing completed image:', typedPayload.new.generated_01);
                // Get the trimmed dimensions of the processed image
                const { url: trimmedUrl, bounds } = await trimTransparentPixels(typedPayload.new.generated_01);
                console.log('Trimmed image URL:', trimmedUrl);
                console.log('Trimmed bounds:', bounds);
                
                // Calculate scale to fit within 512px while maintaining aspect ratio
                const aspectRatio = bounds.width / bounds.height;
                let newWidth, newHeight;
                
                if (aspectRatio > 1) {
                  newWidth = 512;
                  newHeight = 512 / aspectRatio;
                } else {
                  newHeight = 512;
                  newWidth = 512 * aspectRatio;
                }
    
                console.log('New dimensions:', { newWidth, newHeight });
    
                // Calculate new position
                const xOffset = (imageShape.width - newWidth) / 2;
                const yOffset = (imageShape.height - newHeight) / 2;
                const newPosition = {
                  x: imageShape.position.x + imageShape.width + 20 + xOffset,
                  y: imageShape.position.y + yOffset
                };
    
                console.log('New position:', newPosition);
    
                // Update shape with trimmed image
                get().updateShape(prediction_id, {
                  isUploading: false,
                  imageUrl: trimmedUrl,
                  width: newWidth,
                  height: newHeight,
                  position: newPosition
                });
                
                console.log('Successfully updated shape with new image');
                get().removeGeneratingPrediction(prediction_id);
              } catch (error) {
                console.error('Error processing completed image:', error);
                get().setError('Failed to process completed image');
              }
            } else if (typedPayload.new.status === "error" || typedPayload.new.status === "failed") {
              console.error('Generation failed:', typedPayload.new.error_message);
              get().setError(typedPayload.new.error_message || 'Generation failed');
              get().removeGeneratingPrediction(prediction_id);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Failed to subscribe to updates');
            get().setError('Failed to subscribe to generation updates');
          }
        });

    } catch (error) {
      console.error("Failed to generate subject:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to generate subject",
      });
    }
  },
});
