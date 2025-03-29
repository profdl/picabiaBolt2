import { StateCreator } from "zustand";
import { createClient } from "@supabase/supabase-js";
import multiControlWorkflow from "../../lib/generateWorkflow.json";
import { Shape, Position } from "../../types";
import { RealtimeChannel } from "@supabase/supabase-js";
import { findOpenSpace } from "../../utils/spaceUtils";

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

const calculateAverageAspectRatio = (shapes: Shape[]) => {
  // Find all enabled control shapes
  const enabledShapes = shapes.filter(shape => {
    const isControlShape = shape.type === 'image' || shape.type === 'depth' || shape.type === 'edges' || shape.type === 'pose';
    const isEnabled = (shape.type === 'image' && shape.showImagePrompt) ||
                     (shape.type === 'depth' && shape.showDepth) ||
                     (shape.type === 'edges' && shape.showEdges) ||
                     (shape.type === 'pose' && shape.showPose);
    return isControlShape && isEnabled;
  });

  if (enabledShapes.length === 0) return null;

  // Calculate dimensions based on the source image for processed shapes
  const processedShapes = enabledShapes.filter(shape => 
    (shape.type === 'depth' || shape.type === 'edges' || shape.type === 'pose') && 
    shape.sourceImageId
  );

  // If we have processed shapes, use their source image dimensions
  if (processedShapes.length > 0) {
    const sourceShape = shapes.find(s => s.id === processedShapes[0].sourceImageId);
    if (sourceShape) {
      const dimensions = calculateImageShapeDimensions(sourceShape.width, sourceShape.height);
      return dimensions;
    }
  }

  // Fallback to average of all enabled shapes
  const totalWidth = enabledShapes.reduce((sum, shape) => sum + shape.width, 0);
  const totalHeight = enabledShapes.reduce((sum, shape) => sum + shape.height, 0);
  const avgWidth = totalWidth / enabledShapes.length;
  const avgHeight = totalHeight / enabledShapes.length;

  // Round to nearest power of 2 and ensure SDXL compatibility
  const roundToPowerOf2 = (num: number) => {
    return Math.pow(2, Math.round(Math.log2(num)));
  };

  let roundedWidth = roundToPowerOf2(avgWidth);
  let roundedHeight = roundToPowerOf2(avgHeight);

  // Ensure dimensions are compatible with SDXL (multiples of 8)
  roundedWidth = Math.round(roundedWidth / 8) * 8;
  roundedHeight = Math.round(roundedHeight / 8) * 8;

  // Ensure minimum dimensions for SDXL
  roundedWidth = Math.max(roundedWidth, 512);
  roundedHeight = Math.max(roundedHeight, 512);

  // Ensure maximum dimensions for SDXL
  roundedWidth = Math.min(roundedWidth, 2048);
  roundedHeight = Math.min(roundedHeight, 2048);

  return { width: roundedWidth, height: roundedHeight };
};

// Add this function before the generationHandlerSlice
async function hasBlackPixelsInMask(maskCanvas: HTMLCanvasElement): Promise<boolean> {
  const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const data = imageData.data;

  // Check every pixel's red channel (since we're using red for the mask)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 128) { // If red channel is less than 128 (dark), consider it black
      return true;
    }
  }
  return false;
}

// Add this utility function before the generationHandlerSlice
const calculateImageShapeDimensions = (width: number, height: number): { width: number; height: number } => {
  const MAX_DIMENSION = 512;
  const aspectRatio = width / height;
  
  let scaledWidth: number;
  let scaledHeight: number;
  
  if (aspectRatio > 1) {
    // Width is larger than height
    scaledWidth = MAX_DIMENSION;
    scaledHeight = Math.round(MAX_DIMENSION / aspectRatio);
  } else {
    // Height is larger than or equal to width
    scaledHeight = MAX_DIMENSION;
    scaledWidth = Math.round(MAX_DIMENSION * aspectRatio);
  }
  
  return { width: scaledWidth, height: scaledHeight };
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
    const { shapes, updateShape, zoom, offset, setOffset } = state;

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
      const dimensions = calculateImageShapeDimensions(variationShape.width, variationShape.height);
      activeSettings.outputWidth = dimensions.width;
      activeSettings.outputHeight = dimensions.height;

      // Get the preview canvas and mask canvas for the variation shape
      const previewCanvas = document.querySelector(`canvas[data-shape-id="${variationShape.id}"][data-layer="preview"]`) as HTMLCanvasElement;
      const maskCanvas = document.querySelector(`canvas[data-shape-id="${variationShape.id}"][data-layer="mask"]`) as HTMLCanvasElement;
      const backgroundCanvas = document.querySelector(`canvas[data-shape-id="${variationShape.id}"][data-layer="background"]`) as HTMLCanvasElement;
      const permanentStrokesCanvas = document.querySelector(`canvas[data-shape-id="${variationShape.id}"][data-layer="permanent"]`) as HTMLCanvasElement;
      
      if (!previewCanvas || !maskCanvas || !backgroundCanvas) {
        console.error('Required canvases not found for variation shape');
        return;
      }

      // Check if there are any black pixels in the mask
      const hasBlackPixels = await hasBlackPixelsInMask(maskCanvas);

      // If there are black pixels, update settings for inpainting model
      if (hasBlackPixels) {
        activeSettings.model = "juggernautXLInpainting_xiInpainting.safetensors";
        activeSettings.scheduler = "dpmpp_2m_sde";
        activeSettings.steps = 30;
        activeSettings.guidanceScale = 4.0;
        // Keep the variation strength as is, since it's already being used as denoise
      }

      // Create a temporary canvas to combine background and permanent strokes without mask
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = previewCanvas.width;
      tempCanvas.height = previewCanvas.height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) {
        console.error('Failed to create temporary canvas context');
        return;
      }

      // Draw background first
      tempCtx.drawImage(backgroundCanvas, 0, 0);
      
      // Draw permanent strokes on top
      if (permanentStrokesCanvas) {
        tempCtx.drawImage(permanentStrokesCanvas, 0, 0);
      }

      // Ensure the mask is binary before creating the blob
      const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
      if (maskCtx) {
        const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;
        
        // Process each pixel to ensure it's either fully opaque white or fully transparent
        for (let i = 0; i < data.length; i += 4) {
          // Check alpha channel (index i+3)
          const alpha = data[i+3] / 255; // Normalize to 0-1 range
          
          // Apply threshold - if over threshold, make fully opaque white, otherwise fully transparent
          if (alpha > 0.5) {
            // Fully opaque white
            data[i] = 255;     // R
            data[i+1] = 255;   // G
            data[i+2] = 255;   // B
            data[i+3] = 255;   // A
          } else {
            // Fully transparent
            data[i+3] = 0;     // A
          }
        }
        
        // Put the modified pixel data back on the canvas
        maskCtx.putImageData(imageData, 0, 0);
      }

      // Create blobs from both canvases
      const [sourceBlob, maskBlob] = await Promise.all([
        new Promise<Blob>((resolve, reject) => {
          tempCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob from source canvas'));
          }, 'image/png', 1.0);
        }),
        new Promise<Blob>((resolve, reject) => {
          maskCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob from mask canvas'));
          }, 'image/png', 1.0);
        })
      ]);

      // Upload both images to Supabase
      const [sourceFileName, maskFileName] = [
        `variation_source_${Math.random().toString(36).substring(2)}.png`,
        `variation_mask_${Math.random().toString(36).substring(2)}.png`
      ];

      const [sourceArrayBuffer, maskArrayBuffer] = await Promise.all([
        sourceBlob.arrayBuffer(),
        maskBlob.arrayBuffer()
      ]);

      const [sourceFileData, maskFileData] = [
        new Uint8Array(sourceArrayBuffer),
        new Uint8Array(maskArrayBuffer)
      ];

      const [{ error: sourceUploadError }, { error: maskUploadError }] = await Promise.all([
        supabase.storage.from("assets").upload(sourceFileName, sourceFileData, {
          contentType: 'image/png',
          upsert: false,
        }),
        supabase.storage.from("assets").upload(maskFileName, maskFileData, {
          contentType: 'image/png',
          upsert: false,
        })
      ]);

      if (sourceUploadError || maskUploadError) {
        throw new Error('Failed to upload variation images');
      }

      const [{ data: { publicUrl: sourceUrl } }, { data: { publicUrl: maskUrl } }] = await Promise.all([
        supabase.storage.from("assets").getPublicUrl(sourceFileName),
        supabase.storage.from("assets").getPublicUrl(maskFileName)
      ]);

      if (hasBlackPixels) {
        // Set up in-painting workflow nodes
        workflow["36"] = {
          inputs: {
            image: sourceUrl,
            upload: "image",
          },
          class_type: "LoadImage",
        };

        workflow["37"] = {
          inputs: {
            image: maskUrl,
            upload: "image",
          },
          class_type: "LoadImage",
        };

        // Add ImageToMask node to convert the mask image to the correct type
        workflow["39"] = {
          inputs: {
            image: ["37", 0],
            method: "red",
            channel: "red"
          },
          class_type: "ImageToMask",
        };

        // Add InvertMask node
        workflow["41"] = {
          inputs: {
            mask: ["39", 0]
          },
          class_type: "InvertMask",
        };

        workflow["38"] = {
          inputs: {
            pixels: ["36", 0],
            vae: ["4", 2]
          },
          class_type: "VAEEncode",
        };

        // Add SetLatentNoiseMask node to combine the encoded image with the inverted mask
        workflow["40"] = {
          inputs: {
            samples: ["38", 0],
            mask: ["41", 0]  // Use the inverted mask
          },
          class_type: "SetLatentNoiseMask",
        };

        // Update the KSampler to use the masked latent image
        workflow["3"].inputs.latent_image = ["40", 0];
        workflow["3"].inputs.denoise = variationShape.variationStrength || 0.8; // Default to 0.8 for inpainting
      } else {
        // Set up image-to-image workflow nodes
        workflow["36"] = {
          inputs: {
            image: sourceUrl,
            upload: "image",
          },
          class_type: "LoadImage",
        };

        workflow["38"] = {
          inputs: {
            pixels: ["36", 0],
            vae: ["4", 2]
          },
          class_type: "VAEEncode",
        };

        // Update the KSampler to use the encoded image directly
        workflow["3"].inputs.latent_image = ["38", 0];
        workflow["3"].inputs.denoise = variationShape.variationStrength || 0.75;
      }
    } else if (imageReferenceShape) {
      // Use dimensions from the image reference
      const dimensions = calculateImageShapeDimensions(imageReferenceShape.width, imageReferenceShape.height);
      activeSettings.outputWidth = dimensions.width;
      activeSettings.outputHeight = dimensions.height;
    } else {
      // Calculate dimensions from control shapes
      const dimensions = calculateAverageAspectRatio(shapes);
      if (dimensions) {
        activeSettings.outputWidth = dimensions.width;
        activeSettings.outputHeight = dimensions.height;
      } else {
        // Default to 512x512 if no control shapes are enabled
        activeSettings.outputWidth = 512;
        activeSettings.outputHeight = 512;
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

    // Calculate view center
    const viewCenter = {
      x: (-offset.x + window.innerWidth / 2) / zoom,
      y: (-offset.y + window.innerHeight / 2) / zoom,
    };

    // Calculate dimensions for placeholder shape
    const dimensions = calculateImageShapeDimensions(
      activeSettings.outputWidth || 512,
      activeSettings.outputHeight || 512
    );

    // Find open space for the shape
    const position = findOpenSpace(shapes, dimensions.width, dimensions.height, viewCenter);

    // Generate a unique prediction ID early
    const prediction_id = crypto.randomUUID();

    // Create placeholder shape immediately
    const placeholderShape: Shape = {
      id: prediction_id,
      type: "image",
      position,
      width: dimensions.width,
      height: dimensions.height,
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

    // Calculate the target offset to center the shape
    const targetOffset = {
      x: -(position.x + dimensions.width/2) * zoom + window.innerWidth / 2,
      y: -(position.y + dimensions.height/2) * zoom + window.innerHeight / 2 - (dimensions.height * zoom * 0.2), // Subtract 20% of shape height for upward bias
    };

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
        // Get the mask canvas to check for black pixels
        const maskCanvas = document.querySelector(`canvas[data-shape-id="${variationShape.id}"][data-layer="mask"]`) as HTMLCanvasElement;
        const hasBlackPixels = maskCanvas ? await hasBlackPixelsInMask(maskCanvas) : false;

        if (hasBlackPixels) {
          // Add in-painting workflow nodes
          baseWorkflow["36"] = {
            inputs: {
              image: variationShape.imageUrl || "",
              upload: "image",
            },
            class_type: "LoadImage",
          };

          baseWorkflow["37"] = {
            inputs: {
              image: variationShape.imageUrl || "",
              upload: "image",
            },
            class_type: "LoadImage",
          };

          // Add ImageToMask node to convert the mask image to the correct type
          baseWorkflow["39"] = {
            inputs: {
              image: ["37", 0],
              method: "red",
              channel: "red"
            },
            class_type: "ImageToMask",
          };

          // Add InvertMask node
          baseWorkflow["41"] = {
            inputs: {
              mask: ["39", 0]
            },
            class_type: "InvertMask",
          };

          // Add VAEEncode node for the source image
          baseWorkflow["38"] = {
            inputs: {
              pixels: ["36", 0],
              vae: ["4", 2]
            },
            class_type: "VAEEncode",
          };

          // Add SetLatentNoiseMask node to combine the encoded image with the inverted mask
          baseWorkflow["40"] = {
            inputs: {
              samples: ["38", 0],
              mask: ["41", 0]  // Use the inverted mask
            },
            class_type: "SetLatentNoiseMask",
          };

          // Remove EmptyLatentImage node since we're using VAEEncode
          delete baseWorkflow["34"];
          
          // Update KSampler to use the masked latent image
          baseWorkflow["3"].inputs.latent_image = ["40", 0];
          baseWorkflow["3"].inputs.denoise = variationShape.variationStrength || 0.8;
        } else {
          // For regular image-to-image workflow
          baseWorkflow["36"] = {
            inputs: {
              image: variationShape.imageUrl || "",
              upload: "image",
            },
            class_type: "LoadImage",
          };

          // Add VAEEncode node for the source image
          baseWorkflow["38"] = {
            inputs: {
              pixels: ["36", 0],
              vae: ["4", 2]
            },
            class_type: "VAEEncode",
          };

          // Remove EmptyLatentImage node since we're using VAEEncode
          delete baseWorkflow["34"];
          
          // Update KSampler to use the encoded image directly
          baseWorkflow["3"].inputs.latent_image = ["38", 0];
          baseWorkflow["3"].inputs.denoise = variationShape.variationStrength || 0.75;
        }
      } else {
        // Use EmptyLatentImage as before
        baseWorkflow["34"] = workflow["34"];
        baseWorkflow["3"].inputs.latent_image = ["34", 0];
        baseWorkflow["3"].inputs.denoise = 1;
      }

      const currentWorkflow: Workflow = { ...baseWorkflow };
      let currentPositiveNode = "6";

      // Only add ControlNet nodes if depth, edges, or pose controls are enabled
      const hasControlNetControls = shapes.some(shape => 
        (shape.showDepth || shape.showEdges || shape.showPose) && 
        (shape.depthUrl || shape.edgeUrl || shape.poseUrl)
      );

      if (hasControlNetControls) {
        for (const controlShape of shapes) {
          if (controlShape.showEdges && controlShape.edgeUrl) {
            currentWorkflow["12"] = {
              ...workflow["12"],
              inputs: {
                ...workflow["12"].inputs,
                image: controlShape.edgeUrl,
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

          if (controlShape.showDepth && controlShape.depthUrl) {
            currentWorkflow["33"] = {
              ...workflow["33"],
              inputs: {
                ...workflow["33"].inputs,
                image: controlShape.depthUrl,
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

          if (controlShape.showPose && controlShape.poseUrl) {
            // Add pose image loader
            currentWorkflow["37"] = {
              inputs: {
                image: controlShape.poseUrl,
                upload: "image",
              },
              class_type: "LoadImage",
            };
            
            // Add pose control net loader
            currentWorkflow["38"] = {
              inputs: {
                control_net_name: "thibaud_xl_openpose.safetensors",
              },
              class_type: "ControlNetLoader",
            };
            
            // Add pose control application node
            currentWorkflow["42"] = {
              inputs: {
                positive: [currentPositiveNode, 0],
                negative: ["7", 0],
                control_net: ["38", 0],  // Connect to ControlNetLoader instead of LoadImage
                image: ["37", 0],
                strength: controlShape.poseStrength || 0.5,
                start_percent: 0,
                end_percent: 1,
              },
              class_type: "ControlNetApplyAdvanced",
            };
            currentPositiveNode = "42";
          }
        }
      }

      // Handle image reference if present
      if (imageReferenceShape) {
        // Get the preview canvas for the image reference shape
        const previewCanvas = document.querySelector(`canvas[data-shape-id="${imageReferenceShape.id}"][data-layer="preview"]`) as HTMLCanvasElement;
        if (!previewCanvas) {
          console.error('Preview canvas not found for image reference shape');
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

      // Remove the shape entirely since it's just a placeholder
      get().deleteShape(predictionId);
      
      // Remove from generating predictions
      get().removeGeneratingPrediction(predictionId);

      // If no more generating predictions, update isGenerating state
      if (get().generatingPredictions.size === 0) {
        set({ isGenerating: false });
      }
    } catch (error) {
      console.error("Error canceling generation:", error);
      get().setError(error instanceof Error ? error.message : "Failed to cancel generation");
    }
  },
});
