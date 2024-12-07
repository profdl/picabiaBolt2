import { StateCreator } from 'zustand';
import { ContextMenuState } from '../../types';

interface UiState {
    assetsRefreshTrigger: number;
    uploadingAssets: unknown[];
    galleryRefreshCounter: number;
    showAssets: unknown;
    showGallery: unknown;
    showUnsplash: unknown;
    showImageGenerate: unknown;
    setError: (error: string | null) => void;
}

interface UiSlice {
    showImageGenerate: boolean;
    showUnsplash: boolean;
    showGallery: boolean;
    showShortcuts: boolean;
    showAssets: boolean;
    isTextEditing: boolean;
    error: string | null;
    contextMenu: ContextMenuState | null;
    galleryRefreshCounter: number;
    uploadingAssets: string[];
    assetsRefreshTrigger: number;
    toggleImageGenerate: () => void;
    toggleUnsplash: () => void;
    toggleGallery: () => void;
    toggleAssets: () => void;
    setShowShortcuts: (show: boolean) => void;
    setError: (error: string | null) => void;
    setContextMenu: (menu: ContextMenuState | null) => void;
    setIsTextEditing: (isEditing: boolean) => void;
    refreshGallery: () => void;
    addUploadingAsset: (id: string) => void;
    removeUploadingAsset: (id: string) => void;
    triggerAssetsRefresh: () => void;
}

export const uiSlice: StateCreator<UiState, [], [], UiSlice> = (set) => ({
    showImageGenerate: false,
    showUnsplash: false,
    showGallery: false,
    showShortcuts: false,
    showAssets: false,
    isTextEditing: false,
    error: null,
    contextMenu: null,
    galleryRefreshCounter: 0,
    uploadingAssets: [],
    assetsRefreshTrigger: 0,
    toggleImageGenerate: () => set((state) => ({ showImageGenerate: !state.showImageGenerate })),
    toggleUnsplash: () => set((state) => ({ showUnsplash: !state.showUnsplash })),
    toggleGallery: () => set((state) => ({ showGallery: !state.showGallery })),
    toggleAssets: () => set((state) => ({ showAssets: !state.showAssets })),
    setShowShortcuts: (show: boolean) => set((state) => ({ ...state, showShortcuts: show })),
    setError: (error: string | null) => set((state) => ({ ...state, error })),
    setContextMenu: (menu: ContextMenuState | null) => set((state) => ({ ...state, contextMenu: menu })),
    setIsTextEditing: (isEditing) => set((state) => ({ ...state, isTextEditing: isEditing })),
    refreshGallery: () => set((state) => ({ galleryRefreshCounter: state.galleryRefreshCounter + 1 })), addUploadingAsset: (id) => set((state) => ({ uploadingAssets: [...state.uploadingAssets, id] })),
    removeUploadingAsset: (id) => set((state) => ({ uploadingAssets: state.uploadingAssets.filter((assetId) => assetId !== id) })),
    triggerAssetsRefresh: () => set((state) => ({ assetsRefreshTrigger: state.assetsRefreshTrigger + 1 }))
});