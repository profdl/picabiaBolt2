import { useState, useRef } from 'react';
import { useStore } from '../store';
import { Link, useLocation } from 'react-router-dom';
import { Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProjectsSidebar } from './ProjectsSidebar';
import { useProjects } from '../hooks/useProjects';
import { generateThumbnail } from '../utils/thumbnail';
import { Menu } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const location = useLocation();
  const { updateProject } = useProjects();
  const shapes = useStore(state => state.shapes);
  const isBoard = location.pathname.startsWith('/board/');
  const boardId = isBoard ? location.pathname.split('/')[2] : null;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const handleMouseEnter = () => setIsMenuOpen(true);
  const handleMouseLeave = () => setIsMenuOpen(false);
  const { createProject } = useProjects();
  const navigate = useNavigate();
  const addShape = useStore(state => state.addShape);
  const zoom = useStore(state => state.zoom);
  const offset = useStore(state => state.offset);
  const setTool = useStore(state => state.setTool);

  const helpContent = `
>>  DOUBLE CLICK this sticky to enable scrolling the text. <<
  
  Using Picabia for AI Image Generation

  Getting Started:
  – Add reference images by dragging and dropping or using the upload button.
  – Toggle the assets drawer to view the images you've added or search for more via Unsplash. 
  – Add sticky notes and double-click to edit the text. Choose a sticky to use as a prompt for image Generation..
  – Select Model: Choose AI model and adjust settings
  
------------------------------------------------
ControlNet Features
------------------------------------------------
ControlNet allows you to use specific elements of an image as input for AI generation. 
You can activate one mode at a time per image:

- **Depth**: Leverages the 3D depth map of an image.
- **Edges**: Extracts line art or boundaries.
- **Pose**: Applies the pose or skeletal structure.
- **Scribble**: Uses freehand sketches as input.

Each mode has a **strength slider** to adjust how much the AI incorporates that control type. 
Once a checkbox is selected, it may take 5 seconds to 1 minute to analyze the image.

*Note*: Only one checkbox per mode (Depth, Edges, Pose, or Scribble) can be active 
across all images at a time.

------------------------------------------------
Remix with IP-Adapter
------------------------------------------------
Remix mode allows you to combine one or more images as reference inputs for your generation.

- Select the "Remix" checkbox for any image(s) you want to use.
- Multiple images can have the Remix checkbox active at the same time.
- Use the **strength slider** to control how strongly the selected images influence the output.

------------------------------------------------
Generating Images
------------------------------------------------
1. After setting your text prompt, adjusting sliders, and selecting checkboxes, click "Generate."
2. The output image will immediately appear on the canvas in the center, but it may take 
   10 seconds to 3 minutes (or longer) to fully render.

------------------------------------------------
Tips for Effective Use
------------------------------------------------
- Combine ControlNet and Remix features for fine-tuned control over style and structure.
- Adjust sliders to experiment with the influence of your input images.
- Be patient during analysis and generation times to allow the AI to produce the best results.
`;

  const addHelpNote = () => {
    const center = {
      x: (window.innerWidth / 2 - offset.x) / zoom,
      y: (window.innerHeight / 2 - offset.y) / zoom
    };

    addShape({
      id: Math.random().toString(36).substr(2, 9),
      type: 'sticky',
      position: {
        x: center.x - 200,
        y: center.y - 250
      },
      width: 500,
      height: 300,
      color: '#fff9c4',
      content: helpContent,
      fontSize: 14,
      rotation: 0,
      isUploading: false,
      model: '',
      useSettings: false
    });
  };


  const handleSave = async () => {
    if (!boardId) return;
    setIsSaving(true);
    try {
      const thumbnailBase64 = await generateThumbnail(shapes);
      const fileName = `${boardId}-${Date.now()}.webp`;

      // Extract just the binary data
      const base64Data = thumbnailBase64.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, binaryData, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the clean URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);

      // Update project with clean URL
      await updateProject(boardId, {
        shapes,
        thumbnail: publicUrl
      });
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setIsSaving(false);
    }
  };
  const handleNavigation = async () => {
    if (isBoard && boardId) {
      await handleSave();
    }
    window.location.href = '/';
  };


  const handleDashboardClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isBoard && boardId) {
      await handleSave();
    }
    window.location.href = '/';
  };

  const handleNewProjectClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isBoard && boardId) {
      await handleSave();
    }
    const newProject = await createProject({
      shapes: [],
      name: 'Untitled'
    });
    navigate(`/board/${newProject.id}`);
  };

  const { projects } = useProjects();
  const currentProject = projects.find(p => p.id === boardId);

  const handleDuplicateProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (boardId) {
      // Save current project first
      await handleSave();

      // Create new project with current shapes
      const newProject = await createProject({
        shapes: [],
        name: `Copy of ${currentProject?.name || 'Untitled Project'}`
      });

      // Update the new project with current shapes
      await updateProject(newProject.id, {
        shapes,
        name: `Copy of ${boardId}`
      });

      navigate(`/board/${newProject.id}`);
    }
  };
  return (
    <>
      <nav className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center" onClick={(e) => {
                e.preventDefault();
                handleNavigation();
              }}>
                <span className="text-xl font-bold text-gray-900">Picabia</span>
              </Link>
              {isBoard && (
                <div
                  className="relative group"
                  ref={menuRef}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <button className="p-2 hover:bg-gray-100 rounded-lg ml-2">
                    <Menu className="w-5 h-5" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute left-0 mt-0 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={handleDashboardClick}
                        >
                          Projects Dashboard
                        </Link>
                        <Link
                          to="/board/new"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={handleNewProjectClick}
                        >
                          New Project
                        </Link>

                        <Link
                          to="#"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={handleDuplicateProject}
                        >
                          Duplicate Project
                        </Link>

                        <Link
                          to="#"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={(e) => {
                            e.preventDefault();
                            addHelpNote();
                            setIsMenuOpen(false);
                            menuRef.current?.blur();
                            setTool('select');
                          }}
                        >
                          Help
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {user && isBoard && isSaving && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Save className="w-4 h-4 animate-pulse" />
                  <span>Saving...</span>
                </div>
              )}

            </div>
            {user ? (<div className="flex items-center gap-4">

              <button
                onClick={logout}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>

            </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      <ProjectsSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}

