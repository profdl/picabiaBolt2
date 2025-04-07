import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useStore } from "../../store";
import { Shape } from "../../types";
import { Asset } from "../../types/images";

interface ImageCropperProps {
  imageUrl: string;
  sourceShape: Shape;
  onClose: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageUrl,
  sourceShape,
  onClose,
}) => {
  const { uploadAsset, addShape, shapes } = useStore();
  
  // State for crop area
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState('');
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  
  // Refs for DOM elements
  const modalRef = React.useRef<HTMLDivElement>(null);
  const imageContainerRef = React.useRef<HTMLDivElement>(null);
  const cropSelectionRef = React.useRef<HTMLDivElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const handleRefs = React.useRef<Record<string, HTMLDivElement | null>>({
    n: null, s: null, e: null, w: null, nw: null, ne: null, sw: null, se: null
  });
  
  // Update crop selection position
  const updateCropSelection = () => {
    if (!cropSelectionRef.current) return;
    const selection = cropSelectionRef.current;
    selection.style.left = `${cropArea.x}px`;
    selection.style.top = `${cropArea.y}px`;
    selection.style.width = `${cropArea.width}px`;
    selection.style.height = `${cropArea.height}px`;
  };
  
  // Initialize crop area when image loads
  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;
    
    const handleImageLoad = () => {
      const imgRect = img.getBoundingClientRect();
      const initialSize = Math.min(imgRect.width, imgRect.height) * 0.8;
      
      setCropArea({
        x: (imgRect.width - initialSize) / 2,
        y: (imgRect.height - initialSize) / 2,
        width: initialSize,
        height: initialSize
      });
    };
    
    if (img.complete) {
      handleImageLoad();
    } else {
      img.addEventListener('load', handleImageLoad);
      return () => img.removeEventListener('load', handleImageLoad);
    }
  }, []);
  
  // Update the crop selection when cropArea changes
  useEffect(() => {
    updateCropSelection();
  }, [cropArea]);
  
  // Mouse event handlers
  const onMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Determine the target and action
    const target = e.currentTarget;
    
    // Get the container rect once
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const newStartPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setStartPoint(newStartPoint);
    
    // Handle is being clicked
    if (target.classList.contains('crop-handle')) {
      setIsResizing(true);
      setIsDragging(false);
      const handle = Array.from(target.classList)
        .find(cls => ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'].includes(cls));
      setResizeHandle(handle || '');
      return;
    }
    
    // Crop selection is being clicked
    if (target === cropSelectionRef.current) {
      setIsDragging(true);
      setIsResizing(false);
      setStartPoint({
        x: newStartPoint.x - cropArea.x,
        y: newStartPoint.y - cropArea.y
      });
      return;
    }
  };
  
  const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!isDragging && !isResizing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (isDragging) {
      setCropArea(prev => ({
        ...prev,
        x: Math.max(0, Math.min(mouseX - startPoint.x, rect.width - prev.width)),
        y: Math.max(0, Math.min(mouseY - startPoint.y, rect.height - prev.height))
      }));
    } else if (isResizing) {
      setCropArea(prev => {
        const newArea = { ...prev };
        
        switch (resizeHandle) {
          case 'nw':
            newArea.width = prev.x + prev.width - mouseX;
            newArea.height = prev.y + prev.height - mouseY;
            newArea.x = mouseX;
            newArea.y = mouseY;
            break;
          case 'ne':
            newArea.width = mouseX - prev.x;
            newArea.height = prev.y + prev.height - mouseY;
            newArea.y = mouseY;
            break;
          case 'sw':
            newArea.width = prev.x + prev.width - mouseX;
            newArea.height = mouseY - prev.y;
            newArea.x = mouseX;
            break;
          case 'se':
            newArea.width = mouseX - prev.x;
            newArea.height = mouseY - prev.y;
            break;
          case 'n':
            newArea.height = prev.y + prev.height - mouseY;
            newArea.y = mouseY;
            break;
          case 's':
            newArea.height = mouseY - prev.y;
            break;
          case 'e':
            newArea.width = mouseX - prev.x;
            break;
          case 'w':
            newArea.width = prev.x + prev.width - mouseX;
            newArea.x = mouseX;
            break;
        }
        
        // Ensure minimum size
        if (newArea.width < 20) {
          if (resizeHandle.includes('w')) {
            newArea.x = prev.x + prev.width - 20;
          }
          newArea.width = 20;
        }
        
        if (newArea.height < 20) {
          if (resizeHandle.includes('n')) {
            newArea.y = prev.y + prev.height - 20;
          }
          newArea.height = 20;
        }
        
        return newArea;
      });
    }
  };
  
  const onMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };
  
  // Attach and detach document-level event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;
      
      const rect = imageContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      if (isDragging) {
        setCropArea(prev => ({
          ...prev,
          x: Math.max(0, Math.min(mouseX - startPoint.x, rect.width - prev.width)),
          y: Math.max(0, Math.min(mouseY - startPoint.y, rect.height - prev.height))
        }));
      } else if (isResizing) {
        setCropArea(prev => {
          const newArea = { ...prev };
          
          switch (resizeHandle) {
            case 'nw':
              newArea.width = prev.x + prev.width - mouseX;
              newArea.height = prev.y + prev.height - mouseY;
              newArea.x = mouseX;
              newArea.y = mouseY;
              break;
            case 'ne':
              newArea.width = mouseX - prev.x;
              newArea.height = prev.y + prev.height - mouseY;
              newArea.y = mouseY;
              break;
            case 'sw':
              newArea.width = prev.x + prev.width - mouseX;
              newArea.height = mouseY - prev.y;
              newArea.x = mouseX;
              break;
            case 'se':
              newArea.width = mouseX - prev.x;
              newArea.height = mouseY - prev.y;
              break;
            case 'n':
              newArea.height = prev.y + prev.height - mouseY;
              newArea.y = mouseY;
              break;
            case 's':
              newArea.height = mouseY - prev.y;
              break;
            case 'e':
              newArea.width = mouseX - prev.x;
              break;
            case 'w':
              newArea.width = prev.x + prev.width - mouseX;
              newArea.x = mouseX;
              break;
          }
          
          // Ensure minimum size
          if (newArea.width < 20) {
            if (resizeHandle.includes('w')) {
              newArea.x = prev.x + prev.width - 20;
            }
            newArea.width = 20;
          }
          
          if (newArea.height < 20) {
            if (resizeHandle.includes('n')) {
              newArea.y = prev.y + prev.height - 20;
            }
            newArea.height = 20;
          }
          
          return newArea;
        });
      }
    };
    
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, startPoint, resizeHandle]);
  
  // Handle save functionality
  const handleSave = async () => {
    try {
      const img = imageRef.current;
      if (!img) {
        console.error('Image not available');
        return;
      }
      
      // Create canvas for the cropped image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }
      
      // Wait for image to be loaded
      if (!img.complete) {
        await new Promise(resolve => {
          img.onload = resolve;
        });
      }
      
      // Get the image dimensions
      const imgRect = img.getBoundingClientRect();
      
      // Set canvas size to crop area
      canvas.width = Math.max(1, Math.abs(cropArea.width));
      canvas.height = Math.max(1, Math.abs(cropArea.height));
      
      // Calculate scale factors between displayed image and natural size
      const scaleX = img.naturalWidth / imgRect.width;
      const scaleY = img.naturalHeight / imgRect.height;
      
      console.log('Debug - Image dimensions:', {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: imgRect.width,
        displayHeight: imgRect.height,
        cropArea,
        scaleX,
        scaleY
      });
      
      // Draw the cropped portion
      ctx.drawImage(
        img,
        cropArea.x * scaleX,
        cropArea.y * scaleY,
        cropArea.width * scaleX,
        cropArea.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
      
      let file: File;
      
      try {
        // Try to get the cropped image via canvas
        const croppedImageUrl = canvas.toDataURL('image/jpeg');
        const response = await fetch(croppedImageUrl);
        const blob = await response.blob();
        file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
      } catch (e) {
        console.warn('Canvas is tainted, using direct crop parameters instead:', e);
        
        // Get the original image URL
        const originalImageUrl = imageUrl;
        
        // Use a server-side approach: Simply upload parameters and have the server do the cropping
        // For now, we'll just use the original image and log the crop parameters for debugging
        console.log('Crop parameters:', {
          originalUrl: originalImageUrl,
          x: cropArea.x * scaleX,
          y: cropArea.y * scaleY,
          width: cropArea.width * scaleX,
          height: cropArea.height * scaleY
        });
        
        // Fetch the original image directly
        const imgResponse = await fetch(originalImageUrl);
        const imgBlob = await imgResponse.blob();
        file = new File([imgBlob], 'original-image.jpg', { type: imgBlob.type });
      }
      
      console.log('Debug - Created file:', {
        size: file.size,
        type: file.type
      });
      
      // Upload the file
      const asset = await uploadAsset(file) as unknown as Asset | null;
      
      console.log('Debug - Uploaded asset:', asset);
      
      if (asset && asset.url) {
        // Calculate new position for the cropped image
        const cropAspectRatio = cropArea.width / cropArea.height;
        let newWidth = sourceShape.width;
        let newHeight = sourceShape.height;
        
        if (cropAspectRatio > 1) {
          newHeight = sourceShape.width / cropAspectRatio;
        } else {
          newWidth = sourceShape.height * cropAspectRatio;
        }
        
        // Find rightmost shape position
        const rightmostX = Math.max(
          ...shapes.map((s) => s.position.x + s.width)
        );
        const spacing = 20;
        
        // Create new image shape
        const newShape: Shape = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'image',
          position: {
            x: rightmostX + spacing,
            y: sourceShape.position.y,
          },
          width: newWidth,
          height: newHeight,
          rotation: 0,
          imageUrl: asset.url,
          isUploading: false,
          model: '',
          useSettings: false,
          isEditing: false,
          color: '#ffffff',
          depthStrength: 0.25,
          edgesStrength: 0.25,
          contentStrength: 0.25,
          poseStrength: 0.25,
          sketchStrength: 0.25,
          imagePromptStrength: 0.25,
        };
        
        console.log('Debug - Adding new shape:', newShape);
        
        // Add the new shape
        addShape(newShape);
        
        // Scroll to show the new shape
        window.scrollTo({
          left: newShape.position.x + newWidth / 2 - window.innerWidth / 2,
          top: newShape.position.y + newHeight / 2 - window.innerHeight / 2,
          behavior: 'smooth',
        });
        
        // Close the modal
        onClose();
      } else {
        console.error('Failed to upload cropped image: asset or asset.url is null');
      }
    } catch (error) {
      console.error('Error saving cropped image:', error);
      alert('Failed to save cropped image. See console for details.');
    }
  };
  
  return ReactDOM.createPortal(
    <div 
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg p-5 max-w-[90vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-white text-lg font-medium mb-4">Crop Image</div>
        
        <div 
          ref={imageContainerRef}
          className="relative overflow-hidden w-[800px] h-[600px] max-w-[80vw] max-h-[70vh]"
        >
          <img
            ref={imageRef}
            src={imageUrl}
            crossOrigin="anonymous"
            className="max-w-full max-h-full object-contain"
            alt="Crop preview"
          />
          
          <div
            ref={cropSelectionRef}
            className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 cursor-move"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          >
            {/* Resize handles */}
            <div
              ref={(el) => handleRefs.current.nw = el}
              className="crop-handle nw absolute -top-1 -left-1 w-3 h-3 bg-blue-500 cursor-nw-resize"
              onMouseDown={onMouseDown}
            />
            <div
              ref={(el) => handleRefs.current.ne = el}
              className="crop-handle ne absolute -top-1 -right-1 w-3 h-3 bg-blue-500 cursor-ne-resize"
              onMouseDown={onMouseDown}
            />
            <div
              ref={(el) => handleRefs.current.sw = el}
              className="crop-handle sw absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 cursor-sw-resize"
              onMouseDown={onMouseDown}
            />
            <div
              ref={(el) => handleRefs.current.se = el}
              className="crop-handle se absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize"
              onMouseDown={onMouseDown}
            />
            <div
              ref={(el) => handleRefs.current.n = el}
              className="crop-handle n absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 cursor-n-resize"
              onMouseDown={onMouseDown}
            />
            <div
              ref={(el) => handleRefs.current.s = el}
              className="crop-handle s absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 cursor-s-resize"
              onMouseDown={onMouseDown}
            />
            <div
              ref={(el) => handleRefs.current.e = el}
              className="crop-handle e absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 cursor-e-resize"
              onMouseDown={onMouseDown}
            />
            <div
              ref={(el) => handleRefs.current.w = el}
              className="crop-handle w absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 cursor-w-resize"
              onMouseDown={onMouseDown}
            />
          </div>
        </div>
        
        <div className="flex justify-end mt-4 gap-2">
          <button
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}; 