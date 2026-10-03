import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import WebSocketService from './WebSocketService';

const STORAGE_KEY = 'cokie_ai_server_url';
const RAW_ENV_URL = process.env.EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL;

export const DEFAULT_AI_SERVER_URL = RAW_ENV_URL
  ? normalizeServerUrl(RAW_ENV_URL)
  : 'https://cokie-college.onrender.com';

let currentServerUrl = DEFAULT_AI_SERVER_URL;
const listeners = new Set();

/**
 * Normaliza una URL eliminando barras finales y espacios.
 */
export function normalizeServerUrl(url) {
  if (!url || typeof url !== 'string') return DEFAULT_AI_SERVER_URL;
  let clean = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  return clean;
}

/**
 * Obtiene la URL del servidor de IA activa.
 * Si se configuró en .env (EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL), esa es la fuente
 * de verdad automática número 1 absoluta para garantizar que la app siempre se conecte
 * al servidor configurado en .env sin depender de almacenamiento en caché viejo.
 */
export async function getAiServerUrl() {
  if (RAW_ENV_URL && RAW_ENV_URL.trim()) {
    currentServerUrl = normalizeServerUrl(RAW_ENV_URL);
    return currentServerUrl;
  }

  try {
    let saved = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      saved = window.localStorage.getItem(STORAGE_KEY);
    }
    if (!saved) {
      saved = await AsyncStorage.getItem(STORAGE_KEY);
    }
    if (saved && saved.trim()) {
      currentServerUrl = normalizeServerUrl(saved);
      return currentServerUrl;
    }
  } catch (e) {
    console.warn('[aiServerConfig] Error leyendo URL guardada:', e);
  }
  currentServerUrl = DEFAULT_AI_SERVER_URL;
  return currentServerUrl;
}

/**
 * Retorna la URL síncrona en memoria.
 */
export function getCurrentAiServerUrlSync() {
  return currentServerUrl;
}

/**
 * Guarda una nueva URL de servidor de IA, notifica a los oyentes y actualiza WebSocket.
 */
export async function setAiServerUrl(newUrl) {
  const normalized = normalizeServerUrl(newUrl);
  currentServerUrl = normalized;

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    }
    await AsyncStorage.setItem(STORAGE_KEY, normalized);
  } catch (e) {
    console.warn('[aiServerConfig] Error guardando URL:', e);
  }

  // Notificar a oyentes
  listeners.forEach((cb) => {
    try {
      cb(normalized);
    } catch (err) {}
  });

  // Reconectar WebSocket al nuevo servidor
  try {
    WebSocketService.connect(normalized);
  } catch (e) {}

  return normalized;
}

/**
 * Restablece la URL al valor por defecto (Render nube).
 */
export async function resetAiServerUrl() {
  currentServerUrl = DEFAULT_AI_SERVER_URL;
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {}

  listeners.forEach((cb) => {
    try {
      cb(DEFAULT_AI_SERVER_URL);
    } catch (err) {}
  });

  try {
    WebSocketService.connect(DEFAULT_AI_SERVER_URL);
  } catch (e) {}

  return DEFAULT_AI_SERVER_URL;
}

/**
 * Prueba la conectividad con el servidor de IA especificado realizando un ping a /health.
 */
export async function testAiServerConnection(testUrl) {
  const target = normalizeServerUrl(testUrl || currentServerUrl);
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${target}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: true,
        latency,
        url: target,
        data,
      };
    } else {
      return {
        ok: false,
        latency,
        url: target,
        error: `El servidor respondió con código HTTP ${res.status}`,
      };
    }
  } catch (e) {
    const latency = Date.now() - startTime;
    let msg = 'No se pudo conectar al servidor';
    if (e.name === 'AbortError') {
      msg = 'Tiempo de espera agotado (4s). Verifica la IP o red Wi-Fi.';
    } else if (e.message && e.message.includes('Network request failed')) {
      msg = 'Error de red. Si estás en móvil, usa la IP local de tu PC (ej. http://192.168.x.x:8000), no localhost.';
    } else if (e.message) {
      msg = e.message;
    }
    return {
      ok: false,
      latency,
      url: target,
      error: msg,
    };
  }
}

/**
 * Suscribe un callback a cambios de la URL del servidor de IA.
 */
export function subscribeAiServerUrl(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// Carga inicial no bloqueante
getAiServerUrl().catch(() => {});
