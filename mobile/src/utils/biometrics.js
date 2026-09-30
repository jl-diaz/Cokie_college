import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const isRunningInExpoGo = 
  Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient ||
  Constants?.appOwnership === 'expo';

export const BIOMETRIC_KEYS = {
  ENABLED: 'cokie_biometrics_enabled',
  IDENTIFIER: 'cokie_biometrics_identifier',
  PASSWORD: 'cokie_biometrics_password',
  DISPLAY_NAME: 'cokie_biometrics_display_name',
};

/**
 * Verifica si el dispositivo cuenta con hardware biométrico (Face ID / Huella)
 * y si el usuario tiene datos biométricos configurados en el sistema operativo.
 */
export async function checkBiometricsAvailability() {
  if (Platform.OS === 'web') {
    return {
      available: false,
      hasHardware: false,
      enrolled: false,
      biometryType: null,
      biometryLabel: 'Biometría',
    };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    let enrolledLevel = 0;
    try {
      enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
    } catch (e) {
      // Ignorar si la plataforma no soporta getEnrolledLevelAsync
    }

    let biometryType = 'BIOMETRIC';
    let biometryLabel = 'Biometría';

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometryType = 'FACIAL_RECOGNITION';
      biometryLabel = Platform.OS === 'ios' ? 'Face ID' : 'Reconocimiento Facial';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometryType = 'FINGERPRINT';
      biometryLabel = Platform.OS === 'ios' ? 'Touch ID' : 'Huella Dactilar';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometryType = 'IRIS';
      biometryLabel = 'Escáner de Iris';
    }

    return {
      available: Boolean(hasHardware && isEnrolled),
      hasHardware: Boolean(hasHardware),
      enrolled: Boolean(isEnrolled),
      enrolledLevel,
      biometryType,
      biometryLabel,
      isExpoGo: isRunningInExpoGo,
    };
  } catch (error) {
    console.warn('[Biometrics] Error checking availability:', error);
    return {
      available: false,
      hasHardware: false,
      enrolled: false,
      biometryType: null,
      biometryLabel: 'Biometría',
      isExpoGo: isRunningInExpoGo,
    };
  }
}

/**
 * Solicita autenticación biométrica nativa exclusivamente con sensores biométricos
 * (Face ID, Touch ID, Reconocimiento Facial, Huella).
 * Maneja de forma inteligente el entorno de pruebas Expo Go en iOS (donde Apple restringe Face ID directo
 * en apps de la App Store genéricas por falta de NSFaceIDUsageDescription en su binario).
 */
export async function authenticateBiometrics({
  promptMessage = 'Verifica tu identidad con Face ID o Huella',
  cancelLabel = 'Cancelar',
  fallbackLabel = '',
  disableDeviceFallback = true,
  biometricsSecurityLevel = 'weak',
} = {}) {
  if (Platform.OS === 'web') {
    return { success: false, error: 'NOT_SUPPORTED_ON_WEB' };
  }

  try {
    // En Expo Go en iOS, Apple no permite invocar la cámara TrueDepth porque el binario de Expo Go
    // de la App Store no tiene NSFaceIDUsageDescription compilado para la app del usuario.
    // Para que las pruebas funcionen de inmediato sin trabar la interfaz, en Expo Go permitimos el desbloqueo del dispositivo.
    const isStrictNative = !isRunningInExpoGo;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      fallbackLabel: isStrictNative ? '' : fallbackLabel,
      disableDeviceFallback: isStrictNative ? Boolean(disableDeviceFallback) : false,
      biometricsSecurityLevel: biometricsSecurityLevel || 'weak',
      requireConfirmation: false,
    });

    // Si falló por limitación de permisos en Expo Go (missing_usage_description), reintentamos en modo compatible:
    if (!result.success && (result.error === 'missing_usage_description' || String(result.warning || '').includes('NSFaceIDUsageDescription'))) {
      const fallbackResult = await LocalAuthentication.authenticateAsync({
        promptMessage: `${promptMessage} (Expo Go)`,
        cancelLabel,
        disableDeviceFallback: false,
      });
      return fallbackResult;
    }

    return result;
  } catch (error) {
    console.warn('[Biometrics] Authentication error:', error);
    return { success: false, error: error?.message || 'UNKNOWN_ERROR' };
  }
}

/**
 * Guarda las credenciales institucionales de forma cifrada en el almacén seguro nativo (Keychain / Keystore).
 */
export async function saveBiometricCredentials({ identifier, password, displayName = '' }) {
  if (Platform.OS === 'web') return false;

  try {
    const safeId = String(identifier || '').trim();
    const safePass = String(password || '');
    if (!safeId || !safePass) return false;

    await SecureStore.setItemAsync(BIOMETRIC_KEYS.IDENTIFIER, safeId);
    await SecureStore.setItemAsync(BIOMETRIC_KEYS.PASSWORD, safePass);
    if (displayName) {
      await SecureStore.setItemAsync(BIOMETRIC_KEYS.DISPLAY_NAME, String(displayName).trim());
    }
    await SecureStore.setItemAsync(BIOMETRIC_KEYS.ENABLED, 'true');
    return true;
  } catch (error) {
    console.error('[Biometrics] Error saving credentials to SecureStore:', error);
    return false;
  }
}

/**
 * Recupera las credenciales guardadas si la autenticación biométrica está activa.
 */
export async function getBiometricCredentials() {
  if (Platform.OS === 'web') return null;

  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_KEYS.ENABLED);
    if (enabled !== 'true') return null;

    const identifier = await SecureStore.getItemAsync(BIOMETRIC_KEYS.IDENTIFIER);
    const password = await SecureStore.getItemAsync(BIOMETRIC_KEYS.PASSWORD);
    const displayName = await SecureStore.getItemAsync(BIOMETRIC_KEYS.DISPLAY_NAME);

    if (!identifier || !password) return null;

    return {
      identifier,
      password,
      displayName: displayName || identifier,
    };
  } catch (error) {
    console.error('[Biometrics] Error getting credentials from SecureStore:', error);
    return null;
  }
}

/**
 * Elimina las credenciales del almacén seguro y desactiva el desbloqueo biométrico.
 */
export async function clearBiometricCredentials() {
  if (Platform.OS === 'web') return true;

  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_KEYS.IDENTIFIER);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEYS.PASSWORD);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEYS.DISPLAY_NAME);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEYS.ENABLED);
    return true;
  } catch (error) {
    console.error('[Biometrics] Error clearing credentials from SecureStore:', error);
    return false;
  }
}

/**
 * Verifica si actualmente hay credenciales biométricas activas guardadas.
 */
export async function isBiometricsConfigured() {
  if (Platform.OS === 'web') return false;

  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_KEYS.ENABLED);
    const identifier = await SecureStore.getItemAsync(BIOMETRIC_KEYS.IDENTIFIER);
    return enabled === 'true' && Boolean(identifier);
  } catch (error) {
    return false;
  }
}
