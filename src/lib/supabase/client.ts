import { createClient } from '@supabase/supabase-js';
import { ConnectionError } from './errors';

const supabaseUrl = 'https://tobdhxhfijeznhtfntsj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvYmRoeGhmaWplem5odGZudHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ3MjczOTMsImV4cCI6MjA0MDMwMzM5M30.gHrx60MyBvxBtN83WrWTc0LGuk3QDmNn3L-7WXVrZVs';

// Create a single instance of the Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

// Export the single instance
export { supabase };

export async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('projects').select('id').limit(1);
    if (error) throw error;
    return true;
  } catch {
    throw new ConnectionError('Unable to connect to the server');
  }
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        continue;
      }
    }
  }
  
  throw lastError || new Error('Operation failed after multiple retries');
}