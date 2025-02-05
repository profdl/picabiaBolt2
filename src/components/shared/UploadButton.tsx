import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useStore } from "../../store";
import { supabase } from "../../lib/supabase/client";
import { Button } from "./Button";

interface UploadButtonProps {
  className?: string;
}

export const UploadButton = ({ className }: UploadButtonProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toggleAssets = useStore((state) => state.toggleAssets);
  const addShape = useStore((state) => state.addShape);
  const { zoom, offset } = useStore();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    toggleAssets();
    const file = e.target.files?.[0];
    if (!file) return;

    const tempUrl = URL.createObjectURL(file);
    const shapeId = Math.random().toString(36).substr(2, 9);
    const img = new Image();
    img.src = tempUrl;

    await new Promise((resolve) => {
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const windowWidth = window.innerWidth * 0.4;
        const windowHeight = windowWidth / aspectRatio;

        const center = {
          x: (window.innerWidth / 2 - offset.x) / zoom,
          y: (window.innerHeight / 2 - offset.y) / zoom,
        };

        addShape({
          id: shapeId,
          type: "image",
          position: {
            x: center.x - windowWidth / 2,
            y: center.y - windowHeight / 2,
          },
          width: windowWidth,
          height: windowHeight,
          color: "transparent",
          imageUrl: "",
          rotation: 0,
          isUploading: true,
          aspectRatio: aspectRatio,
          model: "",
          useSettings: false,
          isEditing: false,
          depthStrength: 0.75,
          edgesStrength: 0.75,
          contentStrength: 0.75,
          poseStrength: 0.75,
          sketchStrength: 0.75,
          remixStrength: 0.75,
        });
        resolve(null);
      };
    });

    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(fileName, fileData, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("assets").getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("assets").insert([
        {
          url: publicUrl,
          user_id: user.id,
        },
      ]);

      if (dbError) throw dbError;

      useStore.getState().triggerAssetsRefresh();
      useStore.getState().updateShape(shapeId, {
        imageUrl: publicUrl,
        isUploading: false,
      });
    } catch (err) {
      console.error("Error uploading asset:", err);
      useStore.getState().deleteShape(shapeId);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(tempUrl);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        variant="ghost"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={`gap-2 ${className}`} // Added gap-2 here
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Upload className="w-5 h-5" />
        )}
      </Button>
    </>
  );
};
