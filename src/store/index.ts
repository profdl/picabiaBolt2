import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { canvasSlice } from "./slices/canvasSlice";
import { drawerSlice } from "./slices/drawerSlice";
import { shapeSlice } from "./slices/shapeSlice";
import { toolSlice } from "./slices/toolSlice";
import { preProcessSlice } from "./slices/preProcessSlice";
import { uiSlice } from "./slices/uiSlice";
import { generationHandlerSlice } from "./slices/generationHandlerSlice";
import { subjectGenerationSlice } from "./slices/subjectGenerationSlice";
import { imageTrimSlice } from "./slices/imageTrimSlice";
import { warmupSlice } from './slices/warmupSlice';

type State = {
  [K in keyof ReturnType<typeof shapeSlice>]: ReturnType<typeof shapeSlice>[K];
} & {
  [K in keyof ReturnType<typeof canvasSlice>]: ReturnType<
    typeof canvasSlice
  >[K];
} & {
  [K in keyof ReturnType<typeof drawerSlice>]: ReturnType<
    typeof drawerSlice
  >[K];
} & {
  [K in keyof ReturnType<typeof toolSlice>]: ReturnType<typeof toolSlice>[K];
} & {
  [K in keyof ReturnType<typeof preProcessSlice>]: ReturnType<
    typeof preProcessSlice
  >[K];
} & {
  [K in keyof ReturnType<typeof uiSlice>]: ReturnType<typeof uiSlice>[K];
} & {
  [K in keyof ReturnType<typeof generationHandlerSlice>]: ReturnType<
    typeof generationHandlerSlice
  >[K];
} & {
  [K in keyof ReturnType<typeof subjectGenerationSlice>]: ReturnType<
    typeof subjectGenerationSlice
  >[K];
} & {
  [K in keyof ReturnType<typeof imageTrimSlice>]: ReturnType<
    typeof imageTrimSlice
  >[K];
} & {
  [K in keyof ReturnType<typeof warmupSlice>]: ReturnType<typeof warmupSlice>[K];
};

export const useStore = create<State>()(
  devtools(
    (...a) => ({
      ...warmupSlice(...a),
      ...shapeSlice(...a),
      ...canvasSlice(...a),
      ...drawerSlice(...a),
      ...toolSlice(...a),
      ...preProcessSlice(...a),
      ...uiSlice(...a),
      ...generationHandlerSlice(...a),
      ...subjectGenerationSlice(...a),
      ...imageTrimSlice(...a),
    }),
    { name: "PicabiaBolt Store" }
  )
);