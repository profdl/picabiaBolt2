import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { canvasSlice } from './slices/canvasSlice';
import { drawerSlice } from './slices/drawerSlice';
import { shapeSlice } from './slices/shapeSlice';
import { toolSlice } from './slices/toolSlice';
import { generationSlice } from './slices/generationSlice';
import { historySlice } from './slices/historySlice';
import { uiSlice } from './slices/uiSlice';
import { generationHandlerSlice } from './slices/generationHandlerSlice';
import { subjectGenerationSlice } from './slices/subjectGenerationSlice';

type State = {
    [K in keyof ReturnType<typeof shapeSlice>]: ReturnType<typeof shapeSlice>[K];
} & {
    [K in keyof ReturnType<typeof canvasSlice>]: ReturnType<typeof canvasSlice>[K];
} & {
    [K in keyof ReturnType<typeof drawerSlice>]: ReturnType<typeof drawerSlice>[K];
} & {
    [K in keyof ReturnType<typeof toolSlice>]: ReturnType<typeof toolSlice>[K];
} & {
    [K in keyof ReturnType<typeof generationSlice>]: ReturnType<typeof generationSlice>[K];
} & {
    [K in keyof ReturnType<typeof historySlice>]: ReturnType<typeof historySlice>[K];
} & {
    [K in keyof ReturnType<typeof uiSlice>]: ReturnType<typeof uiSlice>[K];
} & {
    [K in keyof ReturnType<typeof generationHandlerSlice>]: ReturnType<typeof generationHandlerSlice>[K];
} & {
    [K in keyof ReturnType<typeof subjectGenerationSlice>]: ReturnType<typeof subjectGenerationSlice>[K];
};

export const useStore = create<State>()(
    devtools(
        (...a) => ({
            ...shapeSlice(...a),
            ...canvasSlice(...a),
            ...drawerSlice(...a),
            ...toolSlice(...a),
            ...generationSlice(...a),
            ...historySlice(...a),
            ...uiSlice(...a),
            ...generationHandlerSlice(...a),
            ...subjectGenerationSlice(...a)
        }),
        { name: 'PicabiaBolt Store' }
    )
);