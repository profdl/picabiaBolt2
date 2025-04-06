import React from "react";
import {
  BookImageIcon,
  Grid,
  Image as ImageIcon,
  Loader2,
  Settings,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react";
import { useStore } from "../../../store";
import { Tooltip } from "../../shared/Tooltip";
import { UploadButton } from "../../shared/UploadButton";
import { PropertiesToolbar } from "./PropertiesToolbar";
import { ToolbarButton } from "../../shared/ToolbarButton";
import { useToolbarBrush } from "../../../hooks/toolbar/useToolbarBrush";
import { useToolbarShapes } from "../../../hooks/toolbar/useToolbarShapes";
import { useToolbarGenerate } from "../../../hooks/toolbar/useToolbarGenerate";
import { useThemeClass } from "../../../styles/useThemeClass";
import { useShapeAdder } from "../../../hooks/shapes/useShapeAdder";
import { Shape } from "../../../types";
import { Asset } from "../../../types/images";
import { ImageShape } from "../../../types/shapes";
import { supabase } from "../../../lib/supabase";

interface ToolbarProps {
  onShowImageGenerate: () => void;
  onShowUnsplash: () => void;
  onShowGallery: () => void;
  showImageGenerate?: boolean;
  showUnsplash?: boolean;
  showGallery?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ showGallery }) => {
  // Theme styles
  const styles = {
    container: useThemeClass(["toolbar", "container"]),
    button: {
      base: useThemeClass(["toolbar", "button", "base"]),
      active: useThemeClass(["toolbar", "button", "active"]),
      primary: useThemeClass(["toolbar", "button", "primary"]),
      ghost: useThemeClass(["toolbar", "button", "ghost"]),
    },
    controls: {
      container: useThemeClass(["toolbar", "controls", "container"]),
      label: useThemeClass(["toolbar", "controls", "label"]),
      input: useThemeClass(["toolbar", "controls", "input"]),
    },
    divider: "w-px bg-neutral-200 dark:bg-neutral-700 mx-2",
  };

  const { addNewShape } = useShapeAdder();

  const {
    handleGenerateSubject,
    create3DDepth,
    updateShape,
    selectedShapes,
    shapes,
    sendBackward,
    sendForward,
    sendToBack,
    sendToFront,
    duplicate,
    deleteShape,
    createGroup,
    ungroup,
    addToGroup,
    removeFromGroup,
    mergeImages,
    addShape,
    setSelectedShapes,
    generatingPredictions,
    handleGenerate,
    cancelGeneration,
    tool,
    generatePreprocessedImage,
  } = useStore((state) => ({
    handleGenerateSubject: state.handleGenerateSubject,
    create3DDepth: state.create3DDepth,
    updateShape: state.updateShape,
    selectedShapes: state.selectedShapes,
    shapes: state.shapes,
    sendBackward: state.sendBackward,
    sendForward: state.sendForward,
    sendToBack: state.sendToBack,
    sendToFront: state.sendToFront,
    duplicate: state.duplicate,
    deleteShape: state.deleteShape,
    createGroup: state.createGroup,
    ungroup: state.ungroup,
    addToGroup: state.addToGroup,
    removeFromGroup: state.removeFromGroup,
    mergeImages: state.mergeImages,
    addShape: state.addShape,
    setSelectedShapes: state.setSelectedShapes,
    generatingPredictions: state.generatingPredictions,
    handleGenerate: state.handleGenerate,
    cancelGeneration: state.cancelGeneration,
    tool: state.tool,
    generatePreprocessedImage: state.generatePreprocessedImage,
  }));

  const selectedShape = shapes.find((s) => selectedShapes.includes(s.id));

  const {
    setBrushTexture,
    setBrushSize,
    setBrushOpacity,
    setBrushRotation,
    setBrushFollowPath,
    setBrushSpacing,
    setBrushHardness,
  } = useStore((state) => ({
    setCurrentColor: state.setCurrentColor,
    setBrushTexture: state.setBrushTexture,
    setBrushSize: state.setBrushSize,
    setBrushOpacity: state.setBrushOpacity,
    setBrushRotation: state.setBrushRotation,
    setBrushFollowPath: state.setBrushFollowPath,
    setBrushSpacing: state.setBrushSpacing,
    setBrushHardness: state.setBrushHardness,
  }));

  const { showAssets, toggleAssets } = useToolbarShapes();

  const { hasActivePrompt } = useToolbarGenerate();

  const { toggleGallery } = useStore();

  // Check for any image shapes with makeVariations enabled
  const hasVariationsEnabled = shapes.some(
    (shape) => shape.type === "image" && (shape as ImageShape).makeVariations
  );

  // Combine with existing hasActivePrompt
  const shouldEnableGenerate = hasActivePrompt || hasVariationsEnabled;

  useStore((state) => ({
    showAssets: state.showAssets,
    toggleAssets: state.toggleAssets,
  }));

  const handleAddSticky = async () => {
    // First, disable any existing sticky notes that have text prompt enabled
    shapes.forEach(shape => {
      if (shape.type === "sticky" && shape.isTextPrompt) {
        updateShape(shape.id, {
          isTextPrompt: false,
          color: shape.isNegativePrompt ? "var(--sticky-red)" : "var(--sticky-yellow)"
        });
      }
    });

    // Then create the new sticky note
    await addNewShape(
      "sticky",
      {
        color: "var(--sticky-green)",
        isEditing: true,
        isTextPrompt: true,
        textPromptStrength: 4.5,
        content: "Double-Click to Edit...",
        isNew: true,
        width: 220,
        height: 180
      } as Partial<Shape>,
      "",
      {
        centerOnShape: true,
        setSelected: true,
        startEditing: true,
        defaultWidth: 220,
      }
    );
  };

  const handleAddSketchpad = async () => {
    // Create a white background canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
    }

    await addNewShape(
      "image",
      {
        imageUrl: canvas.toDataURL('image/png'),
        aspectRatio: 1,
        showSketch: true,
        showImagePrompt: true,
        isDrawing: true,
        imagePromptStrength: 0.5,
      },
      "",
      {
        centerOnShape: true,
        setSelected: true,
        defaultWidth: 400,
      }
    );
  };

  const handleAddDiffusionSettings = async () => {
    shapes.forEach((shape) => {
      if (shape.type === "diffusionSettings" && shape.useSettings) {
        updateShape(shape.id, { useSettings: false });
      }
    });

    await addNewShape(
      "diffusionSettings",
      {
        useSettings: true,
        steps: 30,
        guidanceScale: 4.0,
        scheduler: "dpmpp_2m_sde",
        model: "juggernautXL_v9",
        outputFormat: "png",
        outputQuality: 100,
        randomiseSeeds: true,
        outputWidth: 1024,
        outputHeight: 1024,
        width: 280,
        height: 200
      },
      "",
      {
        centerOnShape: true,
        setSelected: true,
        defaultWidth: 280,
      }
    );
  };

  const handleFlatten = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedShape) return;

    try {
      // Find the preview canvas for the selected shape
      const previewCanvas = document.querySelector(`canvas[data-shape-id="${selectedShape.id}"]`) as HTMLCanvasElement;
      if (!previewCanvas) {
        console.error('Preview canvas not found');
        return;
      }

      // Create a blob from the preview canvas
      const blob = await new Promise<Blob>((resolve, reject) => {
        previewCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/png', 1.0);
      });

      // Upload to Supabase
      const fileName = `flattened_${Math.random().toString(36).substring(2)}.png`;
      const arrayBuffer = await blob.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(fileName, fileData, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(fileName);

      // Insert record in assets table
      await supabase.from("assets").insert([
        {
          url: publicUrl,
          user_id: user.id,
        },
      ]);

      // Create a new image shape with the flattened image
      const newShape: Shape = {
        id: Math.random().toString(36).substr(2, 9),
        type: "image",
        position: {
          x: selectedShape.position.x + selectedShape.width + 20,
          y: selectedShape.position.y,
        },
        width: selectedShape.width,
        height: selectedShape.height,
        rotation: 0,
        imageUrl: publicUrl,
        isUploading: false,
        model: "",
        useSettings: false,
        isEditing: false,
        color: "#ffffff",
        depthStrength: 0.75,
        edgesStrength: 0.75,
        contentStrength: 0.75,
        poseStrength: 0.75,
        sketchStrength: 0.75,
        imagePromptStrength: 0.75,
        showDepth: false,
        showEdges: false,
        showPose: false,
      };

      // Add the new shape
      addShape(newShape);
      setSelectedShapes([newShape.id]);
    } catch (error) {
      console.error("Error flattening image:", error);
    }
  };

  const handleCrop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedShape && selectedShape.type === "image") {
      // Instead of editing the source image, create a modal approach to cropping
      // Create a div that will serve as our crop modal container
      const modalContainer = document.createElement('div');
      modalContainer.id = 'crop-modal-container';
      modalContainer.style.position = 'fixed';
      modalContainer.style.top = '0';
      modalContainer.style.left = '0';
      modalContainer.style.width = '100vw';
      modalContainer.style.height = '100vh';
      modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      modalContainer.style.zIndex = '10000';
      modalContainer.style.display = 'flex';
      modalContainer.style.alignItems = 'center';
      modalContainer.style.justifyContent = 'center';
      document.body.appendChild(modalContainer);
      
      // Create a crop editor component inside the modal
      const cropEditor = document.createElement('div');
      cropEditor.id = 'crop-editor';
      cropEditor.style.position = 'relative';
      cropEditor.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
      cropEditor.style.borderRadius = '8px';
      cropEditor.style.padding = '20px';
      cropEditor.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
      cropEditor.style.maxWidth = '90vw';
      cropEditor.style.maxHeight = '90vh';
      cropEditor.style.overflow = 'hidden';
      modalContainer.appendChild(cropEditor);
      
      // Create image container
      const imageContainer = document.createElement('div');
      imageContainer.style.position = 'relative';
      imageContainer.style.width = '800px';
      imageContainer.style.height = '600px';
      imageContainer.style.maxWidth = '80vw';
      imageContainer.style.maxHeight = '70vh';
      imageContainer.style.overflow = 'hidden';
      cropEditor.appendChild(imageContainer);
      
      // Create the image element
      const img = document.createElement('img');
      img.crossOrigin = "anonymous";
      img.src = (selectedShape as ImageShape).imageUrl || '';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      imageContainer.appendChild(img);
      
      // Create crop selection area
      const cropSelection = document.createElement('div');
      cropSelection.style.position = 'absolute';
      cropSelection.style.border = '2px solid #2196F3';
      cropSelection.style.backgroundColor = 'rgba(33, 150, 243, 0.2)';
      cropSelection.style.cursor = 'move';
      imageContainer.appendChild(cropSelection);
      
      // Create resize handles
      const createHandle = (position: string) => {
        const handle = document.createElement('div');
        handle.className = `crop-handle ${position}`;
        handle.style.position = 'absolute';
        handle.style.width = '10px';
        handle.style.height = '10px';
        handle.style.backgroundColor = '#2196F3';
        
        // Position the handle
        if (position.includes('n')) handle.style.top = '-5px';
        if (position.includes('s')) handle.style.bottom = '-5px';
        if (position.includes('w')) handle.style.left = '-5px';
        if (position.includes('e')) handle.style.right = '-5px';
        
        // Set cursor
        if (position === 'nw' || position === 'se') handle.style.cursor = 'nwse-resize';
        if (position === 'ne' || position === 'sw') handle.style.cursor = 'nesw-resize';
        if (position === 'n' || position === 's') handle.style.cursor = 'ns-resize';
        if (position === 'e' || position === 'w') handle.style.cursor = 'ew-resize';
        
        cropSelection.appendChild(handle);
        return handle;
      };
      
      // Create all 8 handles
      const handles = {
        n: createHandle('n'),
        s: createHandle('s'),
        e: createHandle('e'),
        w: createHandle('w'),
        nw: createHandle('nw'),
        ne: createHandle('ne'),
        sw: createHandle('sw'),
        se: createHandle('se')
      };
      
      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'flex-end';
      buttonContainer.style.marginTop = '20px';
      buttonContainer.style.gap = '10px';
      cropEditor.appendChild(buttonContainer);
      
      // Create Cancel button
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.style.padding = '8px 16px';
      cancelButton.style.backgroundColor = '#6b7280';
      cancelButton.style.color = 'white';
      cancelButton.style.border = 'none';
      cancelButton.style.borderRadius = '4px';
      cancelButton.style.cursor = 'pointer';
      buttonContainer.appendChild(cancelButton);
      
      // Create Save button
      const saveButton = document.createElement('button');
      saveButton.textContent = 'Save Changes';
      saveButton.style.padding = '8px 16px';
      saveButton.style.backgroundColor = '#2563eb';
      saveButton.style.color = 'white';
      saveButton.style.border = 'none';
      saveButton.style.borderRadius = '4px';
      saveButton.style.cursor = 'pointer';
      buttonContainer.appendChild(saveButton);
      
      // Initialize crop area state
      let cropArea = { x: 0, y: 0, width: 0, height: 0 };
      let isDragging = false;
      let isResizing = false;
      let resizeHandle = '';
      let startPoint = { x: 0, y: 0 };
      
      // Wait for image to load before setting up the crop area
      img.onload = () => {
        const imgRect = img.getBoundingClientRect();
        const initialSize = Math.min(imgRect.width, imgRect.height) * 0.8;
        
        cropArea = {
          x: (imgRect.width - initialSize) / 2,
          y: (imgRect.height - initialSize) / 2,
          width: initialSize,
          height: initialSize
        };
        
        // Update crop selection position
        updateCropSelection();
      };
      
      // Helper to update crop selection position
      const updateCropSelection = () => {
        cropSelection.style.left = `${cropArea.x}px`;
        cropSelection.style.top = `${cropArea.y}px`;
        cropSelection.style.width = `${cropArea.width}px`;
        cropSelection.style.height = `${cropArea.height}px`;
      };
      
      // Mouse event handlers
      let activeElement: HTMLElement | null = null;
      
      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Determine the target and action
        activeElement = e.target as HTMLElement;
        
        // Get the container rect once
        const rect = imageContainer.getBoundingClientRect();
        startPoint = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        
        // Handle is being clicked
        if (activeElement.classList.contains('crop-handle')) {
          isResizing = true;
          isDragging = false;
          resizeHandle = Array.from(activeElement.classList)
            .find(cls => ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'].includes(cls)) || '';
          
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
          return;
        }
        
        // Crop selection is being clicked
        if (activeElement === cropSelection) {
          isDragging = true;
          isResizing = false;
          startPoint.x -= cropArea.x;
          startPoint.y -= cropArea.y;
          
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
          return;
        }
      };
      
      const onMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!isDragging && !isResizing) return;
        
        const rect = imageContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        if (isDragging) {
          cropArea.x = mouseX - startPoint.x;
          cropArea.y = mouseY - startPoint.y;
          
          // Constrain to image boundaries
          cropArea.x = Math.max(0, Math.min(cropArea.x, rect.width - cropArea.width));
          cropArea.y = Math.max(0, Math.min(cropArea.y, rect.height - cropArea.height));
        } else if (isResizing) {
          const newArea = { ...cropArea };
          
          switch (resizeHandle) {
            case 'nw':
              newArea.width = cropArea.x + cropArea.width - mouseX;
              newArea.height = cropArea.y + cropArea.height - mouseY;
              newArea.x = mouseX;
              newArea.y = mouseY;
              break;
            case 'ne':
              newArea.width = mouseX - cropArea.x;
              newArea.height = cropArea.y + cropArea.height - mouseY;
              newArea.y = mouseY;
              break;
            case 'sw':
              newArea.width = cropArea.x + cropArea.width - mouseX;
              newArea.height = mouseY - cropArea.y;
              newArea.x = mouseX;
              break;
            case 'se':
              newArea.width = mouseX - cropArea.x;
              newArea.height = mouseY - cropArea.y;
              break;
            case 'n':
              newArea.height = cropArea.y + cropArea.height - mouseY;
              newArea.y = mouseY;
              break;
            case 's':
              newArea.height = mouseY - cropArea.y;
              break;
            case 'e':
              newArea.width = mouseX - cropArea.x;
              break;
            case 'w':
              newArea.width = cropArea.x + cropArea.width - mouseX;
              newArea.x = mouseX;
              break;
          }
          
          // Ensure minimum size
          if (newArea.width < 20) {
            if (resizeHandle.includes('w')) {
              newArea.x = cropArea.x + cropArea.width - 20;
            }
            newArea.width = 20;
          }
          
          if (newArea.height < 20) {
            if (resizeHandle.includes('n')) {
              newArea.y = cropArea.y + cropArea.height - 20;
            }
            newArea.height = 20;
          }
          
          cropArea = newArea;
        }
        
        updateCropSelection();
      };
      
      const onMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        isDragging = false;
        isResizing = false;
        activeElement = null;
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      // Add event listeners directly to elements
      cropSelection.addEventListener('mousedown', onMouseDown);
      
      // Add event listeners to all handles
      Object.values(handles).forEach(handle => {
        handle.addEventListener('mousedown', onMouseDown);
      });
      
      // Cancel button handler
      cancelButton.addEventListener('click', () => {
        // Remove the modal
        if (document.body.contains(modalContainer)) {
          document.body.removeChild(modalContainer);
        }
      });
      
      // Save button handler
      saveButton.addEventListener('click', async () => {
        try {
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
            const originalImageUrl = (selectedShape as ImageShape).imageUrl || '';
            
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
          const { uploadAsset } = useStore.getState();
          const asset = await uploadAsset(file) as unknown as Asset | null;
          
          console.log('Debug - Uploaded asset:', asset);
          
          if (asset && asset.url) {
            // Calculate new position for the cropped image
            const cropAspectRatio = cropArea.width / cropArea.height;
            let newWidth = selectedShape.width;
            let newHeight = selectedShape.height;
            
            if (cropAspectRatio > 1) {
              newHeight = selectedShape.width / cropAspectRatio;
            } else {
              newWidth = selectedShape.height * cropAspectRatio;
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
                y: selectedShape.position.y,
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
            if (document.body.contains(modalContainer)) {
              document.body.removeChild(modalContainer);
            }
          } else {
            console.error('Failed to upload cropped image: asset or asset.url is null');
          }
        } catch (error) {
          console.error('Error saving cropped image:', error);
          alert('Failed to save cropped image. See console for details.');
        }
      });
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedShape?.type === "image" && (selectedShape as ImageShape).imageUrl) {
      try {
        const response = await fetch((selectedShape as ImageShape).imageUrl!);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `image-${selectedShape.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download failed:", error);
      }
    }
  };

  const {
    currentColor,
    setCurrentColor,
    brushTexture,
    brushSize,
    brushOpacity,
    brushRotation,
    brushFollowPath,
    brushSpacing,
    brushHardness,
  } = useToolbarBrush();

  return (
    <div className={styles.container}>
      <div className="max-w-screen-2xl mx-auto relative flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-2">
          <Tooltip content="Asset Library" side="bottom">
            <ToolbarButton
              icon={<ImageIcon />}
              label="Assets"
              active={showAssets}
              onClick={toggleAssets}
              className={`${styles.button.base} ${
                showAssets ? styles.button.active : ""
              }`}
            />
          </Tooltip>
          <UploadButton />
          <div className={styles.divider} />
        </div>

        {/* Center section */}
        <div className="flex items-center gap-4">
          {/* Text Prompt */}
          <Tooltip
            content="Create a new sticky note. Use the text to guide the AI image generation."
            side="bottom"
          >
            <ToolbarButton
              icon={<StickyNote />}
              label="Text Prompt"
              onClick={handleAddSticky}
              className={styles.button.base}
            />
          </Tooltip>

          {/* Image Properties Toolbar */}
          {(tool === "select" && selectedShape) || tool === "pan" ? (
            <PropertiesToolbar
              type={selectedShape?.type === "image" ? "image" : "shape"}
              shape={selectedShape ? selectedShape : undefined}
              selectedShapes={selectedShapes}
              shapes={shapes}
              actions={{
                sendBackward,
                sendForward,
                sendToBack,
                sendToFront,
                duplicate,
                deleteShape,
                createGroup,
                ungroup,
                addToGroup,
                removeFromGroup,
                mergeImages,
                onSelectSubject: (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (selectedShape) {
                    handleGenerateSubject(selectedShape);
                  }
                },
                onCrop: handleCrop,
                onDownload: handleDownload,
                create3DDepth,
                onFlatten: handleFlatten,
                addShape,
                generatePreprocessedImage: async (id: string, type: string) => {
                  await generatePreprocessedImage(id, type as "depth" | "edge" | "pose" | "sketch" | "imagePrompt");
                },
              }}
            />
          ) : null}

          {/* Brush Properties Toolbar */}
          {(tool === "brush" || tool === "eraser" || tool === "inpaint") && (
            <PropertiesToolbar
              type={tool === "brush" ? "brush" : tool === "eraser" ? "eraser" : "inpaint"}
              properties={{
                color: currentColor,
                texture: brushTexture,
                size: brushSize,
                opacity: brushOpacity,
                rotation: brushRotation,
                followPath: brushFollowPath,
                spacing: brushSpacing,
                hardness: brushHardness,
              }}
              onPropertyChange={(property, value) => {
                switch (property) {
                  case "color":
                    setCurrentColor(value as string);
                    break;
                  case "texture":
                    setBrushTexture(value as string);
                    break;
                  case "size":
                    setBrushSize(value as number);
                    break;
                  case "opacity":
                    setBrushOpacity(value as number);
                    break;
                  case "rotation":
                    setBrushRotation(value as number);
                    break;
                  case "followPath":
                    setBrushFollowPath(value as boolean);
                    break;
                  case "spacing":
                    setBrushSpacing(value as number);
                    break;
                  case "hardness":
                    setBrushHardness(value as number);
                    break;
                }
              }}
              shape={selectedShape}
              selectedShapes={selectedShapes}
              shapes={shapes}
              actions={{
                sendBackward,
                sendForward,
                sendToBack,
                sendToFront,
                duplicate,
                deleteShape,
                createGroup,
                ungroup,
                addToGroup,
                removeFromGroup,
                mergeImages,
                onSelectSubject: (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (selectedShape) {
                    handleGenerateSubject(selectedShape);
                  }
                },
                onCrop: handleCrop,
                onDownload: handleDownload,
                create3DDepth,
                onFlatten: handleFlatten,
                addShape,
                generatePreprocessedImage: async (id: string, type: string) => {
                  await generatePreprocessedImage(id, type as "depth" | "edge" | "pose" | "sketch" | "imagePrompt");
                },
              }}
            />
          )}
          {/* Sketchpad */}
          <Tooltip
            content="Create a sketch pad and guide the AI image generation by drawing."
            side="bottom"
          >
            <ToolbarButton
              icon={<BookImageIcon />}
              label="Sketch Prompt"
              onClick={handleAddSketchpad}
              className={styles.button.base}
            />
          </Tooltip>

          <div className={styles.divider} />

          {/* Generate Button */}
          <div className="flex items-center gap-2">
            <Tooltip
              content={
                !shouldEnableGenerate || generatingPredictions.size > 0 ? (
                  "Add a text or image prompt to activate. Make sure Text Prompt is checked on a Sticky Note that has a prompt written. Or add an image and check a control type such as Remix or Make Variations"
                ) : (
                  <div>
                    <p>
                      All checked notes and images will effect the generated
                      image.
                    </p>
                    <p>
                      The first image may take up to 3 minutes to generate. After
                      that it should only take a few seconds.
                    </p>
                  </div>
                )
              }
              side="top"
            >
              <ToolbarButton
                icon={
                  generatingPredictions.size > 0 ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Sparkles />
                  )
                }
                label={
                  generatingPredictions.size > 0 ? "Generating..." : "Generate"
                }
                disabled={!shouldEnableGenerate || generatingPredictions.size > 0}
                onClick={async () => {
                  // If we have variations enabled or other active prompts, proceed with generation
                  handleGenerate();
                }}
                className={`${styles.button.base} ${styles.button.primary} ${
                  !shouldEnableGenerate || generatingPredictions.size > 0
                    ? "opacity-50"
                    : ""
                }`}
              />
            </Tooltip>

            {generatingPredictions.size > 0 && (
              <Tooltip content="Cancel generation" side="top">
                <ToolbarButton
                  icon={<X className="w-4 h-4" />}
                  onClick={() => {
                    // Cancel all generating predictions
                    Array.from(generatingPredictions).forEach(predictionId => {
                      cancelGeneration(predictionId);
                    });
                  }}
                  className={`${styles.button.base} ${styles.button.ghost} text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950`}
                />
              </Tooltip>
            )}
          </div>

          {/* Settings Button */}
          <Tooltip
            content="Add settings to customize the image generation process. Control parameters like quality, size, and model type."
            side="bottom"
          >
            <ToolbarButton
              icon={<Settings />}
              onClick={handleAddDiffusionSettings}
              className={styles.button.base}
            />
          </Tooltip>

          <div className={styles.divider} />
        </div>

        {/* Right section */}
        <div>
          <ToolbarButton
            icon={<Grid />}
            label="Gallery"
            active={showGallery}
            onClick={toggleGallery}
            className={`${styles.button.base} ${
              showGallery ? styles.button.active : ""
            }`}
          />
        </div>
      </div>
    </div>
  );
};
