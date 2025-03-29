import { Shape } from "../../../types";
import { useProcessedImageSubscription } from "../../../hooks/useProcessedImageSubscription";
import { LoadingPlaceholder } from "../../shared/LoadingPlaceholder";

interface ProcessedShapeProps {
  shape: Shape;
  type: "depth" | "edge" | "pose";
}

export const ProcessedShape: React.FC<ProcessedShapeProps> = ({ shape, type }) => {
  // Use the subscription hook for the specific process type
  useProcessedImageSubscription(shape.id, shape.sourceImageId, type);

  // Get the appropriate URL based on the type
  const urlKey = `${type}Url` as keyof Shape;
  const processedUrl = shape[urlKey] as string | undefined;

  if (shape.isUploading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <LoadingPlaceholder isGenerating={false} />
      </div>
    );
  }

  if (!processedUrl) {
    return null;
  }

  return (
    <img
      src={processedUrl}
      alt={`${type} processed image`}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
        top: 0,
        left: 0
      }}
    />
  );
}; 