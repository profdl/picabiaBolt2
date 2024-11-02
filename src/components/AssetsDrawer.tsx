import React, { useState, useRef } from 'react';
import { Upload, Search, Plus } from 'lucide-react';
import { Drawer } from './Drawer';


interface Asset {
  id: string;
  url: string;
  name: string;
  type: 'image';
  createdAt: string;
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
  const [activeTab, setActiveTab] = useState<'my-assets' | 'unsplash'>('my-assets');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]); // This would be populated from your backend
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
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
    });
  };

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

  return (
    <Drawer 
    title="Assets" 
    isOpen={isOpen} 
    onClose={onClose}
    position="left"
  >      
  {/* Tabs */}
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

      {/* Content */}
      <div className="p-4">
        {activeTab === 'my-assets' ? (
          <>
            {/* Upload Button */}
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

            {/* Search */}
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

            {/* Assets Grid */}
            <div className="grid grid-cols-2 gap-2">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => handleAssetClick(asset)}
                  className="aspect-square rounded-lg border border-gray-200 overflow-hidden hover:border-blue-500 transition-colors"
                >
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </>
        ) : (
          // Unsplash tab content would go here
          <div className="flex items-center justify-center h-full text-gray-500">
            Unsplash integration coming soon...
          </div>
        )}
      </div>
    </Drawer>
  );
};