import React from 'react';
import { format } from 'date-fns';

interface SavedImage {
    id: string;
    image_url: string;
    image_url_2: string | null;
    image_url_3: string | null;
    image_url_4: string | null;
    prompt: string;
    created_at: string;
    status: 'generating' | 'completed' | 'failed';
    aspect_ratio: string;
}

interface ImageDetailsModalProps {
    image: SavedImage | null;
    onClose: () => void;
}


export const ImageDetailsModal: React.FC<ImageDetailsModalProps> = ({ image, onClose }) => {
    if (!image) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-medium">Image Details</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                    <div className="aspect-square">
                        <img src={image.image_url} alt={image.prompt} className="w-full h-full object-contain" />
                    </div>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-medium text-gray-700">Prompt</h3>
                            <p className="mt-1 text-gray-600">{image.prompt}</p>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-700">Created</h3>
                            <p className="mt-1 text-gray-600">{format(new Date(image.created_at), 'PPpp')}</p>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-700">Aspect Ratio</h3>
                            <p className="mt-1 text-gray-600">{image.aspect_ratio}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
