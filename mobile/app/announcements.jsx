import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal, 
  TextInput, 
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Bell, Send, Trash2, Users, User, X, Info, CheckCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/utils/api';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';

export default function AnnouncementsScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const { profile } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const styles = useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const canCreateAnnouncement = profile?.role === 'super_admin' || profile?.role === 'coordinator';

  const TARGET_OPTIONS = useMemo(() => [
    { id: 'both', label: t('announcements.targetBoth', 'Ambos (Maestros y Alumnos)'), icon: Users },
    { id: 'teachers', label: t('announcements.targetTeachers', 'Solo Maestros'), icon: User },
    { id: 'students', label: t('announcements.targetStudents', 'Solo Alumnos'), icon: User },
  ], [t]);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('both');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await api.get('/announcements');
      setAnnouncements(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: 'No se pudieron cargar los avisos'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const handleOpenCreateModal = () => {
    setTitle('');
    setMessage('');
    setTargetRole('both');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      showAlert({
        type: 'warning',
        title: t('dashboard.warning', 'Atención'),
        message: 'Por favor ingresa un título y el mensaje del aviso'
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        target_role: targetRole,
        level: profile?.level || 'Todos'
      };

      await api.post('/announcements', payload);
      showAlert({
        type: 'success',
        title: t('dashboard.success', '¡Aviso Enviado!'),
        message: t('announcements.publishSuccess', 'El aviso ha sido enviado y notificado instantáneamente a los destinatarios.')
      });

      setModalVisible(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error sending announcement:', error);
      const msg = error.response?.data?.error || 'Error al enviar el aviso';
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: msg
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    showConfirm({
      type: 'danger',
      title: t('announcements.deleteTitle', 'Eliminar Aviso'),
      message: t('announcements.deleteConfirm', { defaultValue: `¿Deseas eliminar el aviso "${item.title}"?` }),
      confirmText: t('dashboard.delete', 'Eliminar'),
      cancelText: t('dashboard.cancel', 'Cancelar'),
      onConfirm: async () => {
        try {
          await api.delete(`/announcements/${item.id}`);
          showAlert({
            type: 'success',
            title: t('dashboard.success', '¡Eliminado!'),
            message: t('announcements.deleteSuccess', 'Aviso eliminado correctamente.')
          });
          fetchAnnouncements();
        } catch (err) {
          showAlert({
            type: 'error',
            title: t('dashboard.error', 'Error'),
            message: 'No se pudo eliminar el aviso'
          });
        }
      }
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getTargetBadge = (target) => {
    switch (target) {
      case 'teachers': return { label: t('announcements.targetTeachers', 'Maestros'), bg: '#3b82f615', color: '#3b82f6' };
      case 'students': return { label: t('announcements.targetStudents', 'Alumnos'), bg: '#8b5cf615', color: '#8b5cf6' };
      default: return { label: t('announcements.targetBoth', 'Todos'), bg: '#10b98115', color: '#10b981' };
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title={t('titles.announcements', 'Avisos Institucionales')}
        subtitle={t('titles.announcementsSubtitle', 'Comunicados oficiales de coordinación')}
      />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Bell size={48} color={Colors.text.muted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>{t('announcements.noAnnouncements', 'Sin avisos por el momento')}</Text>
            <Text style={styles.emptyText}>{t('announcements.noAnnouncementsSub', 'Los avisos o comunicados importantes se mostrarán aquí.')}</Text>
          </View>
        ) : (
          announcements.map((item) => {
            const badge = getTargetBadge(item.target_role);
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.targetBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.targetText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMessage}>{item.message}</Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.senderText}>
                    {t('announcements.sentBy', 'Enviado por: {{name}}', { name: item.profiles?.full_name || t('announcements.coordination', 'Coordinación') })}
                  </Text>

                  {canCreateAnnouncement && (
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {canCreateAnnouncement && (
        <TouchableOpacity style={styles.fab} onPress={handleOpenCreateModal} activeOpacity={0.85}>
          <Send size={24} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Modal para Crear Aviso */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={Keyboard.dismiss} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t('announcements.createTitle', 'Crear Nuevo Aviso')}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                      <X size={22} color={Colors.text.primary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Text style={styles.inputLabel}>{t('announcements.announcementTitleLabel', 'Título del Aviso *')}</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('announcements.announcementTitlePlaceholder', 'Ej. Cambio de horario para reunión general')}
                      placeholderTextColor={Colors.text.muted}
                      value={title}
                      onChangeText={setTitle}
                    />

                    <Text style={styles.inputLabel}>{t('announcements.targetRoleLabel', 'Destinatarios *')}</Text>
                    <View style={{ gap: 8, marginBottom: 16 }}>
                      {TARGET_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const selected = targetRole === opt.id;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[styles.targetOption, selected && styles.targetOptionSelected]}
                            onPress={() => setTargetRole(opt.id)}
                          >
                            <Icon size={18} color={selected ? Colors.primary : Colors.text.muted} style={{ marginRight: 10 }} />
                            <Text style={[styles.targetOptionText, selected && styles.targetOptionTextSelected]}>
                              {opt.label}
                            </Text>
                            {selected && <CheckCircle size={18} color={Colors.primary} style={{ marginLeft: 'auto' }} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.inputLabel}>{t('announcements.messageLabel', 'Mensaje del Aviso *')}</Text>
                    <TextInput
                      style={[styles.textInput, { height: 110, textAlignVertical: 'top' }]}
                      placeholder={t('announcements.messagePlaceholder', 'Escribe la información detallada que recibirán los alumnos o maestros...')}
                      placeholderTextColor={Colors.text.muted}
                      multiline
                      value={message}
                      onChangeText={setMessage}
                    />

                    <View style={styles.infoBanner}>
                      <Info size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.infoBannerText}>
                        {t('announcements.infoPushBanner', 'El aviso enviará una notificación push al instante a los dispositivos de los destinatarios seleccionados.')}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={[styles.submitBtn, submitting && { opacity: 0.6 }]} 
                      onPress={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Send size={18} color="#FFF" style={{ marginRight: 8 }} />
                          <Text style={styles.submitBtnText}>{t('announcements.publishBtn', 'Enviar Aviso Ahora')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </ScrollView>
                </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: 16 },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  emptyText: { fontSize: 13, color: Colors.text.muted, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  targetBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  targetText: { fontSize: 11, fontWeight: 'bold' },
  dateText: { fontSize: 11, color: Colors.text.muted },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.primary, marginBottom: 6 },
  cardMessage: { fontSize: 14, color: Colors.text.primary, lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.gray[100] || '#f1f5f9' },
  senderText: { fontSize: 11, color: Colors.text.muted, fontStyle: 'italic' },
  deleteBtn: { padding: 4 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.text.secondary, marginBottom: 6, textTransform: 'uppercase' },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  targetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  targetOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
  },
  targetOptionText: { fontSize: 13, color: Colors.text.primary },
  targetOptionTextSelected: { fontWeight: 'bold', color: Colors.primary },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoBannerText: { fontSize: 11, color: Colors.primary, flex: 1 },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' }
});
