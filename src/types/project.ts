import { Shape } from './shapes';

export interface Project {
  id: string;
  name: string;
  shapes: Shape[];
  user_id: string;
  created_at: string;
  updated_at: string;
  is_template: boolean;
  thumbnail: string | null;
  cloned_from?: string;
} 