import { supabase, retryOperation } from './client';
import { handleError, NotFoundError } from './errors';
import type { Project } from '../../types';

export async function fetchProject(id: string, userId: string): Promise<Project> {
  return retryOperation(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (!data) throw new NotFoundError('Project not found');

      return data;
    } catch (error) {
      throw handleError(error);
    }
  });
}

export async function updateProject(
  id: string,
  userId: string,
  updates: Partial<Project>
): Promise<void> {
  return retryOperation(async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      throw handleError(error);
    }
  });
}