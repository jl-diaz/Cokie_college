import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Dispara una respuesta háptica en dispositivos móviles físicos.
 * Se desactiva automáticamente de forma segura en Web y simuladores.
 */
export const hapticSuccess = () => {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {}
};

export const hapticWarning = () => {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (e) {}
};

export const hapticError = () => {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (e) {}
};

export const hapticLight = () => {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

export const hapticMedium = () => {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {}
};

export const hapticHeavy = () => {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (e) {}
};

export const hapticSelection = () => {
  if (Platform.OS === 'web') return;
  try {
    Haptics.selectionAsync();
  } catch (e) {}
};
