import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Canvas } from "../components/layout/Canvas";
import { Toolbar } from "../components/layout/toolbars/Toolbar";
import { GalleryDrawer } from "../components/layout/drawers/GalleryDrawer";
import { useStore } from "../store";
import { useAuth } from "../contexts/AuthContext";
import { useProjects } from "../hooks/project/useProjects";
import { calculateViewportFit } from "../utils/canvas";
import { ShortcutsPanel } from "../components/shared/ShortcutsPanel";
import { AssetsDrawer } from "../components/layout/drawers/AssetsDrawer";
import { ContextMenu } from "../components/shared/ContextMenu";
import { Shape, SavedImage } from "../types";

interface Delta {
  deltaX: number;
  deltaY: number;
}





export const Board = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchProject, updateProject } = useProjects();
  
  // First, get all the state from useStore
  const {
    showGallery,
    toggleGallery,
    showAssets,
    toggleAssets,
    toggleImageGenerate,
    toggleUnsplash,
    contextMenu,
    setContextMenu,
    shapes,
    setShapes,
    setZoom,
    setOffset,
    resetState
  } = useStore((state) => ({
    showGallery: state.showGallery,
    toggleGallery: state.toggleGallery,
    showAssets: state.showAssets,
    toggleAssets: state.toggleAssets,
    toggleImageGenerate: state.toggleImageGenerate,
    toggleUnsplash: state.toggleUnsplash,
    contextMenu: state.contextMenu,
    setContextMenu: state.setContextMenu,
    shapes: state.shapes,
    setShapes: state.setShapes,
    setZoom: state.setZoom,
    setOffset: state.setOffset,
    resetState: state.resetState
  }));

  // Then declare all other state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingImage, setViewingImage] = useState<SavedImage | null>(null);

  // Then declare refs
  const containerRef = useRef<HTMLDivElement>(null);
  const initialFitDone = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>("");

  // Then declare drawer props
  const assetsDrawerProps = {
    isOpen: showAssets,
    onClose: toggleAssets
  };

  const galleryDrawerProps = {
    isOpen: showGallery,
    onClose: toggleGallery,
    viewingImage,
    setViewingImage
  };


  

  const maxRetries = 3;

  useEffect(() => {
    const preventDefaultGestures = (e: Event) => {
      // Only prevent if the event target is within the canvas
      const isCanvas = (e.target as Element)?.closest('#canvas-container');
      if (!isCanvas) return;
      e.preventDefault();
    };
  
    const preventBackForward = (e: TouchEvent | WheelEvent) => {
      // Only prevent if the event target is within the canvas
      const isCanvas = (e.target as Element)?.closest('#canvas-container');
      if (!isCanvas) return;
  
      if (e instanceof TouchEvent) {
        if (e.touches.length > 1) {
          e.preventDefault();
        } else if (e.touches.length === 1) {
          const touch = e.touches[0];
          const delta: Delta = {
            deltaX: touch.clientX,
            deltaY: touch.clientY,
          };
          if (Math.abs(delta.deltaX) > Math.abs(delta.deltaY)) {
            e.preventDefault();
          }
        }
      } else if (e instanceof WheelEvent) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          e.preventDefault();
        }
      }
    };
  
    const blockNavigationGestures = (e: Event) => {
      // Only prevent if the event target is within the canvas
      const isCanvas = (e.target as Element)?.closest('#canvas-container');
      if (!isCanvas) return;
      e.preventDefault();
      return false;
    };
  
    // Get all the elements that need gesture blocking
    const container = containerRef.current;
  
    // Only apply to canvas container
    if (container) {
      container.addEventListener("wheel", preventDefaultGestures, {
        passive: false,
      });
      container.addEventListener("touchstart", preventDefaultGestures, {
        passive: false,
      });
      container.addEventListener(
        "touchmove",
        preventBackForward as EventListener,
        { passive: false }
      );
      container.addEventListener("gesturestart", preventDefaultGestures, {
        passive: false,
      });
      container.addEventListener("gesturechange", preventDefaultGestures, {
        passive: false,
      });
    }
  
    // Block navigation gestures only on canvas
    document.addEventListener("wheel", preventBackForward as EventListener, {
      passive: false,
    });
    document.addEventListener(
      "touchmove",
      preventBackForward as EventListener,
      { passive: false }
    );
    window.addEventListener("swiperight", blockNavigationGestures, {
      passive: false,
    });
    window.addEventListener("swipeleft", blockNavigationGestures, {
      passive: false,
    });
  
    // Only apply overscroll behavior to canvas
    if (container) {
      container.style.overscrollBehavior = "none";
    }
  
    return () => {
      if (container) {
        container.removeEventListener("wheel", preventDefaultGestures);
        container.removeEventListener("touchstart", preventDefaultGestures);
        container.removeEventListener(
          "touchmove",
          preventBackForward as EventListener
        );
        container.removeEventListener("gesturestart", preventDefaultGestures);
        container.removeEventListener("gesturechange", preventDefaultGestures);
        container.style.overscrollBehavior = "";
      }
  
      document.removeEventListener(
        "wheel",
        preventBackForward as EventListener
      );
      document.removeEventListener(
        "touchmove",
        preventBackForward as EventListener
      );
      window.removeEventListener("swiperight", blockNavigationGestures);
      window.removeEventListener("swipeleft", blockNavigationGestures);
    };
  }, []);

  // Memoize the auto-save debounce function// Update the debouncedSave function signature to use proper typing
  const LOCAL_STORAGE_KEY = `board_${id}`; // Use board ID to keep separate states

  // Inside the Board component, modify the debouncedSave function
  const debouncedSave = useMemo(() => {
    return async (shapes: Shape[]) => {
      if (!id || !user) return;

      const shapesString = JSON.stringify(shapes);
      if (shapesString === lastSavedRef.current) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Save to localStorage immediately
      localStorage.setItem(LOCAL_STORAGE_KEY, shapesString);

      saveTimeoutRef.current = setTimeout(async () => {
        if (isSaving) return;

        try {
          setIsSaving(true);
          await updateProject(id, {
            shapes,
            updated_at: new Date().toISOString(),
          });
          lastSavedRef.current = shapesString;
        } catch (err) {
          console.error("Error auto-saving project:", err);
        } finally {
          setIsSaving(false);
        }
      }, 2000);
    };
  }, [id, user, LOCAL_STORAGE_KEY, isSaving, updateProject]);

  // Modify the loadProject function to properly handle shape loading
  const loadProject = useCallback(async () => {
    if (!id || !user) {
      console.log("Missing id or user:", { id, userId: user?.id });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load from Supabase first
      const project = await fetchProject(id);
      console.log('Loaded project from Supabase:', project);

      if (!project) {
        setError("Project not found");
        return;
      }

      // Check if we have shapes in the project
      if (Array.isArray(project.shapes) && project.shapes.length > 0) {
        console.log('Setting shapes from Supabase:', project.shapes.length);
        setShapes(project.shapes);
        
        // Update localStorage with the latest data
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            shapes: project.shapes,
            updated_at: project.updated_at
          })
        );
      } else {
        // If no shapes in Supabase, try loading from localStorage
        console.log('No shapes in Supabase, checking localStorage');
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          try {
            const { shapes: localShapes } = JSON.parse(localData);
            if (Array.isArray(localShapes) && localShapes.length > 0) {
              console.log('Setting shapes from localStorage:', localShapes.length);
              setShapes(localShapes);
            }
          } catch (e) {
            console.warn("Error parsing localStorage data:", e);
          }
        }
      }

      initialFitDone.current = false;
    } catch (err) {
      console.error("Project load error:", err);
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [id, user, LOCAL_STORAGE_KEY, fetchProject, setShapes]);

  const fitShapesToView = useCallback(() => {
    if (!containerRef.current || !shapes?.length) return;

    const { width, height } = containerRef.current.getBoundingClientRect();
    const { zoom, offset } = calculateViewportFit(shapes, width, height);

    setZoom(zoom);
    setOffset(offset);
  }, [shapes, setZoom, setOffset]);

  useEffect(() => {
    console.log("Board mounted, triggering loadProject");
    loadProject();
  }, [loadProject]);
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetState();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Clean up localStorage when unmounting
    };
  }, [resetState, id, LOCAL_STORAGE_KEY]);

  // Fit shapes to view after loading
  useEffect(() => {
    if (!loading && shapes?.length > 0 && !initialFitDone.current) {
      initialFitDone.current = true;
      requestAnimationFrame(fitShapesToView);
    }
  }, [loading, shapes, fitShapesToView]);

  // Auto-save changes
  useEffect(() => {
    if (!loading && shapes?.length > 0) {
      debouncedSave(shapes);
    }
  }, [shapes, loading, debouncedSave]);

  useEffect(() => {
    // Add visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, reloading project");
        loadProject();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadProject]);

  if (error) {
    return (
      <div className="w-screen h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-lg">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-lg font-semibold">Error Loading Board</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            >
              Go to Dashboard
            </button>
            {retryCount < maxRetries && (
              <button
                onClick={() => {
                  setRetryCount((prev) => prev + 1);
                  loadProject();
                }}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-screen h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="w-screen h-[calc(100vh-4rem)] overflow-hidden bg-gray-50 dark:bg-gray-800 relative canvas-container"
        style={{
          touchAction: "none",
          overscrollBehavior: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Canvas />
        <Toolbar
          onShowImageGenerate={toggleImageGenerate}
          onShowUnsplash={toggleUnsplash}
          onShowGallery={toggleGallery}
        />
        <AssetsDrawer {...assetsDrawerProps} />
        {showGallery && <GalleryDrawer {...galleryDrawerProps} />}

        {isSaving && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/75 text-white px-3 py-1 rounded-full text-sm">
            Saving...
          </div>
        )}
      </div>
      <ShortcutsPanel />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};