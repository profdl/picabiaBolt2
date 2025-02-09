import { StateCreator } from "zustand";

interface WarmupSlice {
  isWarmedUp: boolean;
  warmupModel: () => Promise<void>;
  setWarmedUp: (status: boolean) => void;
}

export const warmupSlice: StateCreator<WarmupSlice, [], [], WarmupSlice> = (set) => ({
  isWarmedUp: false,
  setWarmedUp: (status) => set({ isWarmedUp: status }),
  warmupModel: async () => {
    try {
      const response = await fetch("/.netlify/functions/preprocess-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: "https://picsum.photos/200",
          processType: "depth",
          shapeId: "warmup",
        }),
      });
      const data = await response.json();
      console.log("Warmup response:", data);
      set({ isWarmedUp: true });
    } catch {
      console.log("Warmup completed");
    }
  }
})
