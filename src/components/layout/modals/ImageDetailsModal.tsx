import React from "react";
import { format } from "date-fns";
import { useThemeClass } from "../../../styles/useThemeClass";
import { useShapeAdder } from "../../../hooks/shapes/useShapeAdder";

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
  output_quality: number;
  output_format: string;
  model: string;
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
  const { addNewShape } = useShapeAdder();

  const handleReuseSettings = async () => {
    if (!image) return;

    await addNewShape(
      "diffusionSettings",
      {
        model: image.model || "juggernautXL_v9",
        steps: image.num_inference_steps,
        guidanceScale: image.guidance_scale,
        scheduler: image.scheduler || "dpmpp_2m_sde",
        seed: image.seed,
        outputWidth: image.width,
        outputHeight: image.height,
        outputFormat: image.output_format || "png",
        outputQuality: image.output_quality || 100,
        randomiseSeeds: false,
        useSettings: true,
      },
      "",
      {
        centerOnShape: true,
        setSelected: true,
        defaultWidth: 300,
      }
    );

    onClose();
  };

  const styles = {
    overlay: useThemeClass(["imageDetailsModal", "overlay"]),
    container: useThemeClass(["imageDetailsModal", "container"]),
    header: {
      base: useThemeClass(["imageDetailsModal", "header", "base"]),
      title: useThemeClass(["imageDetailsModal", "header", "title"]),
      closeButton: useThemeClass([
        "imageDetailsModal",
        "header",
        "closeButton",
      ]),
    },
    imageContainer: useThemeClass(["imageDetailsModal", "imageContainer"]),
    sidebar: {
      base: useThemeClass(["imageDetailsModal", "sidebar", "base"]),
      sectionTitle: useThemeClass([
        "imageDetailsModal",
        "sidebar",
        "section",
        "title",
      ]),
      gridLabel: useThemeClass([
        "imageDetailsModal",
        "sidebar",
        "section",
        "grid",
        "label",
      ]),
      gridValue: useThemeClass([
        "imageDetailsModal",
        "sidebar",
        "section",
        "grid",
        "value",
      ]),
      promptText: useThemeClass([
        "imageDetailsModal",
        "sidebar",
        "prompt",
        "text",
      ]),
      promptNegative: useThemeClass([
        "imageDetailsModal",
        "sidebar",
        "prompt",
        "negative",
      ]),
      thumbnailBorder: useThemeClass([
        "imageDetailsModal",
        "sidebar",
        "thumbnail",
        "border",
      ]),
      thumbnailLabel: useThemeClass([
        "imageDetailsModal",
        "sidebar",
        "thumbnail",
        "label",
      ]),
      metaText: useThemeClass(["imageDetailsModal", "sidebar", "meta", "text"]),
      button: useThemeClass(["imageDetailsModal", "sidebar", "button"]),
      meta: {
        status: {
          completed: useThemeClass([
            "imageDetailsModal",
            "sidebar",
            "meta",
            "status",
            "completed",
          ]),
          generating: useThemeClass([
            "imageDetailsModal",
            "sidebar",
            "meta",
            "status",
            "generating",
          ]),
          failed: useThemeClass([
            "imageDetailsModal",
            "sidebar",
            "meta",
            "status",
            "failed",
          ]),
        },
      },
    },
    navigationButton: useThemeClass(["imageDetailsModal", "navigationButton"]),
  };

  if (!image) return null;

  const renderDataGrid = (data: DataGridItem) => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {Object.entries(data).map(
        ([key, value]) =>
          value !== null &&
          value !== undefined &&
          value !== "" && (
            <div key={key} className="flex justify-between py-0.5">
              <span className={styles.sidebar.gridLabel}>{key}:</span>
              <span
                className={`font-mono text-right ${styles.sidebar.gridValue}`}
              >
                {value.toString()}
              </span>
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
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 ${styles.overlay}`}
    >
      {hasPrevious && (
        <button
          onClick={onPrevious}
          className={`absolute left-0 top-1/2 -translate-y-1/2 p-1 z-[60] shadow-lg transition-all h-32 flex items-center ${styles.navigationButton}`}
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
          className={`absolute right-0 top-1/2 -translate-y-1/2 p-1 z-[60] shadow-lg transition-all h-32 flex items-center ${styles.navigationButton}`}
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

      <div
        className={`rounded-lg w-[95vw] h-[90vh] flex flex-col overflow-hidden ${styles.container}`}
      >
        <div
          className={`p-3 flex justify-between items-center ${styles.header.base}`}
        >
          <h2 className={`text-lg font-medium ${styles.header.title}`}>
            Image Details
          </h2>
          <button onClick={onClose} className={styles.header.closeButton}>
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div
            className={`w-[70%] h-full flex items-center justify-center ${styles.imageContainer}`}
          >
            <img
              src={image.generated_01}
              alt={image.prompt}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div
            className={`w-[30%] p-4 overflow-y-auto space-y-4 ${styles.sidebar.base}`}
          >
            <div className="space-y-4">
              <div>
                <h3
                  className={`font-medium text-sm mb-2 ${styles.sidebar.sectionTitle}`}
                >
                  Generation Settings
                </h3>
                <button
                  onClick={handleReuseSettings}
                  className={`w-full py-2 px-4 mb-4 ${
                    styles.sidebar.button ||
                    "bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
                  }`}
                >
                  Reuse These Settings
                </button>
                <div className="mt-4"></div>
                {renderDataGrid(imageData)}
              </div>

              <div>
                <h3
                  className={`font-medium text-sm mb-2 ${styles.sidebar.sectionTitle}`}
                >
                  Scale Values
                </h3>
                {renderDataGrid(scaleData)}
              </div>

              <div>
                <h3
                  className={`font-medium text-sm mb-2 ${styles.sidebar.sectionTitle}`}
                >
                  Prompt
                </h3>
                <p className={`text-sm ${styles.sidebar.promptText}`}>
                  {image.prompt}
                </p>
                {image.prompt_negative && (
                  <p
                    className={`text-sm mt-1 ${styles.sidebar.promptNegative}`}
                  >
                    Negative: {image.prompt_negative}
                  </p>
                )}
              </div>

              <div>
                <h3
                  className={`font-medium text-sm mb-2 ${styles.sidebar.sectionTitle}`}
                >
                  Variations
                </h3>
                <div className="grid grid-cols-3 gap-1">
                  {[image.generated_02, image.generated_03, image.generated_04]
                    .filter(Boolean)
                    .map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        className={`aspect-square object-cover rounded ${styles.sidebar.thumbnailBorder}`}
                      />
                    ))}
                </div>
              </div>

              <div>
                <h3
                  className={`font-medium text-sm mb-2 ${styles.sidebar.sectionTitle}`}
                >
                  Control Maps
                </h3>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { url: image.depthMapUrl, label: "Depth" },
                    { url: image.edgeMapUrl, label: "Edge" },
                    { url: image.poseMapUrl, label: "Pose" },
                    { url: image.sketchMapUrl, label: "Sketch" },
                // Split originalUrl for remix images if remix_scale is present
    ...(image.remix_scale > 0 
      ? image.originalUrl.split(',')
          .map((url, index) => ({
            url: url.trim(),
            label: `Remix ${index + 1}`
          }))
      : [])
  ]
                    .filter((map) => map.url)
                    .map((map, i) => (
                      <div key={i} className="text-center">
                        <img
                          src={map.url}
                          className={`aspect-square object-cover rounded ${styles.sidebar.thumbnailBorder}`}
                        />
                        <span
                          className={`text-xs ${styles.sidebar.thumbnailLabel}`}
                        >
                          {map.label}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className={`text-xs space-y-1 ${styles.sidebar.metaText}`}>
                <div>ID: {image.id}</div>
                <div>Created: {formatDate(image.created_at)}</div>
                <div>Updated: {formatDate(image.updated_at)}</div>
                <div>
                  Status:{" "}
                  <span
                    className={`inline-px-1.5 py-0.5 rounded text-xs ${
                      image.status === "completed"
                        ? styles.sidebar.meta.status.completed
                        : image.status === "generating"
                        ? styles.sidebar.meta.status.generating
                        : styles.sidebar.meta.status.failed
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

