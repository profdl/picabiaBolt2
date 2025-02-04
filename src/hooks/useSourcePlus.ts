import { useStore } from "../store";
import { SourcePlusImage } from "../types";
import { convertToWebP, uploadAssetToSupabase } from "../lib/supabase";

export const useSourcePlus = (onClose: () => void) => {
  const {
    sourcePlusLoading,
    sourcePlusQuery,
    sourcePlusImages,
    setSourcePlusQuery,
    addImageToCanvas,
    triggerAssetsRefresh,
  } = useStore((state) => ({
    sourcePlusLoading: state.sourcePlusLoading,
    sourcePlusQuery: state.sourcePlusQuery,
    sourcePlusImages: state.sourcePlusImages || [],
    setSourcePlusQuery: state.setSourcePlusQuery,
    addImageToCanvas: state.addImageToCanvas,
    triggerAssetsRefresh: state.triggerAssetsRefresh,
  }));

  const handleSourcePlusClick = async (sourcePlusImage: SourcePlusImage) => {
    try {
      console.log('Fetching image through proxy:', sourcePlusImage.url);
      
      const thumbnailUrl = sourcePlusImage.thumbnail_url || sourcePlusImage.url;
      
      const proxyResponse = await fetch(
        `/.netlify/functions/sourceplus-proxy?url=${encodeURIComponent(thumbnailUrl)}`
      );
      
      if (!proxyResponse.ok) {
        const errorData = await proxyResponse.json();
        throw new Error(errorData.error || 'Failed to fetch image through proxy');
      }

      const { data: base64Data } = await proxyResponse.json();
      if (!base64Data) {
        throw new Error('No image data received from proxy');
      }

      const response = await fetch(base64Data);
      const blob = await response.blob();
      const file = new File([blob], "image.jpg", { type: blob.type });
      const webpBlob = await convertToWebP(file);
      const { publicUrl } = await uploadAssetToSupabase(webpBlob);

      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        };
        img.onerror = () => reject(new Error('Failed to load image for dimensions'));
        img.src = URL.createObjectURL(webpBlob);
      });

      const success = await addImageToCanvas({
        url: publicUrl,
        width: dimensions.width,
        height: dimensions.height,
        depthStrength: 0.25,
        edgesStrength: 0.25,
        contentStrength: 0.25,
        poseStrength: 0.25,
        sketchStrength: 0.25,
        remixStrength: 0.25,
      });

      if (success) {
        triggerAssetsRefresh();
        onClose();
      }
    } catch (err) {
      console.error("Error processing Source.plus image:", err);
    }
  };

  return {
    sourcePlusLoading,
    sourcePlusQuery,
    sourcePlusImages,
    setSourcePlusQuery,
    handleSourcePlusClick,
  };
};
