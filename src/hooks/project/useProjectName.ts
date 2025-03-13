import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useProjects } from './useProjects';
import { Project } from '../../types'; 

export function useProjectName(boardId: string | null, currentProject?: Project) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState(currentProject?.name || "Untitled");
  const { updateProject } = useProjects();
  const shapes = useStore((state) => state.shapes);

  useEffect(() => {
    if (currentProject?.name) {
      setProjectName(currentProject.name);
    }
  }, [currentProject?.name]);

  const handleNameChange = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (boardId) {
        await updateProject(boardId, {
          name: projectName,
          shapes,
        });
        setIsEditingName(false);
      }
    }
  };

  return {
    isEditingName,
    setIsEditingName,
    projectName,
    setProjectName,
    handleNameChange
  };
}