import { useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useStore } from "../../../store";
import { Shape } from "../../../types";
import { supabase } from "../../../lib/supabase";
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
            const previewUrlKey = `${record.processType}Url`;

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
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        try {
          // Fetch all preprocessed images for this shape
          const { data, error } = await supabase
            .from("preprocessed_images")
            .select("*")
            .eq("shapeId", shape.id)
            .order('created_at', { ascending: false });
  
          if (error) throw error;
  
          if (data) {
            // Process each record and update the UI accordingly
            data.forEach((record) => {
              if (record.status === "completed" && record.processType) {
                const urlKey = `${record.processType}Url`;
                const previewUrlKey = `${record.processType}Url`;
  
                // Update shape with the processed image URL
                updateShape(shape.id, {
                  [previewUrlKey]: record[urlKey],
                });
  
                // Clear the processing state
                useStore.setState((state) => ({
                  preprocessingStates: {
                    ...state.preprocessingStates,
                    [shape.id]: {
                      ...state.preprocessingStates[shape.id],
                      [record.processType]: false,
                    },
                  },
                }));
              } else if (record.status === "failed") {
                // Handle failed processing
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
          console.error("Error fetching preprocessed images:", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
  
    // Immediately check current state on mount
    handleVisibilityChange();


    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [shape.id, updateShape]);

  // Set up subscriptions for each process type
  useEffect(() => {
    const processTypes = ["depth", "edge", "pose", "sketch", "remix"];

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
                  const previewUrlKey = `${processType}Url`;

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
  }, [shape, updateShape]);

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

      {shape.showSketch && shape.sketchPreviewUrl && (
        <img
          src={shape.sketchPreviewUrl}
          alt="Sketch"
          className="absolute w-full h-full object-cover"
          style={{ opacity: shape.sketchStrength || 0.5 }}
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
