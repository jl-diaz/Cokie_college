import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import api from '../src/utils/api';
import { FileText, CheckCircle, XCircle, AlertCircle, X, ExternalLink, Plus, Search, Calendar } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';

export default function CoordinatorJustificationsScreen() {
  const { t } = useTranslation();
  const { colors: Colors } = useTheme();
  const { showAlert } = useAlert();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [selectedReq, setSelectedReq] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [evidenceModalVisible, setEvidenceModalVisible] = useState(false);
  const [evidenceUrlToView, setEvidenceUrlToView] = useState('');
  const [observation, setObservation] = useState('');
  const [statusToSet, setStatusToSet] = useState('');
  const [view, setView] = useState('requests'); // 'requests' or 'create'

  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [absenceDate, setAbsenceDate] = useState('');
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [statusFilter, setStatusFilter] = useState(''); // '' (todas), 'pending', 'approved', 'rejected'

  const pendingRequests = React.useMemo(() => {
    if (!Array.isArray(requests)) return [];
    return requests.filter(r => r.status === 'pending');
  }, [requests]);

  const historyRequests = React.useMemo(() => {
    if (!Array.isArray(requests)) return [];
    return requests.filter(r => r.status !== 'pending');
  }, [requests]);

  useEffect(() => {
    if (view === 'requests') {
      setPage(1);
      fetchRequests(1, true);
    } else {
      fetchStudents();
    }
  }, [view, statusFilter]);

  const fetchRequests = async (pageNum = page, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const response = await api.get('/coordinator/justifications', {
        params: { status: statusFilter || undefined, page: pageNum, limit: 50 }
      });
      const newRequests = response.data?.data || [];
      
      if (reset) {
        setRequests(newRequests);
      } else {
        setRequests(prev => [...prev, ...newRequests]);
      }
      setTotalPages(response.data?.totalPages || 1);
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: t('dashboard.couldNotSend', 'No se pudieron cargar las solicitudes de justificación.')
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchRequests(nextPage);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/coordinator/students');
      setStudents(response.data);
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: 'No se pudieron cargar los estudiantes.'
      });
    }
  };

  const openProcessModal = (req, status) => {
    setSelectedReq(req);
    setStatusToSet(status);
    setObservation('');
    setModalVisible(true);
  };

  const processRequest = async () => {
    if (!selectedReq) return;
    setProcessing(true);
    try {
      await api.put(`/coordinator/justifications/${selectedReq.id}`, {
        status: statusToSet,
        coordinator_message: observation
      });
      showAlert({
        type: 'success',
        title: t('dashboard.success', 'Éxito'),
        message: `Justificación ${statusToSet === 'approved' ? 'aprobada' : 'rechazada'}.`
      });
      setModalVisible(false);
      setPage(1);
      fetchRequests(1, true);
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: 'No se pudo procesar la solicitud.'
      });
    } finally {
      setProcessing(false);
    }
  };

  const createJustification = async () => {
    if (!selectedStudent || !absenceDate || !reason.trim()) {
      showAlert({
        type: 'warning',
        title: t('dashboard.error', 'Error'),
        message: t('dashboard.pleaseCompleteFields', 'Completa todos los campos')
      });
      return;
    }
    setCreating(true);
    try {
      await api.post('/coordinator/justifications/student', {
        student_id: selectedStudent.id,
        absence_date: absenceDate,
        reason
      });
      showAlert({
        type: 'success',
        title: t('dashboard.success', 'Éxito'),
        message: 'Justificación registrada y aprobada correctamente'
      });
      setSelectedStudent(null);
      setAbsenceDate('');
      setReason('');
      setView('requests');
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: 'No se pudo registrar la justificación.'
      });
    } finally {
      setCreating(false);
    }
  };

  const openEvidence = (url) => {
    if (!url) return;
    setEvidenceUrlToView(url);
    setEvidenceModalVisible(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setAbsenceDate(formattedDate);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.institutional_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && requests.length === 0 && view === 'requests') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const statusFilterTabs = [
    { label: t('users.tabAll', 'Todas'), value: '' },
    { label: t('dashboard.pending', 'Pendientes'), value: 'pending' },
    { label: t('dashboard.approved', 'Aprobadas'), value: 'approved' },
    { label: t('dashboard.rejected', 'Rechazadas'), value: 'rejected' }
  ];

  return (
    <View style={styles.container}>
      <PageHeader 
        title={t('titles.justifications', 'Gestión de Justificaciones')} 
        subtitle={t('justifications.coordinatorSubtitle', 'Revisión y aprobación de inasistencias')} 
      >
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, view === 'requests' && styles.activeTab]} 
            onPress={() => setView('requests')}
          >
            <Text style={[styles.tabText, view === 'requests' && styles.activeTabText]}>Solicitudes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, view === 'create' && styles.activeTab]} 
            onPress={() => setView('create')}
          >
            <Text style={[styles.tabText, view === 'create' && styles.activeTabText]}>Ingreso Manual</Text>
          </TouchableOpacity>
        </View>
      </PageHeader>

      {view === 'requests' ? (
        <ScrollView style={styles.content}>
          {/* Sub-filtro por Estado */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {statusFilterTabs.map(st => (
              <TouchableOpacity
                key={st.value}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: statusFilter === st.value ? Colors.primary : Colors.gray[100]
                }}
                onPress={() => setStatusFilter(st.value)}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: statusFilter === st.value ? '#FFF' : Colors.text.muted
                }}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sectionTitle}>{t('dashboard.pending', 'Pendientes')} ({pendingRequests.length})</Text>
          
          {pendingRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('dashboard.noRequestsYet', 'No hay solicitudes pendientes.')}</Text>
            </View>
          ) : (
            pendingRequests.map(req => (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.studentName}>{req.profiles?.full_name}</Text>
                    <Text style={styles.studentCode}>{req.profiles?.institutional_code}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Pendiente</Text>
                  </View>
                </View>
                
                <View style={styles.cardBody}>
                  <Text style={styles.reasonText}><Text style={styles.boldText}>Motivo:</Text> {req.reason}</Text>
                  <Text style={styles.dateText}><Text style={styles.boldText}>Fecha:</Text> {formatDate(req.absence_date)}</Text>
                  
                  {req.evidence_url ? (
                    <TouchableOpacity style={styles.evidenceBtn} onPress={() => openEvidence(req.evidence_url)}>
                      <ExternalLink size={16} color={Colors.primaryLight} />
                      <Text style={styles.evidenceBtnText}>Ver Evidencia</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.noEvidenceText}>Sin evidencia adjunta</Text>
                  )}
                </View>
                
                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => openProcessModal(req, 'approved')}
                  >
                    <CheckCircle size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Aprobar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => openProcessModal(req, 'rejected')}
                  >
                    <XCircle size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Historial</Text>
          {historyRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay historial de solicitudes.</Text>
            </View>
          ) : (
            historyRequests.map(req => (
              <View key={req.id} style={[styles.card, { opacity: 0.8 }]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.studentName}>{req.profiles?.full_name}</Text>
                    <Text style={styles.studentCode}>{req.profiles?.institutional_code}</Text>
                  </View>
                  <View style={[styles.statusBadge, req.status === 'approved' ? styles.badgeApproved : styles.badgeRejected]}>
                    <Text style={[styles.statusText, req.status === 'approved' ? styles.textApproved : styles.textRejected]}>
                      {req.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.reasonText}><Text style={styles.boldText}>Motivo:</Text> {req.reason}</Text>
                  <Text style={styles.dateText}><Text style={styles.boldText}>Fecha:</Text> {formatDate(req.absence_date)}</Text>
                  {req.coordinator_message ? (
                    <Text style={styles.obsText}><Text style={styles.boldText}>Observación:</Text> {req.coordinator_message}</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}

          {page < totalPages && (
            <TouchableOpacity 
              style={{ padding: 16, alignItems: 'center', backgroundColor: Colors.gray[100], borderRadius: 12, marginTop: 10 }}
              onPress={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Cargar Más</Text>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Registrar Justificación Manual</Text>
          
          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Buscar Estudiante</Text>
              <View style={styles.searchBox}>
                <Search size={18} color={Colors.text.muted} />
                <TextInput 
                  style={styles.searchInput}
                  placeholder="Nombre o código..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
              </View>
              
              <ScrollView style={styles.studentList} nestedScrollEnabled>
                {filteredStudents.slice(0, 5).map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.studentItem, selectedStudent?.id === s.id && styles.studentItemSelected]}
                    onPress={() => setSelectedStudent(s)}
                  >
                    <Text style={[styles.studentItemText, selectedStudent?.id === s.id && styles.studentItemTextSelected]}>
                      {s.full_name}
                    </Text>
                    <Text style={styles.studentItemCode}>{s.grade}º {s.section}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Fecha de Ausencia</Text>
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                <Calendar size={18} color={Colors.primary} />
                <Text style={[styles.datePickerText, absenceDate ? styles.selectedText : null]}>
                  {absenceDate || 'Seleccionar fecha'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={absenceDate ? new Date(absenceDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Motivo</Text>
              <TextInput
                style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Descripción del motivo..."
                value={reason}
                onChangeText={setReason}
                multiline
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.submitBtn, styles.submitApprove]}
              onPress={createJustification}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Guardar y Aprobar</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Process Modal */}
      <BottomModal visible={modalVisible} onClose={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {statusToSet === 'approved' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Estudiante: <Text style={{ fontWeight: 'bold' }}>{selectedReq?.profiles?.full_name}</Text>
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Observación (Opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Añade un comentario sobre la decisión..."
                multiline
                numberOfLines={4}
                value={observation}
                onChangeText={setObservation}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.submitBtn, statusToSet === 'approved' ? styles.submitApprove : styles.submitReject]}
              onPress={processRequest}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Confirmar</Text>
              )}
            </TouchableOpacity>
          </View>
        </BottomModal>

      {/* Evidence Viewer Modal */}
      <Modal visible={evidenceModalVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%', width: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FileText size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Evidencia Adjunta</Text>
              </View>
              <TouchableOpacity onPress={() => setEvidenceModalVisible(false)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 16, alignItems: 'center', width: '100%' }} showsVerticalScrollIndicator={false}>
              {evidenceUrlToView.startsWith('data:image') || evidenceUrlToView.startsWith('file://') || evidenceUrlToView.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                <Image
                  source={{ uri: evidenceUrlToView }}
                  style={{ width: '100%', height: 350, borderRadius: 12, resizeMode: 'contain' }}
                />
              ) : evidenceUrlToView.startsWith('http://') || evidenceUrlToView.startsWith('https://') ? (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <ExternalLink size={48} color={Colors.primary} style={{ marginBottom: 12 }} />
                  <Text style={{ fontSize: 14, color: Colors.text.primary, textAlign: 'center', marginBottom: 16 }}>
                    El archivo está disponible como enlace web externo.
                  </Text>
                  <TouchableOpacity
                    style={{ backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
                    onPress={() => Linking.openURL(evidenceUrlToView)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Abrir Enlace Web</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ alignItems: 'center', padding: 24, backgroundColor: Colors.gray[100] || '#f8fafc', borderRadius: 16, width: '100%' }}>
                  <FileText size={56} color={Colors.primary} style={{ marginBottom: 12 }} />
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: Colors.text.primary, textAlign: 'center', marginBottom: 6 }}>
                    {evidenceUrlToView}
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.text.muted, textAlign: 'center' }}>
                    Documento comprobante registrado en la solicitud de justificación.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: Colors.gray[500] || '#64748b', marginTop: 12 }]}
              onPress={() => setEvidenceModalVisible(false)}
            >
              <Text style={styles.submitBtnText}>Cerrar Previsualización</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    paddingTop: 10,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
  },
  headerTitle: { 
    color: '#FFF', 
    fontSize: Typography.size.xl, 
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.lg
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  activeTab: {
    backgroundColor: '#FFF',
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 'bold',
    fontSize: Typography.size.sm,
  },
  activeTabText: {
    color: Colors.primary,
  },
  content: { padding: Spacing.lg },
  sectionTitle: { 
    fontSize: Typography.size.lg, 
    fontWeight: 'bold', 
    color: Colors.primary, 
    marginBottom: Spacing.md 
  },
  emptyContainer: { 
    padding: 30, 
    alignItems: 'center', 
    backgroundColor: Colors.card, 
    borderRadius: BorderRadius.lg 
  },
  emptyText: { color: Colors.text.muted },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  studentName: { fontSize: Typography.size.lg, fontWeight: 'bold', color: Colors.primary },
  studentCode: { fontSize: Typography.size.xs, color: Colors.text.muted, marginTop: 2 },
  statusBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { color: '#d97706', fontSize: Typography.size.xs, fontWeight: 'bold' },
  badgeApproved: { backgroundColor: '#d1fae5' },
  textApproved: { color: '#059669' },
  badgeRejected: { backgroundColor: '#fee2e2' },
  textRejected: { color: '#dc2626' },
  cardBody: { marginBottom: Spacing.md },
  reasonText: { fontSize: Typography.size.md, color: Colors.text.secondary, marginBottom: 4 },
  dateText: { fontSize: Typography.size.md, color: Colors.text.secondary, marginBottom: 8 },
  obsText: { fontSize: Typography.size.sm, color: Colors.text.muted, marginTop: 4, fontStyle: 'italic' },
  boldText: { fontWeight: 'bold' },
  evidenceBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  evidenceBtnText: { color: Colors.primaryLight, marginLeft: 4, fontSize: Typography.size.sm, fontWeight: 'bold' },
  noEvidenceText: { color: Colors.text.muted, fontSize: Typography.size.xs, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: BorderRadius.md },
  approveBtn: { backgroundColor: Colors.status.approved },
  rejectBtn: { backgroundColor: Colors.status.rejected },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6 },
  
  // Create Form Styles
  formContainer: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.card },
  formGroup: { marginBottom: Spacing.lg },
  formLabel: { fontSize: Typography.size.sm, fontWeight: 'bold', color: Colors.primary, marginBottom: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: Typography.size.md,
  },
  studentList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: BorderRadius.md,
  },
  studentItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentItemSelected: {
    backgroundColor: Colors.primary,
  },
  studentItemText: {
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
  },
  studentItemTextSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  studentItemCode: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
  },
  formInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
  },
  submitBtn: { padding: 16, borderRadius: BorderRadius.lg, alignItems: 'center' },
  submitApprove: { backgroundColor: Colors.primary },
  submitReject: { backgroundColor: Colors.status.rejected },
  submitBtnText: { color: '#FFF', fontSize: Typography.size.lg, fontWeight: 'bold' },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  datePickerText: {
    marginLeft: 10,
    fontSize: Typography.size.md,
    color: Colors.text.muted,
  },
  selectedText: {
    color: Colors.text.primary,
    fontWeight: '500',
  },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end', alignItems: 'stretch', padding: 0, margin: 0 },
  modalContent: { width: '100%', maxHeight: '90%', backgroundColor: Colors.card || '#FFF', borderTopLeftRadius: BorderRadius['2xl'] || 24, borderTopRightRadius: BorderRadius['2xl'] || 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.primary },
  modalSubtitle: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginBottom: 20 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: Typography.size.xs, fontWeight: 'bold', color: Colors.text.muted, marginBottom: 8 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: 16,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    textAlignVertical: 'top',
    height: 100
  }
});