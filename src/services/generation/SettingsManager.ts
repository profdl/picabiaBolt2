import { Shape } from "../../types";
import { ShapeProcessor } from "./ShapeProcessor";
import { getShapeCanvases } from "./CanvasUtils";

interface DiffusionSettings {
  steps: number;
  guidanceScale: number;
  scheduler: string;
  seed: number;
  outputWidth: number | null;
  outputHeight: number | null;
  model: string;
  outputFormat: string;
  outputQuality: number;
  randomiseSeeds: boolean;
}

interface WorkflowNode {
  inputs: Record<string, unknown>;
  class_type: string;
}

interface Workflow {
  [key: string]: WorkflowNode;
}

export class SettingsManager {
  private static readonly DEFAULT_SETTINGS: DiffusionSettings = {
    steps: 20,
    guidanceScale: 7.5,
    scheduler: "dpmpp_2m_sde",
    seed: Math.floor(Math.random() * 32767),
    outputWidth: 1344,
    outputHeight: 768,
    model: "juggernautXL_v9",
    outputFormat: "png",
    outputQuality: 100,
    randomiseSeeds: true,
  };

  /**
   * Gets active settings from shapes, with proper dimension handling
   */
  static getActiveSettings(shapes: Shape[]): DiffusionSettings {
    // Find active settings panel
    const activeSettingsPanel = shapes.find(
      (shape) => shape.type === "diffusionSettings" && shape.useSettings
    );

    // Start with default settings
    const settings = { ...this.DEFAULT_SETTINGS };

    // If we have an active settings panel, use its values
    if (activeSettingsPanel) {
      Object.assign(settings, {
        steps: activeSettingsPanel.steps || settings.steps,
        guidanceScale: activeSettingsPanel.guidanceScale || settings.guidanceScale,
        scheduler: activeSettingsPanel.scheduler || settings.scheduler,
        seed: activeSettingsPanel.randomiseSeeds 
          ? Math.floor(Math.random() * 32767) 
          : (activeSettingsPanel.seed || settings.seed),
        model: activeSettingsPanel.model || settings.model,
        outputFormat: activeSettingsPanel.outputFormat || settings.outputFormat,
        outputQuality: activeSettingsPanel.outputQuality || settings.outputQuality,
        randomiseSeeds: activeSettingsPanel.randomiseSeeds ?? settings.randomiseSeeds,
      });

      // If settings panel has dimensions, use them unconditionally
      if (activeSettingsPanel.outputWidth && activeSettingsPanel.outputHeight) {
        settings.outputWidth = activeSettingsPanel.outputWidth;
        settings.outputHeight = activeSettingsPanel.outputHeight;
      }
    }

    // Only calculate dimensions from other sources if no active settings panel
    // or if the active settings panel doesn't specify dimensions
    if (!activeSettingsPanel || (!settings.outputWidth || !settings.outputHeight)) {
      const variationShape = shapes.find(s => s.type === "image" && s.makeVariations);
      const imageReferenceShape = shapes.find(s => s.type === "image" && s.showImagePrompt);

      if (variationShape) {
        const dimensions = ShapeProcessor.calculateImageShapeDimensions(
          variationShape.width,
          variationShape.height
        );
        settings.outputWidth = dimensions.width;
        settings.outputHeight = dimensions.height;
      } else if (imageReferenceShape) {
        const dimensions = ShapeProcessor.calculateImageShapeDimensions(
          imageReferenceShape.width,
          imageReferenceShape.height
        );
        settings.outputWidth = dimensions.width;
        settings.outputHeight = dimensions.height;
      } else {
        const calculatedDimensions = ShapeProcessor.calculateAverageAspectRatio(shapes);
        if (calculatedDimensions) {
          settings.outputWidth = calculatedDimensions.width;
          settings.outputHeight = calculatedDimensions.height;
        } else {
          // Default to 512x512 if no other dimensions are available
          settings.outputWidth = 512;
          settings.outputHeight = 512;
        }
      }
    }

    // Special case: If using inpainting, adjust model and settings
    const hasInpainting = shapes.some(shape => 
      shape.type === "image" && 
      shape.makeVariations && 
      this.hasActiveMask(shape)
    );

    if (hasInpainting) {
      settings.model = "juggernautXLInpainting_xiInpainting.safetensors";
      settings.scheduler = "dpmpp_2m_sde";
      settings.steps = 30;
      settings.guidanceScale = 4.0;
    }

    return settings;
  }

  /**
   * Updates workflow with current settings
   */
  static updateWorkflowWithSettings(workflow: Workflow, settings: DiffusionSettings): void {
    // Check if this is an inpainting workflow by looking for SetLatentNoiseMask node 8
    const isInpaintingWorkflow = workflow["8"] && workflow["8"].class_type === "SetLatentNoiseMask";
    
    // Update the correct KSampler node (3 for regular workflow, 9 for inpainting workflow)
    if (isInpaintingWorkflow) {
      // For inpainting workflow, update node 9 (KSampler)
      workflow["9"].inputs.steps = settings.steps || 30;
      workflow["9"].inputs.cfg = settings.guidanceScale || 4.0;
      workflow["9"].inputs.sampler_name = settings.scheduler || "dpmpp_2m_sde";
      workflow["9"].inputs.seed = settings.randomiseSeeds
        ? Math.floor(Math.random() * 32767)
        : settings.seed || Math.floor(Math.random() * 32767);
    } else {
      // For regular workflow, update node 3 (KSampler)
      workflow["3"].inputs.steps = settings.steps || 20;
      workflow["3"].inputs.cfg = settings.guidanceScale || 7.5;
      workflow["3"].inputs.sampler_name = settings.scheduler || "dpmpp_2m_sde";
      workflow["3"].inputs.seed = settings.randomiseSeeds
        ? Math.floor(Math.random() * 32767)
        : settings.seed || Math.floor(Math.random() * 32767);
    }

    // Update image dimensions if EmptyLatentImage node exists
    if (workflow["34"]) {
      workflow["34"].inputs.width = settings.outputWidth || 1344;
      workflow["34"].inputs.height = settings.outputHeight || 768;
    }
  }

  /**
   * Helper method to check for black pixels in mask
   */
  private static hasBlackPixelsInMask(maskCanvas: HTMLCanvasElement): boolean {
    const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 128) { // If red channel is less than 128 (dark), consider it black
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if a shape has an active mask with black pixels
   */
  private static hasActiveMask(shape: Shape): boolean {
    const canvases = getShapeCanvases(shape.id);
    if (!canvases.mask) return false;
    return this.hasBlackPixelsInMask(canvases.mask);
  }
} 