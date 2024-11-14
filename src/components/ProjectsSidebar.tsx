import React, { useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';

interface ProjectsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectsSidebar({ isOpen, onClose }: ProjectsSidebarProps) {
  const { projects, loading, fetchProjects, createProject} = useProjects();
  const navigate = useNavigate();

  // Refresh projects when sidebar is opened
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen, fetchProjects]);

  const handleProjectClick = (id: string) => {
    navigate(`/board/${id}`);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div 
        className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
        onClick={onClose} 
      />
      
      <div className="fixed inset-y-0 left-0 flex max-w-full pr-10">
        <div 
          className={`w-screen max-w-md transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col overflow-y-scroll bg-gray-50 shadow-xl">
            <div className="flex-1 overflow-y-auto py-6 px-4 sm:px-6">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-medium text-gray-900">Your Projects</h2>
                <button
                  type="button"
                  className="relative -m-2 p-2 text-gray-400 hover:text-gray-500"
                  onClick={onClose}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-4">
                <button
                  onClick={async () => {
                    const newProject = await createProject();
                    handleProjectClick(newProject.id);
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </div>

              {loading ? (
                <div className="mt-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                </div>
              ) : projects.length === 0 ? (
                <p className="mt-8 text-center text-gray-500">No projects yet</p>
              ) : (
                <div className="mt-8 grid grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="group relative cursor-pointer bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-gray-100"
                      onClick={() => handleProjectClick(project.id)}
                    >
                      <div className="aspect-w-16 aspect-h-9 block w-full overflow-hidden rounded-t-xl bg-gray-100">
                        {project.thumbnail ? (
                          <img
                            src={project.thumbnail.startsWith('data:') 
                              ? project.thumbnail 
                              : `data:image/jpeg;base64,${project.thumbnail}`}
                            alt={project.name}
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-gray-400">No preview</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(project.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}            </div>
          </div>
        </div>
      </div>
    </div>
  );
}