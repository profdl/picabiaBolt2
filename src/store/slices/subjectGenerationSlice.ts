import { StateCreator } from "zustand";
import { Shape, Position, StoreState } from "../../types";
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User must be authenticated");

      const workflow = JSON.parse(JSON.stringify(getSubjectWorkflow));
      workflow["14"].inputs.image = sourceShape.imageUrl;

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
        originalUrl: sourceShape.imageUrl,
        width: Math.round(sourceShape.width),
        height: Math.round(sourceShape.height),
        // Add other required fields with defaults
        prompt: "subject extraction",
        aspect_ratio: `${Math.round(sourceShape.width)}:${Math.round(
          sourceShape.height
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
        x: sourceShape.position.x + sourceShape.width + 20,
        y: sourceShape.position.y,
      };

      // Add placeholder shape
      const placeholderShape: Shape = {
        id: prediction_id,
        type: "image",
        position,
        width: sourceShape.width,
        height: sourceShape.height,
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
        remixStrength: 0.75,
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
            
            if (typedPayload.new.status === "completed" && typedPayload.new.generated_01) {
              try {
                // Get the trimmed dimensions of the processed image
                const { url: trimmedUrl, bounds } = await trimTransparentPixels(typedPayload.new.generated_01);
                
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
    
                // Calculate new position
                const xOffset = (sourceShape.width - newWidth) / 2;
                const yOffset = (sourceShape.height - newHeight) / 2;
                const newPosition = {
                  x: sourceShape.position.x + sourceShape.width + 20 + xOffset,
                  y: sourceShape.position.y + yOffset
                };
    
                // Update shape with trimmed image
                get().updateShape(prediction_id, {
                  isUploading: false,
                  imageUrl: trimmedUrl,
                  width: newWidth,
                  height: newHeight,
                  position: newPosition
                });
                
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
