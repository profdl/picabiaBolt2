export const DEFAULT_CONTROL_STRENGTHS = {
  depthStrength: 0.25,
  edgesStrength: 0.25,
  contentStrength: 0.25,
  poseStrength: 0.5,
  scribbleStrength: 0.75,
  remixStrength: 0.4,
} as const;

export const DEFAULT_CONTROL_STATES = {
  showDepth: false,
  showEdges: false,
  showPose: false,
  showScribble: false,
  showRemix: false,
  showPrompt: false,
  showNegativePrompt: false,
} as const;
