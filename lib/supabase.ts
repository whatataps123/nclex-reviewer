import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// This check helps you debug by telling you exactly what is missing in the console
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase Environment Variables! Check your .env.local file.");
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);