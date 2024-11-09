import { create, StateCreator, StoreApi } from 'zustand'
import { createShapeSlice } from './slices/shapeSlice'
import { createToolSlice } from './slices/toolSlice'
import { createImageGenerationSlice } from './slices/imageGenerationSlice'

type StoreState = ReturnType<typeof createShapeSlice> &
  ReturnType<typeof createToolSlice> &
  ReturnType<typeof createImageGenerationSlice>

export const useStore = create<StoreState>((set, get, store) => ({
  ...createShapeSlice(set, get, store),
  ...createToolSlice(set, get, store),
  ...createImageGenerationSlice(set, get, store)
}))
