import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@cokie_offline_attendance_queue';
const STUDENTS_CACHE_PREFIX = '@cokie_classroom_students_';

/**
 * Guarda en caché la lista de alumnos de un aula para uso offline.
 */
export const cacheClassroomStudents = async (grade, section, students) => {
  try {
    if (!grade || !section || !Array.isArray(students)) return;
    const key = `${STUDENTS_CACHE_PREFIX}${grade}_${section}`;
    await AsyncStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      students
    }));
  } catch (error) {
    console.warn('Error caching classroom students:', error);
  }
};

/**
 * Obtiene la lista de alumnos en caché de un aula cuando no hay internet.
 */
export const getCachedClassroomStudents = async (grade, section) => {
  try {
    if (!grade || !section) return null;
    const key = `${STUDENTS_CACHE_PREFIX}${grade}_${section}`;
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed.students || null;
  } catch (error) {
    console.warn('Error reading cached students:', error);
    return null;
  }
};

/**
 * Añade un lote de asistencia a la cola offline persistente.
 */
export const enqueueOfflineAttendance = async (attendanceRecord) => {
  try {
    const rawQueue = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = rawQueue ? JSON.parse(rawQueue) : [];

    const newEntry = {
      id: `offline-att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...attendanceRecord
    };

    // Reemplaza registro previo del mismo aula y fecha si existía pendiente
    const existingIndex = queue.findIndex(
      q => q.grade === attendanceRecord.grade && 
           q.section === attendanceRecord.section && 
           q.date?.substring(0, 10) === attendanceRecord.date?.substring(0, 10)
    );

    if (existingIndex >= 0) {
      queue[existingIndex] = newEntry;
    } else {
      queue.push(newEntry);
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return queue.length;
  } catch (error) {
    console.error('Error enqueuing offline attendance:', error);
    return 0;
  }
};

/**
 * Devuelve la cantidad de registros de asistencia pendientes por sincronizar.
 */
export const getPendingAttendancesCount = async () => {
  try {
    const rawQueue = await AsyncStorage.getItem(QUEUE_KEY);
    if (!rawQueue) return 0;
    const queue = JSON.parse(rawQueue);
    return Array.isArray(queue) ? queue.length : 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Devuelve todos los registros pendientes de la cola offline.
 */
export const getPendingAttendances = async () => {
  try {
    const rawQueue = await AsyncStorage.getItem(QUEUE_KEY);
    return rawQueue ? JSON.parse(rawQueue) : [];
  } catch (error) {
    return [];
  }
};

/**
 * Sincroniza todas las asistencias pendientes con el backend.
 * @param {object} api - Instancia configurada de axios
 * @returns {Promise<{ syncedCount: number, remainingCount: number, errors: Array }>}
 */
export const syncPendingAttendances = async (api) => {
  try {
    const rawQueue = await AsyncStorage.getItem(QUEUE_KEY);
    if (!rawQueue) return { syncedCount: 0, remainingCount: 0, errors: [] };

    const queue = JSON.parse(rawQueue);
    if (!Array.isArray(queue) || queue.length === 0) {
      return { syncedCount: 0, remainingCount: 0, errors: [] };
    }

    const remaining = [];
    const errors = [];
    let syncedCount = 0;

    for (const record of queue) {
      try {
        await api.post('/teacher/attendance', {
          attendances: record.attendances
        });
        syncedCount++;
      } catch (err) {
        console.warn('Fallo al sincronizar registro offline:', record.id, err.message);
        // Si el error es 400 (ej. clase ya pasada o validación estricta), no reintentar eternamente
        if (err.response?.status >= 400 && err.response?.status < 500) {
          errors.push({ id: record.id, error: err.response?.data?.error || err.message });
        } else {
          // Si es error de red o 500, conservarlo para reintento
          remaining.push(record);
        }
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return {
      syncedCount,
      remainingCount: remaining.length,
      errors
    };
  } catch (error) {
    console.error('Error in syncPendingAttendances:', error);
    return { syncedCount: 0, remainingCount: 0, errors: [error.message] };
  }
};
