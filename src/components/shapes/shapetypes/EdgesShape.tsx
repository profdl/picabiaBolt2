import { useEffect, useRef } from "react";
import { Shape } from "../../../types";
import { ProcessedShape } from "./ProcessedShape";
import { supabase } from "../../../lib/supabase";
import { useStore } from "../../../store";

interface EdgesShapeProps {
  shape: Shape;
}

export const EdgesShape: React.FC<EdgesShapeProps> = ({ shape }) => {
  const updateShape = useStore((state) => state.updateShape);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Fetch initial state
    const fetchInitialState = async () => {
      const { data, error } = await supabase
        .from('preprocessed_images')
        .select('*')
        .eq('shapeId', shape.sourceImageId)
        .eq('processType', 'edge')
        .single();

      if (error) {
        console.error('Error fetching initial state:', error);
        return;
      }

      if (data && data.status === 'completed' && data.edgeUrl) {
        updateShape(shape.id, {
          edgeUrl: data.edgeUrl,
          isUploading: false
        });
      }
    };

    fetchInitialState();

    // Set up subscription to preprocessed_images table
    const channelName = `preprocessing_${shape.sourceImageId}_edge`;
    
    if (!subscriptionRef.current) {
      const subscription = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "preprocessed_images",
            filter: `shapeId=eq.${shape.sourceImageId}`,
          },
          (payload) => {
            console.log('Received update:', payload);
            if (
              payload.new.status === "completed" &&
              payload.new.processType === "edge" &&
              payload.new.edgeUrl
            ) {
              console.log('Updating shape with edge URL:', payload.new.edgeUrl);
              updateShape(shape.id, {
                edgeUrl: payload.new.edgeUrl,
                isUploading: false
              });
            }
          }
        )
        .subscribe();

      subscriptionRef.current = subscription;
    }

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [shape.id, shape.sourceImageId, updateShape]);

  return <ProcessedShape shape={shape} type="edge" />;
}; 