import { useState, useEffect } from 'react';
import { Clock, MoreVertical, Edit2, Trash2, X, Check } from 'lucide-react';
import { Project } from '../types';

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onRename: (newName: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function ProjectCard({ project, onOpen, onRename, onDelete }: ProjectCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (project.thumbnail) {
      // If it's already a data URL, use it directly
      if (project.thumbnail.startsWith('data:image/')) {
        setThumbnailUrl(project.thumbnail);
      } else {
        // Otherwise, convert base64 to data URL
        setThumbnailUrl(`data:image/jpeg;base64,${project.thumbnail}`);
      }
    } else {
      setThumbnailUrl(null);
    }
  }, [project.thumbnail]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleRename = async () => {
    if (newName.trim() && newName !== project.name) {
      try {
        await onRename(newName);
      } catch (error) {
        console.error('Failed to rename project:', error);
      }
    }
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      setIsDeleting(true);
      try {
        await onDelete();
      } catch (error) {
        console.error('Failed to delete project:', error);
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group">
      <div
        className="cursor-pointer"
        onClick={isRenaming ? undefined : onOpen}
      >
        <div className="aspect-w-16 aspect-h-9 bg-gray-100">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={project.name}
              className="object-cover rounded-t-lg"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400">No preview</span>
            </div>
          )}
        </div>
        <div className="p-4">
          {isRenaming ? (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') {
                    setNewName(project.name);
                    setIsRenaming(false);
                  }
                }}
              />
              <button
                onClick={handleRename}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setNewName(project.name);
                  setIsRenaming(false);
                }}
                className="p-1 text-gray-600 hover:bg-gray-50 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {project.name}
              </h3>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded-full"
                >
                  <MoreVertical className="h-5 w-5 text-gray-500" />
                </button>
                {isMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0"
                      onClick={() => setIsMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          setIsRenaming(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          handleDelete();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4" />
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            <span>Updated {formatDate(project.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}