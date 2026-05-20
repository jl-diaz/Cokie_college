import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

// Interceptor para añadir el token de Supabase a todas las peticiones
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Error in API interceptor:', error);
  }
  return config;
});

export default api;
