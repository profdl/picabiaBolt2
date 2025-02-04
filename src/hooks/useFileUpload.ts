// src/hooks/useFileUpload.ts
import { useRef, useState } from 'react';
import { Asset } from '../types';
import { convertToWebP, uploadAssetToSupabase } from '../lib/supabase';

export function useFileUpload(onUploadSuccess: (asset: Asset) => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const webpBlob = await convertToWebP(file);
      const { publicUrl } = await uploadAssetToSupabase(webpBlob);

      const newAsset: Asset = {
        id: Math.random().toString(36).substr(2, 9),
        url: publicUrl,
        created_at: new Date().toISOString(),
        user_id: "",
      };

      onUploadSuccess(newAsset);
    } catch (err) {
      console.error("Error uploading asset:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return {
    fileInputRef,
    uploading,
    handleFileSelect
  };
}