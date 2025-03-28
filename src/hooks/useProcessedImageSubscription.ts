import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";

export const useProcessedImageSubscription = (shapeId: string, sourceImageId: string | undefined, processType: string) => {
  const updateShape = useStore((state) => state.updateShape);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!sourceImageId) {
      console.log('No sourceImageId provided, skipping subscription');
      return;
    }

    console.log(`${processType} subscription mounted:`, { 
      shapeId, 
      sourceImageId,
      processType
    });

    // Set initial loading state
    updateShape(shapeId, { isUploading: true });

    // Fetch initial state
    const fetchInitialState = async () => {
      console.log(`Fetching initial state for ${processType}:`, sourceImageId);
      const { data, error } = await supabase
        .from('preprocessed_images')
        .select('*')
        .eq('shapeId', sourceImageId)
        .eq('processType', processType)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching initial state:', error);
        updateShape(shapeId, { isUploading: false });
        return;
      }

      console.log('Initial state data:', data);
      if (data && data.length > 0 && data[0].status === 'completed') {
        const urlField = `${processType}Url`;
        if (data[0][urlField]) {
          console.log(`Found completed ${processType} processing:`, data[0][urlField]);
          updateShape(shapeId, {
            [urlField]: data[0][urlField],
            isUploading: false
          });
        }
      }
    };

    fetchInitialState();

    // Set up subscription to preprocessed_images table
    const channelName = `preprocessing_${sourceImageId}_${processType}`;
    console.log('Setting up subscription with channel:', channelName);
    
    if (!subscriptionRef.current) {
      const subscription = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "preprocessed_images",
            filter: `shapeId=eq.${sourceImageId}`,
          },
          (payload) => {
            console.log('Received update:', {
              payload,
              shapeId,
              sourceImageId,
              processType
            });
            if (
              payload.new.status === "completed" &&
              payload.new.processType === processType
            ) {
              const urlField = `${processType}Url`;
              if (payload.new[urlField]) {
                console.log(`Updating shape with ${processType} URL:`, payload.new[urlField]);
                updateShape(shapeId, {
                  [urlField]: payload.new[urlField],
                  isUploading: false
                });
              }
            }
          }
        )
        .subscribe();

      subscriptionRef.current = subscription;
      console.log('Subscription set up:', subscription);
    }

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        console.log('Cleaning up subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [shapeId, sourceImageId, processType, updateShape]);
}; 