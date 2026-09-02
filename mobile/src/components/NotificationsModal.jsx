import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { X, Bell, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function NotificationsModal({ visible, onClose, onReadChange }) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();

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
        time: new Date(n.created_at).toLocaleString()
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

  const getIcon = (type, title = '') => {
    if (type === 'success') return <CheckCircle size={18} color="#2ecc71" />;
    if (type === 'warning' || title.includes('Conducta') || title.includes('⚠️')) return <AlertTriangle size={18} color="#f39c12" />;
    return <Info size={18} color={colors.primary} />;
  };

  if (!showModal) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={showModal}
      onRequestClose={onClose}
    >
      <View style={styles.overlayContainer}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }], backgroundColor: theme === 'dark' ? '#1E1E1E' : '#FFFFFF' }]}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Bell size={22} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.headerTitle, { color: theme === 'dark' ? '#FFF' : '#0B1956' }]}>
                {t('notifications.title', 'Centro de Notificaciones')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme === 'dark' ? '#AAA' : '#666'} />
            </TouchableOpacity>
          </View>

          {notificationsList.length > 0 && (
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.actionBtn}>
                <CheckCheck size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                  {t('notifications.markRead', 'Marcar leídas')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClearAll} style={styles.actionBtn}>
                <Trash2 size={16} color="#e74c3c" />
                <Text style={[styles.actionBtnText, { color: '#e74c3c' }]}>
                  {t('notifications.clear', 'Limpiar')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
            {notificationsList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Bell size={40} color={theme === 'dark' ? '#555' : '#CCC'} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyText, { color: theme === 'dark' ? '#888' : '#999' }]}>
                  {t('notifications.empty', 'No tienes notificaciones pendientes')}
                </Text>
              </View>
            ) : (
              notificationsList.map(item => (
                <View
                  key={item.id}
                  style={[
                    styles.notifItem,
                    {
                      backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F5F7FA',
                      borderColor: item.unread ? colors.primary : 'transparent',
                    }
                  ]}
                >
                  <View style={styles.iconContainer}>
                    {getIcon(item.type, item.title)}
                  </View>
                  <View style={styles.notifContent}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.notifTitle, { color: theme === 'dark' ? '#FFF' : '#333' }]}>
                        {item.title}
                      </Text>
                      {item.unread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                    </View>
                    <Text style={[styles.notifBody, { color: theme === 'dark' ? '#AAA' : '#666' }]}>
                      {item.body}
                    </Text>
                    <Text style={[styles.notifTime, { color: theme === 'dark' ? '#777' : '#999' }]}>
                      {item.time}
                    </Text>
                  </View>
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
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
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
    maxHeight: 350,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  notifItem: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notifBody: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 10,
    fontWeight: '500',
  },
});
