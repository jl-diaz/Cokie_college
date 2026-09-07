import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, ScrollView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import api from '../src/utils/api';
import { FileText, Calendar, Plus, X, Upload, CheckCircle, Clock, XCircle, ChevronDown } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import PageHeader from '../src/components/PageHeader';
import BottomModal from '../src/components/BottomModal';

import { useAlert } from '../src/context/AlertContext';

const SCHOOL_HOURS = [
  '07:00 AM',
  '07:30 AM',
  '08:00 AM',
  '08:30 AM',
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM'
];

export const timeStringToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }
  return 0;
};

export default function JustificationsScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const { showAlert } = useAlert();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);
  const [justifications, setJustifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const formatLocalDate = (dateStr) => {
    if (!dateStr) return '';
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const clean = dateStr.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
      }
    }
    return new Date(dateStr).toLocaleDateString();
  };

  const [formData, setFormData] = useState({
    date: '',
    reason: '',
    evidence: null,
    scope: 'full_day', // 'full_day' | 'hourly'
    start_time: '07:00 AM',
    end_time: '09:30 AM'
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState(null); // 'start' | 'end'
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  useEffect(() => {
    fetchJustifications();
  }, []);

  const fetchJustifications = async () => {
    try {
      const response = await api.get('/student/justifications');
      setJustifications(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchJustifications();
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormData(prev => ({ ...prev, evidence: result.assets[0] }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: 'No se pudo seleccionar el archivo.'
      });
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (selectedDate > today) {
        showAlert({
          type: 'warning',
          title: 'Fecha Inválida',
          message: 'Solo se permiten justificaciones hasta la fecha actual.'
        });
        return;
      }
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setFormData(prev => ({ ...prev, date: formattedDate }));
    }
  };

  const handleSelectHour = (hour) => {
    if (timePickerTarget === 'start') {
      const newStartMins = timeStringToMinutes(hour);
      const currentEndMins = timeStringToMinutes(formData.end_time);
      let newEndTime = formData.end_time;
      if (newStartMins >= currentEndMins) {
        const nextSlot = SCHOOL_HOURS.find(h => timeStringToMinutes(h) > newStartMins);
        if (nextSlot) {
          newEndTime = nextSlot;
        } else {
          newEndTime = hour;
        }
      }
      setFormData(prev => ({ ...prev, start_time: hour, end_time: newEndTime }));
    } else {
      const startMins = timeStringToMinutes(formData.start_time);
      const endMins = timeStringToMinutes(hour);
      if (endMins <= startMins) {
        showAlert({
          type: 'warning',
          title: 'Horario Inválido',
          message: 'La hora fin (Hasta) no puede ser anterior ni igual a la hora inicio (Desde).'
        });
        return;
      }
      setFormData(prev => ({ ...prev, end_time: hour }));
    }
    setTimePickerVisible(false);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const getBase64FromUri = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Error converting file to base64:', e);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!formData.date || !formData.reason) {
      showAlert({
        type: 'warning',
        title: t('dashboard.error', 'Campos Requeridos'),
        message: t('dashboard.pleaseCompleteFields', 'Por favor completa la fecha y el motivo.')
      });
      return;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (formData.date > todayStr) {
      showAlert({
        type: 'warning',
        title: 'Fecha Inválida',
        message: 'La fecha de inasistencia no puede ser futura. Solo se permiten fechas hasta el día de hoy.'
      });
      return;
    }

    if (formData.scope === 'hourly') {
      const startMins = timeStringToMinutes(formData.start_time);
      const endMins = timeStringToMinutes(formData.end_time);
      if (endMins <= startMins) {
        showAlert({
          type: 'warning',
          title: 'Horario Inválido',
          message: 'La hora fin (Hasta) debe ser posterior a la hora inicio (Desde).'
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      let finalEvidenceUrl = null;
      if (formData.evidence) {
        if (formData.evidence.uri) {
          const b64 = await getBase64FromUri(formData.evidence.uri);
          finalEvidenceUrl = b64 || formData.evidence.uri || formData.evidence.name;
        } else {
          finalEvidenceUrl = formData.evidence.name;
        }
      }

      const finalReason = formData.scope === 'hourly'
        ? `[HORARIO: ${formData.start_time} - ${formData.end_time}] ${formData.reason.trim()}`
        : `[JORNADA COMPLETA] ${formData.reason.trim()}`;

      await api.post('/student/justifications', {
        absence_date: formData.date,
        reason: finalReason,
        evidence_url: finalEvidenceUrl
      });
      
      showAlert({
        type: 'success',
        title: t('dashboard.success', '¡Enviado!'),
        message: t('dashboard.requestSent', 'Solicitud enviada correctamente.')
      });
      setModalVisible(false);
      setTimePickerVisible(false);
      setFormData({ 
        date: '', 
        reason: '', 
        evidence: null, 
        scope: 'full_day', 
        start_time: '07:00 AM', 
        end_time: '09:30 AM' 
      });
      fetchJustifications();
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: error.response?.data?.error || t('dashboard.couldNotSend', 'No se pudo enviar la solicitud.')
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved': return { color: Colors.status.approved, bg: '#f0fdf4', icon: CheckCircle, label: t('dashboard.approved', 'Aprobada') };
      case 'rejected': return { color: Colors.status.rejected, bg: '#fef2f2', icon: XCircle, label: t('dashboard.rejected', 'Rechazada') };
      default: return { color: Colors.status.pending, bg: '#fffbeb', icon: Clock, label: t('dashboard.pending', 'Pendiente') };
    }
  };

  const renderItem = ({ item }) => {
    const status = getStatusStyle(item.status);
    const StatusIcon = status.icon;
    const timeMatch = (item.reason || '').match(/\[HORARIO:\s*([^\]]+)\]/i);
    const isFullDay = (item.reason || '').includes('[JORNADA COMPLETA]');
    const cleanReason = (item.reason || '')
      .replace(/\[HORARIO:\s*[^\]]+\]/gi, '')
      .replace(/\[JORNADA COMPLETA\]/gi, '')
      .trim();

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dateInfo}>
            <Calendar size={16} color={Colors.text.muted} />
            <Text style={styles.dateText}>{formatLocalDate(item.absence_date)}</Text>
          </View>
          <View style={styles.badgesWrapper}>
            {timeMatch && (
              <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color="#0284c7" />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#0284c7' }}>{timeMatch[1]}</Text>
              </View>
            )}
            {isFullDay && (
              <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} color="#475569" />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>Día completo</Text>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <StatusIcon size={14} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.reasonLabel}>{t('dashboard.reason', 'Motivo')}:</Text>
        <Text style={styles.reasonText}>{cleanReason || item.reason}</Text>
        
        {item.coordinator_message && (
          <View style={styles.obsContainer}>
            <Text style={styles.obsLabel}>{t('dashboard.coordinatorResponse', 'Respuesta de Coordinación')}:</Text>
            <Text style={styles.obsText}>{item.coordinator_message}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && justifications.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const headerBgColor = theme === 'dark' ? Colors.card : (Colors.headerC || Colors.primary || '#0B1956');

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <PageHeader 
        title={t('titles.justifications', 'Justificaciones')} 
        subtitle={t('titles.justificationsSubtitle', 'Gestión de ausencias e inasistencias')} 
      />
      <FlatList
        style={{ flex: 1, backgroundColor: Colors.background }}
        data={justifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.content}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.myRequests', 'Mis Solicitudes')}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
              <Plus size={20} color="#FFF" />
              <Text style={styles.addBtnText}>{t('dashboard.new', 'Nueva')}</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <FileText size={48} color={Colors.gray[300]} style={{marginBottom: 16}} />
            <Text style={styles.emptyText}>{t('dashboard.noRequestsYet', 'No has enviado solicitudes de justificación')}</Text>
          </View>
        }
        ListFooterComponent={<View style={{height: 40}} />}
      />

      {/* Modal para Crear Solicitud de Justificación */}
      <BottomModal 
        visible={modalVisible} 
        onClose={() => {
          if (timePickerVisible) {
            setTimePickerVisible(false);
          } else {
            setModalVisible(false);
          }
        }}
      >
          <View style={styles.modalContent}>
            {timePickerVisible ? (
              <View style={{ paddingBottom: 12 }}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      {timePickerTarget === 'start' ? 'Hora de Inicio (Desde)' : 'Hora de Fin (Hasta)'}
                    </Text>
                    <Text style={{ fontSize: 13, color: Colors.text.secondary, marginTop: 2 }}>
                      {timePickerTarget === 'start' 
                        ? 'Selecciona cuándo inicia tu ausencia' 
                        : `Selecciona cuándo finaliza (posterior a ${formData.start_time})`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setTimePickerVisible(false)} style={{ padding: 4 }}>
                    <X size={24} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 16 }}>
                    {SCHOOL_HOURS.map(hour => {
                      const isSelected = (timePickerTarget === 'start' ? formData.start_time : formData.end_time) === hour;
                      const isDisabled = timePickerTarget === 'end' && timeStringToMinutes(hour) <= timeStringToMinutes(formData.start_time);

                      return (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.hourChip, 
                            isSelected && styles.hourChipActive,
                            isDisabled && { opacity: 0.35, backgroundColor: theme === 'dark' ? Colors.card : '#f1f5f9', borderColor: '#cbd5e1' }
                          ]}
                          disabled={isDisabled}
                          onPress={() => handleSelectHour(hour)}
                          activeOpacity={0.7}
                        >
                          <Clock size={14} color={isSelected ? '#FFF' : (isDisabled ? Colors.text.muted : Colors.primary)} style={{ marginRight: 6 }} />
                          <Text style={[
                            styles.hourChipText, 
                            isSelected && styles.hourChipTextActive,
                            isDisabled && { color: Colors.text.muted, textDecorationLine: 'line-through' }
                          ]}>
                            {hour}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : (
              <ScrollView 
                keyboardShouldPersistTaps="handled" 
                showsVerticalScrollIndicator={false}
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{t('dashboard.new', 'Nueva Solicitud')}</Text>
                      <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                        <X size={24} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>

                    {/* Modalidad de Inasistencia */}
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>{t('justifications.scopeLabel', 'Tipo de Inasistencia')}</Text>
                      <View style={styles.scopeSelector}>
                        <TouchableOpacity
                          style={[styles.scopeBtn, formData.scope === 'full_day' && styles.scopeBtnActive]}
                          onPress={() => setFormData(prev => ({ ...prev, scope: 'full_day' }))}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.scopeBtnText, formData.scope === 'full_day' && styles.scopeBtnTextActive]}>
                            Día Completo
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.scopeBtn, formData.scope === 'hourly' && styles.scopeBtnActive]}
                          onPress={() => setFormData(prev => ({ ...prev, scope: 'hourly' }))}
                          activeOpacity={0.8}
                        >
                          <Clock size={16} color={formData.scope === 'hourly' ? '#FFF' : Colors.text.muted} style={{ marginRight: 6 }} />
                          <Text style={[styles.scopeBtnText, formData.scope === 'hourly' && styles.scopeBtnTextActive]}>
                            Por Horario
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Fecha de Inasistencia */}
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>{t('justifications.dateLabel', 'Fecha de Inasistencia')}</Text>
                      <TouchableOpacity style={styles.datePickerBtn} onPress={showDatepicker} activeOpacity={0.8}>
                        <Calendar size={20} color={Colors.primary} />
                        <Text style={[styles.datePickerText, formData.date ? { color: Colors.text.primary, fontWeight: '600' } : null]}>
                          {formData.date || t('justifications.selectDate', 'Seleccionar fecha')}
                        </Text>
                      </TouchableOpacity>
                      {showDatePicker && (
                        <DateTimePicker
                          value={formData.date ? new Date(formData.date + 'T12:00:00') : new Date()}
                          mode="date"
                          display="default"
                          maximumDate={new Date()}
                          onChange={handleDateChange}
                        />
                      )}
                    </View>

                    {/* Rango de Horario (Selector Táctil) */}
                    {formData.scope === 'hourly' && (
                      <View style={styles.timeRangeContainer}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.label}>Desde (Hora Inicio)</Text>
                          <TouchableOpacity
                            style={styles.timeSelectorBtn}
                            onPress={() => {
                              setTimePickerTarget('start');
                              setTimePickerVisible(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Clock size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                              <Text style={styles.timeSelectorText}>{formData.start_time}</Text>
                            </View>
                            <ChevronDown size={16} color={Colors.text.muted} />
                          </TouchableOpacity>
                        </View>
                        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                          <Text style={styles.label}>Hasta (Hora Fin)</Text>
                          <TouchableOpacity
                            style={styles.timeSelectorBtn}
                            onPress={() => {
                              setTimePickerTarget('end');
                              setTimePickerVisible(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Clock size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                              <Text style={styles.timeSelectorText}>{formData.end_time}</Text>
                            </View>
                            <ChevronDown size={16} color={Colors.text.muted} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Motivo */}
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>{t('dashboard.reason', 'Motivo')}</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={4}
                        placeholder={t('justifications.reasonPlaceholder', 'Describe la razón de tu ausencia...')}
                        placeholderTextColor={Colors.text.muted}
                        value={formData.reason}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, reason: text }))}
                      />
                    </View>

                    {/* Adjuntar Evidencia */}
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>{t('justifications.evidenceLabel', 'Comprobante / Evidencia (Opcional)')}</Text>
                      <TouchableOpacity style={styles.uploadBtn} onPress={handlePickDocument} activeOpacity={0.8}>
                        <Upload size={20} color={Colors.primary} />
                        <Text style={[styles.uploadBtnText, { flex: 1 }]} numberOfLines={1}>
                          {formData.evidence ? (formData.evidence.name || 'Archivo Seleccionado') : t('justifications.attachFile', 'Adjuntar archivo PDF o imagen')}
                        </Text>
                        {formData.evidence && (
                          <TouchableOpacity onPress={() => setFormData(prev => ({ ...prev, evidence: null }))} style={{ padding: 4 }}>
                            <X size={18} color="#e74c3c" />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Botón Enviar */}
                    <TouchableOpacity 
                      style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
                      onPress={handleSubmit} 
                      disabled={submitting}
                      activeOpacity={0.8}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>{t('dashboard.save', 'Enviar Solicitud')}</Text>
                      )}
                    </TouchableOpacity>
                  </ScrollView>
            )}
          </View>
        </BottomModal>
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: theme === 'dark' ? Colors.card : '#0B1956',
    padding: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    borderBottomWidth: theme === 'dark' ? 1 : 0,
    borderBottomColor: Colors.gray[200],
  },
  headerTitle: { color: theme === 'dark' ? Colors.primary : '#FFF', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: theme === 'dark' ? Colors.text.secondary : 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, textTransform: 'uppercase' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  addBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[100],
    marginTop: 20,
  },
  emptyText: { color: Colors.text.muted, textAlign: 'center', fontSize: 16 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[100],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  dateInfo: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginTop: 4 },
  dateText: { marginLeft: 8, fontWeight: 'bold', color: Colors.text.primary, fontSize: 16 },
  badgesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexShrink: 0,
    maxWidth: '100%',
  },
  statusText: { fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  reasonLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.text.muted, textTransform: 'uppercase', marginBottom: 4 },
  reasonText: { fontSize: 16, color: Colors.text.primary, marginBottom: 16 },
  obsContainer: {
    backgroundColor: Colors.gray[50],
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryLight,
  },
  obsLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.primary, marginBottom: 4 },
  obsText: { fontSize: 14, color: Colors.text.secondary, fontStyle: 'italic' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end', alignItems: 'stretch', padding: 0, margin: 0 },
  modalContent: {
    width: '100%',
    padding: 24,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
  },
  timeSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card || '#FFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.gray[300] || '#D1D5DB',
  },
  timeSelectorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  hourChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background || '#F3F4F6',
    borderWidth: 1.5,
    borderColor: Colors.gray[200] || '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    width: '48%',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hourChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  hourChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  hourChipTextActive: {
    color: '#FFF',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderStyle: 'dashed',
  },
  uploadBtnText: { marginLeft: 10, color: Colors.text.secondary, fontSize: 14 },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  submitBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  datePickerText: {
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text.muted,
  },
  scopeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[100],
    borderRadius: 16,
    padding: 4,
    marginBottom: 4,
  },
  scopeBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  scopeBtnActive: {
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scopeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.muted,
  },
  scopeBtnTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
