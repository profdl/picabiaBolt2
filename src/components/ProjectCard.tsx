import React, { useState, useEffect } from 'react';
import { Clock, MoreVertical, Edit2, Trash2, X, Check, Image as ImageIcon } from 'lucide-react';
import { Project } from '../hooks/useProjects';

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
        <div className="aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={project.name}
              className="w-full h-full object-cover rounded-t-lg"
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <ImageIcon className="w-12 h-12 text-gray-300" />
              <span className="text-sm text-gray-400 mt-2">No preview available</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            {isRenaming ? (
              <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
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
              <>
                <h3 className="text-lg font-medium text-gray-900 truncate flex-1">
                  {project.name}
                </h3>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRenaming(true);
                    }}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            <span>Updated {formatDate(project.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}