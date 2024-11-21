import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProjectsSidebar } from './ProjectsSidebar';
import { useProjects } from '../hooks/useProjects';
import { useStore } from '../store';
import { generateThumbnail } from '../utils/thumbnail';
import { HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const location = useLocation();
  const { updateProject } = useProjects();
  const shapes = useStore(state => state.shapes);
  const { showShortcuts, setShowShortcuts } = useStore();
  const isBoard = location.pathname.startsWith('/board/');
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';
  const boardId = isBoard ? location.pathname.split('/')[2] : null;

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

  const handleProjectsClick = async () => {
    if (isBoard && boardId) {
      await handleSave();
    }
    setIsSidebarOpen(true);
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
              {user && (
                <>
                  {!isDashboard && (
                    <button
                      onClick={handleProjectsClick}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>Projects</span>
                    </button>
                  )}
                  {isBoard && (
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md ${isSaving ? 'bg-gray-100 text-gray-400' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                      <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                  )}
                </>
              )}
            </div>
            {user ? (<div className="flex items-center gap-4">

              <button
                onClick={logout}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
              {user && isBoard && (
                <button
                  onClick={() => setShowShortcuts(!showShortcuts)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Toggle Keyboard Shortcuts"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              )}
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

