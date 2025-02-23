declare module 'mixbox' {
  export interface Mixbox {
    init(): Promise<void>;
    rgbToLatent(r: number, g: number, b: number): number[];
    latentToRgb(latent: number[]): [number, number, number];
  }

  const mixbox: Mixbox;
  export default mixbox;
}
