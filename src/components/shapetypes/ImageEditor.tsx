import { useState, useRef } from "react";
import ReactCrop, { Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Shape } from "../../types";
import { Button } from "../ui/Button";
import ReactDOM from "react-dom";
import { useStore } from "../../store";

interface ImageEditorProps {
  shape: Shape;
  updateShape: (id: string, updates: Partial<Shape>) => void;
}

export interface Asset {
  id: string;
  url: string;
  created_at: string;
  user_id: string;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  shape,
  updateShape,
}) => {
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 100,
    height: 100,
    x: 0,
    y: 0,
  });
  const { uploadAsset, addShape, shapes } = useStore();

  const imageRef = useRef<HTMLImageElement>(null);

  const getCroppedImg = () => {
    const image = imageRef.current;
    if (!image) return;

    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    return canvas.toDataURL("image/jpeg");
  };

  const handleSave = async () => {
    const croppedImageUrl = getCroppedImg();
    if (!croppedImageUrl) return;

    const response = await fetch(croppedImageUrl);
    const blob = await response.blob();
    const file = new File([blob], "cropped-image.jpg", { type: "image/jpeg" });

    try {
      const asset = await uploadAsset(file);
      if (asset) {
        // Calculate new dimensions based on crop aspect ratio
        const cropAspectRatio = crop.width / crop.height;
        let newWidth = shape.width;
        let newHeight = shape.height;

        if (cropAspectRatio > 1) {
          newHeight = shape.width / cropAspectRatio;
        } else {
          newWidth = shape.height * cropAspectRatio;
        }

        // Find rightmost shape position
        const rightmostX = Math.max(
          ...shapes.map((s) => s.position.x + s.width)
        );
        const spacing = 20; // Gap between shapes

        addShape({
          id: Math.random().toString(36).substr(2, 9),
          type: "image",
          position: {
            x: rightmostX + spacing,
            y: shape.position.y,
          },
          width: newWidth,
          height: newHeight,
          color: "#ffffff",
          rotation: 0,
          imageUrl: asset.url,
          model: "",
          useSettings: false,
          isUploading: false,
          isEditing: false,
          depthStrength: 0.75,
          edgesStrength: 0.75,
          contentStrength: 0.75,
          poseStrength: 0.75,
          scribbleStrength: 0.75,
          remixStrength: 0.75,
        });
      }
    } catch (error) {
      console.error("Error uploading cropped image:", error);
    }

    updateShape(shape.id, { isImageEditing: false });
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Edit Image</h3>
          <Button
            variant="ghost"
            onClick={() => updateShape(shape.id, { isImageEditing: false })}
          >
            Cancel
          </Button>
        </div>

        {/* Image Container with fixed height */}
        <div className="w-[400px] h-[400px] flex items-center justify-center">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            aspect={undefined}
            className="max-h-full max-w-full"
          >
            <img
              ref={imageRef}
              src={shape.imageUrl}
              alt="Edit"
              crossOrigin="anonymous"
              className="max-h-[400px] max-w-[400px] object-contain"
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => updateShape(shape.id, { isImageEditing: false })}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
