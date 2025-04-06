import { StateCreator } from "zustand";
import { createClient } from "@supabase/supabase-js";
import multiControlWorkflow from "../../lib/generateWorkflow.json";
import inpaintWorkflow from "../../lib/inpaintWorkflow.json";
import { Shape, Position } from "../../types";
import { ImageShape } from "../../types/shapes";
import { RealtimeChannel } from "@supabase/supabase-js";
import { findOpenSpace } from "../../utils/spaceUtils";
import { createDatabaseRecord, setupGenerationSubscription, uploadImageToStorage } from "../../lib/database";
import {
  getShapeCanvases,
  prepareCanvasesForGeneration,
  prepareCanvasesForInpainting,
  canvasToBlob
} from "../../services/generation/CanvasUtils";
import { ShapeProcessor } from "../../services/generation/ShapeProcessor";
import { SettingsManager } from "../../services/generation/SettingsManager";

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
  deleteShape: (id: string) => void;
  setSelectedShapes: (ids: string[]) => void;
  centerOnShape: (id: string) => void;
  addGeneratingPrediction: (id: string) => void;
  removeGeneratingPrediction: (id: string) => void;
  setError: (error: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  hasActivePrompt: boolean;
  setOffset: (offset: Position) => void;
}

export interface GenerationHandlerSlice {
  subscription: RealtimeChannel | null;
  handleGenerate: () => Promise<void>;
  cancelGeneration: (predictionId: string) => Promise<void>;
}

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
    const { shapes, updateShape, zoom, offset, setOffset } = state;

    // Check if multiple images have makeVariations enabled
    const variationShapes = shapes.filter(s => s.type === "image" && s.makeVariations);
    if (variationShapes.length > 1) {
      // Keep the last enabled one and disable the rest
      variationShapes.slice(0, -1).forEach(shape => {
        updateShape(shape.id, { makeVariations: false });
      });
    }

    // Get active settings using SettingsManager
    const activeSettings = SettingsManager.getActiveSettings(shapes);

    // Find variation shape
    const variationShape = shapes.find(s => s.type === "image" && s.makeVariations);

    // Handle image reference if present
    const imageReferenceShapes = shapes.filter(s => s.type === "image" && s.showImagePrompt);

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be authenticated");

    // Check for active controls
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

    // Get prompt text
    const stickyWithPrompt = ShapeProcessor.findStickyWithPrompt(shapes);

    if (!stickyWithPrompt?.content && !hasActiveControls) {
      set({ error: "Please select either a text prompt, image controls, or enable variations." });
      return;
    }

    const promptText = stickyWithPrompt?.content || "";

    // Calculate view center
    const viewCenter = {
      x: (-offset.x + window.innerWidth / 2) / zoom,
      y: (-offset.y + window.innerHeight / 2) / zoom,
    };

    // Calculate dimensions for placeholder shape
    const dimensions = ShapeProcessor.calculateImageShapeDimensions(
      activeSettings.outputWidth || 512,
      activeSettings.outputHeight || 512
    );

    // Find the top-right most shape with enabled toggles
    const topRightMostShape = shapes.find(shape => 
      ShapeProcessor.hasEnabledToggles(shape) &&
      shape.position.x + ShapeProcessor.getShapeDimensions(shape).width === Math.max(
        ...shapes.filter(s => ShapeProcessor.hasEnabledToggles(s))
          .map(s => s.position.x + ShapeProcessor.getShapeDimensions(s).width)
      )
    );

    // Calculate position based on top-right most shape with toggles or view center
    let position: Position;
    if (topRightMostShape) {
      position = ShapeProcessor.calculatePositionFromReference(
        topRightMostShape,
        dimensions,
        shapes
      );
    } else {
      position = findOpenSpace(shapes, dimensions.width, dimensions.height, viewCenter);
    }

    // Generate a unique prediction ID early
    const prediction_id = crypto.randomUUID();

    // Create placeholder shape
    const placeholderShape = ShapeProcessor.createPlaceholderShape(
      prediction_id,
      position,
      dimensions
    );

    // Add placeholder shape and set it as selected
    get().addShape(placeholderShape);
    get().setSelectedShapes([prediction_id]);

    // Calculate the target offset to center the shape
    const targetOffset = ShapeProcessor.calculateCenteringOffset(
      position,
      dimensions,
      zoom
    );

    // Animate the offset change
    const startOffset = { ...offset };
    const duration = 500; // Animation duration in ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-cubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setOffset({
        x: startOffset.x + (targetOffset.x - startOffset.x) * easeProgress,
        y: startOffset.y + (targetOffset.y - startOffset.y) * easeProgress,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);

    get().addGeneratingPrediction(prediction_id);

    // Set generating state
    set((state) => ({
      isGenerating: true,
      hasActivePrompt: state.hasActivePrompt,
    }));

    try {
      // Check for inpainting case - look for shapes with valid inpaint masks
      const shapesWithInpaintMasks = shapes.filter(shape => 
        shape.type === "image" && 
        ShapeProcessor.hasValidInpaintMask(shape)
      );
      
      // If we have a shape with a valid inpaint mask, use the inpaint workflow
      const useInpaintWorkflow = shapesWithInpaintMasks.length > 0;
      
      // Initialize the base workflow - either normal or inpaint
      const baseWorkflow: Workflow = useInpaintWorkflow 
        ? JSON.parse(JSON.stringify(inpaintWorkflow))
        : {
            "3": workflow["3"],
            "4": workflow["4"],
            "6": workflow["6"],
            "7": workflow["7"],
            "8": workflow["8"],
            "9": workflow["9"],
          };

      // Initialize the current workflow
      const currentWorkflow: Workflow = { ...baseWorkflow };
      
      // Default positive node - will be updated based on workflow
      let currentPositiveNode = useInpaintWorkflow ? "2" : "6";
      let currentModelNode = ["4", 0];

      // Handle shape with inpaint mask if present
      if (useInpaintWorkflow) {
        const inpaintShape = shapesWithInpaintMasks[0]; // Use the first shape with inpaint mask
        
        try {
          // Use specialized inpainting canvas preparation
          const { sourceBlob, maskBlob } = await prepareCanvasesForInpainting(inpaintShape);
          
          if (!sourceBlob || !maskBlob) {
            throw new Error('Failed to create source or mask blob');
          }
          
          // Set the specific inpainting model for better results
          currentWorkflow["1"] = {
            ...currentWorkflow["1"],
            inputs: {
              ckpt_name: "juggernautXLInpainting_xiInpainting.safetensors"
            }
          };
          
          // Update default settings for Juggernaut XL Inpaint
          const defaultInpaintSettings = {
            steps: activeSettings.steps || 40,  // Use steps from settings panel or default to 40
            guidanceScale: stickyWithPrompt?.textPromptStrength || 7.5,  // Use strength from sticky note
            scheduler: "dpmpp_2m_sde",
            denoise: inpaintShape.variationStrength || 0.75  // Use variation strength from image shape
          };
          
          // Update workflow with optimized inpainting settings
          currentWorkflow["9"] = {
            inputs: {
              model: ["1", 0],
              positive: ["2", 0],
              negative: ["3", 0],
              latent_image: ["5", 0],
              mask: ["7a", 0],
              denoise: defaultInpaintSettings.denoise,
              seed: activeSettings.seed || Math.floor(Math.random() * 1000000),
              steps: defaultInpaintSettings.steps,
              cfg: defaultInpaintSettings.guidanceScale,
              sampler_name: defaultInpaintSettings.scheduler,
              scheduler: "normal",
              add_noise: "enable",
              noise_seed: activeSettings.seed || Math.floor(Math.random() * 1000000),
              noise_weight: 1.0,
              start_at_step: 0,
              end_at_step: 10000,
              return_with_leftover_noise: "disable"
            },
            class_type: "KSamplerAdvanced"
          };
          
          // Upload images to Supabase
          const [sourceFileName, maskFileName] = [
            `inpaint_source_${Math.random().toString(36).substring(2)}.png`,
            `inpaint_mask_${Math.random().toString(36).substring(2)}.png`
          ];
          
          const [sourceArrayBuffer, maskArrayBuffer] = await Promise.all([
            sourceBlob.arrayBuffer(),
            maskBlob.arrayBuffer()
          ]);
          
          const [sourceFileData, maskFileData] = [
            new Uint8Array(sourceArrayBuffer),
            new Uint8Array(maskArrayBuffer)
          ];
          
          // Upload to storage
          const [sourceUrl, maskUrl] = await Promise.all([
            uploadImageToStorage(sourceFileName, sourceFileData, "preprocessed-images"),
            uploadImageToStorage(maskFileName, maskFileData, "preprocessed-images")
          ]);
          
          // Set up inpainting nodes with our uploaded images
          currentWorkflow["4"].inputs.image = sourceUrl;
          currentWorkflow["6"].inputs.image = maskUrl;
          
          // Set prompt text in the inpainting workflow
          const promptText = stickyWithPrompt?.content || "";
          currentWorkflow["2"].inputs.text = promptText;
          
          // Set negative prompt
          const negativePrompt = ShapeProcessor.findStickyWithNegativePrompt(shapes)?.content || "text, watermark";
          currentWorkflow["3"].inputs.text = negativePrompt;
          
          // Update with strength settings
          const strength = inpaintShape.variationStrength || 0.75;
          currentWorkflow["9"].inputs.denoise = strength;
          
          // Update settings like seed, steps, etc.
          SettingsManager.updateWorkflowWithSettings(currentWorkflow, activeSettings);

          // Configure ImageToMask node to correctly interpret our mask
          if (currentWorkflow["7"] && currentWorkflow["7"].class_type === "ImageToMask") {
            currentWorkflow["7"].inputs.channel = "red";
          }
          
          // Add InvertMask node
          currentWorkflow["7a"] = {
            inputs: {
              mask: ["7", 0]
            },
            class_type: "InvertMask"
          };
          
          // Replace SetLatentNoiseMask with KSamplerAdvanced for inpainting
          if (currentWorkflow["8"] && currentWorkflow["8"].class_type === "SetLatentNoiseMask") {
            // Remove the old SetLatentNoiseMask node
            delete currentWorkflow["8"];
            
            // Add SetLatentNoiseMask node
            currentWorkflow["8"] = {
              inputs: {
                samples: ["5", 0],
                mask: ["7a", 0]
              },
              class_type: "SetLatentNoiseMask"
            };
            
            // Add KSamplerAdvanced node for inpainting
            currentWorkflow["9"] = {
              inputs: {
                model: ["1", 0],
                positive: ["2", 0],
                negative: ["3", 0],
                latent_image: ["8", 0],
                denoise: strength,
                seed: activeSettings.seed || Math.floor(Math.random() * 1000000),
                steps: activeSettings.steps || 20,
                cfg: activeSettings.guidanceScale || 7.5,
                sampler_name: activeSettings.scheduler || "dpmpp_2m_sde",
                scheduler: "normal",
                add_noise: "enable",
                noise_seed: activeSettings.seed || Math.floor(Math.random() * 1000000),
                noise_weight: 1.0,
                start_at_step: 0,
                end_at_step: 10000,
                return_with_leftover_noise: "disable"
              },
              class_type: "KSamplerAdvanced"
            };
          }
        } catch (error) {
          console.error('Error preparing canvases for inpainting:', error);
          set({ error: 'Failed to prepare canvases for inpainting' });
          return;
        }
      } else {
        // Handle variation shape if present
        if (variationShape) {
          const canvases = getShapeCanvases(variationShape.id);
          
          if (!canvases.preview) {
            console.error('Preview canvas not found for variation shape');
            return;
          }

          try {
            // Prepare canvases for generation
            const { sourceBlob, maskBlob, hasBlackPixels } = await prepareCanvasesForGeneration(variationShape);

            if (!sourceBlob) {
              throw new Error('Failed to create source blob');
            }

            // Upload images to Supabase
            const [sourceFileName, maskFileName] = [
              `variation_source_${Math.random().toString(36).substring(2)}.png`,
              `variation_mask_${Math.random().toString(36).substring(2)}.png`
            ];

            const [sourceArrayBuffer, maskArrayBuffer] = await Promise.all([
              sourceBlob.arrayBuffer(),
              maskBlob?.arrayBuffer()
            ]);

            const [sourceFileData, maskFileData] = [
              new Uint8Array(sourceArrayBuffer),
              maskArrayBuffer ? new Uint8Array(maskArrayBuffer) : undefined
            ];

            // Upload to storage
            const [sourceUrl, maskUrl] = await Promise.all([
              uploadImageToStorage(sourceFileName, sourceFileData, "preprocessed-images"),
              maskFileData ? uploadImageToStorage(maskFileName, maskFileData, "preprocessed-images") : undefined
            ]);

            if (hasBlackPixels && maskUrl) {
              // Set up in-painting workflow nodes
              currentWorkflow["36"] = {
                inputs: {
                  image: sourceUrl,
                  upload: "image",
                },
                class_type: "LoadImage",
              };

              currentWorkflow["37"] = {
                inputs: {
                  image: maskUrl,
                  upload: "image",
                },
                class_type: "LoadImage",
              };

              // Add ImageToMask node
              currentWorkflow["39"] = {
                inputs: {
                  image: ["37", 0],
                  method: "red",
                  channel: "red"
                },
                class_type: "ImageToMask",
              };

              // Add InvertMask node
              currentWorkflow["41"] = {
                inputs: {
                  mask: ["39", 0]
                },
                class_type: "InvertMask",
              };

              currentWorkflow["38"] = {
                inputs: {
                  pixels: ["36", 0],
                  vae: ["4", 2]
                },
                class_type: "VAEEncode",
              };

              // Add SetLatentNoiseMask node
              currentWorkflow["40"] = {
                inputs: {
                  samples: ["38", 0],
                  mask: ["41", 0]
                },
                class_type: "SetLatentNoiseMask",
              };

              // Update the KSampler
              currentWorkflow["3"].inputs.latent_image = ["40", 0];
              currentWorkflow["3"].inputs.denoise = variationShape.variationStrength || 0.8;
            } else {
              // Set up regular image-to-image workflow nodes
              currentWorkflow["36"] = {
                inputs: {
                  image: sourceUrl,
                  upload: "image",
                },
                class_type: "LoadImage",
              };

              currentWorkflow["38"] = {
                inputs: {
                  pixels: ["36", 0],
                  vae: ["4", 2]
                },
                class_type: "VAEEncode",
              };

              // Update the KSampler
              currentWorkflow["3"].inputs.latent_image = ["38", 0];
              currentWorkflow["3"].inputs.denoise = variationShape.variationStrength || 0.75;
            }
          } catch (error) {
            console.error('Error preparing canvases:', error);
            set({ error: 'Failed to prepare canvases for generation' });
            return;
          }
        } else {
          // Use EmptyLatentImage when no variation shape is present
          currentWorkflow["34"] = {
            inputs: {
              width: activeSettings.outputWidth || 1344,
              height: activeSettings.outputHeight || 768,
              batch_size: 1
            },
            class_type: "EmptyLatentImage",
          };
          currentWorkflow["3"].inputs.latent_image = ["34", 0];
          currentWorkflow["3"].inputs.denoise = 1;
        }

        // Update workflow with settings
        SettingsManager.updateWorkflowWithSettings(currentWorkflow, activeSettings);

        // Set up the workflow nodes
        currentWorkflow["6"].inputs.text = promptText;
        currentWorkflow["6"].inputs.clip = ["4", 1];

        const negativePrompt = ShapeProcessor.findStickyWithNegativePrompt(shapes)?.content || "text, watermark";
        currentWorkflow["7"].inputs.text = negativePrompt;
        currentWorkflow["7"].inputs.clip = ["4", 1];

        currentWorkflow["3"].inputs.model = ["4", 0];
        currentWorkflow["3"].inputs.positive = ["6", 0];
        currentWorkflow["3"].inputs.negative = ["7", 0];
      }

      // Handle image reference if present
      if (imageReferenceShapes.length > 0) {
        for (const imageReferenceShape of imageReferenceShapes) {
          const canvases = getShapeCanvases(imageReferenceShape.id);
          
          if (!canvases.preview) {
            console.error('Preview canvas not found for image reference shape');
            continue;
          }

          try {
            // Convert preview canvas to blob
            const blob = await canvasToBlob(canvases.preview);

            // Upload to Supabase
            const fileName = `reference_source_${Math.random().toString(36).substring(2)}.png`;
            const arrayBuffer = await blob.arrayBuffer();
            const fileData = new Uint8Array(arrayBuffer);

            // Upload to storage
            const publicUrl = await uploadImageToStorage(fileName, fileData, "preprocessed-images");

            // Check if "Image is a Drawing" is enabled
            if (imageReferenceShape.isDrawing) {
              // Use Sketch-to-Image ControlNet workflow
              // Generate unique IDs for this ControlNet set
              const loaderNodeId = `controlnet_loader_${Math.random().toString(36).substring(2)}`;
              const imageNodeId = `sketch_image_loader_${Math.random().toString(36).substring(2)}`;
              const controlNetNodeId = `controlnet_apply_${Math.random().toString(36).substring(2)}`;
              
              // Add ControlNet Loader for sketch
              currentWorkflow[loaderNodeId] = {
                inputs: {
                  control_net_name: "controlnet-scribble-sdxl-1.0.safetensors",
                },
                class_type: "ControlNetLoader",
              };
              
              // Add Image Loader for the sketch
              currentWorkflow[imageNodeId] = {
                inputs: {
                  image: publicUrl,
                  upload: "image",
                },
                class_type: "LoadImage",
              };
              
              // Add ControlNet Apply Advanced node
              currentWorkflow[controlNetNodeId] = {
                inputs: {
                  positive: [currentPositiveNode, 0],
                  negative: ["7", 0],
                  control_net: [loaderNodeId, 0],
                  image: [imageNodeId, 0],
                  strength: imageReferenceShape.imagePromptStrength || 0.5,
                  start_percent: 0,
                  end_percent: 1,
                },
                class_type: "ControlNetApplyAdvanced",
              };
              
              // Update current positive node for next iteration
              currentPositiveNode = controlNetNodeId;
            } else {
              // Use IP Adapter for photo reference
              // Generate unique IDs for this IP adapter set
              const loaderNodeId = `ipadapter_loader_${Math.random().toString(36).substring(2)}`;
              const imageNodeId = `image_loader_${Math.random().toString(36).substring(2)}`;
              const advancedNodeId = `ipadapter_advanced_${Math.random().toString(36).substring(2)}`;

              // Add IP Adapter Loader
              currentWorkflow[loaderNodeId] = {
                inputs: {
                  preset: "PLUS (high strength)",
                  model: currentModelNode,
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
                  model: currentModelNode,
                  ipadapter: [loaderNodeId, 1],
                  image: [imageNodeId, 0],
                },
                class_type: "IPAdapterAdvanced",
              };

              // Update the current model node for the next iteration
              currentModelNode = [advancedNodeId, 0];
            }
          } catch (error) {
            console.error('Error processing image reference:', error);
            continue;
          }
        }

        // Only update the KSampler if not using inpainting workflow
        if (!useInpaintWorkflow) {
          // Only update the KSampler with the final IP adapter output if we didn't use ControlNet
          if (!(imageReferenceShapes.some(shape => shape.isDrawing))) {
            currentWorkflow["3"].inputs.model = currentModelNode;
          }
          
          // Apply text prompt strength if available
          if (stickyWithPrompt && stickyWithPrompt.textPromptStrength !== undefined) {
            currentWorkflow["3"].inputs.cfg = stickyWithPrompt.textPromptStrength;
          }

          currentWorkflow["3"].inputs.positive = [currentPositiveNode, 0];
          currentWorkflow["3"].inputs.negative = ["7", 0];
        }
      }

      // Only add ControlNet nodes if depth, edges, or pose controls are enabled
      const hasControlNetControls = shapes.some(shape => 
        (shape.showDepth || shape.showEdges || shape.showPose) && 
        ((shape as ImageShape).depthUrl || 
         (shape as ImageShape).edgeUrl || 
         (shape as ImageShape).poseUrl)
      );

      if (hasControlNetControls) {
        // Store the last controlnet node ID to connect to KSampler
        let lastControlNetNodeId = null;

        for (const controlShape of shapes) {
          if (controlShape.showEdges && (controlShape as ImageShape).edgeUrl) {
            // Generate unique IDs for this ControlNet set
            const loaderNodeId = `controlnet_loader_${Math.random().toString(36).substring(2)}`;
            const imageNodeId = `edge_image_loader_${Math.random().toString(36).substring(2)}`;
            const controlNetNodeId = `controlnet_apply_${Math.random().toString(36).substring(2)}`;
            
            // Add ControlNet Loader for edges
            currentWorkflow[loaderNodeId] = {
              inputs: {
                control_net_name: "controlnet-canny-sdxl-1.0_V2.safetensors",
              },
              class_type: "ControlNetLoader",
            };
            
            // Add Image Loader for the edge image
            currentWorkflow[imageNodeId] = {
              inputs: {
                image: (controlShape as ImageShape).edgeUrl,
                upload: "image",
              },
              class_type: "LoadImage",
            };
            
            // Add ControlNet Apply Advanced node
            currentWorkflow[controlNetNodeId] = {
              inputs: {
                positive: [lastControlNetNodeId || "6", 0],
                negative: ["7", 0],
                control_net: [loaderNodeId, 0],
                image: [imageNodeId, 0],
                strength: controlShape.edgesStrength || 0.5,
                start_percent: 0,
                end_percent: 1,
              },
              class_type: "ControlNetApplyAdvanced",
            };
            
            // Update last controlnet node ID
            lastControlNetNodeId = controlNetNodeId;
          }

          if (controlShape.showDepth && (controlShape as ImageShape).depthUrl) {
            // Generate unique IDs for this ControlNet set
            const loaderNodeId = `controlnet_loader_${Math.random().toString(36).substring(2)}`;
            const imageNodeId = `depth_image_loader_${Math.random().toString(36).substring(2)}`;
            const controlNetNodeId = `controlnet_apply_${Math.random().toString(36).substring(2)}`;
            
            // Add ControlNet Loader for depth
            currentWorkflow[loaderNodeId] = {
              inputs: {
                control_net_name: "controlnet-depth-sdxl-1.0.safetensors",
              },
              class_type: "ControlNetLoader",
            };
            
            // Add Image Loader for the depth image
            currentWorkflow[imageNodeId] = {
              inputs: {
                image: (controlShape as ImageShape).depthUrl,
                upload: "image",
              },
              class_type: "LoadImage",
            };
            
            // Add ControlNet Apply Advanced node
            currentWorkflow[controlNetNodeId] = {
              inputs: {
                positive: [lastControlNetNodeId || "6", 0],
                negative: ["7", 0],
                control_net: [loaderNodeId, 0],
                image: [imageNodeId, 0],
                strength: controlShape.depthStrength || 0.5,
                start_percent: 0,
                end_percent: 1,
              },
              class_type: "ControlNetApplyAdvanced",
            };
            
            // Update last controlnet node ID
            lastControlNetNodeId = controlNetNodeId;
          }

          if (controlShape.showPose && (controlShape as ImageShape).poseUrl) {
            // Generate unique IDs for this ControlNet set
            const loaderNodeId = `controlnet_loader_${Math.random().toString(36).substring(2)}`;
            const imageNodeId = `pose_image_loader_${Math.random().toString(36).substring(2)}`;
            const controlNetNodeId = `controlnet_apply_${Math.random().toString(36).substring(2)}`;
            
            // Add ControlNet Loader for pose
            currentWorkflow[loaderNodeId] = {
              inputs: {
                control_net_name: "thibaud_xl_openpose.safetensors",
              },
              class_type: "ControlNetLoader",
            };
            
            // Add Image Loader for the pose image
            currentWorkflow[imageNodeId] = {
              inputs: {
                image: (controlShape as ImageShape).poseUrl,
                upload: "image",
              },
              class_type: "LoadImage",
            };
            
            // Add ControlNet Apply Advanced node
            currentWorkflow[controlNetNodeId] = {
              inputs: {
                positive: [lastControlNetNodeId || "6", 0],
                negative: ["7", 0],
                control_net: [loaderNodeId, 0],
                image: [imageNodeId, 0],
                strength: controlShape.poseStrength || 0.5,
                start_percent: 0,
                end_percent: 1,
              },
              class_type: "ControlNetApplyAdvanced",
            };
            
            // Update last controlnet node ID
            lastControlNetNodeId = controlNetNodeId;
          }
        }

        // Connect the last controlnet node to the KSampler
        if (lastControlNetNodeId) {
          currentWorkflow["3"].inputs.positive = [lastControlNetNodeId, 0];
        }
      }

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
          prediction_id: prediction_id
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

      // Create database record using the new function
      await createDatabaseRecord(
        user.id,
        promptText,
        state.aspectRatio,
        replicatePredictionId
      );

      // Set up subscription using the new function
      const newSubscription = setupGenerationSubscription(replicatePredictionId, (payload) => {
        if (payload.status === "completed" && payload.generated_01) {
          get().updateShape(payload.prediction_id, {
            isUploading: false,
            imageUrl: payload.generated_01,
          });
          get().removeGeneratingPrediction(payload.prediction_id);
        } else if (payload.status === "error" || payload.status === "failed") {
          get().updateShape(payload.prediction_id, {
            isUploading: false,
            color: "#ffcccb"
          });
          get().removeGeneratingPrediction(payload.prediction_id);
          get().setError(payload.error_message || "Generation failed");
        }
      });

      set({ subscription: newSubscription });

    } catch (error) {
      console.error("Error generating image:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to generate image",
        isGenerating: false,
      });
    } finally {
      if (get().generatingPredictions.size === 0) {
        set({ isGenerating: false });
      }
    }
  },
  cancelGeneration: async (predictionId: string) => {
    try {
      const response = await fetch("/.netlify/functions/cancel-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prediction_id: predictionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel generation");
      }

      get().deleteShape(predictionId);
      get().removeGeneratingPrediction(predictionId);

      if (get().generatingPredictions.size === 0) {
        set({ isGenerating: false });
      }
    } catch (error) {
      console.error("Error canceling generation:", error);
      get().setError(error instanceof Error ? error.message : "Failed to cancel generation");
    }
  },
});
