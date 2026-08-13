import React, { useState, useEffect } from 'react';
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
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Edit2, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/utils/api';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';

const LEVELS = ['Todos', 'Primaria', 'Tercer Ciclo'];

export default function EventsScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const { profile } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const isManagementAllowed = profile?.role === 'super_admin' || profile?.role === 'coordinator';

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedLevel, setSelectedLevel] = useState(profile?.level || 'Todos');
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setEventDate(formattedDate);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/events');
      setEvents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching events:', error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: 'No se pudieron cargar los eventos'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setStartTime('08:00');
    setEndTime('10:00');
    setSelectedLevel(profile?.role === 'coordinator' ? (profile?.level || 'Todos') : 'Todos');
    setModalVisible(true);
  };

  const handleOpenEditModal = (event) => {
    setEditingEvent(event);
    setTitle(event.title || '');
    setDescription(event.description || '');
    setEventDate(event.event_date || '');
    setStartTime(event.start_time?.substring(0, 5) || '08:00');
    setEndTime(event.end_time?.substring(0, 5) || '10:00');
    setSelectedLevel(event.level || 'Todos');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !eventDate.trim() || !startTime.trim() || !endTime.trim()) {
      showAlert({
        type: 'warning',
        title: t('dashboard.warning', 'Atención'),
        message: 'Por favor completa los campos obligatorios (Título, Fecha, Hora Inicio y Fin)'
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        event_date: eventDate.trim(),
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        level: profile?.role === 'coordinator' ? (profile?.level || 'Todos') : selectedLevel
      };

      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}`, payload);
        showAlert({
          type: 'success',
          title: t('dashboard.success', '¡Éxito!'),
          message: t('events.updateSuccess', 'Evento actualizado correctamente')
        });
      } else {
        await api.post('/events', payload);
        showAlert({
          type: 'success',
          title: t('dashboard.success', '¡Éxito!'),
          message: t('events.createSuccess', 'Evento creado correctamente. Se enviará una notificación 24h antes del inicio.')
        });
      }

      setModalVisible(false);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      const msg = error.response?.data?.error || 'Error al guardar el evento';
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: msg
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (event) => {
    showConfirm({
      type: 'danger',
      title: t('events.deleteTitle', 'Eliminar Evento'),
      message: t('events.deleteConfirm', { title: event.title, defaultValue: `¿Estás seguro de que deseas eliminar el evento "${event.title}"?` }),
      confirmText: t('dashboard.delete', 'Eliminar'),
      cancelText: t('dashboard.cancel', 'Cancelar'),
      onConfirm: async () => {
        try {
          await api.delete(`/events/${event.id}`);
          showAlert({
            type: 'success',
            title: t('dashboard.success', '¡Eliminado!'),
            message: t('events.deleteSuccess', 'Evento eliminado correctamente.')
          });
          fetchEvents();
        } catch (err) {
          showAlert({
            type: 'error',
            title: t('dashboard.error', 'Error'),
            message: 'No se pudo eliminar el evento'
          });
        }
      }
    });
  };

  const getLevelColor = (lvl) => {
    switch (lvl) {
      case 'Primaria': return '#3b82f6';
      case 'Tercer Ciclo': return '#8b5cf6';
      default: return '#10b981';
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title={t('titles.events', 'Eventos Institucionales')}
        subtitle={t('titles.eventsSubtitle', 'Calendario y actividades del colegio')}
      />

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : events.length === 0 ? (
          <View style={styles.emptyCard}>
            <CalendarIcon size={48} color={Colors.text.muted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>{t('events.noEvents', 'No hay eventos programados')}</Text>
            <Text style={styles.emptyText}>Los eventos que se publiquen aparecerán aquí.</Text>
          </View>
        ) : (
          events.map((item) => (
            <View key={item.id} style={styles.eventCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.level) + '15', borderColor: getLevelColor(item.level) }]}>
                  <Text style={[styles.levelText, { color: getLevelColor(item.level) }]}>{item.level}</Text>
                </View>
                <View style={styles.dateBadge}>
                  <CalendarIcon size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.dateText}>{item.event_date}</Text>
                </View>
              </View>

              <Text style={styles.eventTitle}>{item.title}</Text>

              <View style={styles.timeRow}>
                <Clock size={15} color={Colors.text.muted} style={{ marginRight: 6 }} />
                <Text style={styles.timeText}>
                  {item.start_time?.substring(0, 5)} - {item.end_time?.substring(0, 5)} hrs
                </Text>
              </View>

              {item.description ? (
                <Text style={styles.eventDesc}>{item.description}</Text>
              ) : null}

              {isManagementAllowed && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={() => handleOpenEditModal(item)} style={styles.editBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Edit2 size={16} color={Colors.primary} />
                    <Text style={styles.editBtnText}>{t('dashboard.edit', 'Editar')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={styles.deleteBtnText}>{t('dashboard.delete', 'Eliminar')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {isManagementAllowed && (
        <TouchableOpacity style={styles.fab} onPress={handleOpenCreateModal} activeOpacity={0.85}>
          <Plus size={26} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Modal para Crear / Editar Evento */}
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
                    <Text style={styles.modalTitle}>{editingEvent ? t('events.editTitle', 'Editar Evento') : t('events.createTitle', 'Nuevo Evento')}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                      <X size={22} color={Colors.text.primary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Text style={styles.inputLabel}>{t('events.eventTitleLabel', 'Título del Evento *')}</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('events.eventTitlePlaceholder', 'Ej. Feria de Ciencias 2026')}
                      placeholderTextColor={Colors.text.muted}
                      value={title}
                      onChangeText={setTitle}
                    />

                    <Text style={styles.inputLabel}>{t('events.dateLabel', 'Fecha del Evento *')}</Text>
                    <TouchableOpacity
                      style={[styles.textInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: eventDate ? Colors.text.primary : Colors.text.muted, fontSize: 14 }}>
                        {eventDate || 'Seleccionar fecha...'}
                      </Text>
                      <CalendarIcon size={18} color={Colors.text.muted} />
                    </TouchableOpacity>

                    {showDatePicker && (
                      <DateTimePicker
                        value={eventDate ? new Date(eventDate + 'T12:00:00') : new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                      />
                    )}

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>{t('events.startTimeLabel', 'Hora Inicio *')}</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="08:00"
                          placeholderTextColor={Colors.text.muted}
                          value={startTime}
                          onChangeText={setStartTime}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>{t('events.endTimeLabel', 'Hora Fin *')}</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="11:30"
                          placeholderTextColor={Colors.text.muted}
                          value={endTime}
                          onChangeText={setEndTime}
                        />
                      </View>
                    </View>

                    {profile?.role === 'super_admin' && (
                      <>
                        <Text style={styles.inputLabel}>{t('events.targetLevelLabel', 'Nivel Académico')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                          {LEVELS.map((lvl) => (
                            <TouchableOpacity
                              key={lvl}
                              style={[
                                styles.levelPill,
                                selectedLevel === lvl && styles.levelPillActive
                              ]}
                              onPress={() => setSelectedLevel(lvl)}
                            >
                              <Text style={[styles.levelPillText, selectedLevel === lvl && styles.levelPillTextActive]}>
                                {lvl}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </>
                    )}

                    <Text style={styles.inputLabel}>{t('events.descriptionLabel', 'Descripción (Opcional)')}</Text>
                    <TextInput
                      style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                      placeholder={t('events.descriptionPlaceholder', 'Detalles sobre el evento...')}
                      placeholderTextColor={Colors.text.muted}
                      multiline
                      numberOfLines={3}
                      value={description}
                      onChangeText={setDescription}
                    />

                    <TouchableOpacity
                      style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                      onPress={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>
                          {editingEvent ? t('dashboard.save', 'Guardar Cambios') : t('events.saveBtn', 'Crear Evento')}
                        </Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.text.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: Colors.text.muted,
    fontWeight: '600',
  },
  eventDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100] || '#f1f5f9',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: 4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#EF4444',
    marginLeft: 4,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    padding: 0,
    margin: 0,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text.secondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
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
  levelPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.gray[100] || '#f1f5f9',
    marginRight: 8,
  },
  levelPillActive: {
    backgroundColor: Colors.primary,
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  levelPillTextActive: {
    color: '#FFF',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  }
});
