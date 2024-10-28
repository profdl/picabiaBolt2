import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export const handleSupabaseError = (error: any): string => {
  if (!navigator.onLine) {
    return 'No internet connection. Please check your network.';
  }
  
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Unable to connect to the server. Please check your connection and try again.';
  }
  
  if (error?.code === '23505') {
    return 'A record with this information already exists.';
  }
  
  if (error?.code === '42501') {
    return 'You don\'t have permission to perform this action.';
  }

  if (error?.code === 'PGRST116') {
    return 'Resource not found. The project may have been deleted or you may not have permission to access it.';
  }

  if (error?.message?.includes('JWT')) {
    return 'Your session has expired. Please log in again.';
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, initialDelay * Math.pow(2, attempt))
        );
        continue;
      }
    }
  }
  
  throw lastError || new Error('Operation failed after multiple retries');
};