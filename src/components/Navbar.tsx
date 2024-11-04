import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, LogOut, LayoutGrid, Save, Keyboard, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ProjectsSidebar } from './ProjectsSidebar';
import { useProjects } from '../hooks/useProjects';
import { useStore } from '../store';
import { generateThumbnail } from '../utils/thumbnail';
import { HelpCircle } from 'lucide-react';
import { WebSocketTester } from './WebSocketTester';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const location = useLocation();
  const { updateProject } = useProjects();
  const shapes = useStore(state => state.shapes);
  const { showShortcuts, setShowShortcuts } = useStore();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [showWebSocketTester, setShowWebSocketTester] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', (!isDarkMode).toString());
  };

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  }, []);

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
      <nav className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center">
                <span className="text-xl font-bold text-gray-900">Picabia</span>
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
                      className={`flex items-center gap-2 px-3 py-2 rounded-md ${isSaving
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
                <button
                  onClick={() => setShowWebSocketTester(!showWebSocketTester)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="WebSocket Tester"
                >
                  <span className="w-5 h-5">🔌</span>
                </button>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Toggle Dark Mode"
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
                <button
                  onClick={() => setShowShortcuts(!showShortcuts)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Toggle Keyboard Shortcuts"
                >
                  <HelpCircle className="w-5 h-5" />
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
      {showWebSocketTester && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg max-w-lg w-full m-4">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl">WebSocket Tester</h2>
              <button onClick={() => setShowWebSocketTester(false)}>✕</button>
            </div>
            <WebSocketTester />
          </div>
        </div>
      )}
    </>
  );
}