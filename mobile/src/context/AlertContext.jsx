import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Pressable, 
  Platform,
  BackHandler
} from 'react-native';
import { CheckCircle2, XCircle, AlertTriangle, Info, Trash2 } from 'lucide-react-native';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next';

const AlertContext = createContext({
  showAlert: () => {},
  showConfirm: () => {},
  hideAlert: () => {}
});

export const AlertProvider = ({ children }) => {
  const { colors: Colors, theme } = useTheme();
  const { t } = useTranslation();

  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    type: 'info', // 'success', 'error', 'warning', 'info', 'danger'
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: null,
    onConfirm: null,
    onCancel: null
  });

  const showAlert = useCallback(({ type = 'info', title, message, confirmText, onConfirm }) => {
    setConfig({
      type,
      title,
      message,
      confirmText: confirmText || t('common.ok', 'Aceptar'),
      cancelText: null,
      onConfirm
    });
    setVisible(true);
  }, [t]);

  const showConfirm = useCallback(({ type = 'danger', title, message, confirmText, cancelText, onConfirm, onCancel }) => {
    setConfig({
      type,
      title,
      message,
      confirmText: confirmText || t('common.confirm', 'Confirmar'),
      cancelText: cancelText || t('common.cancel', 'Cancelar'),
      onConfirm,
      onCancel
    });
    setVisible(true);
  }, [t]);

  const hideAlert = useCallback(() => {
    setVisible(false);
  }, []);

  const handleConfirm = useCallback(() => {
    const onConfirmAction = config.onConfirm;
    hideAlert();
    if (onConfirmAction) {
      setTimeout(() => {
        onConfirmAction();
      }, 50);
    }
  }, [config.onConfirm, hideAlert]);

  const handleCancel = useCallback(() => {
    const onCancelAction = config.onCancel;
    hideAlert();
    if (onCancelAction) {
      setTimeout(() => {
        onCancelAction();
      }, 50);
    }
  }, [config.onCancel, hideAlert]);

  // Manejo de tecla Escape en Web y botón Atrás en Android
  useEffect(() => {
    if (!visible) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          hideAlert();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } else if (Platform.OS === 'android') {
      const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
        hideAlert();
        return true;
      });
      return () => backSub.remove();
    }
  }, [visible, hideAlert]);

  const getIcon = () => {
    switch (config.type) {
      case 'success':
        return <CheckCircle2 size={36} color="#FFFFFF" />;
      case 'error':
      case 'danger':
        return config.cancelText ? <Trash2 size={36} color="#FFFFFF" /> : <XCircle size={36} color="#FFFFFF" />;
      case 'warning':
        return <AlertTriangle size={36} color="#FFFFFF" />;
      default:
        return <Info size={36} color="#FFFFFF" />;
    }
  };

  const getIconBg = () => {
    return theme === 'dark' ? '#27272A' : '#18181B';
  };

  const getConfirmBtnColor = () => {
    if (config.type === 'danger' || config.type === 'error') {
      return '#ef4444';
    }
    return Colors.primary;
  };

  const styles = createStyles(Colors, theme);

  const alertContent = (
    <View style={styles.overlay} pointerEvents="auto">
      {/* Fondo oscuro clicable para cerrar */}
      <Pressable 
        style={StyleSheet.absoluteFillObject} 
        onPress={config.cancelText ? handleCancel : handleConfirm}
        accessibilityLabel="Cerrar modal"
      />

      {/* Tarjeta de alerta */}
      <View style={styles.alertCard}>
        <View style={[styles.iconContainer, { backgroundColor: getIconBg() }]}>
          {getIcon()}
        </View>

        {config.title ? <Text style={styles.title}>{config.title}</Text> : null}
        {config.message ? <Text style={styles.message}>{config.message}</Text> : null}

        <View style={styles.buttonRow}>
          {config.cancelText ? (
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>{config.cancelText}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: getConfirmBtnColor(), flex: config.cancelText ? 1 : 0, minWidth: 120 }
            ]}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmButtonText}>{config.confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}

      {visible && (
        Platform.OS === 'web' ? (
          alertContent
        ) : (
          <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={hideAlert}
            statusBarTranslucent
            navigationBarTranslucent
          >
            {alertContent}
          </Modal>
        )
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);

const createStyles = (Colors, theme) => StyleSheet.create({
  overlay: {
    ...(Platform.OS === 'web' ? {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 99999999,
    } : {
      flex: 1,
    }),
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 1,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#3F3F46' : '#18181B',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
