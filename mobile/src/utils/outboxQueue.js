import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const OUTBOX_STORAGE_KEY = '@cokie_chat_outbox_queue_v1';

let isProcessing = false;
const listeners = new Set();

/**
 * Suscribirse a eventos de la cola de salida (ej. mensaje despachado con éxito)
 * @param {Function} callback - ({ type: 'sent' | 'failed', tempId, realData })
 * @returns {Function} Desuscribir
 */
export const subscribeOutbox = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const notifyListeners = (event) => {
  listeners.forEach(fn => {
    try { fn(event); } catch (e) { console.error('[outboxQueue] Listener error:', e); }
  });
};

/**
 * Obtener todos los elementos pendientes de la cola
 */
export const getOutbox = async () => {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[outboxQueue] Error reading outbox:', err);
    return [];
  }
};

/**
 * Guardar la lista de elementos en la cola
 */
const saveOutbox = async (items) => {
  try {
    await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('[outboxQueue] Error saving outbox:', err);
  }
};

/**
 * Añadir un elemento a la cola de salida
 */
export const enqueueOutbox = async ({ type = 'message', endpoint, payload, tempId }) => {
  const items = await getOutbox();
  const newItem = {
    tempId: tempId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    endpoint,
    payload,
    status: 'pending',
    retries: 0,
    createdAt: new Date().toISOString()
  };

  items.push(newItem);
  await saveOutbox(items);
  return newItem;
};

/**
 * Remover un elemento de la cola
 */
export const dequeueOutbox = async (tempId) => {
  const items = await getOutbox();
  const filtered = items.filter(item => item.tempId !== tempId);
  await saveOutbox(filtered);
};

/**
 * Procesar y vaciar la cola de salida enviando las peticiones acumuladas
 * @param {object} api - Instancia configurada de Axios
 */
export const flushOutbox = async (api) => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const items = await getOutbox();
    if (items.length === 0) {
      isProcessing = false;
      return;
    }

    const remaining = [];

    for (const item of items) {
      try {
        const res = await api.post(item.endpoint, item.payload);
        // Éxito al enviar
        notifyListeners({
          type: 'sent',
          tempId: item.tempId,
          realData: res.data,
          itemType: item.type
        });
      } catch (error) {
        const isNetworkError = !error.response || error.code === 'ECONNABORTED' || error.message?.includes('Network Error');
        if (isNetworkError) {
          // Si no hay red, conservamos el elemento y detenemos el bucle hasta reconectar
          remaining.push({ ...item, retries: (item.retries || 0) + 1 });
        } else {
          // Error 4xx/5xx definitivo de negocio (ej. validación)
          console.warn('[outboxQueue] Permanent failure for item:', item.tempId, error.response?.data);
          notifyListeners({
            type: 'failed',
            tempId: item.tempId,
            error: error.response?.data || error.message
          });
        }
      }
    }

    await saveOutbox(remaining);
  } catch (e) {
    console.error('[outboxQueue] Error processing flush:', e);
  } finally {
    isProcessing = false;
  }
};

/**
 * Iniciar vigilancia periódica de red para procesar la cola automáticamente
 */
export const startOutboxAutoFlush = (api, intervalMs = 15000) => {
  // Intentar vaciar inmediatamente
  flushOutbox(api);

  const timer = setInterval(() => {
    flushOutbox(api);
  }, intervalMs);

  return () => clearInterval(timer);
};

export default {
  subscribeOutbox,
  getOutbox,
  enqueueOutbox,
  dequeueOutbox,
  flushOutbox,
  startOutboxAutoFlush
};
