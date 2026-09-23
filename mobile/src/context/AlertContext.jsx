import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  TouchableWithoutFeedback 
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

  const handleConfirm = () => {
    const onConfirmAction = config.onConfirm;
    hideAlert();
    if (onConfirmAction) {
      setTimeout(() => {
        onConfirmAction();
      }, 50);
    }
  };

  const handleCancel = () => {
    const onCancelAction = config.onCancel;
    hideAlert();
    if (onCancelAction) {
      setTimeout(() => {
        onCancelAction();
      }, 50);
    }
  };

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

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={hideAlert}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <TouchableWithoutFeedback onPress={hideAlert}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);

const createStyles = (Colors, theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 9999,
    elevation: 9999,
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
