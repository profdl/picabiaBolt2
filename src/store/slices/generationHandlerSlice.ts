import { StateCreator } from "zustand";
import { createClient } from "@supabase/supabase-js";
import multiControlWorkflow from "../../lib/generateWorkflow.json";
import { Shape, Position } from "../../types";
import { uploadCanvasToSupabase } from "../../utils/canvasUtils";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Workflow {
  [key: string]: {
    inputs: Record<string, unknown>;
    class_type: string;
  };
}

interface StoreState {
  shapes: Shape[];
  zoom: number;
  offset: Position;
  error: string | null;
  isGenerating: boolean;
  aspectRatio: string;
  generatingPredictions: Set<string>;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, props: Partial<Shape>) => void;
  setSelectedShapes: (ids: string[]) => void;
  centerOnShape: (id: string) => void;
  addGeneratingPrediction: (id: string) => void;
  removeGeneratingPrediction: (id: string) => void;
  setError: (error: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  hasActivePrompt: boolean;
}
interface GenerationHandlerSlice {
  handleGenerate: () => Promise<void>;
}

const findRightmostBoundary = (shapes: Shape[]): number => {
  if (shapes.length === 0) return 0;
  return Math.max(...shapes.map((shape) => shape.position.x + shape.width));
};

const findOpenSpace = (
  shapes: Shape[],
  width: number,
  height: number,
  center: Position
): Position => {
  const PADDING = 20; // Space between shapes
  const rightBoundary = findRightmostBoundary(shapes);
  const maxWidth = Math.max(width, rightBoundary); // Use width parameter

  return {
    x: maxWidth + PADDING,
    y: center.y - height / 2,
  };
};
export const generationHandlerSlice: StateCreator<
  StoreState & GenerationHandlerSlice,
  [],
  [],
  GenerationHandlerSlice
> = (set, get) => ({
  handleGenerate: async () => {
    const workflow = JSON.parse(JSON.stringify(multiControlWorkflow));
    const state = get();
    const { shapes } = state;

    const activeSettings = shapes.find(
      (shape) => shape.type === "diffusionSettings" && shape.useSettings
    ) || {
      steps: 30,
      guidanceScale: 4.5,
      scheduler: "dpmpp_2m_sde",
      seed: Math.floor(Math.random() * 32767),
      outputWidth: 1360,
      outputHeight: 768,
      model: "juggernautXL_v9",
      outputFormat: "png",
      outputQuality: 100,
      randomiseSeeds: true,
    };

    if (!activeSettings) {
      set({ error: "No settings selected. Please select a settings shape." });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be authenticated");

    const hasActiveControls = shapes.some(
      (shape) =>
        shape.type === "image" &&
        (shape.showDepth ||
          shape.showEdges ||
          shape.showPose ||
          shape.showScribble ||
          shape.showRemix)
    );

    const stickyWithPrompt = shapes.find(
      (shape) => shape.type === "sticky" && shape.showPrompt && shape.content
    );

    if (!stickyWithPrompt?.content && !hasActiveControls) {
      set({ error: "Please select either a text prompt or image controls." });
      return;
    }

    const promptText = stickyWithPrompt?.content || "";
    workflow["6"].inputs.text = promptText;

    // In generationHandlerSlice
    set((state) => ({
      isGenerating: true,
      hasActivePrompt: state.hasActivePrompt,
    }));

    try {
      workflow["3"].inputs.steps = activeSettings.steps || 20;
      workflow["3"].inputs.cfg = activeSettings.guidanceScale || 7.5;
      workflow["3"].inputs.sampler_name =
        activeSettings.scheduler || "dpmpp_2m_sde";
      workflow["3"].inputs.seed = activeSettings.randomiseSeeds
        ? Math.floor(Math.random() * 32767)
        : activeSettings.seed || Math.floor(Math.random() * 32767);

      workflow["34"].inputs.width = activeSettings.outputWidth || 1344;
      workflow["34"].inputs.height = activeSettings.outputHeight || 768;

      workflow["6"].inputs.text = promptText;
      workflow["6"].inputs.clip = ["4", 1];

      const negativePrompt =
        shapes.find(
          (shape) =>
            shape.type === "sticky" && shape.showNegativePrompt && shape.content
        )?.content || "text, watermark";
      workflow["7"].inputs.text = negativePrompt;
      workflow["7"].inputs.clip = ["4", 1];

      workflow["3"].inputs.model = ["4", 0];
      workflow["3"].inputs.positive = ["6", 0];
      workflow["3"].inputs.negative = ["7", 0];

      const baseWorkflow: Workflow = {
        "3": workflow["3"],
        "4": workflow["4"],
        "6": workflow["6"],
        "7": workflow["7"],
        "8": workflow["8"],
        "9": workflow["9"],
        "34": workflow["34"],
      };

      const currentWorkflow: Workflow = { ...baseWorkflow };
      let currentPositiveNode = "6";

      const controlShapes = shapes.filter(
        (shape) =>
          (shape.type === "image" || shape.type === "sketchpad") &&
          (shape.showDepth ||
            shape.showEdges ||
            shape.showPose ||
            shape.showScribble ||
            shape.showRemix)
      );

      for (const controlShape of controlShapes) {
        if (controlShape.showEdges && controlShape.edgePreviewUrl) {
          currentWorkflow["12"] = {
            ...workflow["12"],
            inputs: {
              ...workflow["12"].inputs,
              image: controlShape.edgePreviewUrl,
            },
          };
          currentWorkflow["18"] = workflow["18"];
          currentWorkflow["41"] = {
            ...workflow["41"],
            inputs: {
              ...workflow["41"].inputs,
              positive: [currentPositiveNode, 0],
              negative: ["7", 0],
              control_net: ["18", 0],
              strength: controlShape.edgesStrength || 0.5,
            },
          };
          currentPositiveNode = "41";
        }

        if (controlShape.showDepth && controlShape.depthPreviewUrl) {
          currentWorkflow["33"] = {
            ...workflow["33"],
            inputs: {
              ...workflow["33"].inputs,
              image: controlShape.depthPreviewUrl,
            },
          };
          currentWorkflow["32"] = workflow["32"];
          currentWorkflow["31"] = {
            ...workflow["31"],
            inputs: {
              ...workflow["31"].inputs,
              positive: [currentPositiveNode, 0],
              negative: ["7", 0],
              control_net: ["32", 0],
              strength: controlShape.depthStrength || 0.5,
            },
          };
          currentPositiveNode = "31";
        }

        if (controlShape.showPose && controlShape.posePreviewUrl) {
          currentWorkflow["37"] = {
            ...workflow["37"],
            inputs: {
              ...workflow["37"].inputs,
              image: controlShape.posePreviewUrl,
            },
          };
          currentWorkflow["36"] = workflow["36"];
          currentWorkflow["42"] = {
            ...workflow["42"],
            inputs: {
              ...workflow["42"].inputs,
              positive: [currentPositiveNode, 0],
              negative: ["7", 0],
              control_net: ["36", 0],
              strength: controlShape.poseStrength || 0.5,
            },
          };
          currentPositiveNode = "42";
        }

        if (controlShape.showScribble && controlShape.type === "sketchpad") {
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = 512; // Match original dimensions
          tempCanvas.height = 512;
          const ctx = tempCanvas.getContext("2d");

          if (ctx && controlShape.canvasData) {
            const img = new Image();
            img.src = controlShape.canvasData;
            await new Promise((resolve) => {
              img.onload = () => {
                ctx.drawImage(img, 0, 0);
                resolve(null);
              };
            });

            const publicUrl = await uploadCanvasToSupabase(tempCanvas);

            if (publicUrl) {
              currentWorkflow["40"] = {
                ...workflow["40"],
                inputs: {
                  image: publicUrl,
                  upload: "image",
                },
                class_type: "LoadImage",
              };
              currentWorkflow["39"] = workflow["39"];
              currentWorkflow["43"] = {
                ...workflow["43"],
                inputs: {
                  ...workflow["43"].inputs,
                  positive: [currentPositiveNode, 0],
                  negative: ["7", 0],
                  control_net: ["39", 0],
                  strength: controlShape.scribbleStrength || 0.5,
                },
              };
              currentPositiveNode = "43";
            }
          }
        }

        let currentModelNode = "4"; // Start with the base model
        let ipAdapterCounter = 0;

        // First, collect all shapes with remix enabled
        const remixShapes = controlShapes.filter(
          (shape) => shape.showRemix && shape.imageUrl
        );

        // Then process each remix shape
        for (const controlShape of remixShapes) {
          // Generate unique node IDs for this IP Adapter chain
          const loaderNodeId = `11_${ipAdapterCounter}`;
          const imageNodeId = `17_${ipAdapterCounter}`;
          const advancedNodeId = `14_${ipAdapterCounter}`;

          // Add IP Adapter Loader
          currentWorkflow[loaderNodeId] = {
            inputs: {
              preset: "PLUS (high strength)",
              model: ["4", 0],
            },
            class_type: "IPAdapterUnifiedLoader",
          };

          // Add Image Loader
          currentWorkflow[imageNodeId] = {
            inputs: {
              image: controlShape.imageUrl,
              upload: "image",
            },
            class_type: "LoadImage",
          };

          // Add IP Adapter Advanced
          currentWorkflow[advancedNodeId] = {
            inputs: {
              weight: controlShape.remixStrength || 1,
              weight_type: "linear",
              combine_embeds: "concat",
              start_at: 0,
              end_at: 1,
              embeds_scaling: "V only",
              model: [currentModelNode, 0], // Input from previous stage
              ipadapter: [loaderNodeId, 1], // Input from this stage's loader
              image: [imageNodeId, 0], // Input from this stage's image
            },
            class_type: "IPAdapterAdvanced",
          };

          // Update current model node for next iteration
          currentModelNode = advancedNodeId;
          ipAdapterCounter++;
        }

        // Update the KSampler to use the final model output
        if (remixShapes.length > 0) {
          workflow["3"].inputs.model = [currentModelNode, 0];
        } else {
          workflow["3"].inputs.model = ["4", 0];
        }
      }

      workflow["3"].inputs.positive = [currentPositiveNode, 0];
      workflow["3"].inputs.negative = ["7", 0];

      const response = await fetch("/.netlify/functions/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_json: currentWorkflow,
          outputFormat: activeSettings.outputFormat,
          outputQuality: activeSettings.outputQuality,
          randomiseSeeds: activeSettings.randomiseSeeds,
        }),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const responseData = await response.json();
      const prediction_id = responseData.prediction.id;

      const { zoom, offset } = get();
      const center = {
        x: (window.innerWidth / 2 - offset.x) / zoom,
        y: (window.innerHeight / 2 - offset.y) / zoom,
      };

      const maxDimension = 400;
      const aspectRatio =
        (activeSettings.outputWidth || 1360) /
        (activeSettings.outputHeight || 768);
      const [scaledWidth, scaledHeight] =
        aspectRatio > 1
          ? [maxDimension, maxDimension / aspectRatio]
          : [maxDimension * aspectRatio, maxDimension];

      const openPosition = findOpenSpace(
        shapes,
        scaledWidth,
        scaledHeight,
        center
      );

      const placeholderShape: Shape = {
        id: prediction_id,
        type: "image",
        position: openPosition,
        width: scaledWidth,
        height: scaledHeight,
        isUploading: true,
        imageUrl: "",
        color: "transparent",
        rotation: 0,
        model: "",
        useSettings: false,
        isEditing: false,
        depthStrength: 0,
        edgesStrength: 0,
        contentStrength: 0,
        poseStrength: 0,
        scribbleStrength: 0,
        remixStrength: 0,
        showDepth: false,
        showEdges: false,
        showPose: false,
        showScribble: false,
        showRemix: false,
      };

      get().addShape(placeholderShape);
      get().setSelectedShapes([prediction_id]);
      get().centerOnShape(prediction_id);
      get().addGeneratingPrediction(prediction_id);

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
          (payload: unknown) => {
            const typedPayload = payload as {
              new: { status: string; generated_01: string };
            };
            if (typedPayload.new.status === "completed") {
              get().updateShape(prediction_id, {
                isUploading: false,
                imageUrl: typedPayload.new.generated_01,
              });
              get().removeGeneratingPrediction(prediction_id);
              subscription.unsubscribe();
            }
          }
        )
        .subscribe();

      const insertData = {
        id: crypto.randomUUID(),
        user_id: user.id,
        prompt: promptText,
        aspect_ratio: state.aspectRatio,
        created_at: new Date().toISOString(),
        prediction_id: prediction_id,
        status: "generating",
        updated_at: new Date().toISOString(),
        image_index: 0,
        originalUrl: controlShapes
          .map((shape) => shape.imageUrl)
          .filter(Boolean)
          .join(","),
        depthMapUrl: controlShapes
          .filter((shape) => shape.showDepth)
          .map((shape) => shape.depthPreviewUrl)
          .filter(Boolean)
          .join(","),
        edgeMapUrl: controlShapes
          .filter((shape) => shape.showEdges)
          .map((shape) => shape.edgePreviewUrl)
          .filter(Boolean)
          .join(","),
        poseMapUrl: controlShapes
          .filter((shape) => shape.showPose)
          .map((shape) => shape.posePreviewUrl)
          .filter(Boolean)
          .join(","),
        scribbleMapUrl: controlShapes
          .filter((shape) => shape.showScribble)
          .map((shape) => shape.imageUrl)
          .filter(Boolean)
          .join(","),
        remixMapUrl: controlShapes
          .filter((shape) => shape.showRemix)
          .map((shape) => shape.imageUrl)
          .filter(Boolean)
          .join(","),
        depth_scale: Math.max(
          ...controlShapes
            .filter((shape) => shape.showDepth)
            .map((shape) => shape.depthStrength || 0.5)
        ),
        edge_scale: Math.max(
          ...controlShapes
            .filter((shape) => shape.showEdges)
            .map((shape) => shape.edgesStrength || 0.5)
        ),
        pose_scale: Math.max(
          ...controlShapes
            .filter((shape) => shape.showPose)
            .map((shape) => shape.poseStrength || 0.5)
        ),
        scribble_scale: Math.max(
          ...controlShapes
            .filter((shape) => shape.showScribble)
            .map((shape) => shape.scribbleStrength || 0.5)
        ),
        remix_scale: Math.max(
          ...controlShapes
            .filter((shape) => shape.showRemix)
            .map((shape) => shape.remixStrength || 0.5)
        ),
        generated_01: "",
        generated_02: "",
        generated_03: "",
        generated_04: "",
        num_inference_steps: activeSettings.steps,
        prompt_negative: negativePrompt,
        width: activeSettings.outputWidth || 1360,
        height: activeSettings.outputHeight || 768,
        num_outputs: 1,
        scheduler: activeSettings.scheduler,
        guidance_scale: activeSettings.guidanceScale,
        prompt_strength: 1.0,
        seed: activeSettings.seed,
        refine: "",
        refine_steps: 0,
        lora_scale: 1.0,
        lora_weights: "",
      };

      const { error: dbError } = await supabase
        .from("generated_images")
        .insert(insertData)
        .select()
        .single();

      if (dbError) throw dbError;
    } catch (error) {
      console.error("Error generating image:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to generate image",
        isGenerating: false,
      });
    } finally {
      if (get().generatingPredictions.size === 0) {
        set({ isGenerating: false });
      }
    }
  },
});
