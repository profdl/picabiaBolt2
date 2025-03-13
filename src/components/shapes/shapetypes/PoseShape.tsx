import { useStore } from "../../../store";
import { Shape } from "../../../types";
import { Loader2 } from "lucide-react";
import { useThemeClass } from "../../../styles/useThemeClass";

interface PoseShapeProps {
  shape: Shape;
}

export const PoseShape: React.FC<PoseShapeProps> = ({ shape }) => {
  const styles = {
    container: useThemeClass(["shape", "pose", "container"]),
    image: useThemeClass(["shape", "pose", "image"]),
  };

  const poseProcessing = useStore((state) => state.preprocessingStates[shape.id]?.pose);

  return (
    <div className={styles.container}>
      {poseProcessing ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Generating pose map...</span>
          </div>
        </div>
      ) : (
        shape.poseMapUrl && (
          <img
            src={shape.poseMapUrl}
            alt="Pose map"
            className={styles.image}
            style={{
              opacity: 0.5 + (shape.poseStrength || 0.5) * 0.5,
            }}
            draggable={false}
          />
        )
      )}
    </div>
  );
}; 