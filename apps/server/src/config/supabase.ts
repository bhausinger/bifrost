import { createClient } from '@supabase/supabase-js';
import { config } from './environment.js';

const supabaseUrl = config.supabase.url;
const supabaseServiceRoleKey = config.supabase.serviceRoleKey;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration');
}

// Create Supabase client with service role for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create Supabase client with anon key for frontend operations  
export const supabaseAnon = createClient(supabaseUrl, config.supabase.anonKey);

export default supabase;