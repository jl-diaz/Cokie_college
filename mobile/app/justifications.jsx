import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, ScrollView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import api from '../src/utils/api';
import { FileText, Calendar, Plus, X, Upload, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import PageHeader from '../src/components/PageHeader';

import { useAlert } from '../src/context/AlertContext';

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

  const [formData, setFormData] = useState({
    date: '',
    reason: '',
    evidence: null
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setFormData(prev => ({ ...prev, date: formattedDate }));
    }
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

      await api.post('/student/justifications', {
        absence_date: formData.date,
        reason: formData.reason,
        evidence_url: finalEvidenceUrl
      });
      
      showAlert({
        type: 'success',
        title: t('dashboard.success', '¡Enviado!'),
        message: t('dashboard.requestSent', 'Solicitud enviada correctamente.')
      });
      setModalVisible(false);
      setFormData({ date: '', reason: '', evidence: null });
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
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dateInfo}>
            <Calendar size={16} color={Colors.text.muted} />
            <Text style={styles.dateText}>{new Date(item.absence_date).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <StatusIcon size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        
        <Text style={styles.reasonLabel}>{t('dashboard.reason', 'Motivo')}:</Text>
        <Text style={styles.reasonText}>{item.reason}</Text>
        
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

  return (
    <View style={styles.container}>
      <PageHeader 
        title={t('titles.justifications', 'Justificaciones')} 
        subtitle={t('titles.justificationsSubtitle', 'Gestión de ausencias e inasistencias')} 
      />
      <FlatList
        style={styles.container}
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
      <Modal
        visible={modalVisible}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior="padding" 
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%' }}>
              <View style={styles.modalContent}>
                <ScrollView 
                  keyboardShouldPersistTaps="handled" 
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t('dashboard.new', 'Nueva Solicitud')}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                      <X size={24} color={Colors.primary} />
                    </TouchableOpacity>
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
                        onChange={handleDateChange}
                      />
                    )}
                  </View>

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
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
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
    alignItems: 'center',
    marginBottom: 16,
  },
  dateInfo: { flexDirection: 'row', alignItems: 'center' },
  dateText: { marginLeft: 8, fontWeight: 'bold', color: Colors.text.primary, fontSize: 16 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '90%',
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
});
