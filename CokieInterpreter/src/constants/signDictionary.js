/**
 * Diccionario centralizado de traducción de señas y gestos
 * Idéntico al catálogo de Cokie College (español institucional / inglés)
 */

export const SIGN_DICTIONARY = {
  // Números
  '0': '0 (Cero)',
  '1': '1 (Uno)',
  '2': '2 (Dos)',
  '3': '3 (Tres)',
  '4': '4 (Cuatro)',
  '5': '5 (Cinco)',
  '6': '6 (Seis)',
  '7': '7 (Siete)',
  '8': '8 (Ocho)',
  '9': '9 (Nueve)',
  '10': '10 (Diez)',

  // Alfabeto LSM / ASL
  'a': 'A',
  'b': 'B',
  'c': 'C',
  'd': 'D',
  'e': 'E',
  'f': 'F',
  'g': 'G',
  'h': 'H',
  'i': 'I',
  'j': 'J',
  'k': 'K',
  'l': 'L',
  'm': 'M',
  'n': 'N',
  'o': 'O',
  'p': 'P',
  'q': 'Q',
  'r': 'R',
  's': 'S',
  't': 'T',
  'u': 'U',
  'v': 'V',
  'w': 'W',
  'x': 'X',
  'y': 'Y',
  'z': 'Z',

  // Gestos Fundamentales MediaPipe / Google
  'open_palm': 'Palma abierta / Hola',
  'closed_fist': 'Puño cerrado',
  'pointing_up': 'Atención / Arriba',
  'thumb_down': 'Mal / Incorrecto',
  'thumb_up': 'Bien / Correcto',
  'victory': 'Paz / Victoria',
  'i_love_you': 'Te quiero',
  'please_wait': 'Por favor espera / Alto',
  'ok': 'Ok / De acuerdo',

  // Dialecto Institucional Cokie College (Entrenado)
  'hola': 'Hola',
  'gracias': 'Gracias',
  'por_favor': 'Por favor',
  'permiso_bano': 'Permiso para ir al baño',
  'buenos_dias': 'Buenos días',
  'si': 'Sí',
  'no': 'No',
  'me_llamo___mi_nombre_es': 'Mi nombre es...',
  'yo': 'Yo',
  'uno': 'Uno',
  'dos': 'Dos',
  'tres': 'Tres',
  'cuatro': 'Cuatro',
  'cinco': 'Cinco',
  'adios': 'Adiós',
  'perdon': 'Perdón / Disculpa',
  'ayuda': 'Ayuda',
  'agua': 'Agua',
  'comida': 'Comida',
  'querer': 'Querer',
  'casa': 'Casa',
  'amigo': 'Amigo',
  'listo___terminado': 'Listo / Terminado',
  'mama': 'Mamá',
  'papa': 'Papá',
  'que': '¿Qué?',
  'listo': 'Listo',
  'como_estan': '¿Cómo están?',
  'bien': 'Bien',
  'esta_bien__ok': 'Está bien / OK',
};

/**
 * Traduce cualquier identificador de seña entrante al texto legible en español.
 * Soporta prefijos como "sign.", objetos de metadatos del backend, etc.
 */
export function formatSignTranslation(text, rawData) {
  if (!text && !rawData) return '';

  // 1. Si viene metadata enriquecida del backend de dialecto
  if (rawData && typeof rawData === 'object') {
    if (rawData.name_es) return rawData.name_es;
    if (rawData.text && !rawData.text.startsWith('sign.')) return rawData.text;
  }

  let key = typeof text === 'string' ? text.trim() : '';
  if (!key) return '';

  // Quitar prefijo sign. o signs.
  if (key.startsWith('signs.')) {
    key = key.replace('signs.', '');
  } else if (key.startsWith('sign.')) {
    key = key.replace('sign.', '');
  }

  const normalized = key.toLowerCase();

  // Buscar en el diccionario
  if (SIGN_DICTIONARY[normalized]) {
    return SIGN_DICTIONARY[normalized];
  }

  // Si no está exactamente en el diccionario, formatear human-friendly
  const humanReadable = normalized.replace(/_/g, ' ');
  return humanReadable.charAt(0).toUpperCase() + humanReadable.slice(1);
}

export default SIGN_DICTIONARY;
