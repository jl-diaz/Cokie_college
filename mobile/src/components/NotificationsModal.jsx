import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { X, Bell, CheckCheck, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function NotificationsModal({ visible, onClose, onReadChange }) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [notificationsList, setNotificationsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      fetchNotifications();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      const data = Array.isArray(res.data) ? res.data : [];
      setNotificationsList(data.map(n => ({
        id: n.id,
        title: n.title,
        body: n.body,
        unread: !n.read,
        date: formatDateOnly(n.created_at)
      })));
      if (onReadChange) {
        const unread = data.filter(n => !n.read).length;
        onReadChange(unread);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-read');
      setNotificationsList(prev => prev.map(n => ({ ...n, unread: false })));
      if (onReadChange) {
        onReadChange(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    try {
      try {
        await api.delete('/notifications');
      } catch (err) {
        if (err.response?.status === 404) {
          await api.delete('/notifications/clear');
        } else {
          throw err;
        }
      }
      setNotificationsList([]);
      if (onReadChange) {
        onReadChange(0);
      }
    } catch (err) {
      console.error('Error clearing notifications:', err);
      setNotificationsList([]);
      if (onReadChange) {
        onReadChange(0);
      }
    }
  };

  if (!showModal) return null;

  const isDark = theme === 'dark';
  const bottomPadding = Math.max(insets.bottom, 24) + 16;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={showModal}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlayContainer}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <Animated.View 
          style={[
            styles.panel, 
            { 
              transform: [{ translateY: slideAnim }], 
              backgroundColor: isDark ? '#18181B' : '#F8FAFC',
              paddingBottom: bottomPadding,
            }
          ]}
        >
          {/* Header del Modal */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Bell size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#0B1956' }]}>
                {t('notifications.title', 'Notificaciones')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={isDark ? '#AAA' : '#666'} />
            </TouchableOpacity>
          </View>

          {/* Acciones de Limpiar y Marcar Leídas */}
          {notificationsList.length > 0 && (
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.actionBtn} activeOpacity={0.7}>
                <CheckCheck size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                  {t('notifications.markRead', 'Marcar leídas')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClearAll} style={styles.actionBtn} activeOpacity={0.7}>
                <Trash2 size={16} color="#e74c3c" />
                <Text style={[styles.actionBtnText, { color: '#e74c3c' }]}>
                  {t('notifications.clear', 'Limpiar')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de Notificaciones con Cards Minimalistas */}
          <ScrollView 
            style={styles.notifList} 
            contentContainerStyle={styles.notifListContent}
            showsVerticalScrollIndicator={false}
          >
            {notificationsList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Bell size={40} color={isDark ? '#4B5563' : '#CBD5E1'} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                  {t('notifications.empty', 'No tienes notificaciones pendientes')}
                </Text>
              </View>
            ) : (
              notificationsList.map(item => (
                <View
                  key={item.id}
                  style={[
                    styles.notifCard,
                    {
                      backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                    }
                  ]}
                >
                  {/* Título */}
                  <Text style={[styles.notifTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {item.title}
                  </Text>

                  {/* Descripción */}
                  <Text style={[styles.notifBody, { color: isDark ? '#A1A1AA' : '#475569' }]}>
                    {item.body}
                  </Text>

                  {/* Fecha sin hora */}
                  <Text style={[styles.notifDate, { color: isDark ? '#71717A' : '#94A3B8' }]}>
                    {item.date}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  panel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  notifList: {
    maxHeight: Math.min(SCREEN_HEIGHT * 0.58, 440),
  },
  notifListContent: {
    paddingBottom: 24, // Espacio para que la última tarjeta no choque con los bordes
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Card Minimalista tipo Instagram: más grande, plana y sin sombra
  notifCard: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 0,
  },
  notifTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  notifBody: {
    fontSize: 14.5,
    lineHeight: 21,
    marginBottom: 10,
  },
  notifDate: {
    fontSize: 12.5,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
