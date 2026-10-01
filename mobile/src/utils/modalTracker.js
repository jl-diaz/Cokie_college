import { Platform } from 'react-native';

const activeModals = new Set();
let isClosing = false;
let lastClosedAt = 0;

export const modalTracker = {
  registerOpen(id = 'default') {
    activeModals.add(id);
    isClosing = false;
  },

  registerCloseStart(id = 'default') {
    isClosing = true;
    lastClosedAt = Date.now();
  },

  registerCloseEnd(id = 'default') {
    activeModals.delete(id);
    lastClosedAt = Date.now();
    if (activeModals.size === 0) {
      isClosing = false;
    }
  },

  hasActiveModals() {
    return activeModals.size > 0;
  },

  isClosingRecently(thresholdMs = 350) {
    return isClosing || (Date.now() - lastClosedAt < thresholdMs);
  },

  getSafeAlertDelay(baseDelay = 60) {
    if (Platform.OS === 'web') return 0;
    const elapsed = Date.now() - lastClosedAt;
    const minWait = 340;
    if (isClosing || elapsed < minWait) {
      const remaining = minWait - elapsed;
      return Math.max(baseDelay, remaining + 40);
    }
    return baseDelay;
  }
};

export default modalTracker;
