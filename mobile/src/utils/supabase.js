import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Error: Faltan las llaves de Supabase en el archivo .env de mobile");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
