import React, { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { Shape } from "../../../types";
import {
  ModelName,
  modelDefaults,
  SCHEDULER_OPTIONS,
} from "../../../constants/diffusionModels";
import { useThemeClass } from "../../../styles/useThemeClass";

interface DiffusionSettingsPanelProps {
  shape: Shape;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  onAdvancedToggle: (isExpanded: boolean) => void;
}

export const DiffusionSettingsPanel: React.FC<DiffusionSettingsPanelProps> = ({
  shape,
  updateShape,
  onAdvancedToggle,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // default randomizeSeeds value
  useEffect(() => {
    if (shape.randomiseSeeds === undefined) {
      updateShape(shape.id, { randomiseSeeds: true });
    }
  }, [shape.id, shape.randomiseSeeds, updateShape]);

  const aspectRatios = {
    "Square (1:1)": { width: 1024, height: 1024 },
    "Landscape SD (4:3)": { width: 1176, height: 888 },
    "Widescreen IMAX (1.43:1)": { width: 1224, height: 856 },
    "Widescreen HD(16:9)": { width: 1360, height: 768 },
    "Golden Ratio (1.618:1)": { width: 1296, height: 800 },
    "Portrait (2:3)": { width: 832, height: 1248 },
    "Portrait Standard (3:4)": { width: 880, height: 1176 },
    "Portrait Large Format (4:5)": { width: 912, height: 1144 },
    "Portrait Social Video (9:16)": { width: 768, height: 1360 },
  };
  const diffusionPanelClass = useThemeClass(["shape", "diffusionPanel"]);

  return (
    <div className="relative w-full h-full">
      <div
        className={`absolute inset-0 ${diffusionPanelClass} border border-neutral-200 dark:border-neutral-700 rounded-lg`}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="h-full p-3 text-neutral-900 dark:text-neutral-100 overflow-y-auto"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {" "}
            {/* Basic Settings */}
            <div className="space-y-2 mb-3">
              <div>
                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                  Model
                </label>
                <select
                  value={shape.model || "juggernautXL_v9"}
                  onChange={(e) => {
                    const selectedModel = e.target.value as ModelName;
                    const defaults = modelDefaults[selectedModel];
                    updateShape(shape.id, {
                      model: selectedModel,
                      steps: defaults.steps,
                      guidanceScale: defaults.guidanceScale,
                      scheduler: defaults.scheduler,
                    });
                  }}
                  className="w-full py-1 px-2 text-xs border rounded bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 block"
                >
                  <option value="juggernautXL_v9">Juggernaut XL v9</option>
                  <option value="RealVisXL_V4.0">RealVis XL V4.0</option>
                  <option value="epicrealismXL_v10">EpicRealism XL v10</option>
                  <option value="albedobaseXL_v21">AlbedobaseXL v21</option>
                  <option value="proteusV0.5">Proteus V0.5</option>
                  <option value="sd_xl_base_1.0">SDXL Base 1.0</option>
                  <option value="realismEngineSDXL_v30VAE">
                    Realism Engine SDXL v3.0
                  </option>
                  <option value="copaxTimelessxlSDXL1_v122">
                    Copax Timeless XL v1.22
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                  Image Dimensions
                </label>
                <select
                  value={`${shape.outputWidth}x${shape.outputHeight}`}
                  onChange={(e) => {
                    const [width, height] = e.target.value
                      .split("x")
                      .map(Number);
                    updateShape(shape.id, {
                      outputWidth: width,
                      outputHeight: height,
                    });
                  }}
                  className="w-full py-1 px-2 text-xs border rounded bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 block"
                >
                  {Object.entries(aspectRatios).map(([label, dims]) => (
                    <option key={label} value={`${dims.width}x${dims.height}`}>
                      {label} ({dims.width}x{dims.height})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Advanced Settings Toggle */}
            <button
              onClick={() => {
                setShowAdvanced(!showAdvanced);
                onAdvancedToggle(!showAdvanced);
              }}
              className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 mb-2"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform ${
                  showAdvanced ? "rotate-90" : ""
                }`}
              />
              Advanced Settings
            </button>
            {/* Advanced Settings Content */}
            {showAdvanced && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-neutral-600 dark:text-neutral-400">
                    Steps
                  </label>
                  <input
                    type="number"
                    value={shape.steps?.toString() || "20"}
                    onChange={(e) =>
                      updateShape(shape.id, { steps: Number(e.target.value) })
                    }
                    min="1"
                    max="100"
                    className="w-full py-1 px-2 text-xs border rounded bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 block"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-600 dark:text-neutral-400">
                    Scheduler
                  </label>
                  <select
                    value={shape.scheduler || "dpmpp_2m_sde"}
                    onChange={(e) =>
                      updateShape(shape.id, { scheduler: e.target.value })
                    }
                    className="w-full py-1 px-2 text-xs border rounded bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 block"
                  >
                    {SCHEDULER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-600 dark:text-neutral-400">
                    Seed
                  </label>
                  <input
                    type="number"
                    value={shape.seed?.toString() || "-1"}
                    onChange={(e) =>
                      updateShape(shape.id, { seed: Number(e.target.value) })
                    }
                    className="w-full py-1 px-2 text-xs border rounded bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 block"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    id={`randomize-${shape.id}`}
                    checked={shape.randomiseSeeds ?? true}
                    onChange={(e) =>
                      updateShape(shape.id, {
                        randomiseSeeds: e.target.checked,
                      })
                    }
                    className="w-3 h-3 text-blue-600 bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 rounded"
                  />
                  <label
                    htmlFor={`randomize-${shape.id}`}
                    className="text-xs text-neutral-600 dark:text-neutral-400"
                  >
                    Randomize Seeds
                  </label>
                </div>

                <div>
                  <label className="text-xs text-neutral-600 dark:text-neutral-400">
                    Output Format
                  </label>
                  <select
                    value={shape.outputFormat || "png"}
                    onChange={(e) =>
                      updateShape(shape.id, { outputFormat: e.target.value })
                    }
                    className="w-full py-1 px-2 text-xs border rounded bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 block"
                  >
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-600 dark:text-neutral-400">
                    Output Quality
                  </label>
                  <input
                    type="number"
                    value={shape.outputQuality?.toString() || "100"}
                    onChange={(e) =>
                      updateShape(shape.id, {
                        outputQuality: Number(e.target.value),
                      })
                    }
                    min="1"
                    max="100"
                    className="w-full py-1 px-2 text-xs border rounded bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 block"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
