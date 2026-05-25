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

<<<<<<< HEAD
// Interceptor para manejar errores globales (como 401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      await supabase.auth.signOut();
      // El onAuthStateChange en AuthContext se encargará de redirigir
    }
    return Promise.reject(error);
  }
);

=======
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
export default api;
