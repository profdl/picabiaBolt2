export type ControlType = "Depth" | "Edges" | "Pose" | "Scribble" | "Remix";

export const getControlDescription = (type: ControlType) => {
  const descriptions = {
    Depth:
      "Detects the depth of objects in the image. Use this depth map to control the spatial relationships when generating a new image.",
    Edges:
      "Detects the edges of elements in the image. Use this to control the composition of your generated images.",
    Pose: "Detects human poses in the image. You can generate new images with the same pose.",
    Scribble:
      "Only use this for imported drawings. Your drawings will control the composition and subject matter of the generated image.",
    Remix:
      "Allows you to use the image as inspiration for the AI when generating a new image. Try remixing multiple images together.",
  };
  return descriptions[type] || "";
};
