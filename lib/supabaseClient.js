// lib/supabaseClient.js
// Public client — safe to use in the browser. Uses the "anon" key, which
// only allows what the Row Level Security policies in schema.sql permit.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
