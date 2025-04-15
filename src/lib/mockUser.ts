import { User } from '@supabase/supabase-js';

export const mockUser: User = {
  id: 'mock-user-id',
  email: 'test@example.com',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as User; 