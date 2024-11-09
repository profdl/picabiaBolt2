import { StateCreator } from 'zustand'
import { Shape, Position } from '../../types'

const MAX_HISTORY = 50

interface ShapeSlice {
    shapes: Shape[]
    selectedShapes: string[]
    history: Shape[][]
    historyIndex: number
    clipboard: Shape[]
    zoom: number
    offset: Position

    setShapes: (shapes: Shape[]) => void
    addShape: (shape: Shape) => void
    addShapes: (shapes: Shape[]) => void
    updateShape: (id: string, props: Partial<Shape>) => void
    updateShapes: (updates: { id: string; shape: Partial<Shape> }[]) => void
    deleteShape: (id: string) => void
    deleteShapes: (ids: string[]) => void
    setSelectedShapes: (ids: string[]) => void
    setZoom: (zoom: number) => void
    setOffset: (offset: Position) => void
    copyShapes: () => void
    cutShapes: () => void
    pasteShapes: (offset?: Position) => void
    undo: () => void
    redo: () => void
    resetState: () => void

}

export const createShapeSlice: StateCreator<ShapeSlice> = (set, get) => ({
    shapes: [],
    selectedShapes: [],
    history: [[]],
    historyIndex: 0,
    clipboard: [],
    zoom: 1,
    offset: { x: 0, y: 0 },

    setShapes: (shapes) => {
        set({
            shapes,
            history: [...get().history.slice(0, get().historyIndex + 1), shapes].slice(-MAX_HISTORY),
            historyIndex: get().historyIndex + 1,
            selectedShapes: [],
        })
    },

    addShape: (shape) => {
        set(state => {
            const newShapes = [...state.shapes, shape]
            return {
                shapes: newShapes,
                history: [...state.history.slice(0, state.historyIndex + 1), newShapes],
                historyIndex: state.historyIndex + 1
            }
        })
    },

    addShapes: (newShapes) => {
        const { shapes, historyIndex, history } = get()
        const updatedShapes = [...shapes, ...newShapes]
        set({
            shapes: updatedShapes,
            history: [...history.slice(0, historyIndex + 1), updatedShapes].slice(-MAX_HISTORY),
            historyIndex: historyIndex + 1,
        })
    },

    updateShape: (id, updatedProps) => {
        const { shapes, historyIndex, history } = get()
        const newShapes = shapes.map((shape) =>
            shape.id === id ? { ...shape, ...updatedProps } : shape
        )
        set({
            shapes: newShapes,
            history: [...history.slice(0, historyIndex + 1), newShapes].slice(-MAX_HISTORY),
            historyIndex: historyIndex + 1,
        })
    },

    updateShapes: (updates) => {
        const { shapes, historyIndex, history } = get()
        const newShapes = shapes.map((shape) => {
            const update = updates.find((u) => u.id === shape.id)
            return update ? { ...shape, ...update.shape } : shape
        })
        set({
            shapes: newShapes,
            history: [...history.slice(0, historyIndex + 1), newShapes].slice(-MAX_HISTORY),
            historyIndex: historyIndex + 1,
        })
    },

    deleteShape: (id) => {
        const { shapes, historyIndex, history, selectedShapes } = get()
        const newShapes = shapes.filter((shape) => shape.id !== id)
        set({
            shapes: newShapes,
            selectedShapes: selectedShapes.filter((shapeId) => shapeId !== id),
            history: [...history.slice(0, historyIndex + 1), newShapes].slice(-MAX_HISTORY),
            historyIndex: historyIndex + 1,
        })
    },

    deleteShapes: (ids) => {
        const { shapes, historyIndex, history } = get()
        const newShapes = shapes.filter((shape) => !ids.includes(shape.id))
        set({
            shapes: newShapes,
            selectedShapes: [],
            history: [...history.slice(0, historyIndex + 1), newShapes].slice(-MAX_HISTORY),
            historyIndex: historyIndex + 1,
        })
    },

    setSelectedShapes: (ids) => set({ selectedShapes: ids }),
    setZoom: (zoom) => set({ zoom }),
    setOffset: (offset) => set({ offset }),

    copyShapes: () => {
        const { shapes, selectedShapes } = get()
        const shapesToCopy = shapes.filter((shape) => selectedShapes.includes(shape.id))
        set({ clipboard: shapesToCopy })
    },

    cutShapes: () => {
        const { shapes, selectedShapes, historyIndex, history } = get()
        const shapesToCut = shapes.filter((shape) => selectedShapes.includes(shape.id))
        const remainingShapes = shapes.filter((shape) => !selectedShapes.includes(shape.id))
        set({
            shapes: remainingShapes,
            selectedShapes: [],
            clipboard: shapesToCut,
            history: [...history.slice(0, historyIndex + 1), remainingShapes].slice(-MAX_HISTORY),
            historyIndex: historyIndex + 1,
        })
    },

    pasteShapes: (offset = { x: 20, y: 20 }) => {
        const { clipboard, shapes, historyIndex, history } = get()
        if (clipboard.length === 0) return

        const newShapes = clipboard.map((shape) => ({
            ...shape,
            id: Math.random().toString(36).substr(2, 9),
            position: {
                x: shape.position.x + offset.x,
                y: shape.position.y + offset.y,
            },
        }))

        const updatedShapes = [...shapes, ...newShapes]
        set({
            shapes: updatedShapes,
            selectedShapes: newShapes.map((shape) => shape.id),
            history: [...history.slice(0, historyIndex + 1), updatedShapes].slice(-MAX_HISTORY),
            historyIndex: historyIndex + 1,
        })
    },

    undo: () => {
        const { historyIndex, history } = get()
        if (historyIndex > 0) {
            set({
                shapes: history[historyIndex - 1],
                historyIndex: historyIndex - 1,
                selectedShapes: [],
            })
        }
    },

    redo: () => {
        const { historyIndex, history } = get()
        if (historyIndex < history.length - 1) {
            set({
                shapes: history[historyIndex + 1],
                historyIndex: historyIndex + 1,
                selectedShapes: [],
            })
        }
    },
    resetState: () => set({
        shapes: [],
        selectedShapes: [],
        history: [[]],
        historyIndex: 0,
        clipboard: [],
        zoom: 1,
        offset: { x: 0, y: 0 }
    })
})
