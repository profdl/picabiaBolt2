import React from 'react';
import { Plus } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { ProjectCard } from '../components/ProjectCard';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { projects, createProject, updateProject, deleteProject, loading, error } = useProjects();
  const navigate = useNavigate();

  const handleCreateProject = async () => {
    const project = await createProject();
    if (project) {
      navigate(`/board/${project.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-red-600">Failed to load projects</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Boards</h1>
        <button
          onClick={handleCreateProject}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Board
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No boards yet
          </h3>
          <p className="text-gray-500">
            Create your first board to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => navigate(`/board/${project.id}`)}
              onRename={async (newName) => {
                await updateProject(project.id, { name: newName });
              }}
              onDelete={async () => {
                await deleteProject(project.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}