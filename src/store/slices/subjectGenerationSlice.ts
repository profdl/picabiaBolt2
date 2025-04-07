import { StateCreator } from "zustand";
import { Shape, Position, StoreState } from "../../types";
import { ImageShape } from "../../types/shapes";
import getSubjectWorkflow from "../../lib/getSubject_workflow.json";
import { supabase } from "../../lib/supabase";
import { trimTransparentPixels, trimImageToBounds } from "../../utils/imageUtils";
import { setupGenerationSubscription } from "../../lib/database";

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
    let subscription: { unsubscribe: () => void } | null = null;
    
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
        logs: ["Preparing subject extraction..."],
      };

      get().addShape(placeholderShape);
      get().setSelectedShapes([prediction_id]);
      get().addGeneratingPrediction(prediction_id);

      // Use the setupGenerationSubscription function for consistent handling
      subscription = setupGenerationSubscription(prediction_id, async (payload) => {
        console.log('Subject extraction update:', payload);
        
        // Always update logs if available
        if (payload.logs) {
          get().updateShape(payload.prediction_id, {
            logs: payload.logs
          });
        }
        
        if ((payload.status === "completed" || payload.status === "Completed!") && payload.generated_01) {
          try {
            console.log('Processing completed image:', payload.generated_01);
            // Get the trimmed dimensions of the processed image
            const { url: trimmedUrl, bounds } = await trimTransparentPixels(payload.generated_01);
            console.log('Trimmed image URL:', trimmedUrl);
            console.log('Trimmed bounds:', bounds);
            
            // Now trim the original source image to the same dimensions as the processed image
            let trimmedOriginalUrl = trimmedUrl; // Default to the generated image if original URL is missing
            
            if (imageShape.imageUrl) {
              // Use the original image if available
              const result = await trimImageToBounds(imageShape.imageUrl, bounds);
              trimmedOriginalUrl = result.url;
            }
            
            console.log('Trimmed original image URL:', trimmedOriginalUrl);
            
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

            // Create a temporary canvas to generate the mask
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = newWidth;
            tempCanvas.height = newHeight;
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            
            if (tempCtx) {
              // Load the trimmed image
              const img = new Image();
              img.src = trimmedUrl;
              await new Promise((resolve) => {
                img.onload = resolve;
              });
              
              // Draw the image for mask creation
              tempCtx.drawImage(img, 0, 0, newWidth, newHeight);
              
              // Get the image data for creating the mask
              const imageData = tempCtx.getImageData(0, 0, newWidth, newHeight);
              const data = imageData.data;
              
              // Store the original alpha values before creating the mask
              const originalAlpha = new Uint8ClampedArray(data.length / 4);
              for (let i = 0; i < data.length; i += 4) {
                originalAlpha[i / 4] = data[i + 3];
              }
              
              // Create a binary mask (white for non-transparent pixels, transparent for transparent pixels)
              for (let i = 0; i < data.length; i += 4) {
                // If pixel is not transparent (alpha > 0)
                if (data[i + 3] > 0) {
                  // Make it white
                  data[i] = 255;     // R
                  data[i + 1] = 255; // G
                  data[i + 2] = 255; // B
                  data[i + 3] = 255; // A
                } else {
                  // Make it transparent
                  data[i + 3] = 0;   // A
                }
              }
              
              // Put the modified data back
              tempCtx.putImageData(imageData, 0, 0);
              
              // Apply Gaussian blur to smooth edges
              const blurRadius = 4;
              const blurData = new Uint8ClampedArray(data);
              
              for (let y = blurRadius; y < newHeight - blurRadius; y++) {
                for (let x = blurRadius; x < newWidth - blurRadius; x++) {
                  const i = (y * newWidth + x) * 4;
                  
                  // Calculate weighted average of surrounding pixels
                  let sum = 0;
                  let weight = 0;
                  let hasTransparentNeighbor = false;
                  
                  for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                    for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                      const ni = ((y + dy) * newWidth + (x + dx)) * 4;
                      const distance = Math.sqrt(dx * dx + dy * dy);
                      const gaussianWeight = Math.exp(-(distance * distance) / (blurRadius));
                      
                      if (blurData[ni + 3] === 0) {
                        hasTransparentNeighbor = true;
                      }
                      
                      sum += blurData[ni + 3] * gaussianWeight;
                      weight += gaussianWeight;
                    }
                  }
                  
                  // More aggressive edge handling
                  if (hasTransparentNeighbor) {
                    data[i + 3] = Math.round((sum / weight) * 0.8);
                  } else {
                    data[i + 3] = Math.round(sum / weight);
                  }
                }
              }
              
              // Put the blurred data back
              tempCtx.putImageData(imageData, 0, 0);
              
              // Contract the mask - use a more effective erosion technique
              const contractionAmount = 4;
              const originalData = new Uint8ClampedArray(data);
              const newMask = new Uint8ClampedArray(data.length);
              
              // First copy the original data to the new mask
              for (let i = 0; i < data.length; i++) {
                newMask[i] = originalData[i];
              }
              
              // Perform erosion multiple times for stronger effect
              for (let iteration = 0; iteration < contractionAmount; iteration++) {
                // Make a copy of the current mask for this iteration
                const currentMask = new Uint8ClampedArray(newMask);
                
                // Single-pixel erosion
                for (let y = 1; y < newHeight - 1; y++) {
                  for (let x = 1; x < newWidth - 1; x++) {
                    const i = (y * newWidth + x) * 4;
                    
                    // Check if any of the 8 neighboring pixels are transparent
                    let hasTransparentNeighbor = false;
                    
                    // Check the 8 neighboring pixels
                    // Top-left, top, top-right, left, right, bottom-left, bottom, bottom-right
                    const neighbors = [
                      ((y - 1) * newWidth + (x - 1)) * 4 + 3, // top-left
                      ((y - 1) * newWidth + x) * 4 + 3,       // top
                      ((y - 1) * newWidth + (x + 1)) * 4 + 3, // top-right
                      (y * newWidth + (x - 1)) * 4 + 3,       // left
                      (y * newWidth + (x + 1)) * 4 + 3,       // right
                      ((y + 1) * newWidth + (x - 1)) * 4 + 3, // bottom-left
                      ((y + 1) * newWidth + x) * 4 + 3,       // bottom
                      ((y + 1) * newWidth + (x + 1)) * 4 + 3  // bottom-right
                    ];
                    
                    for (const ni of neighbors) {
                      if (currentMask[ni] < 128) { // Any pixel with alpha < 128 is considered transparent
                        hasTransparentNeighbor = true;
                        break;
                      }
                    }
                    
                    // If this pixel has a transparent neighbor, make it transparent in the new mask
                    if (hasTransparentNeighbor) {
                      newMask[i + 3] = 0;
                    }
                  }
                }
              }
              
              // Apply the eroded mask back to the data
              for (let i = 0; i < data.length; i++) {
                data[i] = newMask[i];
              }
              
              // Put the contracted mask data back
              tempCtx.putImageData(imageData, 0, 0);
              
              // Update shape with trimmed original image and mask
              get().updateShape(payload.prediction_id, {
                isUploading: false,
                imageUrl: trimmedOriginalUrl, // Use the trimmed original image
                width: newWidth,
                height: newHeight,
                position: newPosition,
                maskCanvasData: tempCanvas.toDataURL('image/png'), // Apply our processed mask
                logs: payload.logs || ["Subject extraction completed"]
              });
            } else {
              // Fallback to updating without mask if canvas context creation fails
              get().updateShape(payload.prediction_id, {
                isUploading: false,
                imageUrl: trimmedOriginalUrl,
                width: newWidth,
                height: newHeight,
                position: newPosition,
                logs: payload.logs || ["Subject extraction completed"]
              });
            }
            
            console.log('Successfully updated shape with new image and mask');
            get().removeGeneratingPrediction(payload.prediction_id);
          } catch (error) {
            console.error('Error processing completed image:', error);
            get().updateShape(payload.prediction_id, {
              isUploading: false,
              color: "#ffcccb",
              logs: payload.logs || ["Error processing completed image"]
            });
            get().setError('Failed to process completed image');
            get().removeGeneratingPrediction(payload.prediction_id);
          }
        } else if (payload.status === "error" || payload.status === "failed") {
          console.error('Generation failed:', payload.error_message);
          get().updateShape(payload.prediction_id, {
            isUploading: false,
            color: "#ffcccb",
            logs: payload.logs || ["Subject extraction failed"]
          });
          get().removeGeneratingPrediction(payload.prediction_id);
          get().setError(payload.error_message || 'Generation failed');
        }
      });

    } catch (error) {
      console.error("Failed to generate subject:", error);
      // Clean up subscription if it exists
      if (subscription) {
        subscription.unsubscribe();
      }
      set({
        error: error instanceof Error ? error.message : "Failed to generate subject",
      });
    }
  },
});
