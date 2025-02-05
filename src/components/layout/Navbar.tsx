import { useRef, useState } from "react";
import { useStore } from "../../store";
import { Link, useLocation } from "react-router-dom";
import { Save, EyeOff, Eye } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useProjects } from "../../hooks/useProjects";
import { Menu } from "lucide-react";
import { useNavigation } from "../../hooks/useNavigation";
import { useProjectName } from "../../hooks/useProjectName";
import { useProjectSave } from "../../hooks/useProjectSave";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isBoard = location.pathname.startsWith("/board/");
  const boardId = isBoard ? location.pathname.split("/")[2] : null;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { projects } = useProjects();
  const currentProject = projects.find((p) => p.id === boardId);

  // Custom hooks
  const { handleNavigation, handleNewProjectClick, handleDuplicateProject } = useNavigation(boardId);
  const { isEditingName, setIsEditingName, projectName, setProjectName, handleNameChange } = useProjectName(boardId, currentProject);
  const { isSaving, handleSave } = useProjectSave(boardId);

  const handleMouseEnter = () => setIsMenuOpen(true);
  const handleMouseLeave = () => setIsMenuOpen(false);

  const { showTooltips, toggleTooltips } = useStore((state) => ({
    showTooltips: state.showTooltips,
    toggleTooltips: state.toggleTooltips,
  }));

  const handleDashboardClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    handleNavigation(handleSave);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow z-50 relative">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between w-full h-16">
          <div className="flex items-center gap-4 flex-none">
            <Link
              to="/"
              className="flex items-center"
              onClick={(e) => {
                e.preventDefault();
                handleNavigation(handleSave);
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
                <button className="p-2 hover:bg-gray-100 rounded-lg">
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
                        onClick={(e) => handleNewProjectClick(e, handleSave)}
                      >
                        New Project
                      </Link>
                      <Link
                        to="#"
                        className="flex px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={(e) => handleDuplicateProject(e, handleSave, currentProject)}
                      >
                        Duplicate Project
                      </Link>
                      <Link
                        to="#"
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
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
            {isBoard && (
              <div className="ml-4">
                {isEditingName ? (
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={handleNameChange}
                    onBlur={() => setIsEditingName(false)}
                    className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {projectName}
                  </button>
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
          <div className="flex items-center gap-4 ml-auto">
            {user ? (
              <button
                onClick={logout}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
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
      </div>
    </nav>
  );
};