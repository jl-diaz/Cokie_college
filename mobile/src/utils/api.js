import axios from 'axios';
import { supabase } from './supabase';
import Constants from 'expo-constants';

const rawUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'https://cokie-college.vercel.app/api/';
const baseURL = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;

const api = axios.create({
  baseURL,
});

// Interceptor para añadir el token de Supabase a todas las peticiones
api.interceptors.request.use(async (config) => {
  try {
    // Normalizar la URL para evitar problemas de ruta al combinar baseURL y url
    if (config.url && config.url.startsWith('/')) {
      config.url = config.url.substring(1);
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Error in API request interceptor:', error);
  }
  return config;
});

// Interceptor de respuesta para manejar tokens expirados o desautorizados
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Sesión expirada o token inválido (401). Cerrando sesión...');
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Error durante el cierre de sesión automático:', e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
