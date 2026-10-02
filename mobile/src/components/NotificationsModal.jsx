import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Animated, 
  Dimensions, 
  Platform, 
  Modal, 
  Pressable,
  ActivityIndicator,
  PanResponder
} from 'react-native';
import { X, Bell, CheckCheck, Trash2, Inbox } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import api from '../utils/api';
import { modalTracker } from '../utils/modalTracker';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function NotificationsModal({ visible, onClose, onReadChange }) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const getViewportDimensions = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.visualViewport?.height || window.innerHeight || Dimensions.get('window').height,
      };
    }
    return Dimensions.get('window');
  };

  const [windowDimensions, setWindowDimensions] = useState(getViewportDimensions);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const updateDim = () => {
        setWindowDimensions(getViewportDimensions());
      };
      window.addEventListener('resize', updateDim);
      window.visualViewport?.addEventListener('resize', updateDim);
      return () => {
        window.removeEventListener('resize', updateDim);
        window.visualViewport?.removeEventListener('resize', updateDim);
      };
    } else {
      const sub = Dimensions.addEventListener('change', ({ window }) => {
        setWindowDimensions(window);
      });
      return () => sub?.remove?.();
    }
  }, []);

  const isWeb = Platform.OS === 'web';
  const isMobileWeb = isWeb && (
    typeof navigator !== 'undefined' && 
    /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '')
  );

  const [notificationsList, setNotificationsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const currentScreenHeight = windowDimensions.height || SCREEN_HEIGHT;
  const slideAnim = useRef(new Animated.Value(currentScreenHeight)).current;

  // PanResponder para permitir cerrar arrastrando hacia abajo
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          slideAnim.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100 || gesture.vy > 0.6) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 8,
            tension: 70,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      modalTracker.registerCloseEnd('notifications-modal');
    };
  }, []);

  const isVisibleRef = useRef(false);

  const handleClose = () => {
    if (!isVisibleRef.current && !showModal) return;
    isVisibleRef.current = false;
    modalTracker.registerCloseStart('notifications-modal');
    Animated.timing(slideAnim, {
      toValue: currentScreenHeight,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      modalTracker.registerCloseEnd('notifications-modal');
      onClose?.();
    });
  };

  useEffect(() => {
    if (visible) {
      isVisibleRef.current = true;
      modalTracker.registerOpen('notifications-modal');
      setShowModal(true);
      fetchNotifications();
      slideAnim.setValue(currentScreenHeight);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8.5,
        tension: 65,
        useNativeDriver: true,
      }).start();
    } else if (showModal) {
      handleClose();
    }
  }, [visible]);

  // Suscripción Realtime para recibir notificaciones instantáneas
  useEffect(() => {
    if (!visible || !user?.id) return;
    const channel = supabase
      .channel(`user_notifications_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible, user?.id]);

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
      console.warn('Error fetching notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-read');
      setNotificationsList(prev => prev.map(n => ({ ...n, unread: false })));
      if (onReadChange) onReadChange(0);
    } catch (err) {
      console.warn('Error marking all as read:', err.message);
    }
  };

  const handleClearAll = async () => {
    try {
      try {
        await api.delete('/notifications/clear');
      } catch {
        await api.delete('/notifications');
      }
      setNotificationsList([]);
      if (onReadChange) onReadChange(0);
    } catch (err) {
      console.warn('Error clearing notifications:', err.message);
      setNotificationsList([]);
      if (onReadChange) onReadChange(0);
    }
  };

  if (!showModal) return null;

  const isDark = theme === 'dark';

  return (
    <Modal
      transparent
      visible={showModal}
      onRequestClose={handleClose}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlayContainer}>
        <Pressable 
          style={StyleSheet.absoluteFillObject} 
          onPress={handleClose} 
          accessibilityLabel="Cerrar modal" 
        />

        <Animated.View 
          style={[
            styles.panel, 
            { 
              transform: [{ translateY: slideAnim }], 
              backgroundColor: isDark ? '#18181B' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              paddingBottom: isMobileWeb ? Math.max(insets.bottom || 0, 80) : Math.max(insets.bottom, 24),
              height: Math.min(currentScreenHeight * 0.72, 560),
              maxHeight: isWeb ? '82dvh' : '85%',
            }
          ]}
        >
          {/* Drag Handle con PanResponder para deslizar hacia abajo */}
          <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.18)' }]} />
          </View>

          {/* Header del Modal */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconCircle, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(11, 25, 86, 0.08)' }]}>
                <Bell size={18} color={isDark ? '#818CF8' : colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#0B1956' }]}>
                {t('notifications.title', 'Notificaciones')}
              </Text>
              {notificationsList.filter(n => n.unread).length > 0 && (
                <View style={styles.unreadCountBadge}>
                  <Text style={styles.unreadCountText}>
                    {notificationsList.filter(n => n.unread).length}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: isDark ? '#27272A' : '#F1F5F9' }]} activeOpacity={0.7}>
              <X size={18} color={isDark ? '#E4E4E7' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Acciones de Limpiar y Marcar Leídas */}
          {notificationsList.length > 0 && !loading && (
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.actionBtn} activeOpacity={0.7}>
                <CheckCheck size={15} color={isDark ? '#818CF8' : colors.primary} />
                <Text style={[styles.actionBtnText, { color: isDark ? '#818CF8' : colors.primary }]}>
                  {t('notifications.markRead', 'Marcar leídas')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClearAll} style={styles.actionBtn} activeOpacity={0.7}>
                <Trash2 size={15} color="#EF4444" />
                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>
                  {t('notifications.clear', 'Limpiar')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Estado de carga */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                {t('common.loading', 'Cargando notificaciones...')}
              </Text>
            </View>
          ) : notificationsList.length === 0 ? (
            /* Estado vacío con diseño espacioso */
            <View style={styles.centerContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#27272A' : '#F8FAFC' }]}>
                <Inbox size={42} color={isDark ? '#6B7280' : '#94A3B8'} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#0B1956' }]}>
                {t('notifications.emptyTitle', 'Bandeja limpia')}
              </Text>
              <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                {t('notifications.empty', 'No tienes notificaciones pendientes')}
              </Text>
            </View>
          ) : (
            /* Lista de Notificaciones con Cards Minimalistas */
            <ScrollView 
              style={styles.notifList} 
              contentContainerStyle={styles.notifListContent}
              showsVerticalScrollIndicator={false}
            >
              {notificationsList.map(item => (
                <View
                  key={item.id}
                  style={[
                    styles.notifCard,
                    {
                      backgroundColor: isDark ? '#27272A' : '#F8FAFC',
                      borderColor: item.unread 
                        ? (isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(11, 25, 86, 0.15)') 
                        : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                    },
                    item.unread && styles.notifCardUnread
                  ]}
                >
                  <View style={styles.notifHeaderRow}>
                    <Text style={[styles.notifTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.unread && <View style={styles.cardUnreadDot} />}
                  </View>

                  <Text style={[styles.notifBody, { color: isDark ? '#A1A1AA' : '#475569' }]}>
                    {item.body}
                  </Text>

                  <View style={styles.notifFooterRow}>
                    <Text style={[styles.notifDate, { color: isDark ? '#71717A' : '#94A3B8' }]}>
                      {item.date}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    zIndex: 99998,
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
    }),
  },
  panel: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 560 : '100%',
    height: Math.min(SCREEN_HEIGHT * 0.68, 540),
    minHeight: 360,
    maxHeight: '85%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 16,
  },
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 10,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  unreadCountBadge: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13.5,
    textAlign: 'center',
    maxWidth: 260,
  },
  notifList: {
    flex: 1,
  },
  notifListContent: {
    paddingBottom: Platform.OS === 'web' ? 100 : 48,
    gap: 10,
  },
  notifCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  notifCardUnread: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#EC4899',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EC4899',
    marginTop: 4,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  notifBody: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 8,
  },
  notifFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  notifDate: {
    fontSize: 11.5,
    fontWeight: '500',
  },
});
