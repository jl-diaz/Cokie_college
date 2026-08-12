import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl || "https://ocqffplvqnqmwoeyxblr.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jcWZmcGx2cW5xbXdvZXl4YmxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNjE0NjksImV4cCI6MjA5NDYzNzQ2OX0.jey5Hn73UTqLxTTf_sVV-yUNv5iQo-41BpCQxvvl1Bg";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Error: Faltan las llaves de Supabase en el archivo .env de mobile");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
