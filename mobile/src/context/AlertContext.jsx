import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Pressable,
  Platform,
  Keyboard,
  BackHandler,
  Animated,
  Modal
} from 'react-native';
import { CheckCircle2, XCircle, AlertTriangle, Info, Trash2 } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next';
import { useTabBar } from './TabBarContext';

const AlertContext = createContext({
  showAlert: () => {},
  showConfirm: () => {},
  hideAlert: () => {}
});

export const AlertProvider = ({ children }) => {
  const { colors: Colors, theme } = useTheme();
  const { t } = useTranslation();
  const { registerModal, unregisterModal } = useTabBar();

  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef(null);

  useEffect(() => {
    if (visible) {
      registerModal?.();
      return () => unregisterModal?.();
    }
  }, [visible, registerModal, unregisterModal]);

  const [config, setConfig] = useState({
    type: 'info', // 'success', 'error', 'warning', 'info', 'danger'
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: null,
    onConfirm: null,
    onCancel: null
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 75,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  const hideAlert = useCallback((callback) => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 120,
        useNativeDriver: true,
      })
    ]).start(() => {
      setVisible(false);
      if (typeof callback === 'function') {
        setTimeout(callback, 50);
      }
    });
  }, [fadeAnim, scaleAnim]);

  const showAlert = useCallback(({ type = 'info', title, message, confirmText, onConfirm }) => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    setConfig({
      type,
      title,
      message,
      confirmText: confirmText || t('common.ok', 'Aceptar'),
      cancelText: null,
      onConfirm
    });
    // Pequeño retardo para dar respiro a modales previos que estén cerrándose y evitar colisión en iOS/Android
    const delay = Platform.OS === 'web' ? 0 : 180;
    showTimerRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [t]);

  const showConfirm = useCallback(({ type = 'danger', title, message, confirmText, cancelText, onConfirm, onCancel }) => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    setConfig({
      type,
      title,
      message,
      confirmText: confirmText || t('common.confirm', 'Confirmar'),
      cancelText: cancelText || t('common.cancel', 'Cancelar'),
      onConfirm,
      onCancel
    });
    const delay = Platform.OS === 'web' ? 0 : 180;
    showTimerRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [t]);

  const handleConfirm = () => {
    const onConfirmAction = config.onConfirm;
    hideAlert(() => {
      if (onConfirmAction) {
        onConfirmAction();
      }
    });
  };

  const handleCancel = () => {
    const onCancelAction = config.onCancel;
    hideAlert(() => {
      if (onCancelAction) {
        onCancelAction();
      }
    });
  };

  // Soporte para botón atrás físico en Android
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (config.cancelText) {
        handleCancel();
      } else {
        hideAlert();
      }
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, config.cancelText, handleCancel, hideAlert]);

  const renderIconBadge = () => {
    const isDark = theme === 'dark';
    switch (config.type) {
      case 'success':
        return (
          <View style={[styles.iconOuter, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7' }]}>
            <View style={[styles.iconInner, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#BBF7D0' }]}>
              <CheckCircle2 size={32} color={isDark ? '#34D399' : '#16A34A'} strokeWidth={2.4} />
            </View>
          </View>
        );
      case 'error':
      case 'danger':
        return (
          <View style={[styles.iconOuter, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
            <View style={[styles.iconInner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA' }]}>
              {config.cancelText ? (
                <Trash2 size={28} color={isDark ? '#F87171' : '#DC2626'} strokeWidth={2.2} />
              ) : (
                <XCircle size={32} color={isDark ? '#F87171' : '#DC2626'} strokeWidth={2.4} />
              )}
            </View>
          </View>
        );
      case 'warning':
        return (
          <View style={[styles.iconOuter, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
            <View style={[styles.iconInner, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A' }]}>
              <AlertTriangle size={30} color={isDark ? '#FBBF24' : '#D97706'} strokeWidth={2.4} />
            </View>
          </View>
        );
      default:
        return (
          <View style={[styles.iconOuter, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE' }]}>
            <View style={[styles.iconInner, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE' }]}>
              <Info size={30} color={isDark ? '#60A5FA' : '#2563EB'} strokeWidth={2.4} />
            </View>
          </View>
        );
    }
  };

  const getConfirmBtnColor = () => {
    if (config.type === 'danger' || config.type === 'error') {
      return '#DC2626';
    }
    if (config.type === 'warning') {
      return '#D97706';
    }
    return Colors.primary || '#0B1956';
  };

  const styles = createStyles(Colors, theme);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      <View style={{ flex: 1, width: '100%', height: '100%' }}>
        {children}

        {visible && (
          <Modal
            transparent
            visible={visible}
            animationType="none"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={config.cancelText ? handleCancel : () => hideAlert()}
          >
            <View style={styles.modalRoot}>
              {/* Fondo oscuro a pantalla completa */}
              <Animated.View 
                style={[styles.backdrop, { opacity: fadeAnim }]}
              >
                <Pressable 
                  style={StyleSheet.absoluteFillObject} 
                  onPress={config.cancelText ? undefined : () => hideAlert()} 
                  accessibilityLabel="Cerrar alerta"
                />
              </Animated.View>

              {/* Contenedor perfectamente centrado en pantalla */}
              <View style={styles.cardContainer} pointerEvents="box-none">
                <Animated.View 
                  style={[
                    styles.alertCard,
                    { transform: [{ scale: scaleAnim }] }
                  ]}
                  onStartShouldSetResponder={() => true}
                >
                  {renderIconBadge()}

                  {config.title ? <Text style={styles.title}>{config.title}</Text> : null}
                  {config.message ? <Text style={styles.message}>{config.message}</Text> : null}

                  <View style={[styles.buttonRow, !config.cancelText && styles.singleButtonRow]}>
                    {config.cancelText ? (
                      <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={handleCancel}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelButtonText}>{config.cancelText}</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.confirmButton,
                        { backgroundColor: getConfirmBtnColor() }
                      ]}
                      onPress={handleConfirm}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.confirmButtonText}>{config.confirmText}</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);

const createStyles = (Colors, theme) => StyleSheet.create({
  modalRoot: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 999999,
    elevation: 999999,
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
    }),
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 360,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  alertCard: {
    width: '100%',
    backgroundColor: Colors.card || (theme === 'dark' ? '#1E293B' : '#FFFFFF'),
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: theme === 'dark' ? 0.4 : 0.14,
    shadowRadius: 28,
    elevation: 12,
  },
  iconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  singleButtonRow: {
    justifyContent: 'center',
  },
  button: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
  },
  cancelButtonText: {
    color: theme === 'dark' ? '#E2E8F0' : '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
