import {
  subjects,
  styles,
  techniques,
  lighting,
  characteristics,
  perspectives,
} from "./prompt-data";

export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generatePrompt(): string {
  // Core structure with subject and style
  let prompt = `${randomChoice(styles)} ${randomChoice(subjects)}`;

  // Add perspective if appropriate
  if (Math.random() > 0.3) {
    prompt = `${randomChoice(perspectives)} view of ${prompt}`;
  }

  // Add characteristics
  const numCharacteristics = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < numCharacteristics; i++) {
    prompt += `, ${randomChoice(characteristics)}`;
  }

  // Add technique
  prompt += `, ${randomChoice(techniques)}`;

  // Add lighting
  prompt += `, ${randomChoice(lighting)} lighting`;

  return prompt;
}

// Original prompts array for reference or direct selection
export const originalPrompts = [
  "Aerial view of modernist desert compound at twilight, interlocking geometric volumes, infinity pool reflecting deep purple sky, architectural lighting emerging from recessed coves, minimalist landscape design",
  "Extreme close-up of crystalline mineral formations, iridescent geode surfaces, macro photography revealing complex geometric patterns, dramatic side lighting emphasizing texture, dark background with selective focus",
  "Experimental double exposure merging urban infrastructure with ocean waves, monochromatic gradient, long exposure capturing fluid movement, high contrast architectural elements, grainy film texture",
  "Bird's eye view of textile manufacturing process, intricate weaving machines in motion, industrial color palette, documentary-style lighting, technical detail emphasis on mechanical components and fabric patterns",
  "Low angle shot through prismatic glass sculpture, refracted light creating rainbow caustics, studio lighting with multiple color gels, abstract compositions against pure black background, experimental photography",
  "Cross-section rendering of sustainable skyscraper systems, technical blueprint aesthetic, cutaway details revealing inner workings, professional architectural visualization, subtle ambient occlusion",
  "Overhead composition of contemporary ceramic installation, scattered porcelain fragments creating topographical landscape, dramatic shadows from angled lighting, pure white forms on dark surface",
  "Microscopic photograph of exotic plant cells, fluorescent biological structures, scientific imaging technique, vivid complementary colors, ultra-sharp focus on cellular patterns",
  "Worm's eye view of suspended kinetic sculpture, polished metal surfaces catching dynamic reflections, contemporary gallery space, long exposure capturing motion blur, dramatic upward perspective",
  "Split-level photograph capturing above and below water surface, coral reef meeting mangrove roots, natural diffused lighting, rich aquatic colors, documentary underwater photography style",
];
// Get a random prompt from the original list
export function getRandomOriginalPrompt(): string {
  return randomChoice(originalPrompts);
}
