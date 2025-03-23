import { StateCreator } from "zustand";
import { createClient } from "@supabase/supabase-js";
import multiControlWorkflow from "../../lib/generateWorkflow.json";
import { Shape, Position } from "../../types";
import { uploadCanvasToSupabase, mergeImageWithStrokes } from "../../utils/canvasUtils";
import { RealtimeChannel } from "@supabase/supabase-js";

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
export interface GenerationHandlerSlice {
  subscription: RealtimeChannel | null;
  handleGenerate: () => Promise<void>;
}



const findOccupiedSpaces = (shapes: Shape[]): Array<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}> => {
  return shapes.map((shape) => ({
    x1: shape.position.x,
    y1: shape.position.y,
    x2: shape.position.x + shape.width,
    y2: shape.position.y + shape.height,
  }));
};

// Helper function to check if a position overlaps with existing shapes
const isPositionOverlapping = (
  x: number,
  y: number,
  width: number,
  height: number,
  occupiedSpaces: Array<{ x1: number; y1: number; x2: number; y2: number }>,
  padding: number
): boolean => {
  const proposed = {
    x1: x - padding,
    y1: y - padding,
    x2: x + width + padding,
    y2: y + height + padding,
  };

  return occupiedSpaces.some(
    (space) =>
      proposed.x1 < space.x2 &&
      proposed.x2 > space.x1 &&
      proposed.y1 < space.y2 &&
      proposed.y2 > space.y1
  );
};

const findOpenSpace = (
  shapes: Shape[],
  width: number,
  height: number,
  viewCenter: Position
): Position => {
  const PADDING = 5;
  const MAX_ATTEMPTS = 10;
  const occupiedSpaces = findOccupiedSpaces(shapes);

  // Start with trying to place directly to the right of viewport center
  let attemptX = viewCenter.x + PADDING;
  const attemptY = viewCenter.y - height / 2;

  // Try positions progressively further to the right
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (!isPositionOverlapping(
      attemptX,
      attemptY,
      width,
      height,
      occupiedSpaces,
      PADDING
    )) {
      return { x: attemptX, y: attemptY };
    }
    // Move further right for next attempt
    attemptX += (width + PADDING);
  }

  // If no space found, default to a position right of viewport center
  return {
    x: viewCenter.x + PADDING,
    y: viewCenter.y - height / 2,
  };
};

const calculateAverageAspectRatio = (shapes: Shape[]) => {
  // Find the first enabled control shape
  const enabledShape = shapes.find(shape => {
    const isControlShape = shape.type === 'image' || shape.type === 'depth' || shape.type === 'edges' || shape.type === 'pose';
    const isEnabled = (shape.type === 'image' && shape.showImagePrompt) ||
                     (shape.type === 'depth' && shape.showDepth) ||
                     (shape.type === 'edges' && shape.showEdges) ||
                     (shape.type === 'pose' && shape.showPose);
    return isControlShape && isEnabled;
  });

  if (enabledShape) {
    // Return the aspect ratio of the first enabled control shape
    return enabledShape.width / enabledShape.height;
  }

  return null;
};

export const generationHandlerSlice: StateCreator<
  StoreState & GenerationHandlerSlice,
  [],
  [],
  GenerationHandlerSlice
> = (set, get) => ({
  subscription: null,
  handleGenerate: async () => {
    const workflow = JSON.parse(JSON.stringify(multiControlWorkflow));
    const state = get();
    const { shapes, updateShape } = state;

    // Check if multiple images have makeVariations enabled
    const variationShapes = shapes.filter(s => s.type === "image" && s.makeVariations);
    if (variationShapes.length > 1) {
      // Keep the last enabled one and disable the rest
      variationShapes.slice(0, -1).forEach(shape => {
        updateShape(shape.id, { makeVariations: false });
      });
    }

    const activeSettings = shapes.find(
      (shape) => shape.type === "diffusionSettings" && shape.useSettings
    ) || {
      steps: 30,
      guidanceScale: 4.5,
      scheduler: "dpmpp_2m_sde",
      seed: Math.floor(Math.random() * 32767),
      outputWidth: null,
      outputHeight: null,
      model: "juggernautXL_v9",
      outputFormat: "png",
      outputQuality: 100,
      randomiseSeeds: true,
    };

    // Find both variation and image reference shapes
    const variationShape = shapes.find(s => s.type === "image" && s.makeVariations);
    const imageReferenceShape = shapes.find(s => s.type === "image" && s.showImagePrompt);

    // Handle dimensions based on active shapes
    // First check if we have an active DiffusionSettingsPanel with dimensions
    if (activeSettings.outputWidth && activeSettings.outputHeight) {
      // Use the DiffusionSettingsPanel dimensions
      // No need to modify activeSettings as it already has the correct dimensions
    } else if (variationShape) {
      // Use the dimensions from the variation source image
      activeSettings.outputWidth = Math.round(variationShape.width);
      activeSettings.outputHeight = Math.round(variationShape.height);

      // Get the preview canvas for the variation shape
      const previewCanvas = document.querySelector(`canvas[data-shape-id="${variationShape.id}"][data-layer="preview"]`) as HTMLCanvasElement;
      if (!previewCanvas) {
        console.error('Preview canvas not found for variation shape');
        return;
      }

      // Create a blob from the preview canvas
      const blob = await new Promise<Blob>((resolve, reject) => {
        previewCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from preview canvas'));
          }
        }, 'image/png', 1.0);
      });

      // Upload to Supabase
      const fileName = `variation_source_${Math.random().toString(36).substring(2)}.png`;
      const arrayBuffer = await blob.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(fileName, fileData, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(fileName);

      // Use VAEEncode on the preview image instead of EmptyLatentImage
      workflow["36"] = {
        ...workflow["36"],
        inputs: {
          image: publicUrl,
          upload: "image",
        },
        class_type: "LoadImage",
      };
      
      workflow["35"] = {
        ...workflow["35"],
        inputs: {
          pixels: ["36", 0],
          vae: ["4", 2]
        },
        class_type: "VAEEncode",
      };
      
      // Set the latent_image input to the encoded image and adjust denoise strength
      workflow["3"].inputs.latent_image = ["35", 0];
      workflow["3"].inputs.denoise = variationShape.variationStrength || 0.75;
    } else if (imageReferenceShape) {
      // Use dimensions from the image reference
      activeSettings.outputWidth = Math.round(imageReferenceShape.width);
      activeSettings.outputHeight = Math.round(imageReferenceShape.height);
    } else {
      // Only calculate dimensions from control shapes if no other dimensions are set
      const avgAspectRatio = calculateAverageAspectRatio(shapes);
      if (avgAspectRatio) {
        // Target approximately 1 megapixel area
        const targetArea = 1024 * 1024;
        let width = Math.round(Math.sqrt(targetArea * avgAspectRatio));
        let height = Math.round(width / avgAspectRatio);
        
        // Ensure dimensions are multiples of 8
        width = Math.round(width / 8) * 8;
        height = Math.round(height / 8) * 8;
        
        activeSettings.outputWidth = width;
        activeSettings.outputHeight = height;
      } else {
        // Default to 1024x1024 if no control shapes are enabled
        activeSettings.outputWidth = 1024;
        activeSettings.outputHeight = 1024;
      }
    }

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
        (shape.type === "image" || 
         shape.type === "sketchpad" || 
         shape.type === "depth" ||
         shape.type === "edges" ||
         shape.type === "pose") &&
        (shape.showDepth ||
          shape.showEdges ||
          shape.showPose ||
          shape.showSketch ||
          shape.showImagePrompt ||
          shape.makeVariations)
    );

    const stickyWithPrompt = shapes.find(
      (shape) => shape.type === "sticky" && shape.isTextPrompt && shape.content
    );

    if (!stickyWithPrompt?.content && !hasActiveControls) {
      set({ error: "Please select either a text prompt, image controls, or enable variations." });
      return;
    }

    const promptText = stickyWithPrompt?.content || "";
    workflow["6"].inputs.text = promptText;

    // Calculate dimensions for placeholder shape
    const maxDimension = 400;
    const aspectRatio = (activeSettings.outputWidth || 1360) / (activeSettings.outputHeight || 768);
    const [scaledWidth, scaledHeight] = aspectRatio > 1
      ? [maxDimension, maxDimension / aspectRatio]
      : [maxDimension * aspectRatio, maxDimension];
    
    const { zoom, offset } = get();
    const viewCenter = {
      x: (-offset.x + window.innerWidth / 2) / zoom,
      y: (-offset.y + window.innerHeight / 2) / zoom,
    };

    const position = findOpenSpace(shapes, scaledWidth, scaledHeight, viewCenter);

    // Generate a unique prediction ID early
    const prediction_id = crypto.randomUUID();

    // Create placeholder shape immediately
    const placeholderShape: Shape = {
      id: prediction_id,
      type: "image",
      position,
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
      sketchStrength: 0,
      imagePromptStrength: 0,
      showDepth: false,
      showEdges: false,
      showPose: false,
      showSketch: false,
      showImagePrompt: false,
    };

    // Add placeholder shape and set it as selected
    get().addShape(placeholderShape);
    get().setSelectedShapes([prediction_id]);
    get().centerOnShape(prediction_id);
    get().addGeneratingPrediction(prediction_id);

    // Set generating state
    set((state) => ({
      isGenerating: true,
      hasActivePrompt: state.hasActivePrompt,
    }));

    let subscription: RealtimeChannel | null = null;
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
            shape.type === "sticky" && shape.isNegativePrompt && shape.content
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
      };

      // Add variation nodes if needed
      if (variationShape) {
        baseWorkflow["35"] = workflow["35"];
        baseWorkflow["36"] = workflow["36"];
        // Remove EmptyLatentImage node since we're using VAEEncode
        delete baseWorkflow["34"];
      } else {
        // Use EmptyLatentImage as before
        baseWorkflow["34"] = workflow["34"];
        baseWorkflow["3"].inputs.latent_image = ["34", 0];
        baseWorkflow["3"].inputs.denoise = 1;
      }

      const currentWorkflow: Workflow = { ...baseWorkflow };
      let currentPositiveNode = "6";

      for (const controlShape of shapes) {
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
              image: ["33", 0],
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

        if (controlShape.showSketch) {
          if (controlShape.type === "sketchpad" && controlShape.canvasData) {
            // Existing canvas processing logic for sketchpad
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = 512;
            tempCanvas.height = 512;
            const ctx = tempCanvas.getContext("2d");

            if (ctx) {
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
                // Set up workflow nodes
                currentWorkflow["40"] = {
                  ...workflow["40"],
                  inputs: {
                    image: publicUrl,
                    upload: "image",
                  },
                  class_type: "LoadImage",
                };
              }
            }
          } else if (controlShape.type === "image" && controlShape.imageUrl) {
            // Direct image URL processing for ImageShape
            currentWorkflow["40"] = {
              ...workflow["40"],
              inputs: {
                image: controlShape.imageUrl,
                upload: "image",
              },
              class_type: "LoadImage",
            };
          }

          // Common workflow setup for both types
          currentWorkflow["39"] = workflow["39"];
          currentWorkflow["43"] = {
            ...workflow["43"],
            inputs: {
              ...workflow["43"].inputs,
              positive: [currentPositiveNode, 0],
              negative: ["7", 0],
              control_net: ["39", 0],
              strength: controlShape.sketchStrength || 0.5,
            },
          };
          currentPositiveNode = "43";
        }

        let currentModelNode = "4"; // Start with the base model
        let ipAdapterCounter = 0;

        // First, collect all shapes with remix enabled
        const remixShapes = shapes.filter(
          (shape) => shape.showImagePrompt && shape.imageUrl
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

          // Add Image Loader with merged image
          const mergedImageUrl = await mergeImageWithStrokes(controlShape);
          currentWorkflow[imageNodeId] = {
            inputs: {
              image: mergedImageUrl,
              upload: "image",
            },
            class_type: "LoadImage",
          };

          // Add IP Adapter Advanced
          currentWorkflow[advancedNodeId] = {
            inputs: {
              weight: controlShape.imagePromptStrength || 1,
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

      // Handle image reference if present
      if (imageReferenceShape) {
        // Get the preview canvas and mask canvas for the image reference shape
        const previewCanvas = document.querySelector(`canvas[data-shape-id="${imageReferenceShape.id}"][data-layer="preview"]`) as HTMLCanvasElement;
        const maskCanvas = document.querySelector(`canvas[data-shape-id="${imageReferenceShape.id}"][data-layer="mask"]`) as HTMLCanvasElement;
        
        if (!previewCanvas || !maskCanvas) {
          console.error('Required canvas layers not found for image reference shape');
          return;
        }

        // Create a temporary canvas with white background
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = previewCanvas.width;
        tempCanvas.height = previewCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          console.error('Could not get temporary canvas context');
          return;
        }

        // Fill with white background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the preview canvas content
        tempCtx.drawImage(previewCanvas, 0, 0);

        // Apply mask using destination-in composite operation
        tempCtx.globalCompositeOperation = "destination-in";
        tempCtx.drawImage(maskCanvas, 0, 0);
        tempCtx.globalCompositeOperation = "source-over";

        // Create a blob from the temporary canvas
        const blob = await new Promise<Blob>((resolve, reject) => {
          tempCanvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          }, 'image/png', 1.0);
        });

        // Upload to Supabase
        const fileName = `reference_source_${Math.random().toString(36).substring(2)}.png`;
        const arrayBuffer = await blob.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await supabase.storage
          .from("assets")
          .upload(fileName, fileData, {
            contentType: 'image/png',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("assets")
          .getPublicUrl(fileName);

        // Add image reference to the workflow using IP Adapter
        const loaderNodeId = `ipadapter_loader_${Math.random().toString(36).substring(2)}`;
        const imageNodeId = `image_loader_${Math.random().toString(36).substring(2)}`;
        const advancedNodeId = `ipadapter_advanced_${Math.random().toString(36).substring(2)}`;

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
            image: publicUrl,
            upload: "image",
          },
          class_type: "LoadImage",
        };

        // Add IP Adapter Advanced
        currentWorkflow[advancedNodeId] = {
          inputs: {
            weight: imageReferenceShape.imagePromptStrength || 0.5,
            weight_type: "linear",
            combine_embeds: "concat",
            start_at: 0,
            end_at: 1,
            embeds_scaling: "V only",
            model: ["4", 0],
            ipadapter: [loaderNodeId, 1],
            image: [imageNodeId, 0],
          },
          class_type: "IPAdapterAdvanced",
        };

        // Update the KSampler to use the IP Adapter output
        workflow["3"].inputs.model = [advancedNodeId, 0];
      }

      // Apply text prompt strength if available
      if (stickyWithPrompt && stickyWithPrompt.textPromptStrength !== undefined) {
        // Use the text prompt strength directly as the CFG value
        // The slider now ranges from 1-10, which maps directly to CFG values
        workflow["3"].inputs.cfg = stickyWithPrompt.textPromptStrength;
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
          variations: variationShape ? {
            imageId: variationShape.id,
            strength: variationShape.variationStrength || 0.75
          } : undefined,
          prediction_id: prediction_id // Add the prediction ID to the request
        }),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const responseData = await response.json();
      const replicatePredictionId = responseData.prediction.id;

      // Update the placeholder shape with the actual prediction ID
      get().updateShape(prediction_id, { id: replicatePredictionId });
      get().removeGeneratingPrediction(prediction_id);
      get().addGeneratingPrediction(replicatePredictionId);

      // Create database record
      const insertData = {
        id: crypto.randomUUID(),
        user_id: user.id,
        prompt: promptText,
        aspect_ratio: state.aspectRatio,
        created_at: new Date().toISOString(),
        prediction_id: replicatePredictionId, // Use the Replicate prediction ID
        status: "generating",
        updated_at: new Date().toISOString(),
        generated_01: "",
        generated_02: "",
        generated_03: "",
        generated_04: "",
      };

      const { error: dbError } = await supabase
        .from("generated_images")
        .insert(insertData)
        .select()
        .single();

      if (dbError) throw dbError;

      // Set up subscription for updates
      subscription = supabase
        .channel("generated_images")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "generated_images",
          },
          (payload: unknown) => {
            const typedPayload = payload as {
              new: {
                status: string;
                generated_01: string;
                prediction_id: string;
                updated_at: string;
                error_message?: string;
              };
            };

            // Handle completion regardless of window focus
            if (
              typedPayload.new.status === "completed" &&
              typedPayload.new.generated_01
            ) {
              get().updateShape(typedPayload.new.prediction_id, {
                isUploading: false,
                imageUrl: typedPayload.new.generated_01,
              });
              get().removeGeneratingPrediction(typedPayload.new.prediction_id);
            } else if (
              typedPayload.new.status === "error" ||
              typedPayload.new.status === "failed"
            ) {
              // Handle error states
              get().updateShape(typedPayload.new.prediction_id, {
                isUploading: false,
                color: "#ffcccb" // Add a visual indicator for error
              });
              get().removeGeneratingPrediction(typedPayload.new.prediction_id);
              get().setError(
                typedPayload.new.error_message || "Generation failed"
              );
            }
          }
        )
        .subscribe();

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
    set({ subscription: subscription });
  },
});
