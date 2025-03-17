export const DEFAULT_CONTROL_STRENGTHS = {
  contentStrength: 0.25,
  sketchStrength: 0.75,
  imagePromptStrength: 0.4,
  depthStrength: 0.5,
  edgesStrength: 0.5,
  poseStrength: 0.5,
  useSettings: true,
} as const;

export const DEFAULT_CONTROL_STATES = {
  showSketch: false,
  showImagePrompt: false,
  showDepth: false,
  showEdges: false,
  showPose: false,
  showPrompt: false,
  showNegativePrompt: false,
  useSettings: true,
} as const;
