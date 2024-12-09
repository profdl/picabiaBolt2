import { useState, useEffect, useCallback } from 'react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types';




export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: fetchedProjects, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      setProjects(fetchedProjects || []);
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      console.error('Error fetching projects:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchProject = useCallback(async (id: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, created_at, updated_at, name, user_id, shapes, thumbnail')
        .eq('user_id', user.id)
        .eq('id', id)
        .single();


      if (error) {
        const errorMessage = handleSupabaseError(error);
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error('Project not found');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : handleSupabaseError(err);
      console.error('Error fetching project:', errorMessage);
      throw new Error(errorMessage);
    }
  }, [user]);


  const createProject = async ({ name, shapes }: { name: string; shapes: never[] }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            name,
            user_id: user.id,
            shapes,
            thumbnail: null
          }
        ])
        .select()
        .single();

      if (error) {
        const errorMessage = handleSupabaseError(error);
        throw new Error(errorMessage);
      }

      setProjects(prev => [data, ...prev]);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : handleSupabaseError(err);
      console.error('Error creating project:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };


  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        const errorMessage = handleSupabaseError(error);
        throw new Error(errorMessage);
      }

      setProjects(prev =>
        prev.map(project =>
          project.id === id
            ? {
              ...project,
              ...updates,
              thumbnail: updates.thumbnail || null,
            }
            : project
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : handleSupabaseError(err);
      console.error('Error updating project:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };


  const deleteProject = async (id: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        const errorMessage = handleSupabaseError(error);
        throw new Error(errorMessage);
      }

      setProjects(prev => prev.filter(project => project.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : handleSupabaseError(err);
      console.error('Error deleting project:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    fetchProject,
    fetchProjects,
  };
}