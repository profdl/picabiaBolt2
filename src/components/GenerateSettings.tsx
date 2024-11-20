import React from 'react';
import { useStore } from '../store';

export const ImageGeneratePanel: React.FC = () => {
  const { advancedSettings, setAdvancedSettings } = useStore();
  const aspectRatios = {
    'Portrait (2:3)': { width: 832, height: 1248 },
    'Standard (3:4)': { width: 880, height: 1176 },
    'Large Format (4:5)': { width: 912, height: 1144 },
    'Selfie / Social Media Video (9:16)': { width: 1360, height: 768 },
    'Square (1:1)': { width: 1024, height: 1024 },
    'SD TV (4:3)': { width: 1176, height: 888 },
    'IMAX (1.43:1)': { width: 1224, height: 856 },
    'European Widescreen (1.66:1)': { width: 1312, height: 792 },
    'Widescreen / HD TV (16:9)': { width: 1360, height: 768 },
    'Standard Widescreen (1.85:1)': { width: 1392, height: 752 },
    'Cinemascope / Panavision (2.35:1)': { width: 1568, height: 664 },
    'Anamorphic Widescreen (2.39:1)': { width: 1576, height: 656 },
    'Older TV and documentaries (4:3)': { width: 1176, height: 880 },
    'Golden Ratio (1.618:1)': { width: 1296, height: 800 }
  };

  return (
    <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="p-4 space-y-4">
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Model</label>
          <select
            value={advancedSettings.model || 'juggernautXL'}
            onChange={(e) => setAdvancedSettings({ model: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            <option value="juggernautXL">juggernautXL_juggernautX</option>
            <option value="epicrealismXL v10">epicrealismXL_v10.safetensors            </option>
            <option value="juggernautXL v9">Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors</option>
          </select>
        </div>
        {/* Size Selection*/}
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Image Dimensions</label>
          <select
            value={`${advancedSettings.width}x${advancedSettings.height}`}
            onChange={(e) => {
              const [width, height] = e.target.value.split('x').map(Number);
              setAdvancedSettings({ width, height });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            {Object.entries(aspectRatios).map(([label, dims]) => (
              <option key={label} value={`${dims.width}x${dims.height}`}>
                {label} ({dims.width}x{dims.height})
              </option>
            ))}
          </select>
        </div>
        {/* Negative Prompt */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Negative Prompt</label>
          <textarea
            value={advancedSettings.negativePrompt || ''}
            onChange={(e) => setAdvancedSettings({ negativePrompt: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            rows={3}
          />
        </div>
        {/* Existing Sampling Settings */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Steps</label>
          <input
            type="number"
            value={advancedSettings.steps || 35}
            onChange={(e) => setAdvancedSettings({ steps: parseInt(e.target.value) })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            min="1"
            max="100"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700">CFG Scale</label>
          <input
            type="number"
            value={advancedSettings.guidanceScale || 4.5}
            onChange={(e) => setAdvancedSettings({ guidanceScale: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            min="1"
            max="20"
            step="0.5"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Scheduler</label>
          <select
            value={advancedSettings.scheduler || 'dpmpp_2m_sde'}
            onChange={(e) => setAdvancedSettings({ scheduler: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            <option value="dpmpp_2m_sde">DPM++ 2M SDE</option>
            <option value="euler">euler</option>
            <option value="euler_ancestral">euler_ancestral</option>
            <option value="heun">heun</option>
            <option value="dpm_2">dpm_2</option>
            <option value="dpm_2_ancestral">dpm_2_ancestral</option>
            <option value="lms">lms</option>
            <option value="dpm_fast">dpm_fast</option>
            <option value="dpm_adaptive">dpm_adaptive</option>
            <option value="dpmpp_sde">dpmpp_sde</option>
            <option value="dpmpp_sde_gpu">dpmpp_sde_gpu</option>
            <option value="dpmpp_2m">dpmpp_2m</option>
            <option value="dpmpp_2m_sde">dpmpp_2m_sde</option>
            <option value="dpmpp_2m_sde_gpu">dpmpp_2m_sde_gpu</option>
            <option value="dpmpp_3m_sde">dpmpp_3m_sde</option>
            <option value="dpmpp_3m_sde_gpu">dpmpp_3m_sde_gpu</option>
            <option value="ddim">ddim</option>
            <option value="uni_pc">uni_pc</option>
            <option value="uni_pc_bh2">uni_pc_bh2</option>

          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Seed</label>
          <input
            type="number"
            value={advancedSettings.seed || -1}
            onChange={(e) => setAdvancedSettings({ seed: parseInt(e.target.value) })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            min="-1"
          />
        </div>

        {/* Output Settings */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Output Format</label>
          <select
            value={advancedSettings.outputFormat}
            onChange={(e) => setAdvancedSettings({ outputFormat: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            <option value="webp">WebP</option>
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700">
            Output Quality ({advancedSettings.outputQuality})
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={advancedSettings.outputQuality}
            onChange={(e) => setAdvancedSettings({ outputQuality: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={advancedSettings.randomiseSeeds}
              onChange={(e) => setAdvancedSettings({ randomiseSeeds: e.target.checked })}
            />
            <span className="text-sm text-gray-700">Randomize Seeds</span>
          </label>
        </div>
      </div>
    </div>
  );
};
