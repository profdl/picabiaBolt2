import { StateCreator } from "zustand";
import { ContextMenuState } from "../../types";
import { supabase } from "../../lib/supabase";

interface Asset {
  url: string;
  id: string;
  created_at: string;
  user_id: string;
}
interface UiState {
  assetsRefreshTrigger: number;
  uploadingAssets: unknown[];
  galleryRefreshCounter: number;
  showAssets: unknown;
  showGallery: unknown;
  showUnsplash: unknown;
  showImageGenerate: unknown;
  setError: (error: string | null) => void;
  uploadAsset: (file: File) => Promise<Asset>;
  showTooltips: boolean;
  isColorPickerOpen: boolean;
  setColorPickerOpen: (isOpen: boolean) => void;
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
  uploadAsset: (file: File) => Promise<Asset>;
  showTooltips: boolean;
  toggleTooltips: () => void;
  isColorPickerOpen: boolean;
  setColorPickerOpen: (isOpen: boolean) => void;
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
  showTooltips: true,
  toggleTooltips: () => set((state) => ({ showTooltips: !state.showTooltips })),
  toggleImageGenerate: () =>
    set((state) => ({ showImageGenerate: !state.showImageGenerate })),
  toggleUnsplash: () => set((state) => ({ showUnsplash: !state.showUnsplash })),
  toggleGallery: () => set((state) => ({ showGallery: !state.showGallery })),
  toggleAssets: () => set((state) => ({ showAssets: !state.showAssets })),
  setShowShortcuts: (show: boolean) =>
    set((state) => ({ ...state, showShortcuts: show })),
  setError: (error: string | null) => set((state) => ({ ...state, error })),
  setContextMenu: (menu: ContextMenuState | null) =>
    set((state) => ({ ...state, contextMenu: menu })),
  setIsTextEditing: (isEditing) =>
    set((state) => ({ ...state, isTextEditing: isEditing })),
  refreshGallery: () =>
    set((state) => ({
      galleryRefreshCounter: state.galleryRefreshCounter + 1,
    })),
  addUploadingAsset: (id) =>
    set((state) => ({ uploadingAssets: [...state.uploadingAssets, id] })),
  removeUploadingAsset: (id) =>
    set((state) => ({
      uploadingAssets: state.uploadingAssets.filter(
        (assetId) => assetId !== id
      ),
    })),
  triggerAssetsRefresh: () =>
    set((state) => ({ assetsRefreshTrigger: state.assetsRefreshTrigger + 1 })),
  uploadAsset: async (file: File) => {
    const { data, error } = await supabase.storage
      .from("assets")
      .upload(`${Math.random().toString(36).substring(7)}`, file);

    if (error) throw error;

    const assetUrl = supabase.storage.from("assets").getPublicUrl(data.path)
      .data.publicUrl;

    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const asset: Asset = {
      url: assetUrl,
      id: data.path,
      created_at: new Date().toISOString(),
      user_id: userId,
    };

    return asset;
  },
  isColorPickerOpen: false,
  setColorPickerOpen: (isOpen: boolean) => set((state) => ({ isColorPickerOpen: isOpen })),
});
