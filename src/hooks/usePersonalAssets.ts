import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Asset } from "../types";
import { useStore } from "../store";

export const usePersonalAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Move store selector outside of hook body
  const deleteAsset = useStore(state => state.deleteAsset);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (err) {
      console.error("Error fetching assets:", err);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array since it doesn't depend on any props or state

  const handleDeleteAsset = useCallback(async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const asset = assets.find((a) => a.id === assetId);
    if (asset) {
      await deleteAsset(assetId, asset.url);
      setAssets((prevAssets) => prevAssets.filter((a) => a.id !== assetId));
    }
  }, [assets, deleteAsset]);

  const mapAssetsToImageItems = useCallback((assets: Asset[]) => {
    return assets.map((asset) => ({
      id: asset.id,
      url: asset.url,
      status: "completed" as const,
    }));
  }, []);

  return {
    assets,
    loading,
    fetchAssets,
    handleDeleteAsset,
    mapAssetsToImageItems,
  };
};