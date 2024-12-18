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
        const cropAspectRatio = crop.width / crop.height;
        let newWidth = shape.width;
        let newHeight = shape.height;

        if (cropAspectRatio > 1) {
          newHeight = shape.width / cropAspectRatio;
        } else {
          newWidth = shape.height * cropAspectRatio;
        }

        const rightmostX = Math.max(
          ...shapes.map((s) => s.position.x + s.width)
        );
        const spacing = 20;

        const newShapePosition = {
          x: rightmostX + spacing,
          y: shape.position.y,
        };

        // Add the new shape
        const newShape = {
          id: Math.random().toString(36).substr(2, 9),
          type: "image",
          position: newShapePosition,
          width: newWidth,
          height: newHeight,
          color: "#ffffff",
          rotation: 0,
          imageUrl: asset.url,
          model: "",
          useSettings: false,
          isUploading: false,
          isEditing: false,
          depthStrength: 0.25,
          edgesStrength: 0.25,
          contentStrength: 0.25,
          poseStrength: 0.25,
          sketchStrength: 0.25,
          remixStrength: 0.25,
        };

        addShape(newShape);

        // Animate canvas to center the new shape
        const centerX = newShapePosition.x + newWidth / 2;
        const centerY = newShapePosition.y + newHeight / 2;

        // Using window.scrollTo with smooth behavior
        window.scrollTo({
          left: centerX - window.innerWidth / 2,
          top: centerY - window.innerHeight / 2,
          behavior: "smooth",
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
        {/* Image Container with fixed height */}
        <div className="w-[600px] h-[400px] flex items-center justify-center overflow-hidden">
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
              className="max-h-[350px] w-auto object-contain" // Updated styles
              style={{ maxHeight: "350px" }} // Added max-width constraint
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
