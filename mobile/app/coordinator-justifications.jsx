import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image, Dimensions, BackHandler, StatusBar } from 'react-native';
import api from '../src/utils/api';
import { FileText, CheckCircle, XCircle, AlertCircle, X, ExternalLink, Plus, Search, Calendar, Clock, ChevronDown, Download } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';
import BottomModal from '../src/components/BottomModal';
import DatePickerSelector from '../src/components/DatePickerSelector';
import { WebView } from 'react-native-webview';

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

const timeStringToMinutes = (timeStr) => {
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
  const [absenceScope, setAbsenceScope] = useState('full_day'); // 'full_day' | 'hourly'
  const [startTime, setStartTime] = useState('07:00 AM');
  const [endTime, setEndTime] = useState('09:30 AM');
  const [timePickerTarget, setTimePickerTarget] = useState(null); // 'start' | 'end' | null
  const [timePickerVisible, setTimePickerVisible] = useState(false);
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
      setModalVisible(false);
      showAlert({
        type: 'success',
        title: t('dashboard.success', 'Éxito'),
        message: `Justificación ${statusToSet === 'approved' ? 'aprobada' : 'rechazada'}.`
      });
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

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (absenceDate > todayStr) {
      showAlert({
        type: 'warning',
        title: 'Fecha Inválida',
        message: 'La fecha de inasistencia no puede ser futura. Solo se permiten fechas hasta el día de hoy.'
      });
      return;
    }

    if (absenceScope === 'hourly') {
      const startMins = timeStringToMinutes(startTime);
      const endMins = timeStringToMinutes(endTime);
      if (endMins <= startMins) {
        showAlert({
          type: 'warning',
          title: 'Horario Inválido',
          message: 'La hora fin (Hasta) debe ser posterior a la hora inicio (Desde).'
        });
        return;
      }
    }

    setCreating(true);
    try {
      const finalReason = absenceScope === 'hourly'
        ? `[HORARIO: ${startTime} - ${endTime}] ${reason.trim()}`
        : `[JORNADA COMPLETA] ${reason.trim()}`;

      await api.post('/coordinator/justifications/student', {
        student_id: selectedStudent.id,
        absence_date: absenceDate,
        reason: finalReason
      });
      showAlert({
        type: 'success',
        title: t('dashboard.success', 'Éxito'),
        message: 'Justificación registrada y aprobada correctamente'
      });
      setSelectedStudent(null);
      setAbsenceDate('');
      setAbsenceScope('full_day');
      setStartTime('07:00 AM');
      setEndTime('09:30 AM');
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

  const getEvidenceInfo = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return { type: 'none', url: '' };

    // Detectar PDF por MIME o por Magic Bytes en base64 (JVBERi0 = %PDF-)
    if (
      rawUrl.startsWith('data:application/pdf') || 
      rawUrl.includes('base64,JVBERi0') || 
      rawUrl.startsWith('JVBERi0') || 
      rawUrl.toLowerCase().endsWith('.pdf')
    ) {
      let pdfUrl = rawUrl;
      if (rawUrl.startsWith('data:application/octet-stream;base64,JVBERi0')) {
        pdfUrl = rawUrl.replace('data:application/octet-stream', 'data:application/pdf');
      } else if (rawUrl.startsWith('JVBERi0')) {
        pdfUrl = `data:application/pdf;base64,${rawUrl}`;
      }
      return { type: 'pdf', url: pdfUrl };
    }

    // Normalizar imágenes que vinieron guardadas como octet-stream o base64 puro
    if (rawUrl.startsWith('data:application/octet-stream;base64,/9j/')) {
      return { type: 'image', url: rawUrl.replace('data:application/octet-stream', 'data:image/jpeg') };
    }
    if (rawUrl.startsWith('data:application/octet-stream;base64,iVBORw')) {
      return { type: 'image', url: rawUrl.replace('data:application/octet-stream', 'data:image/png') };
    }
    if (rawUrl.startsWith('/9j/')) {
      return { type: 'image', url: `data:image/jpeg;base64,${rawUrl}` };
    }
    if (rawUrl.startsWith('iVBORw')) {
      return { type: 'image', url: `data:image/png;base64,${rawUrl}` };
    }

    if (
      rawUrl.startsWith('data:image') || 
      rawUrl.startsWith('file://') || 
      !!rawUrl.match(/\.(jpeg|jpg|gif|png|webp)/i)
    ) {
      return { type: 'image', url: rawUrl };
    }

    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      if (rawUrl.match(/\.(jpeg|jpg|gif|png|webp)/i)) return { type: 'image', url: rawUrl };
      if (rawUrl.match(/\.pdf/i)) return { type: 'pdf', url: rawUrl };
      return { type: 'external', url: rawUrl };
    }

    return { type: 'document', url: rawUrl };
  };

  const getPdfViewerHtml = (pdfUrl) => {
    let b64 = pdfUrl || '';
    if (b64.includes('base64,')) {
      b64 = b64.split('base64,')[1];
    }
    b64 = b64.replace(/[\r\n\s]+/g, '');

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, minimum-scale=1.0, user-scalable=yes">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background-color: #000000;
      width: 100%;
      min-height: 100%;
      margin: 0;
      padding: 0;
    }
    body {
      padding-top: 76px;
      padding-bottom: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    #container {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    canvas {
      width: 100% !important;
      max-width: 100%;
      height: auto !important;
      display: block;
      margin: 0 auto;
      background: #ffffff;
    }
    #loader {
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      margin-top: 80px;
      text-align: center;
    }
    .spinner {
      border: 3px solid rgba(255,255,255,0.2);
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="loader">
    <div class="spinner"></div>
    <span>Cargando documento PDF...</span>
  </div>
  <div id="container"></div>
  <script>
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const b64Data = "${b64}";
      const binaryString = atob(b64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      pdfjsLib.getDocument({ data: bytes }).promise.then(function(pdf) {
        document.getElementById('loader').style.display = 'none';
        for (let p = 1; p <= pdf.numPages; p++) {
          pdf.getPage(p).then(function(page) {
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const ctx = canvas.getContext('2d');
            document.getElementById('container').appendChild(canvas);
            page.render({ canvasContext: ctx, viewport: viewport });
          });
        }
      }).catch(function(err) {
        document.getElementById('loader').innerHTML = '<span style="color:#f87171;">Error al renderizar PDF: ' + err.message + '</span>';
      });
    } catch(e) {
      document.getElementById('loader').innerHTML = '<span style="color:#f87171;">Error al procesar: ' + e.message + '</span>';
    }
  </script>
</body>
</html>`;
  };

  const handleOpenPdfMobile = async (pdfUrl) => {
    try {
      if (Platform.OS === 'web') {
        window.open(pdfUrl, '_blank');
        return;
      }
      let base64Data = pdfUrl;
      if (pdfUrl.includes('base64,')) {
        base64Data = pdfUrl.split('base64,')[1];
      }
      base64Data = base64Data.replace(/[\r\n\s]+/g, '');
      const fileUri = `${FileSystem.cacheDirectory}evidencia_justificacion_${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Comprobante de Justificación (PDF)',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Linking.openURL(fileUri);
      }
    } catch (err) {
      console.error('Error al abrir PDF:', err);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo abrir el documento PDF en el dispositivo.'
      });
    }
  };

  const openEvidence = (url) => {
    if (!url) return;
    setEvidenceUrlToView(url);
    setEvidenceModalVisible(true);
  };

  useEffect(() => {
    if (!evidenceModalVisible) return;
    const backAction = () => {
      setEvidenceModalVisible(false);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [evidenceModalVisible]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
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
      setAbsenceDate(formattedDate);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.institutional_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderReasonContent = (rawReason) => {
    if (!rawReason) return null;
    const timeMatch = rawReason.match(/\[HORARIO:\s*([^\]]+)\]/i);
    const isFullDay = rawReason.includes('[JORNADA COMPLETA]');
    const cleanReason = rawReason
      .replace(/\[HORARIO:\s*[^\]]+\]/gi, '')
      .replace(/\[JORNADA COMPLETA\]/gi, '')
      .trim();

    return (
      <View style={{ marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {timeMatch && (
            <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={12} color="#0284c7" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#0284c7' }}>{timeMatch[1]}</Text>
            </View>
          )}
          {isFullDay && (
            <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} color="#475569" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>Día Completo</Text>
            </View>
          )}
        </View>
        <Text style={styles.reasonText}><Text style={styles.boldText}>Motivo:</Text> {cleanReason || rawReason}</Text>
      </View>
    );
  };

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
                  {renderReasonContent(req.reason)}
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
                  {renderReasonContent(req.reason)}
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView 
            style={styles.content}
            contentContainerStyle={{ paddingBottom: 160 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
              
              {/* Modalidad de Inasistencia */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tipo de Inasistencia</Text>
                <View style={styles.scopeSelector}>
                  <TouchableOpacity
                    style={[styles.scopeBtn, absenceScope === 'full_day' && styles.scopeBtnActive]}
                    onPress={() => setAbsenceScope('full_day')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.scopeBtnText, absenceScope === 'full_day' && styles.scopeBtnTextActive]}>
                      Día Completo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scopeBtn, absenceScope === 'hourly' && styles.scopeBtnActive]}
                    onPress={() => setAbsenceScope('hourly')}
                    activeOpacity={0.8}
                  >
                    <Clock size={16} color={absenceScope === 'hourly' ? '#FFF' : Colors.text.muted} style={{ marginRight: 6 }} />
                    <Text style={[styles.scopeBtnText, absenceScope === 'hourly' && styles.scopeBtnTextActive]}>
                      Por Horario
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <DatePickerSelector
                label="Fecha de Ausencia *"
                value={absenceDate}
                onChange={(dateStr) => {
                  const today = new Date();
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  if (dateStr > todayStr) {
                    showAlert({
                      type: 'warning',
                      title: 'Fecha Inválida',
                      message: 'Solo se permiten justificaciones hasta la fecha actual.'
                    });
                    return;
                  }
                  setAbsenceDate(dateStr);
                }}
                maxDate={new Date().toISOString().split('T')[0]}
                placeholder="Seleccionar fecha"
              />

              {/* Rango de Horario (Selector Táctil) */}
              {absenceScope === 'hourly' && (
                <View style={styles.timeRangeContainer}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.formLabel}>Desde (Hora Inicio)</Text>
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
                        <Text style={styles.timeSelectorText}>{startTime}</Text>
                      </View>
                      <ChevronDown size={16} color={Colors.text.muted} />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>Hasta (Hora Fin)</Text>
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
                        <Text style={styles.timeSelectorText}>{endTime}</Text>
                      </View>
                      <ChevronDown size={16} color={Colors.text.muted} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Motivo de Ausencia</Text>
                <TextInput
                  style={[styles.formInput, styles.reasonInput]}
                  placeholder="Escribe detalladamente el motivo de la ausencia..."
                  placeholderTextColor={Colors.text.muted}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={4}
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
        </KeyboardAvoidingView>
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

      {/* Time Picker Modal */}
      <BottomModal visible={timePickerVisible} onClose={() => setTimePickerVisible(false)}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {timePickerTarget === 'start' ? 'Hora de Inicio (Desde)' : 'Hora de Fin (Hasta)'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {timePickerTarget === 'start' ? 'Selecciona la hora lectiva de inicio' : `Selecciona la hora de fin (posterior a ${startTime})`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setTimePickerVisible(false)}>
              <X size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 16 }}>
              {SCHOOL_HOURS.map(hour => {
                const isSelected = (timePickerTarget === 'start' ? startTime : endTime) === hour;
                const isDisabled = timePickerTarget === 'end' && timeStringToMinutes(hour) <= timeStringToMinutes(startTime);
                return (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.hourChip, 
                      isSelected && styles.hourChipActive,
                      isDisabled && { opacity: 0.35, backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }
                    ]}
                    disabled={isDisabled}
                    onPress={() => {
                      if (timePickerTarget === 'start') {
                        const newStartMins = timeStringToMinutes(hour);
                        const currentEndMins = timeStringToMinutes(endTime);
                        if (newStartMins >= currentEndMins) {
                          const nextSlot = SCHOOL_HOURS.find(h => timeStringToMinutes(h) > newStartMins);
                          if (nextSlot) setEndTime(nextSlot);
                          else setEndTime(hour);
                        }
                        setStartTime(hour);
                      } else {
                        const startMins = timeStringToMinutes(startTime);
                        const endMins = timeStringToMinutes(hour);
                        if (endMins <= startMins) {
                          showAlert({
                            type: 'warning',
                            title: 'Horario Inválido',
                            message: 'La hora fin (Hasta) no puede ser anterior ni igual a la hora inicio (Desde).'
                          });
                          return;
                        }
                        setEndTime(hour);
                      }
                      setTimePickerVisible(false);
                    }}
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
      </BottomModal>

      {/* Evidence Viewer Modal - Full Screen Edge-to-Edge */}
      <Modal
        visible={evidenceModalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setEvidenceModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={true} />
        <View style={{ flex: 1, backgroundColor: '#000000', width: '100%', height: '100%' }}>
          {/* Header Bar */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              height: Platform.OS === 'ios' ? 96 : (Platform.OS === 'android' ? 76 : 64),
              paddingTop: Platform.OS === 'ios' ? 44 : (Platform.OS === 'android' ? 24 : 8),
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
              <TouchableOpacity
                onPress={() => setEvidenceModalVisible(false)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '700',
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                Evidencia Adjunta
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {(() => {
                const info = getEvidenceInfo(evidenceUrlToView);
                if (info.type === 'pdf') {
                  return (
                    <TouchableOpacity
                      onPress={() => handleOpenPdfMobile(info.url)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: Colors.primary,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        gap: 6,
                      }}
                    >
                      <Download size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Descargar</Text>
                    </TouchableOpacity>
                  );
                }
                if (info.type === 'external') {
                  return (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(info.url)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: Colors.primary,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        gap: 6,
                      }}
                    >
                      <ExternalLink size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Abrir</Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })()}
            </View>
          </View>

          {/* Full Screen Content Body */}
          <View style={{ flex: 1, width: '100%', height: '100%' }}>
            {(() => {
              const info = getEvidenceInfo(evidenceUrlToView);
              if (info.type === 'image') {
                return Platform.OS === 'web' ? (
                  <View
                    style={{
                      flex: 1,
                      width: '100%',
                      height: '100%',
                      paddingTop: 64,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#000000',
                    }}
                  >
                    <img
                      src={info.url}
                      style={{
                        maxWidth: '100%',
                        maxHeight: 'calc(100vh - 64px)',
                        objectFit: 'contain',
                        cursor: 'zoom-in',
                        transition: 'transform 0.2s ease-out',
                      }}
                      alt="Evidencia"
                      onClick={(e) => {
                        const img = e.target;
                        const currentScale = img.style.transform ? parseFloat(img.style.transform.replace('scale(', '')) : 1;
                        img.style.transform = `scale(${currentScale === 1 ? 2 : 1})`;
                        img.style.cursor = currentScale === 1 ? 'zoom-out' : 'zoom-in';
                      }}
                    />
                  </View>
                ) : (
                  <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#000000' }}>
                    <ScrollView
                      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                      maximumZoomScale={5}
                      minimumZoomScale={1}
                      showsHorizontalScrollIndicator={false}
                      showsVerticalScrollIndicator={false}
                      bouncesZoom={true}
                      style={{ flex: 1, width: '100%', height: '100%' }}
                    >
                      <Image
                        source={{ uri: info.url }}
                        style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                        onError={(e) => console.warn('Error cargando imagen de evidencia:', e.nativeEvent?.error)}
                      />
                    </ScrollView>
                  </View>
                );
              }

              if (info.type === 'pdf') {
                return Platform.OS === 'web' ? (
                  <View style={{ flex: 1, width: '100%', height: '100%', paddingTop: 64, backgroundColor: '#000000' }}>
                    <iframe
                      src={info.url}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="Documento PDF"
                    />
                  </View>
                ) : (
                  <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#000000' }}>
                    <WebView
                      originWhitelist={['*']}
                      source={{ html: getPdfViewerHtml(info.url) }}
                      style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#000000' }}
                      scalesPageToFit={true}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                      showsVerticalScrollIndicator={true}
                    />
                  </View>
                );
              }

              if (info.type === 'external') {
                return (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#000000' }}>
                    <View style={{ alignItems: 'center', padding: 28, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, maxWidth: 360, width: '90%' }}>
                      <ExternalLink size={56} color="#38BDF8" style={{ marginBottom: 16 }} />
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 8 }}>
                        Enlace Externo
                      </Text>
                      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24 }}>
                        El archivo está disponible mediante un enlace o servicio externo.
                      </Text>
                      <TouchableOpacity
                        style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' }}
                        onPress={() => Linking.openURL(info.url)}
                      >
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>Abrir Enlace Externo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }

              return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#000000' }}>
                  <View style={{ alignItems: 'center', padding: 28, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, maxWidth: 360, width: '90%' }}>
                    <FileText size={56} color="#38BDF8" style={{ marginBottom: 16 }} />
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 8 }}>
                      Documento Adjunto
                    </Text>
                    <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24 }}>
                      Comprobante registrado en la solicitud. Puedes abrirlo con una aplicación compatible.
                    </Text>
                    {info.url && info.url.length > 20 && (
                      <TouchableOpacity
                        style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                        onPress={() => handleOpenPdfMobile(info.url)}
                      >
                        <Download size={18} color="#FFF" />
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>Abrir o Descargar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })()}
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
  timeSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card || '#FFF',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.gray[300] || '#D1D5DB',
  },
  timeSelectorText: {
    fontSize: Typography.size.sm,
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
    borderRadius: BorderRadius.md,
    width: '48%',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hourChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  hourChipText: {
    fontSize: Typography.size.sm,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  hourChipTextActive: {
    color: '#FFF',
  },
  reasonInput: {
    height: 100,
    textAlignVertical: 'top',
    backgroundColor: Colors.card || '#FFF',
    borderWidth: 1.5,
    borderColor: Colors.gray[300] || '#D1D5DB',
    padding: 12,
    fontSize: Typography.size.sm,
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
  modalContent: { width: '100%', maxHeight: '90%', backgroundColor: Colors.card || '#FFF', borderTopLeftRadius: BorderRadius['2xl'] || 24, borderTopRightRadius: BorderRadius['2xl'] || 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 24, paddingBottom: 24 },
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
  },
  scopeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: 4,
  },
  scopeBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm || 8,
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
    fontSize: Typography.size.sm,
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
    marginBottom: 4,
  },
});
