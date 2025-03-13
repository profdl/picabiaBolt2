export interface Position {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type: "drawing" | "image" | "text" | "sticky" | "3d" | "sketchpad" | "diffusionSettings" | "group";
  position: Position;
  width: number;
  height: number;
  color?: string;
  points?: Position[];
  strokeWidth?: number;
  rotation?: number;
  isUploading?: boolean;
  model?: string;
  useSettings?: boolean;
  depthStrength?: number;
  edgesStrength?: number;
  contentStrength?: number;
  poseStrength?: number;
  sketchStrength?: number;
  remixStrength?: number;
  isEditing?: boolean;
  content?: string;
  imageUrl?: string;
  isOrbiting?: boolean;
  camera?: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    fov: number;
  };
  isNew?: boolean;
  isTextPrompt?: boolean;
  isNegativePrompt?: boolean;
  groupId?: string;
  onClear?: () => void;
} 