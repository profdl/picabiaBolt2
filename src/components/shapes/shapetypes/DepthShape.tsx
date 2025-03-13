import { useStore } from "../../../store";
import { Shape } from "../../../types";
import { Loader2 } from "lucide-react";
import { useThemeClass } from "../../../styles/useThemeClass";

interface DepthShapeProps {
  shape: Shape;
}

export const DepthShape: React.FC<DepthShapeProps> = ({ shape }) => {
  const styles = {
    container: useThemeClass(["shape", "depth", "container"]),
    image: useThemeClass(["shape", "depth", "image"]),
  };

  const depthProcessing = useStore((state) => state.preprocessingStates[shape.id]?.depth);

  return (
    <div className={styles.container}>
      {depthProcessing ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Generating depth map...</span>
          </div>
        </div>
      ) : (
        shape.depthMapUrl && (
          <img
            src={shape.depthMapUrl}
            alt="Depth map"
            className={styles.image}
            style={{
              opacity: 0.5 + (shape.depthStrength || 0.5) * 0.5,
            }}
            draggable={false}
          />
        )
      )}
    </div>
  );
}; 