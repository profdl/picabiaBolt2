export type ModelName =
    | 'juggernautXL_v9'
    | 'RealVisXL_V4_0'
    | 'epicrealismXL_v10'
    | 'albedobaseXL_v21'
    | 'proteusV0_5'
    | 'sd_xl_base_1_0'
    | 'realismEngineSDXL_v30VAE'
    | 'copaxTimelessxlSDXL1_v122'
    | 'juggernautXLInpainting_xiInpainting';

export interface ModelDefaults {
    steps: number;
    guidanceScale: number;
    scheduler: string;
}

export const modelDefaults: Record<ModelName, ModelDefaults> = {
    juggernautXL_v9: {
        steps: 30,
        guidanceScale: 6.5,
        scheduler: 'dpmpp_2m'
    },
    RealVisXL_V4_0: {
        steps: 35,
        guidanceScale: 7.0,
        scheduler: 'dpmpp_2m_sde'
    },
    epicrealismXL_v10: {
        steps: 25,
        guidanceScale: 5.5,
        scheduler: 'euler'
    },
    albedobaseXL_v21: {
        steps: 28,
        guidanceScale: 7.5,
        scheduler: 'dpmpp_2m'
    },
    proteusV0_5: {
        steps: 32,
        guidanceScale: 8.0,
        scheduler: 'euler_ancestral'
    },
    sd_xl_base_1_0: {
        steps: 25,
        guidanceScale: 7.0,
        scheduler: 'dpmpp_2m_sde'
    },
    realismEngineSDXL_v30VAE: {
        steps: 30,
        guidanceScale: 6.0,
        scheduler: 'dpmpp_2m'
    },
    copaxTimelessxlSDXL1_v122: {
        steps: 28,
        guidanceScale: 7.0,
        scheduler: 'euler'
    },
    juggernautXLInpainting_xiInpainting: {
        steps: 40,
        guidanceScale: 7.5,
        scheduler: 'euler_ancestral'
    }
};

// Additional constants related to diffusion settings
export const SCHEDULER_OPTIONS = [
    { value: 'dpmpp_2m_sde', label: 'DPM++ 2M SDE' },
    { value: 'dpmpp_2m', label: 'DPM++ 2M' },
    { value: 'euler', label: 'Euler' },
    { value: 'euler_ancestral', label: 'Euler Ancestral' }
];