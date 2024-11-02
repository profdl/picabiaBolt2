import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Image } from 'lucide-react';
import { Canvas } from '../components/Canvas';
import { Toolbar } from '../components/Toolbar';
import { ImageGeneratePanel } from '../components/ImageGeneratePanel';
import { UnsplashPanel } from '../components/UnsplashPanel';
import { GalleryPanel } from '../components/GalleryPanel';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../hooks/useProjects';
import { calculateViewportFit } from '../utils/canvas';
import { ShortcutsPanel } from '../components/ShortcutsPanel';
import { AssetsDrawer } from '../components/AssetsDrawer';


export const Board = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchProject, updateProject } = useProjects();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const { 
    showImageGenerate, 
    showUnsplash, 
    showGallery, 
    toggleImageGenerate,  // This was missing
    toggleUnsplash, 
    toggleGallery 
  } =
    useStore();
    const showAssets = useStore(state => state.showAssets);
  const toggleAssets = useStore(state => state.toggleAssets);
  const addShape = useStore(state => state.addShape);
  const zoom = useStore(state => state.zoom);
  const offset = useStore(state => state.offset);

  const getViewportCenter = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: (rect.width / 2 - offset.x) / zoom,
      y: (rect.height / 2 - offset.y) / zoom
    };
  }, [zoom, offset]);

  const containerRef = useRef<HTMLDivElement>(null);
  const initialFitDone = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');

  const shapes = useStore(state => state.shapes);
  const setShapes = useStore(state => state.setShapes);
  const setZoom = useStore(state => state.setZoom);
  const setOffset = useStore(state => state.setOffset);
  const resetState = useStore(state => state.resetState);
  
  const maxRetries = 3;



  // Memoize the auto-save debounce function
  const debouncedSave = useMemo(() => {
    return async (shapes: any[]) => {
      if (!id || !user) return;

      // Convert shapes to string for comparison
      const shapesString = JSON.stringify(shapes);
      
      // Don't save if shapes haven't changed
      if (shapesString === lastSavedRef.current) return;

      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout
      saveTimeoutRef.current = setTimeout(async () => {
        if (isSaving) return;

        try {
          setIsSaving(true);
          await updateProject(id, {
            shapes,
            updated_at: new Date().toISOString()
          });
          lastSavedRef.current = shapesString;
        } catch (err) {
          console.error('Error auto-saving project:', err);
        } finally {
          setIsSaving(false);
        }
      }, 2000); // Increased debounce time to 2 seconds
    };
  }, [id, user, updateProject, isSaving]);

  const fitShapesToView = useCallback(() => {
    if (!containerRef.current || !shapes?.length) return;

    const { width, height } = containerRef.current.getBoundingClientRect();
    const { zoom, offset } = calculateViewportFit(shapes, width, height);

    setZoom(zoom);
    setOffset(offset);
  }, [shapes, setZoom, setOffset]);

  const loadProject = useCallback(async () => {
    if (!id || !user) return;

    try {
      setLoading(true);
      setError(null);
      const project = await fetchProject(id);
      
      if (!project) {
        setError('Project not found. It may have been deleted or you may not have permission to access it.');
        return;
      }

      if (project.shapes) {
        setShapes(project.shapes);
        lastSavedRef.current = JSON.stringify(project.shapes);
        initialFitDone.current = false;
      }
    } catch (err: any) {
      console.error('Error fetching project:', err);
      setError(err.message || 'Failed to load project. Please try again.');
      
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadProject();
        }, Math.min(1000 * Math.pow(2, retryCount), 8000));
      }
    } finally {
      setLoading(false);
    }
  }, [id, user, fetchProject, setShapes, retryCount]);

  // Load project on mount
  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetState();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [resetState]);

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
              onClick={() => navigate('/')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            >
              Go to Dashboard
            </button>
            {retryCount < maxRetries && (
              <button
                onClick={() => {
                  setRetryCount(prev => prev + 1);
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
      <div ref={containerRef} className="w-screen h-[calc(100vh-4rem)] overflow-hidden bg-gray-50 relative canvas-container">
        <Canvas />
        <Toolbar />
        <AssetsDrawer
            isOpen={showAssets}
            onClose={toggleAssets}
            addShape={addShape}
            getViewportCenter={getViewportCenter}
          />
        {showUnsplash && <UnsplashPanel onClose={toggleUnsplash} />}
        {showImageGenerate && <ImageGeneratePanel onClose={toggleImageGenerate} />}
        {showGallery && (
  <GalleryPanel 
    isOpen={showGallery} 
    onClose={toggleGallery} 
    refreshTrigger={0} 
  />
)}        {isSaving && (          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/75 text-white px-3 py-1 rounded-full text-sm">
            Saving...
          </div>
        )}
      </div>
      <ShortcutsPanel />
    </>
  );
}

function setShowImageGenerate(arg0: (prev: any) => boolean): void {
  throw new Error('Function not implemented.');
}

