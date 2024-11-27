import { convertToWebP, uploadAssetToSupabase } from "../lib/supabase";
import { useStore } from '../store';

export const useImageUpload = () => {
    const { addShape, deleteShape, triggerAssetsRefresh } = useStore();

    const handleImageUpload = async (file: File, point: { x: number; y: number; }, p0: { width: number; height: number; }) => {
        const tempId = Math.random().toString(36).substr(2, 9);

        addShape({
            id: tempId,
            type: 'image',
            position: {
                x: point.x - 150,
                y: point.y - 150
            },
            width: 300,
            height: 300,
            color: 'transparent',
            imageUrl: URL.createObjectURL(file),
            rotation: 0,
            isUploading: true
        });

        try {
            const webpBlob = await convertToWebP(file);
            const { publicUrl } = await uploadAssetToSupabase(webpBlob);

            addShape({
                id: Math.random().toString(36).substr(2, 9),
                type: 'image',
                position: {
                    x: point.x - 150,
                    y: point.y - 150
                },
                width: 300,
                height: 300,
                color: 'transparent',
                imageUrl: publicUrl,
                rotation: 0,
                isUploading: false
            });

            deleteShape(tempId);
            triggerAssetsRefresh();

        } catch (err) {
            console.error('Upload failed:', err);
            deleteShape(tempId);
        }
    };

    return { handleImageUpload };
};
