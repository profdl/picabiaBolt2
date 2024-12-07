// AssetsDrawer.tsx
import React, { useRef, useEffect } from 'react';
import { Upload, Loader2, Search } from 'lucide-react';
import { useStore } from '../store';
import { Drawer } from './Drawer';
import ImageGrid from './ui/ImageGrid';
import { supabase } from '../lib/supabase';


interface Asset {
  id: string;
  url: string;
  created_at: string;
  user_id: string;
  width?: number;
  height?: number;
}

interface AssetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}



export const AssetsDrawer: React.FC<AssetsDrawerProps> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = React.useState('my-assets');
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const {
    uploadAsset,
    addImageToCanvas,
    deleteAsset,
    assetsRefreshTrigger,
    unsplashQuery,
    setUnsplashQuery,
  } = useStore(state => ({
    uploadAsset: state.uploadAsset,
    addImageToCanvas: state.addImageToCanvas,
    deleteAsset: state.deleteAsset,
    assetsRefreshTrigger: state.assetsRefreshTrigger,
    unsplashQuery: state.unsplashQuery,
    setUnsplashQuery: state.setUnsplashQuery,
  }));

  const {
    unsplashImages,
    unsplashLoading
  } = useStore(state => {
    console.log('Unsplash Images:', state.unsplashImages); // Add this debug log
    return {
      unsplashImages: state.unsplashImages || [],
      unsplashLoading: state.unsplashLoading
    };
  });

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

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, assetsRefreshTrigger]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadAsset(file);
    } catch (err) {
      console.error('Error uploading asset:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleAssetClick = async (asset: Asset) => {
    const success = await addImageToCanvas(asset);
    if (success) {
      onClose();
    }
  };

  const handleDeleteAsset = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      await deleteAsset(assetId, asset.url);
      setAssets(prevAssets => prevAssets.filter(a => a.id !== assetId));
    }
  };

  const mapAssetsToImageItems = (assets: Asset[]) => {
    return assets.map(asset => ({
      id: asset.id,
      url: asset.url,
      status: 'completed' as const
    }));
  };

  // Add this effect to handle search
  useEffect(() => {
    const searchUnsplash = async () => {
      if (!unsplashQuery.trim()) return;

      try {
        const response = await fetch(`/.netlify/functions/unsplash-search?query=${encodeURIComponent(unsplashQuery)}`);
        const data = await response.json();

        // Update Unsplash images in store
        useStore.setState({
          unsplashImages: data.results,
          unsplashLoading: false
        });
      } catch (error) {
        console.error('Unsplash search error:', error);
        useStore.setState({ unsplashLoading: false });
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(() => {
      if (unsplashQuery) {
        useStore.setState({ unsplashLoading: true });
        searchUnsplash();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [unsplashQuery]);


  return (
    <Drawer
      title="Assets"
      isOpen={isOpen}
      onClose={onClose}
      position="left"
    >
      <div className="flex flex-col h-full">
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
                className="w-full mb-4 p-2 flex items-center justify-center gap-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
              <ImageGrid
                images={mapAssetsToImageItems(assets)}
                loading={loading}
                emptyMessage="No uploaded assets yet"
                onImageClick={(image) => handleAssetClick(assets.find(a => a.id === image.id)!)}
                onImageDelete={handleDeleteAsset}
              />
            </div>
          )}
          {activeTab === 'stock' && (
            <div className="p-4">
              <div className="relative mb-3">
                <input
                  type="text"
                  value={unsplashQuery}
                  onChange={(e) => setUnsplashQuery(e.target.value)}
                  placeholder="Search images..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
              <ImageGrid

                images={unsplashImages?.map(img => ({
                  id: img.id,
                  url: img.urls.regular,
                  thumbnailUrl: img.urls.thumb,
                  alt: img.alt_description || 'Unsplash image',
                  status: 'completed' as const,

                })) || []}
                loading={unsplashLoading}
                emptyMessage="Search for images to get started"
                onImageClick={(image) => {
                  const unsplashImage = unsplashImages.find(img => img.id === image.id);
                  if (unsplashImage) {
                    handleAssetClick({
                      id: unsplashImage.id,
                      url: unsplashImage.urls.regular,
                      created_at: new Date().toISOString(),
                      user_id: '',
                      width: unsplashImage.width,
                      height: unsplashImage.height
                    });
                  }
                }}
                onImageDelete={() => { }}
                showViewButton={false}
                imageUrlKey="thumbnailUrl"
              />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
