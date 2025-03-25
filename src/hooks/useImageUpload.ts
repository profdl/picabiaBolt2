import { convertToWebP, uploadAssetToSupabase } from "../lib/supabase";
import { useStore } from "../store";
import {
  DEFAULT_CONTROL_STRENGTHS,
  DEFAULT_CONTROL_STATES,
} from "../constants/shapeControlSettings";

export const useImageUpload = () => {
  const { addShape, deleteShape, triggerAssetsRefresh } = useStore();
  const MAX_DIMENSION = 2400;

  const resizeImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = (height / width) * MAX_DIMENSION;
            width = MAX_DIMENSION;
          } else {
            width = (width / height) * MAX_DIMENSION;
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          const resizedFile = new File([blob!], file.name, { type: file.type });
          resolve(resizedFile);
        }, file.type);
      };

      img.src = url;
    });
  };

  const handleImageUpload = async (
    file: File,
    point: { x: number; y: number },
    p0: { width: number; height: number }
  ) => {
    const tempId = Math.random().toString(36).substr(2, 9);
    const aspectRatio = p0.width / p0.height;

    let width = 512;
    let height = width / aspectRatio;

    addShape({
      id: tempId,
      type: "image",
      position: {
        x: point.x - width / 2,
        y: point.y - height / 2,
      },
      width,
      height,
      aspectRatio,
      color: "transparent",
      imageUrl: URL.createObjectURL(file),
      rotation: 0,
      isUploading: true,
      model: "",
      useSettings: false,
      isEditing: false,
      ...DEFAULT_CONTROL_STRENGTHS,
      ...DEFAULT_CONTROL_STATES,
    });

    try {
      const resizedBlob = await resizeImage(file);
      const webpBlob = await convertToWebP(resizedBlob);
      const { publicUrl } = await uploadAssetToSupabase(webpBlob);

      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type: "image",
        position: {
          x: point.x - width / 2,
          y: point.y - height / 2,
        },
        width,
        height,
        aspectRatio,
        color: "transparent",
        imageUrl: publicUrl,
        rotation: 0,
        isUploading: false,
        model: "",
        useSettings: false,
        isEditing: false,
        depthStrength: 0.25,
        edgesStrength: 0.25,
        contentStrength: 0.25,
        poseStrength: 0.25,
        sketchStrength: 0.25,
        remixStrength: 0.25,
      });

      deleteShape(tempId);
      triggerAssetsRefresh();
    } catch (err) {
      console.error("Upload failed:", err);
      deleteShape(tempId);
    }
  };

  return { handleImageUpload };
};
