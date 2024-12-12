import { useState, useRef } from "react";
import { useStore } from "../store";
import { Link, useLocation } from "react-router-dom";
import { Save, EyeOff, Eye } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ProjectsSidebar } from "./ProjectsSidebar";
import { useProjects } from "../hooks/useProjects";
import { generateThumbnail } from "../utils/thumbnail";
import { Menu } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const location = useLocation();
  const { updateProject } = useProjects();
  const shapes = useStore((state) => state.shapes);
  const isBoard = location.pathname.startsWith("/board/");
  const boardId = isBoard ? location.pathname.split("/")[2] : null;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const handleMouseEnter = () => setIsMenuOpen(true);
  const handleMouseLeave = () => setIsMenuOpen(false);
  const { createProject } = useProjects();
  const navigate = useNavigate();
  const { showTooltips, toggleTooltips } = useStore((state) => ({
    showTooltips: state.showTooltips,
    toggleTooltips: state.toggleTooltips,
  }));

  const handleSave = async () => {
    if (!boardId) return;
    setIsSaving(true);
    try {
      const thumbnailBase64 = await generateThumbnail(shapes);
      const fileName = `${boardId}-${Date.now()}.webp`;

      // Extract just the binary data
      const base64Data = thumbnailBase64.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
      const binaryData = Uint8Array.from(atob(base64Data), (c) =>
        c.charCodeAt(0)
      );

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(fileName, binaryData, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get the clean URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("assets").getPublicUrl(fileName);

      // Update project with clean URL
      await updateProject(boardId, {
        shapes,
        thumbnail: publicUrl,
      });
    } catch (error) {
      console.error("Failed to save project:", error);
    } finally {
      setIsSaving(false);
    }
  };
  const handleNavigation = async () => {
    if (isBoard && boardId) {
      await handleSave();
    }
    window.location.href = "/";
  };

  const handleDashboardClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isBoard && boardId) {
      await handleSave();
    }
    window.location.href = "/";
  };

  const handleNewProjectClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isBoard && boardId) {
      await handleSave();
    }
    const newProject = await createProject({
      shapes: [],
      name: "Untitled",
    });
    navigate(`/board/${newProject.id}`);
  };

  const { projects } = useProjects();
  const currentProject = projects.find((p) => p.id === boardId);

  const handleDuplicateProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (boardId) {
      // Save current project first
      await handleSave();

      // Create new project with current shapes
      const newProject = await createProject({
        shapes: [],
        name: `Copy of ${currentProject?.name || "Untitled Project"}`,
      });

      // Update the new project with current shapes
      await updateProject(newProject.id, {
        shapes,
        name: `Copy of ${boardId}`,
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
              <Link
                to="/"
                className="flex items-center"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigation();
                }}
              >
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
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleTooltips();
                            setIsMenuOpen(false);
                            menuRef.current?.blur();
                          }}
                        >
                          <span>Toggle Tips</span>
                          {showTooltips ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
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
            {user ? (
              <div className="flex items-center gap-4">
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
      <ProjectsSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </>
  );
};
