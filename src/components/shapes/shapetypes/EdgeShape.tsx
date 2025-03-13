import { useStore } from "../../../store";
import { Shape } from "../../../types";
import { Loader2 } from "lucide-react";
import { useThemeClass } from "../../../styles/useThemeClass";

interface EdgeShapeProps {
  shape: Shape;
}

export const EdgeShape: React.FC<EdgeShapeProps> = ({ shape }) => {
  const styles = {
    container: useThemeClass(["shape", "edge", "container"]),
    image: useThemeClass(["shape", "edge", "image"]),
  };

  const edgeProcessing = useStore((state) => state.preprocessingStates[shape.id]?.edge);

  return (
    <div className={styles.container}>
      {edgeProcessing ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Generating edge map...</span>
          </div>
        </div>
      ) : (
        shape.edgeMapUrl && (
          <img
            src={shape.edgeMapUrl}
            alt="Edge map"
            className={styles.image}
            style={{
              opacity: 0.5 + (shape.edgesStrength || 0.5) * 0.5,
            }}
            draggable={false}
          />
        )
      )}
    </div>
  );
}; 