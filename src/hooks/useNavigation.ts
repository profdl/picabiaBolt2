import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useProjects } from './useProjects';
import { Project } from '../types';

export function useNavigation(boardId: string | null) {
  const navigate = useNavigate();
  const { createProject, updateProject } = useProjects();
  const shapes = useStore((state) => state.shapes);

  const handleNavigation = async (handleSave: () => Promise<void>) => {
    if (boardId) {
      await handleSave();
    }
    window.location.href = "/";
  };

  const handleNewProjectClick = async (
    e: React.MouseEvent,
    handleSave: () => Promise<void>
  ) => {
    e.preventDefault();
    if (boardId) {
      await handleSave();
    }
    const newProject = await createProject({
      shapes: [],
      name: "Untitled",
    });
    navigate(`/board/${newProject.id}`);
  };

  const handleDuplicateProject = async (
    e: React.MouseEvent,
    handleSave: () => Promise<void>,
    currentProject?: Project
  ) => {
    e.preventDefault();
    if (boardId) {
      await handleSave();
      const newProject = await createProject({
        shapes: [],
        name: `Copy of ${currentProject?.name || "Untitled Project"}`,
      });
      await updateProject(newProject.id, {
        shapes,
        name: `Copy of ${currentProject?.name || "Untitled Project"}`,
      });
      navigate(`/board/${newProject.id}`);
    }
  };

  return {
    handleNavigation,
    handleNewProjectClick,
    handleDuplicateProject
  };
}