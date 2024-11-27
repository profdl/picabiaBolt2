
import {
  StickyNote,
  Hand,
  MousePointer,
  // Pencil,
  Sparkles,
  Settings,
  Image as ImageIcon,
  Upload,
  Loader2,
  Grid,
  // Brush,
  // Frame,
  // Eraser,
  // ArrowUpRight
} from 'lucide-react';
import { useStore } from '../store';
import { useState, useRef } from 'react';
import { ImageGeneratePanel } from './GenerateSettings';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
// import { BrushShapeSelector } from './BrushShapeSelector';


const AssetsButton = () => {
  const showAssets = useStore(state => state.showAssets);
  const toggleAssets = useStore(state => state.toggleAssets);

  return (
    <button
      onClick={toggleAssets}
      className={`p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1 ${showAssets ? 'bg-gray-100' : ''
        }`}
      title="Asset Library"
    >
      <ImageIcon className="w-5 h-5" />
      <span className="text-sm font-medium">Assets</span>
    </button>
  );
};

const UploadButton = () => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toggleAssets = useStore(state => state.toggleAssets);
  const addShape = useStore(state => state.addShape);
  const { zoom, offset } = useStore();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    toggleAssets();
    const file = e.target.files?.[0];
    if (!file) return;

    // Create placeholder immediately
    const windowWidth = window.innerWidth * 0.4;
    const windowHeight = window.innerHeight * 0.4;
    const center = {
      x: (window.innerWidth / 2 - offset.x) / zoom,
      y: (window.innerHeight / 2 - offset.y) / zoom
    };
    const shapeId = Math.random().toString(36).substr(2, 9);
    // Add loading placeholder
    addShape({
      id: shapeId,
      type: 'image',
      position: {
        x: center.x - windowWidth / 2,
        y: center.y - windowHeight / 2
      },
      width: windowWidth,
      height: windowHeight,
      color: 'transparent',
      imageUrl: '',
      rotation: 0,
      isUploading: true,
      model: '',
      useSettings: false
    });


    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

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

      useStore.getState().triggerAssetsRefresh();


      // Update the shape with the final image URL
      useStore.getState().updateShape(shapeId, {
        imageUrl: publicUrl,
        isUploading: false
      });

    } catch (err) {
      console.error('Error uploading asset:', err);
      // Remove the shape if upload fails
      useStore.getState().deleteShape(shapeId);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
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
        className={`p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1`}
        title="Upload Image"
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Upload className="w-5 h-5" />
        )}
        <span className="text-sm font-medium">Add Image</span>
      </button>
    </>
  );
};





// const SettingsButton = () => {
//   const [showPanel, setShowPanel] = useState(false);
//   const buttonRef = useRef<HTMLDivElement>(null);
//   const timeoutRef = useRef<NodeJS.Timeout>();

//   const handleMouseEnter = () => {
//     if (timeoutRef.current) {
//       clearTimeout(timeoutRef.current);
//     }
//     setShowPanel(true);
//   };

//   const handleMouseLeave = () => {
//     timeoutRef.current = setTimeout(() => {
//       setShowPanel(false);
//     }, 300); // Small delay to allow moving to panel
//   };

//   return (
//     <div
//       ref={buttonRef}
//       className="relative"
//       onMouseEnter={handleMouseEnter}
//       onMouseLeave={handleMouseLeave}
//     >
//       <button
//         className={`p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1 ${showPanel ? 'bg-gray-100' : ''
//           }`}
//         title="Image Generator Settings"
//       >
//         <Settings className="w-5 h-5" />
//         <span className="text-sm font-medium">Settings</span>
//       </button>

//       {showPanel && <ImageGeneratePanel />}
//     </div>
//   );
// };


interface ToolbarProps {
  onShowImageGenerate: () => void;
  onShowUnsplash: () => void;
  onShowGallery: () => void;
  showImageGenerate?: boolean;
  showUnsplash?: boolean;
  showGallery?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  showGallery
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showAssets, setShowAssets] = useState(false);
  const { setCurrentColor } = useStore();

  const {
    zoom,
    setZoom,
    addShape,
    tool,
    setTool,
    offset,

    toggleGallery,
    handleGenerate,
    isGenerating,
    shapes,
    // currentColor,
    // strokeWidth,
    // setStrokeWidth,
    // brushSize,
    // setBrushSize,
    // brushOpacity,
    // setBrushOpacity,
    // brushTexture,
    // setBrushTexture,
    // brushSpacing,
    // setBrushSpacing,
    // brushRotation,
    // setBrushRotation,
    // brushFollowPath,
  } = useStore();

  const hasActivePrompt = shapes.some(shape =>
    (shape.type === 'sticky' && shape.showPrompt && shape.content) ||
    (shape.type === 'image' && shape.showPrompt)
  );

  const getViewportCenter = () => {
    const rect = document.querySelector('#root')?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: (rect.width / 2 - offset.x) / zoom,
      y: (rect.height / 2 - offset.y) / zoom
    };
  };

  useEffect(() => {
    console.log('Current tool:', tool);
  }, [tool]);

  const handleAddShape = (type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'image' | 'sketchpad' | 'diffusionSettings') => {
    if (type === 'sketchpad') {
      const center = getViewportCenter();
      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type: 'sketchpad',
        position: {
          x: center.x - 256,
          y: center.y - 256
        },
        width: 512,
        height: 512,
        color: '#ffffff',
        rotation: 0,
        locked: true
      });
      setTool('select');
      return;
    }

    const center = getViewportCenter();

    if (type === 'image') {
      const url = window.prompt('Enter image URL:');
      if (!url) return;

      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type,
        position: {
          x: center.x - 150,
          y: center.y - 100
        },
        width: 300,
        height: 200,
        color: 'transparent',
        imageUrl: url,
        rotation: 0,
        aspectRatio: 1.5,
        isUploading: false,
        useSettings: false,
        model: ''
      });
      setTool('select');
      return;
    }
    if (type === 'diffusionSettings') {
      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type: 'diffusionSettings',
        position: {
          x: center.x - 150,
          y: center.y - 300
        },
        width: 250,
        height: 520,
        color: '#f3f4f6',
        rotation: 0,
        isUploading: false,
        useSettings: true,
        // Initialize all numeric values
        steps: 30,
        outputQuality: 100,
        guidanceScale: 4.5,
        outputWidth: 1360,
        outputHeight: 768,
        model: 'juggernautXL_v9',
        scheduler: 'dpmpp_2m_sde',
        outputFormat: 'png',
        randomiseSeeds: true,
      });


      return;
    }
    const size = type === 'sticky' ? 260 : 50;
    if (type === 'sticky') {
      // Get existing shapes and updateShape from the store
      const existingShapes = useStore.getState().shapes;
      const storeUpdateShape = useStore.getState().updateShape;

      // First, uncheck any existing sticky notes with showPrompt
      existingShapes.forEach(shape => {
        if (shape.type === 'sticky' && shape.showPrompt) {
          storeUpdateShape(shape.id, {
            showPrompt: false,
            color: shape.showNegativePrompt ? '#ffcccb' : '#fff9c4'
          });
        }
      });

      // Array of prompts
      const prompts = [
        "A monumental brutalist building with weathered concrete, illuminated by golden-hour sunlight. A low-angle wide shot emphasizes its geometric forms, with moody clouds in the background. High cinematic realism, 35mm film look, with lens flares and shallow depth of field.",
        "An extreme close-up of a vibrant orchid, showing intricate petal details with water droplets glistening in soft light. The creamy blurred background isolates the flower's delicate stamen. High macro realism, vivid colors, and sharp focus.",
        "A sleek concept sketch of a futuristic handheld device with bold lines, intricate patterns, and dynamic 3/4 view. Annotated details include mesh, leather, and reflective materials. Modern design style with vibrant accents and textured shading.",
        "An avant-garde costume inspired by Bauhaus and 20th-century theater. Geometric shapes and bold colors mix with textures like plastic, mesh, and leather. Illustrated on a mannequin with dramatic lighting, showcasing exaggerated, angular forms.",
        "An ancient marble sculpture of a Greek warrior on a polished pedestal in a museum. Smooth and weathered textures depict muscles and drapery. Spotlights cast soft shadows, enhancing the serene, muted setting with reflective floors.",
        "A flooded Los Angeles with landmarks like the Hollywood sign submerged. Skyscrapers reflect in the murky water as boats and debris drift. Dark storm clouds create an eerie, cinematic atmosphere with detailed water textures.",
        "A colossal brutalist library with tiered concrete and narrow windows, surrounded by early morning fog. Reflections shimmer in rain-soaked pavement. Cinematic atmosphere with diffused light and high architectural detail.",
        "A macro close-up of a dew-covered sunflower, its seed patterns spiraling symmetrically. Vibrant golden petals glow in soft light against a dark, blurred background with bokeh highlights.",
        "An avant-garde costume inspired by Cubism, with angular metal panels and translucent fabric. Bold primary colors and fragmented shapes are illuminated dramatically, creating a surreal sculptural effect under stage lights.",
        "An ancient terracotta statue of a mythical creature in a museum glass case. Weathered with fine cracks, it features intricate carvings. Spotlights highlight earthy tones against a darkened, reverent background.",
        "An opulent Art Nouveau theater set with organic lines, floral motifs, and rich jewel tones. A grand staircase with golden railings dominates the stage, lit by a chandelier casting intricate light patterns.",
        "A dystopian Venice Beach, partially submerged with graffiti above floodlines. Abandoned storefronts and lifeguard towers rise above the water. Hazy sunlight creates a cinematic, post-apocalyptic mood.",
        "A brutalist concert hall interior with sharp-angled concrete walls and dramatic shadows. Warm spotlight beams contrast with the cool gray material, while rows of empty chairs complete the scene.",
        "A close-up of a rare desert flower in bloom, its vibrant pink and orange petals stretching outward. Fine sand grains cling to its surface, highlighted by soft golden sunlight.",
        "A sprawling brutalist sports complex at night, illuminated by harsh floodlights. Dramatic shadows fall across the rain-slick concrete, with reflections creating a surreal, cinematic effect."
      ];



      // Randomly select a prompt from the array
      function getRandomPrompt() {
        const randomIndex = Math.floor(Math.random() * prompts.length);
        return prompts[randomIndex];
      }

      // Function to add a sticky note with a random prompt
      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type,
        position: {
          x: center.x - size / 2,
          y: center.y - size / 2
        },
        width: size * 1.5,
        height: size,
        color: '#90EE90', // Green color
        content: getRandomPrompt(), // Use a random prompt
        fontSize: 16,
        rotation: 0,
        showPrompt: true, // Automatically enable text prompt
        isUploading: false,
        useSettings: false,
        model: ''
      });

    } else {
      // Handle other shape types as before
      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type,
        position: {
          x: center.x - size / 2,
          y: center.y - size / 2
        },
        width: size,
        height: size,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        content: type === 'text' ? 'Double click to edit' : undefined,
        fontSize: 16,
        rotation: 0,
        isUploading: false
      });
    }



  };


  useEffect(() => {
    if (tool === 'brush') {
      setCurrentColor('#ffffff');
    }
  }, [setCurrentColor, tool]);



  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white shadow-lg px-4 py-2 border-t border-gray-200">
      <div className="max-w-screen-2xl mx-auto relative flex items-center justify-between">
        {/* Left-aligned buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <AssetsButton />
            <UploadButton />
            <div className="w-px bg-gray-200 mx-2" />
          </div>
        </div>

        {/* Center-aligned toolbar buttons */}
        <div className="flex items-center gap-2">
          {/* Sticky Note Button */}
          <button
            onClick={() => handleAddShape('sticky')}
            className="p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1"
            title="Add Sticky Note"
          >
            <StickyNote className="w-5 h-5" />
            <span className="text-sm font-medium">Text Prompt</span>
          </button>
          <button
            onClick={() => handleAddShape('diffusionSettings')}
            className="p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1"
            title="Add Diffusion Settings"
          >
            {/* <Settings className="w-5 h-5" /> */}
            <span className="text-sm font-medium">Add Settings</span>
          </button>


          {/* <button
            onClick={() => setTool('pen')}
            className={`p-2 hover:bg-gray-100 rounded-lg ${tool === 'pen' ? 'bg-gray-100' : ''}`}
            title="Pen Tool"
          >
            <Pencil className="w-5 h-5" />
          </button> */}

          {/* <div className="w-px bg-gray-200 mx-2" />
          {(tool === 'pen' || tool === 'brush' || tool === 'eraser') && (
            <div className="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-4">
              {tool === 'pen' && (
                <>
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => setCurrentColor(e.target.value)}
                    className="w-8 h-8 p-0 cursor-pointer"
                    title="Stroke Color"
                  />
                  <select
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="p-1 border rounded"
                    title="Stroke Width"
                  >
                    {[1, 2, 4, 6, 8, 12].map((width) => (
                      <option key={width} value={width}>{width}px</option>
                    ))}
                  </select>
                </>
              )}
              {(tool === 'brush' || tool === 'eraser') && (
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => setCurrentColor(e.target.value)}
                    className="w-8 h-8 p-0 cursor-pointer"
                    title="Brush Color"
                  />

                  <BrushShapeSelector
                    currentTexture={brushTexture}
                    onTextureSelect={setBrushTexture}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Size</label>
                    <input
                      type="range"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      min="1"
                      max="100"
                      title="Brush Size"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Opacity</label>
                    <input
                      type="range"
                      value={brushOpacity}
                      onChange={(e) => setBrushOpacity(Number(e.target.value))}
                      min="0"
                      max="1"
                      step="0.1"
                      title="Brush Opacity"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Rotation</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        value={brushRotation}
                        onChange={(e) => setBrushRotation(Number(e.target.value))}
                        min="0"
                        max="360"
                        title="Brush Rotation"
                      />

                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="brushFollowPath"
                        checked={brushFollowPath}
                        onChange={(e) => useStore.getState().setBrushFollowPath(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="brushFollowPath" className="text-xs text-gray-500">
                        Follow
                      </label>
                    </div>
                  </div>


                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Spacing</label>
                    <input
                      type="range"
                      value={brushSpacing * 100}
                      onChange={(e) => setBrushSpacing(Number(e.target.value) / 100)}
                      min="5"
                      max="100"
                      title="Brush Spacing"
                    />
                  </div>
                </div>
              )}
            </div>
          )} */}
          {/* <button
            onClick={() => {
              setTool('brush');
              setCurrentColor('#ffffff'); // White for brush
            }}
            className={`p-2 hover:bg-gray-100 rounded-lg ${tool === 'brush' ? 'bg-gray-100' : ''}`}
            title="Brush Tool (B)"
          >
            <Brush className="w-5 h-5" />
          </button> */}
          {/* <button
            onClick={() => {
              setTool('eraser');
              setCurrentColor('#000000'); // Black for eraser
            }}
            className={`p-2 hover:bg-gray-100 rounded-lg ${tool === 'eraser' ? 'bg-gray-100' : ''}`}
            title="Eraser Tool (E)"
          >
            <Eraser className="w-5 h-5" />
          </button> */}

          {/* Canvas */}
          {/* <button
            onClick={() => handleAddShape('sketchpad')}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Add sketchpad"
          >
            <Frame className="w-5 h-5" />
          </button> */}
          {/* Shape Tools */}
          {/* <button
            onClick={() => handleAddShape('rectangle')}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Add Rectangle"
          >
            <Square className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleAddShape('circle')}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Add Circle"
          >
            <Circle className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleAddShape('text')}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Add Text"
          >
            <Type className="w-5 h-5" />
          </button> */}



          {/* Image Generation Tools */}
          <button
            onClick={async () => {
              // First ensure gallery is open
              if (!showGallery) {
                toggleGallery();
              }

              // Generate the image
              await handleGenerate();

              // Wait for Supabase insert to complete
              setTimeout(() => {
                toggleGallery();
                setTimeout(() => toggleGallery(), 0);
              }, 2000);
            }}
            disabled={!hasActivePrompt || isGenerating}
            className={`p-2 rounded-lg flex items-center gap-1 ${hasActivePrompt && !isGenerating
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'opacity-50 cursor-not-allowed text-gray-400'
              }`}
            title={
              !hasActivePrompt
                ? 'Select a sticky note and enable prompting to generate'
                : 'Generate Image'
            }
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">Generate</span>
          </button>

          {/* <SettingsButton /> */}

          {/* Select, Pan Zoom */}
          <div className="w-px bg-gray-200 mx-4" />

          <button
            onClick={() => setTool('select')}
            className={`p-2 hover:bg-gray-100 rounded-lg ${tool === 'select' ? 'bg-gray-100' : ''}`}
            title="Select Tool (V)"
          >

            <MousePointer className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('pan')}
            className={`p-2 hover:bg-gray-100 rounded-lg ${tool === 'pan' ? 'bg-gray-100' : ''}`}
            title="Pan Tool (Space)"
          >
            <Hand className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={Math.round(zoom * 100)}
              onChange={(e) => {
                const newZoom = Math.max(0.1, Math.min(5, Number(e.target.value) / 100))
                const rect = document.querySelector('.canvas-container')?.getBoundingClientRect()
                if (!rect) return

                const center = {
                  x: rect.width / 2,
                  y: rect.height / 2
                }

                setZoom(newZoom, center)
              }}
              className="w-16 px-2 py-1 text-sm border rounded"
              min="10"
              max="500"
              step="10"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>

        </div>
        {/* Right-aligned Gallery button */}
        <div>
          <button
            onClick={toggleGallery}
            className={`p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1 ${showGallery ? 'bg-gray-100' : ''}`}
            title="Generated Images Gallery"
          >
            <Grid className="w-5 h-5" />
            <span className="text-sm font-medium">Gallery</span>
          </button>
        </div>
      </div>
    </div>
  );
};


function setSelectedShapes(arg0: string[]) {
  throw new Error('Function not implemented.');
}

