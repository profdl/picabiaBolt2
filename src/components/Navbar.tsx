import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, LogOut, LayoutGrid, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProjectsSidebar } from './ProjectsSidebar';
import { useProjects } from '../hooks/useProjects';
import { useStore } from '../store';
import { generateThumbnail } from '../utils/thumbnail';

export function Navbar() {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const location = useLocation();
  const { updateProject } = useProjects();
  const shapes = useStore(state => state.shapes);

  const isBoard = location.pathname.startsWith('/board/');
  const boardId = isBoard ? location.pathname.split('/')[2] : null;

  const handleSave = async () => {
    if (!boardId) return;
    
    setIsSaving(true);
    try {
      const thumbnail = await generateThumbnail(shapes);
      await updateProject(boardId, { 
        shapes,
        thumbnail: thumbnail.split(',')[1]
      });
      console.log('Project saved successfully');
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center">
                <span className="text-xl font-bold text-gray-900">Whiteboard</span>
              </Link>
              {user && (
                <>
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>Projects</span>
                  </button>
                  {isBoard && (
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                        isSaving
                          ? 'bg-gray-100 text-gray-400'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{user.email}</span>
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.email}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <button
                  onClick={logout}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
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