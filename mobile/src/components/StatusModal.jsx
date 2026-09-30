import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Platform, Modal, Pressable } from 'react-native';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTabBar } from '../context/TabBarContext';
import { useTranslation } from 'react-i18next';

/**
 * StatusModal - Modal de estado y confirmación reutilizable con estética premium.
 */
export default function StatusModal({
  visible,
  onClose,
  title,
  message,
  image = null,
  type = 'success',
  buttonText,
  onConfirm = null,
  confirmText,
  cancelText,
  confirmLoading = false,
  isDestructive = false,
}) {
  const { t } = useTranslation();
  const resolvedButtonText = buttonText || t('common.done', 'Listo');
  const resolvedConfirmText = confirmText || t('common.confirm', 'Confirmar');
  const resolvedCancelText = cancelText || t('common.cancel', 'Cancelar');
  const { theme, colors: Colors } = useTheme();
  const isDark = theme === 'dark';
  const { registerModal, unregisterModal } = useTabBar();

  useEffect(() => {
    if (visible) {
      registerModal();
      return () => {
        unregisterModal();
      };
    }
  }, [visible, registerModal, unregisterModal]);

  if (!visible) return null;

  const renderBadgeFallback = () => {
    switch (type) {
      case 'warning':
        return (
          <View style={[styles.badgeOuter, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
            <View style={[styles.badgeInner, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A' }]}>
              <AlertTriangle size={30} color={isDark ? '#FBBF24' : '#D97706'} strokeWidth={2.4} />
            </View>
          </View>
        );
      case 'error':
        return (
          <View style={[styles.badgeOuter, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
            <View style={[styles.badgeInner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA' }]}>
              <XCircle size={32} color={isDark ? '#F87171' : '#DC2626'} strokeWidth={2.4} />
            </View>
          </View>
        );
      case 'info':
        return (
          <View style={[styles.badgeOuter, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE' }]}>
            <View style={[styles.badgeInner, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE' }]}>
              <Info size={30} color={isDark ? '#60A5FA' : '#2563EB'} strokeWidth={2.4} />
            </View>
          </View>
        );
      case 'success':
      default:
        return (
          <View style={[styles.badgeOuter, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7' }]}>
            <View style={[styles.badgeInner, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#BBF7D0' }]}>
              <CheckCircle2 size={32} color={isDark ? '#34D399' : '#16A34A'} strokeWidth={2.4} />
            </View>
          </View>
        );
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable 
          style={StyleSheet.absoluteFillObject} 
          onPress={onClose} 
          accessibilityLabel="Cerrar modal" 
        />
        <View style={[
          styles.modalCard,
          { 
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
          }
        ]}>
          {/* Espacio para Imagen Centrada (o badge moderno por defecto) */}
          <View style={styles.imageWrapper}>
            {image ? (
              <Image 
                source={image} 
                style={styles.customImage} 
                resizeMode="contain" 
              />
            ) : (
              renderBadgeFallback()
            )}
          </View>

          {/* Título */}
          {title ? (
            <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
              {title}
            </Text>
          ) : null}

          {/* Mensaje / Descripción */}
          {message ? (
            <Text style={[styles.message, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {message}
            </Text>
          ) : null}

          {/* Botones de acción */}
          {onConfirm ? (
            <View style={styles.twoButtonsWrapper}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9' }
                ]}
                onPress={onClose}
                disabled={confirmLoading}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                  {resolvedCancelText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isDestructive 
                    ? { backgroundColor: '#DC2626' } 
                    : { backgroundColor: Colors?.primary || '#0B1956' },
                ]}
                onPress={onConfirm}
                disabled={confirmLoading}
                activeOpacity={0.85}
              >
                {confirmLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>{resolvedConfirmText}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { width: '100%', backgroundColor: Colors?.primary || '#0B1956' }
              ]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>{resolvedButtonText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 99999,
    ...(Platform.OS === 'web' ? { 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      width: '100vw', 
      height: '100vh',
    } : {}),
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  customImage: {
    width: 80,
    height: 80,
  },
  badgeOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  twoButtonsWrapper: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
