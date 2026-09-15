import CryptoJS from 'crypto-js';

const INSTITUTIONAL_FALLBACK_KEY = 'cokie_college_institutional_secret_aes_key_2026';
const ENCRYPTION_PREFIX = 'enc::';

export const getSecretKey = () => {
  return process.env.EXPO_PUBLIC_CHAT_ENCRYPTION_KEY || INSTITUTIONAL_FALLBACK_KEY;
};

/**
 * Cifra un texto usando AES-256 simétrico para almacenamiento en reposo
 * @param {string} text - Texto en plano a cifrar
 * @returns {string} Texto cifrado con prefijo "enc::"
 */
export const encryptMessage = (text) => {
  if (!text || typeof text !== 'string') return text;
  if (text.startsWith(ENCRYPTION_PREFIX)) return text; // Ya está cifrado

  try {
    const key = getSecretKey();
    const encrypted = CryptoJS.AES.encrypt(text, key).toString();
    return `${ENCRYPTION_PREFIX}${encrypted}`;
  } catch (error) {
    console.error('[chatCrypto] Error encrypting message:', error);
    return text;
  }
};

/**
 * Descifra un mensaje cifrado. Si no tiene prefijo "enc::", lo devuelve tal cual.
 * @param {string} cipherText - Texto cifrado o mensaje plano retrocompatible
 * @returns {string} Texto en claro
 */
export const decryptMessage = (cipherText) => {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;
  if (!cipherText.startsWith(ENCRYPTION_PREFIX)) {
    return cipherText; // Mensaje legado sin cifrar
  }

  try {
    const key = getSecretKey();
    const rawCipher = cipherText.slice(ENCRYPTION_PREFIX.length);
    const bytes = CryptoJS.AES.decrypt(rawCipher, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText;
  } catch (error) {
    console.warn('[chatCrypto] Error decrypting message, returning original:', error.message);
    return cipherText;
  }
};

/**
 * Verifica si un contenido está cifrado
 * @param {string} content 
 * @returns {boolean}
 */
export const isEncryptedMessage = (content) => {
  return typeof content === 'string' && content.startsWith(ENCRYPTION_PREFIX);
};

export default {
  encryptMessage,
  decryptMessage,
  isEncryptedMessage,
  getSecretKey
};
