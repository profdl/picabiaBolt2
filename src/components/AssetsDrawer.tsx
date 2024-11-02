import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Search, Loader, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Drawer } from './Drawer';
import debounce from 'lodash/debounce';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const UNSPLASH_ACCESS_KEY = '8Pc0QO3oorclz9uR4RVfaFD5aXcBUnJ-2d9FP-KtI9U';
const UNSPLASH_API_URL = 'https://api.unsplash.com';

interface Asset {
  id: string;
  name: string;
  url: string;
  source: 'upload' | 'unsplash';
  unsplash_user_name?: string;
  created_at: string;
}

interface UnsplashImage {
  id: string;
  urls: {
    regular: string;
    thumb: string;
  };
  alt_description: string;
  user: {
    name: string;
    username: string;
  };
  width: number;
  height: number;
}

interface AssetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  addShape: (shape: any) => void;
  getViewportCenter: () => { x: number; y: number };
}

export const AssetsDrawer: React.FC<AssetsDrawerProps> = ({
  isOpen,
  onClose,
  addShape,
  getViewportCenter
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-assets' | 'unsplash'>('my-assets');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [unsplashImages, setUnsplashImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch assets from Supabase
  const fetchAssets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  // Upload asset to Supabase Storage and save reference in assets table
  const uploadAsset = async (file: File) => {
    if (!user) return;

    try {
      // Upload to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      // Save to assets table
      const { error: insertError } = await supabase
        .from('assets')
        .insert({
          user_id: user.id,
          name: file.name,
          url: publicUrl,
          source: 'upload'
        });

      if (insertError) throw insertError;

      // Refresh assets list
      await fetchAssets();
    } catch (err) {
      console.error('Error uploading asset:', err);
      setError('Failed to upload asset');
    }
  };

  // Save Unsplash image to assets
  const saveUnsplashImage = async (image: UnsplashImage) => {
    if (!user) return;

    try {
      const { error: insertError } = await supabase
        .from('assets')
        .insert({
          user_id: user.id,
          name: image.alt_description || 'Unsplash image',
          url: image.urls.regular,
          source: 'unsplash',
          unsplash_user_name: image.user.name
        });

      if (insertError) throw insertError;

      // Refresh assets list
      await fetchAssets();
    } catch (err) {
      console.error('Error saving Unsplash image:', err);
      setError('Failed to save Unsplash image');
    }
  };

  // Delete asset
  const deleteAsset = async (assetId: string) => {
    if (!user) return;

    try {
      const asset = assets.find(a => a.id === assetId);
      if (!asset) return;

      // If it's an uploaded asset, delete from storage
      if (asset.source === 'upload') {
        const storagePathMatch = asset.url.match(/assets\/([^?]+)/);
        if (storagePathMatch) {
          const storagePath = storagePathMatch[1];
          await supabase.storage
            .from('assets')
            .remove([storagePath]);
        }
      }

      // Delete from assets table
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId);

      if (error) throw error;

      // Refresh assets list
      await fetchAssets();
    } catch (err) {
      console.error('Error deleting asset:', err);
      setError('Failed to delete asset');
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await uploadAsset(file);
      
      // Add to canvas
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        const center = getViewportCenter();
        
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
          imageUrl,
          rotation: 0,
          aspectRatio: 1.5,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Unsplash image click
  const handleUnsplashImageClick = async (image: UnsplashImage) => {
    await saveUnsplashImage(image);
    
    const center = getViewportCenter();
    const maxWidth = 512;
    const aspectRatio = image.width / image.height;
    const width = Math.min(maxWidth, image.width);
    const height = width / aspectRatio;

    addShape({
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      position: {
        x: center.x - width / 2,
        y: center.y - height / 2
      },
      width,
      height,
      color: 'transparent',
      imageUrl: image.urls.regular,
      rotation: 0,
      aspectRatio,
    });
  };

  // Search Unsplash
  const searchUnsplashImages = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setUnsplashImages([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(
            query
          )}&per_page=20&orientation=landscape`,
          {
            headers: {
              Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch images');

        const data = await response.json();
        setUnsplashImages(data.results);
      } catch (err) {
        setError('Failed to load images');
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  // Handle asset click
  const handleAssetClick = (asset: Asset) => {
    const center = getViewportCenter();
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
      aspectRatio: 1.5,
    });
  };

  // Filter assets based on search query
  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Effects
  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (activeTab === 'unsplash' && searchQuery) {
      searchUnsplashImages(searchQuery);
    }
    return () => searchUnsplashImages.cancel();
  }, [searchQuery, activeTab, searchUnsplashImages]);

  return (
    <Drawer 
      title="Assets" 
      isOpen={isOpen} 
      onClose={onClose}
      position="left"
    >      
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('my-assets')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'my-assets'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          My Assets
        </button>
        <button
          onClick={() => setActiveTab('unsplash')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'unsplash'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Unsplash
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'my-assets' ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">
                  Upload Images
                </span>
                <span className="text-xs text-gray-400">
                  Drop files here or click to browse
                </span>
              </div>
            </button>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search my assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <Loader className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : filteredAssets.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="group relative rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <button
                      onClick={() => handleAssetClick(asset)}
                      className="w-full aspect-square"
                    >
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                          Click to add
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => deleteAsset(asset.id)}
                      className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    {asset.source === 'unsplash' && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-xs text-white truncate">
                          By {asset.unsplash_user_name}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No assets found</p>
              </div>
            )}
          </>
        ) : (
          // Unsplash tab content
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Unsplash images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-2 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : unsplashImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {unsplashImages.map((image) => (
                    <div
                      key={image.id}
                      className="group relative cursor-pointer rounded-md overflow-hidden hover:ring-2 hover:ring-blue-500"
                      onClick={() => handleUnsplashImageClick(image)}
                    >
                      <img
                        src={image.urls.thumb}
                        alt={image.alt_description || 'Unsplash image'}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                          Click to add
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-xs text-white truncate">
                          By {image.user.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <p className="text-center text-gray-500 py-4">No images found</p>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Search for images to add to your canvas</p>
                </div>
              )}
            </div>

            {/* Unsplash attribution */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <p>Photos provided by Unsplash. By using Unsplash images, you agree to their <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">license terms</a>.</p>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};