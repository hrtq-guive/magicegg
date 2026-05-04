import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || '';

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SECRET_KEY is missing. Admin operations will fail.');
}

// This client uses the secret key, bypassing RLS. 
// ONLY use this in API routes (server-side).
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
