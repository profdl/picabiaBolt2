import { useStore } from "../../../store";
import { Shape } from "../../../types";
import { Loader2 } from "lucide-react";

type ProcessedShapeType = "depth" | "edge" | "pose";

interface ProcessedShapeProps {
  shape: Shape;
  type: ProcessedShapeType;
}

const SHAPE_CONFIG = {
  depth: {
    urlKey: "depthMapUrl",
    strengthKey: "depthStrength",
    loadingText: "Generating depth map...",
    altText: "Depth map",
  },
  edge: {
    urlKey: "edgeMapUrl",
    strengthKey: "edgesStrength",
    loadingText: "Detecting edges...",
    altText: "Edge map",
  },
  pose: {
    urlKey: "poseMapUrl",
    strengthKey: "poseStrength",
    loadingText: "Detecting poses...",
    altText: "Pose map",
  },
} as const;

export const ProcessedShape: React.FC<ProcessedShapeProps> = ({ shape, type }) => {
  const config = SHAPE_CONFIG[type];
  const isProcessing = useStore((state) => state.preprocessingStates[shape.id]?.[type]);
  const mapUrl = shape[config.urlKey as keyof Shape] as string | undefined;
  const strength = shape[config.strengthKey as keyof Shape] as number | undefined;

  return (
    <div className="relative w-full h-full bg-transparent">
      {isProcessing ? (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm text-neutral-300">{config.loadingText}</span>
          </div>
        </div>
      ) : (
        mapUrl && (
          <img
            src={mapUrl}
            alt={config.altText}
            className="absolute w-full h-full object-cover"
            style={{
              opacity: 0.5 + (strength || 0.5) * 0.5,
              mixBlendMode: type === 'depth' ? 'multiply' : 'normal',
              filter: type === 'depth' ? 'contrast(1.5)' : 'none',
            }}
            draggable={false}
          />
        )
      )}
    </div>
  );
}; 