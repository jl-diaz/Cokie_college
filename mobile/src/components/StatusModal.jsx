import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Platform, Modal, Pressable } from 'react-native';
import { Check, AlertTriangle, X, Info } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTabBar } from '../context/TabBarContext';

/**
 * StatusModal - Modal de estado y confirmación reutilizable.
 * Basado en el diseño minimalista de la referencia (tarjeta limpia, fondo gris atenuado,
 * imagen centrada personalizable y botón negro mate).
 * 
 * Props:
 * - visible: boolean
 * - onClose: () => void
 * - title: string
 * - message: string
 * - image: any (Image source, ej: require('../assets/...'))
 * - type: 'success' | 'warning' | 'error' | 'info' (default: 'success')
 * - buttonText: string (texto del botón único, default: 'Listo')
 * - onConfirm: () => void (opcional: si se pasa, habilita modo 2 botones)
 * - confirmText: string (texto botón confirmar)
 * - cancelText: string (texto botón cancelar)
 * - confirmLoading: boolean
 * - isDestructive: boolean (si el botón de confirmación debe resaltar peligro)
 */
export default function StatusModal({
  visible,
  onClose,
  title,
  message,
  image = null,
  type = 'success',
  buttonText = 'Listo',
  onConfirm = null,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  confirmLoading = false,
  isDestructive = false,
}) {
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
    const matteBg = isDark ? '#27272A' : '#18181B';
    switch (type) {
      case 'warning':
        return (
          <View style={[styles.badgeContainer, { backgroundColor: matteBg }]}>
            <AlertTriangle size={36} color="#FFFFFF" />
          </View>
        );
      case 'error':
        return (
          <View style={[styles.badgeContainer, { backgroundColor: matteBg }]}>
            <X size={36} color="#FFFFFF" />
          </View>
        );
      case 'info':
        return (
          <View style={[styles.badgeContainer, { backgroundColor: matteBg }]}>
            <Info size={36} color="#FFFFFF" />
          </View>
        );
      case 'success':
      default:
        return (
          <View style={[styles.badgeContainer, { backgroundColor: matteBg }]}>
            <View style={[styles.innerSuccessBadge, { backgroundColor: Colors?.primary || '#10b981' }]}>
              <Check size={32} color="#FFFFFF" strokeWidth={3} />
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
            backgroundColor: isDark ? '#18181B' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          }
        ]}>
          {/* Espacio para Imagen Centrada (o badge por defecto si image es null) */}
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
            <Text style={[styles.message, { color: isDark ? '#A1A1AA' : '#64748B' }]}>
              {message}
            </Text>
          ) : null}

          {/* Botones de acción */}
          {onConfirm ? (
            <View style={styles.twoButtonsWrapper}>
              <TouchableOpacity
                style={[
                  styles.matteButton,
                  isDestructive 
                    ? { backgroundColor: '#DC2626' } 
                    : { backgroundColor: Colors?.primary || (isDark ? '#27272A' : '#18181B') },
                ]}
                onPress={onConfirm}
                disabled={confirmLoading}
                activeOpacity={0.8}
              >
                {confirmLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.matteButtonText}>{confirmText}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={confirmLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>
                  {cancelText}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.matteButton,
                { backgroundColor: Colors?.primary || (isDark ? '#27272A' : '#18181B') }
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.matteButtonText}>{buttonText}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 80,
  },
  customImage: {
    width: 86,
    height: 86,
  },
  badgeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerSuccessBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#BBF7D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 26,
    paddingHorizontal: 4,
  },
  matteButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  twoButtonsWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
