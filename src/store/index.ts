import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { canvasSlice } from "./slices/canvasSlice";
import { drawerSlice } from "./slices/drawerSlice";
import { baseShapeSlice } from "./slices/baseShapeSlice";
import { stickyNoteSlice } from "./slices/stickyNoteSlice";
import { groupSlice } from "./slices/groupSlice";
import { imageSlice } from "./slices/imageSlice";
import { historySlice } from "./slices/historySlice";
import { clipboardSlice } from "./slices/clipboardSlice";
import { toolSlice } from "./slices/toolSlice";
import { preProcessSlice } from "./slices/preProcessSlice";
import { uiSlice } from "./slices/uiSlice";
import { generationHandlerSlice } from "./slices/generationHandlerSlice";
import { subjectGenerationSlice } from "./slices/subjectGenerationSlice";
import { imageTrimSlice } from "./slices/imageTrimSlice";
import { warmupSlice } from './slices/warmupSlice';

// Define the store state that combines all slices
type StoreSliceState = ReturnType<typeof baseShapeSlice> &
  ReturnType<typeof stickyNoteSlice> &
  ReturnType<typeof groupSlice> &
  ReturnType<typeof imageSlice> &
  ReturnType<typeof historySlice> &
  ReturnType<typeof clipboardSlice> &
  ReturnType<typeof canvasSlice> &
  ReturnType<typeof drawerSlice> &
  ReturnType<typeof toolSlice> &
  ReturnType<typeof preProcessSlice> &
  ReturnType<typeof uiSlice> &
  ReturnType<typeof generationHandlerSlice> &
  ReturnType<typeof subjectGenerationSlice> &
  ReturnType<typeof imageTrimSlice> &
  ReturnType<typeof warmupSlice>;

// Create the store with middleware
export const useStore = create<StoreSliceState>()(
  devtools(
    (...a) => ({
      ...baseShapeSlice(...a),
      ...stickyNoteSlice(...a),
      ...groupSlice(...a),
      ...imageSlice(...a),
      ...historySlice(...a),
      ...clipboardSlice(...a),
      ...canvasSlice(...a),
      ...drawerSlice(...a),
      ...toolSlice(...a),
      ...preProcessSlice(...a),
      ...uiSlice(...a),
      ...generationHandlerSlice(...a),
      ...subjectGenerationSlice(...a),
      ...imageTrimSlice(...a),
      ...warmupSlice(...a),
    }),
    { name: "PicabiaBolt Store" }
  )
);