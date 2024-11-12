import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Upload, Loader2, Search, ImageIcon, TrashIcon } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { useStore } from '../store';
import { Drawer } from './Drawer';
import { debounce } from 'lodash';
import { getImageDimensions } from '../utils/image';

// Add Unsplash constants
const UNSPLASH_ACCESS_KEY = '8Pc0QO3oorclz9uR4RVfaFD5aXcBUnJ-2d9FP-KtI9U';
const UNSPLASH_API_URL = 'https://api.unsplash.com';

interface Asset {
  id: string;
  url: string;
  created_at: string;
  user_id: string;
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

export const AssetsDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  // Existing assets state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addShape = useStore(state => state.addShape);
  const { zoom, offset } = useStore();

  // Add Unsplash state
  const [activeTab, setActiveTab] = useState('my-assets');
  const [query, setQuery] = useState('');
  const [unsplashImages, setUnsplashImages] = useState<UnsplashImage[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, asset: Asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'asset',
      url: asset.url
    }));
  };

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

  const handleAssetClick = async (asset: Asset) => {
    const dimensions = await getImageDimensions(asset.url);
    const aspectRatio = dimensions.width / dimensions.height;

    const center = {
      x: (window.innerWidth / 2 - offset.x) / zoom,
      y: (window.innerHeight / 2 - offset.y) / zoom
    };

    // Base width of 300, height adjusted by aspect ratio
    const baseWidth = 300;
    const width = baseWidth;
    const height = baseWidth / aspectRatio;

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
      imageUrl: asset.url,
      rotation: 0,
    });
  };

  // Add Unsplash search functionality
  const searchImages = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setUnsplashImages([]);
        return;
      }

      setUnsplashLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(
            searchQuery
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
        setError('Failed to load images. Please try again.');
        console.error('Error fetching Unsplash images:', err);
      } finally {
        setUnsplashLoading(false);
      }
    }, 500),
    []
  );
  useEffect(() => {
    if (query) {
      searchImages(query);
    }
    return () => searchImages.cancel();
  }, [query, searchImages]);

  const deleteAsset = async (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      // Log the asset details we're trying to delete
      console.log('Deleting asset:', asset);

      // Get filename from URL
      const fileName = asset.url.split('/').pop();

      // Delete from storage bucket
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('assets')
          .remove([fileName]);

        console.log('Storage deletion result:', { error: storageError });
      }

      // Delete from assets table with logging
      const { data: deleteData, error: dbError } = await supabase
        .from('assets')
        .delete()
        .match({
          id: asset.id,
          user_id: user.id
        })
        .select();

      console.log('Database deletion result:', { data: deleteData, error: dbError });

      if (dbError) throw dbError;

      setAssets(currentAssets => currentAssets.filter(a => a.id !== asset.id));

    } catch (err) {
      console.error('Error deleting asset:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = async (image: UnsplashImage) => {
    const aspectRatio = image.width / image.height;

    const center = {
      x: (window.innerWidth / 2 - offset.x) / zoom,
      y: (window.innerHeight / 2 - offset.y) / zoom
    };

    const baseWidth = 300;
    const width = baseWidth;
    const height = baseWidth / aspectRatio;

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
    });
  };
  return (
    <Drawer
      title="Assets"
      isOpen={isOpen}
      onClose={onClose}
      position="left"
    >
      <div className="flex flex-col h-full">
        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('my-assets')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'my-assets'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            My Assets
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'stock'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Stock Images
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'my-assets' && (
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
                className="w-full mb-4 p-2 flex items-center justify-center gap-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 sticky top-0"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, asset)}
                    onClick={() => handleAssetClick(asset)}
                    className="relative group cursor-pointer"
                  >
                    <img
                      src={asset.url}
                      alt="Asset"
                      className="w-full h-32 object-cover rounded"
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => deleteAsset(asset, e)}
                        className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="p-4">
              <div className="relative mb-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search images..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>

              <div className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {unsplashLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : unsplashImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {unsplashImages.map((image) => (
                      <div
                        key={image.id}
                        className="group relative cursor-grab rounded-md overflow-hidden hover:ring-2 hover:ring-blue-500"
                        onClick={() => handleImageClick(image)}
                      >
                        <img
                          src={image.urls.thumb}
                          alt={image.alt_description || 'Unsplash image'}
                          className="w-full h-32 object-cover"
                          draggable={false}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                            Click to add
                          </span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                          <p className="text-xs text-white">
                            Photo by {image.user.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : query ? (
                  <p className="text-center text-gray-500 py-4">No images found</p>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>Search for images to add to your canvas</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
};


