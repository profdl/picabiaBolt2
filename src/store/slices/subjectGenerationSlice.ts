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
      const subscription = supabase
      .channel(`generation_${prediction_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "generated_images",
          filter: `prediction_id=eq.${prediction_id}`,
        },
        async (payload: unknown) => {
          const typedPayload = payload as {
            new: { status: string; generated_01: string };
          };
          if (typedPayload.new.status === "completed") {
            // Get the trimmed dimensions of the processed image
            const { url: trimmedUrl, bounds } = await trimTransparentPixels(typedPayload.new.generated_01);
            
            // Calculate new position to keep image centered relative to original position
            const xOffset = (sourceShape.width - bounds.width) / 2;
            const yOffset = (sourceShape.height - bounds.height) / 2;
            const newPosition = {
              x: sourceShape.position.x + sourceShape.width + 20 + xOffset,
              y: sourceShape.position.y + yOffset
            };

            // Update shape with trimmed image and new dimensions
            get().updateShape(prediction_id, {
              isUploading: false,
              imageUrl: trimmedUrl,
              width: bounds.width,
              height: bounds.height,
              position: newPosition
            });
            
            get().removeGeneratingPrediction(prediction_id);
            subscription.unsubscribe();
          }
        }
      )
      .subscribe();

  } catch (error) {
    console.error("Failed to generate subject:", error);
    set({
      error: error instanceof Error ? error.message : "Failed to generate subject",
    });
  }
},
});
