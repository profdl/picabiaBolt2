import { useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Shape } from "../../types";
import { useStore } from "../../store";
import { supabase } from "../../lib/supabase";
import { ImageEditor } from "./ImageEditor";

interface ImageShapeProps {
  shape: Shape;
}
interface PreprocessedImagePayload {
  new: {
    status: string;
    processType: string;
    shapeId: string;
    [key: string]: string | number | boolean | null;
  };
}

export const ImageShape: React.FC<ImageShapeProps> = ({ shape }) => {
  const updateShape = useStore((state) => state.updateShape);
  const preprocessingStates = useStore((state) => state.preprocessingStates);
  const subscriptionRef = useRef<{
    [key: string]: ReturnType<typeof supabase.channel>;
  }>({});

  // Fetch current state on mount and visibility change
  const fetchCurrentState = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("preprocessed_images")
        .select("*")
        .eq("shapeId", shape.id)
        .in("status", ["processing", "completed"]);

      if (error) throw error;

      if (data) {
        data.forEach((record) => {
          if (record.status === "completed" && record.processType) {
            const urlKey = `${record.processType}Url`;
            const previewUrlKey = `${record.processType}PreviewUrl`;

            updateShape(shape.id, {
              [previewUrlKey]: record[urlKey],
            });

            useStore.setState((state) => ({
              preprocessingStates: {
                ...state.preprocessingStates,
                [shape.id]: {
                  ...state.preprocessingStates[shape.id],
                  [record.processType]: false,
                },
              },
            }));
          }
        });
      }
    } catch (error) {
      console.error("Error fetching current state:", error);
    }
  }, [shape.id, updateShape]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchCurrentState();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchCurrentState, shape.id]);

  // Set up subscriptions for each process type
  useEffect(() => {
    const processTypes = ["depth", "edge", "pose", "scribble", "remix"];

    processTypes.forEach((processType) => {
      if (
        shape[
          `show${
            processType.charAt(0).toUpperCase() + processType.slice(1)
          }` as keyof Shape
        ]
      ) {
        const channelName = `preprocessing_${shape.id}_${processType}`;

        if (!subscriptionRef.current[channelName]) {
          const subscription = supabase
            .channel(channelName)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "preprocessed_images",
                filter: `shapeId=eq.${shape.id}`,
              },
              (payload: PreprocessedImagePayload) => {
                if (
                  payload.new.status === "completed" &&
                  payload.new.processType === processType
                ) {
                  const urlKey = `${processType}Url`;
                  const previewUrlKey = `${processType}PreviewUrl`;

                  updateShape(shape.id, {
                    [previewUrlKey]: payload.new[urlKey],
                  });

                  useStore.setState((state) => ({
                    preprocessingStates: {
                      ...state.preprocessingStates,
                      [shape.id]: {
                        ...state.preprocessingStates[shape.id],
                        [processType]: false,
                      },
                    },
                  }));
                }
              }
            )
            .subscribe();

          subscriptionRef.current[channelName] = subscription;
        }
      } else if (
        subscriptionRef.current[`preprocessing_${shape.id}_${processType}`]
      ) {
        subscriptionRef.current[
          `preprocessing_${shape.id}_${processType}`
        ].unsubscribe();
        delete subscriptionRef.current[
          `preprocessing_${shape.id}_${processType}`
        ];
      }
    });

    // Fetch current state on mount
    fetchCurrentState();

    // Cleanup subscriptions
    return () => {
      Object.values(subscriptionRef.current).forEach((subscription) => {
        subscription.unsubscribe();
      });
      subscriptionRef.current = {};
    };
  }, [
    shape.id,
    shape.showDepth,
    shape.showEdges,
    shape.showPose,
    shape.showScribble,
    shape.showRemix,
    fetchCurrentState,
    shape,
    updateShape,
  ]);

  return (
    <div className="relative w-full h-full">
      {shape.isImageEditing ? (
        <ImageEditor shape={shape} updateShape={updateShape} />
      ) : (
        <>
          <img
            src={shape.imageUrl}
            alt="Original image"
            className="absolute w-full h-full object-cover"
            draggable={false}
          />
          {/* Rest of your existing layers */}
        </>
      )}
      {/* Base image */}
      <img
        src={shape.imageUrl}
        alt="Original image"
        className="absolute w-full h-full object-cover"
        draggable={false}
      />

      {/* Depth layer */}
      {shape.showDepth &&
        (preprocessingStates[shape.id]?.depth ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
      {shape.isProcessingSubject && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}
    </div>
  );
};
