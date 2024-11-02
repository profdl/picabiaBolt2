
import React, { useRef, useState, useEffect } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { useStore } from '../store';
import { Drawer } from './Drawer';

interface Asset {
  id: string;
  url: string;
  created_at: string;
  user_id: string;
}

export const AssetsDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ 
  isOpen, 
  onClose 
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addShape = useStore(state => state.addShape);
  const { zoom, offset } = useStore();

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAssets(data || []);
    } catch (err) {
      console.error('Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Read file as ArrayBuffer to ensure we're uploading raw image data
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);
      
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, fileData, {
          contentType: file.type,
          upsert: false
        });
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('assets')
        .insert([{ 
          url: publicUrl,
          user_id: user.id 
        }]);

      if (dbError) throw dbError;

      await fetchAssets();
    } catch (err) {
      console.error('Error uploading asset:', err);
    } finally {
      setUploading(false);
    }
  };
  const handleAssetClick = (asset: Asset) => {
    const center = {
      x: (window.innerWidth / 2 - offset.x) / zoom,
      y: (window.innerHeight / 2 - offset.y) / zoom
    };

    addShape({
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      position: {
        x: center.x - 150,
        y: center.y - 100
      },
      width: 300,
      height: 200,
      color: 'transparent',
      imageUrl: asset.url,
      rotation: 0,
    });
  };

  return (
    <Drawer
      title="Assets"
      isOpen={isOpen}
      onClose={onClose}
      position="left"
    >
      <div className="p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full mb-4 p-2 flex items-center justify-center gap-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
          {uploading ? 'Uploading...' : 'Upload Image'}
        </button>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => handleAssetClick(asset)}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img
                  src={asset.url}
                  alt="Asset"
                  className="w-full h-32 object-cover rounded"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};
