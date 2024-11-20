import React from 'react';
import { useStore } from '../store';

export const ImageGeneratePanel: React.FC = () => {
  const { advancedSettings, setAdvancedSettings } = useStore();

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

        {/* Existing Sampling Settings */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Steps</label>
          <input
            type="number"
            value={advancedSettings.steps || 20}
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
            value={advancedSettings.guidanceScale || 7.5}
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
            value={advancedSettings.scheduler || 'euler'}
            onChange={(e) => setAdvancedSettings({ scheduler: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            <option value="euler">euler</option>
            <option value="euler_ancestral">euler_ancestral</option>
            <option value="heun">heun</option>
            <option value="dpm_2">dpm_2</option>
            <option value="dpm_2_ancestral">dpm_2_ancestral</option>
            <option value="lms">lms</option>
            <option value="dpm_fast">dpm_fast</option>
            <option value="dpm_adaptive">dpm_adaptive</option>
            <option value="dpmpp_2s_ancestral">dpmpp_2s_ancestral</option>
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
