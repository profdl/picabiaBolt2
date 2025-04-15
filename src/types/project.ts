import { Shape } from './shapes';

export interface PartialProject {
  id: string;
  name: string;
  thumbnail: string | null;
  updated_at: string;
  is_template: boolean;
}

export interface Project extends PartialProject {
  shapes: Shape[];
  user_id: string;
  created_at: string;
  cloned_from?: string;
} 