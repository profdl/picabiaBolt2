import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Shape } from "../../types";
import { useStore } from "../../store";
import { supabase } from "../../lib/supabase";

interface ImageShapeProps {
  shape: Shape;
}

export const ImageShape: React.FC<ImageShapeProps> = ({ shape }) => {
  const updateShape = useStore((state) => state.updateShape);

  // Subscription effect
  useEffect(() => {
    const channel = supabase
      .channel("preprocessed_images_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "preprocessed_images",
        },
        (payload) => {
          if (payload.new.shapeId === shape.id) {
            const processType = payload.new.processType;
            useStore.setState((state) => ({
              ...state,
              preprocessingStates: {
                ...state.preprocessingStates,
                [shape.id]: {
                  ...state.preprocessingStates[shape.id],
                  [processType]: false,
                },
              },
            }));

            updateShape(shape.id, {
              [`${processType}PreviewUrl`]: payload.new[`${processType}Url`],
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [shape.id, updateShape]);

  // Visibility change effect
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        supabase
          .from("preprocessed_images")
          .select("*")
          .eq("shapeId", shape.id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error("Error fetching preprocessed image:", error);
              return;
            }
            if (data) {
              const previewUrlKey = `${data.processType}PreviewUrl`;
              updateShape(shape.id, {
                [previewUrlKey]: data[`${data.processType}Url`],
                [`is${data.processType}Processing`]: false,
              });
            }
          });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [shape.id, updateShape]);
  return (
    <div className="relative w-full h-full">
      {/* Base image */}
      <img
        src={shape.imageUrl}
        alt="Original image"
        className="absolute w-full h-full object-cover"
        draggable={false}
      />

      {/* Depth layer */}
      {shape.showDepth &&
        (useStore.getState().preprocessingStates[shape.id]?.depth ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          shape.depthPreviewUrl && (
            <img
              src={shape.depthPreviewUrl}
              alt="Depth map"
              className="absolute w-full h-full object-cover"
              style={{ opacity: shape.depthStrength || 0.5 }}
              draggable={false}
            />
          )
        ))}

      {/* Edges layer */}
      {shape.showEdges &&
        (useStore.getState().preprocessingStates[shape.id]?.edge ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          shape.edgePreviewUrl && (
            <img
              src={shape.edgePreviewUrl}
              alt="Edge detection"
              className="absolute w-full h-full object-cover"
              style={{ opacity: shape.edgesStrength || 0.5 }}
              draggable={false}
            />
          )
        ))}

      {/* Pose layer */}
      {shape.showPose &&
        (useStore.getState().preprocessingStates[shape.id]?.pose ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          shape.posePreviewUrl && (
            <img
              src={shape.posePreviewUrl}
              alt="Pose detection"
              className="absolute w-full h-full object-cover"
              style={{ opacity: shape.poseStrength || 0.5 }}
              draggable={false}
            />
          )
        ))}

      {shape.showScribble && shape.scribblePreviewUrl && (
        <img
          src={shape.scribblePreviewUrl}
          alt="Scribble"
          className="absolute w-full h-full object-cover"
          style={{ opacity: shape.scribbleStrength || 0.5 }}
          draggable={false}
        />
      )}

      {shape.showRemix && shape.remixPreviewUrl && (
        <img
          src={shape.remixPreviewUrl}
          alt="Remix"
          className="absolute w-full h-full object-cover"
          style={{ opacity: shape.remixStrength || 0.5 }}
          draggable={false}
        />
      )}
    </div>
  );
};
