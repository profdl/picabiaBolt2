import { useRef, useState } from "react";
import { useStore } from "../../store";
import { Link, useLocation } from "react-router-dom";
import { Save, EyeOff, Eye, Sun, Moon } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useProjects } from "../../hooks/useProjects";
import { Menu } from "lucide-react";
import { useNavigation } from "../../hooks/useNavigation";
import { useProjectName } from "../../hooks/useProjectName";
import { useProjectSave } from "../../hooks/useProjectSave";
import { useThemeClass } from "../../styles/useThemeClass";
import { useDarkMode } from "../../hooks/useDarkMode";

export const Navbar = () => {
  const { isDark, toggleDarkMode } = useDarkMode();
  const { user, logout } = useAuth();
  const location = useLocation();
  const isBoard = location.pathname.startsWith("/board/");
  const boardId = isBoard ? location.pathname.split("/")[2] : null;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { projects } = useProjects();
  const currentProject = projects.find((p) => p.id === boardId);

  // Custom hooks
  const { handleNavigation, handleNewProjectClick, handleDuplicateProject } =
    useNavigation(boardId);
  const {
    isEditingName,
    setIsEditingName,
    projectName,
    setProjectName,
    handleNameChange,
  } = useProjectName(boardId, currentProject);
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

  const handleLogout = async () => {
    try {
      await logout();
      // Optionally redirect to home page or login page after logout
      window.location.href = "/";
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Styles
  const styles = {
    nav: useThemeClass(["nav", "base"]),
    container: useThemeClass(["nav", "container"]),
    header: useThemeClass(["nav", "header"]),
    logo: useThemeClass(["nav", "logo"]),
    menuButton: useThemeClass(["nav", "menuButton"]),
    dropdown: {
      container: useThemeClass(["nav", "dropdown", "container"]),
      item: useThemeClass(["nav", "dropdown", "item"]),
    },
    projectName: {
      input: useThemeClass(["nav", "projectName", "input"]),
      button: useThemeClass(["nav", "projectName", "button"]),
    },
    auth: {
      signOut: useThemeClass(["nav", "auth", "signOut"]),
      login: useThemeClass(["nav", "auth", "login"]),
      signUp: useThemeClass(["nav", "auth", "signUp"]),
    },
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className="flex items-center gap-4 flex-none">
            <Link
              to="/"
              className="flex items-center"
              onClick={(e) => {
                e.preventDefault();
                handleNavigation(handleSave);
              }}
            >
              <span className={styles.logo}>Picabia</span>
            </Link>

            {isBoard && (
              <div
                className="relative group"
                ref={menuRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button className={styles.menuButton}>
                  <Menu className="w-5 h-5" />
                </button>
                {isMenuOpen && (
                  <div className={styles.dropdown.container}>
                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        className={styles.dropdown.item}
                        onClick={handleDashboardClick}
                      >
                        Projects Dashboard
                      </Link>
                      <Link
                        to="/board/new"
                        className={styles.dropdown.item}
                        onClick={(e) => handleNewProjectClick(e, handleSave)}
                      >
                        New Project
                      </Link>
                      <Link
                        to="#"
                        className={styles.dropdown.item}
                        onClick={(e) =>
                          handleDuplicateProject(e, handleSave, currentProject)
                        }
                      >
                        Duplicate Project
                      </Link>
                      <Link
                        to="#"
                        className={`${styles.dropdown.item} flex items-center justify-between`}
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
                      <button
                        className={`${styles.dropdown.item} w-full flex items-center justify-between`}
                        onClick={() => {
                          toggleDarkMode();
                          setIsMenuOpen(false);
                          menuRef.current?.blur();
                        }}
                      >
                        <span>Theme</span>
                        {isDark ? (
                          <Sun className="w-4 h-4" />
                        ) : (
                          <Moon className="w-4 h-4" />
                        )}
                      </button>
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
                    className={styles.projectName.input}
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className={styles.projectName.button}
                  >
                    {projectName}
                  </button>
                )}
              </div>
            )}

            {user && isBoard && isSaving && (
              <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                <Save className="w-4 h-4 animate-pulse" />
                <span>Saving...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {user ? (
              <button onClick={handleLogout} className={styles.auth.signOut}>
                Sign Out
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className={styles.auth.login}>
                  Login
                </Link>
                <Link to="/register" className={styles.auth.signUp}>
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
