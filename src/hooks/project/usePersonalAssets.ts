import { useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { Asset } from "../../types";
import { useStore } from "../../store";

export const usePersonalAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ASSETS_PER_PAGE = 20;
  
  const deleteAsset = useStore(state => state.deleteAsset);

  const fetchAssets = useCallback(async (pageNumber = 1) => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const from = (pageNumber - 1) * ASSETS_PER_PAGE;
      const to = from + ASSETS_PER_PAGE - 1;

      // First get the total count
      const { count } = await supabase
        .from("assets")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id);

      // If we're trying to fetch beyond available data, stop
      if (count && from >= count) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      setAssets(prev => pageNumber === 1 ? data || [] : [...prev, ...(data || [])]);
      setHasMore(count ? from + ASSETS_PER_PAGE < count : false);
    } catch (err) {
      console.error("Error fetching assets:", err);
    } finally {
      setLoading(false);
    }
  }, []); 

  const handleDeleteAsset = useCallback(async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const asset = assets.find((a) => a.id === assetId);
    if (asset) {
      await deleteAsset(assetId, asset.url);
      setAssets((prevAssets) => prevAssets.filter((a) => a.id !== assetId));
    }
  }, [assets, deleteAsset]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      fetchAssets(page + 1);
    }
  }, [loading, hasMore, page, fetchAssets]);

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
    hasMore,
    fetchAssets,
    loadMore,
    handleDeleteAsset,
    mapAssetsToImageItems,
  };
};