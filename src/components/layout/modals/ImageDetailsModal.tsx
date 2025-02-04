import React from "react";
import { format } from "date-fns";
interface ImageDetailsModalProps {
  image: SavedImage | null;
  onClose: () => void;
}
interface ImageDetailsModalProps {
  image: SavedImage | null;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}
interface DataGridItem {
  [key: string]: string | number | boolean | null | undefined;
}
export interface SavedImage {
  id: string;
  user_id: string;
  prompt: string;
  aspect_ratio: string;
  created_at: string;
  prediction_id: string;
  status: "generating" | "completed" | "failed";
  updated_at: string;
  image_index: number;
  originalUrl: string;
  depthMapUrl: string;
  edgeMapUrl: string;
  poseMapUrl: string;
  generated_01: string;
  generated_02: string;
  generated_03: string;
  generated_04: string;
  num_inference_steps: number;
  prompt_negative: string;
  width: number;
  height: number;
  num_outputs: number;
  scheduler: string;
  guidance_scale: number;
  prompt_strength: number;
  seed: number;
  refine: boolean;
  refine_steps: number;
  lora_scale: number;
  lora_weights: string;
  depth_scale: number;
  edge_scale: number;
  pose_scale: number;
  sketchMapUrl: string;
  sketch_scale: number;
  remixMapUrl: string;
  remix_scale: number;
  logs: string;
}

export const ImageDetailsModal: React.FC<ImageDetailsModalProps> = ({
  image,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}) => {
  if (!image) return null;

  const renderDataGrid = (data: DataGridItem) => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {Object.entries(data).map(
        ([key, value]) =>
          value !== null &&
          value !== undefined &&
          value !== "" && (
            <div key={key} className="flex justify-between py-0.5">
              <span className="text-gray-500">{key}:</span>
              <span className="font-mono text-right">{value.toString()}</span>
            </div>
          )
      )}
    </div>
  );

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Invalid Date" : format(date, "PPpp");
  };

  const imageData = {
    Dimensions: `${image.width}x${image.height}`,
    Outputs: image.num_outputs,
    Steps: image.num_inference_steps,
    Guidance: image.guidance_scale,
    Scheduler: image.scheduler,
    Seed: image.seed,
  };

  const scaleData = {
    Prompt: image.prompt_strength,
    LoRA: image.lora_scale,
    Depth: image.depth_scale,
    Edge: image.edge_scale,
    Pose: image.pose_scale,
    Sketch: image.sketch_scale,
    Remix: image.remix_scale,
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      {/* Navigation Buttons */}
      {hasPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-0 top-1/2 -translate-y-1/2 p-1 bg-black hover:bg-blue-600 text-white z-[60] shadow-lg transition-all h-32 flex items-center"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 bg-black hover:bg-blue-600 text-white z-[60] shadow-lg transition-all h-32 flex items-center"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      <div className="bg-gray-900 rounded-lg w-[95vw] h-[90vh] flex flex-col overflow-hidden border border-gray-800">
        <div className="p-3 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-medium text-white">Image Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[70%] h-full bg-black flex items-center justify-center">
            <img
              src={image.generated_01}
              alt={image.prompt}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div className="w-[30%] p-4 overflow-y-auto space-y-4 bg-gray-900 text-gray-200">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm mb-2 text-blue-400">
                  Generation Settings
                </h3>
                {renderDataGrid(imageData)}
              </div>

              <div>
                <h3 className="font-medium text-sm mb-2 text-blue-400">
                  Scale Values
                </h3>
                {renderDataGrid(scaleData)}
              </div>

              <div>
                <h3 className="font-medium text-sm mb-2 text-blue-400">
                  Prompt
                </h3>
                <p className="text-sm text-gray-300">{image.prompt}</p>
                {image.prompt_negative && (
                  <p className="text-sm text-gray-400 mt-1">
                    Negative: {image.prompt_negative}
                  </p>
                )}
              </div>

              <div>
                <h3 className="font-medium text-sm mb-2 text-blue-400">
                  Variations
                </h3>
                <div className="grid grid-cols-3 gap-1">
                  {[image.generated_02, image.generated_03, image.generated_04]
                    .filter(Boolean)
                    .map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        className="aspect-square object-cover rounded border border-gray-800"
                      />
                    ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-sm mb-2 text-blue-400">
                  Control Maps
                </h3>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { url: image.depthMapUrl, label: "Depth" },
                    { url: image.edgeMapUrl, label: "Edge" },
                    { url: image.poseMapUrl, label: "Pose" },
                    { url: image.sketchMapUrl, label: "Sketch" },
                    { url: image.remixMapUrl, label: "Remix" },
                  ]
                    .filter((map) => map.url)
                    .map((map, i) => (
                      <div key={i} className="text-center">
                        <img
                          src={map.url}
                          className="aspect-square object-cover rounded border border-gray-800"
                        />
                        <span className="text-xs text-gray-400">
                          {map.label}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-1">
                <div>ID: {image.id}</div>
                <div>Created: {formatDate(image.created_at)}</div>
                <div>Updated: {formatDate(image.updated_at)}</div>
                <div>
                  Status:{" "}
                  <span
                    className={`inline-px-1.5 py-0.5 rounded text-xs
                    ${
                      image.status === "completed"
                        ? "text-green-400"
                        : image.status === "generating"
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {image.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
