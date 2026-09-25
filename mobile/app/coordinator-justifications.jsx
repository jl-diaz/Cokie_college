import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image, Dimensions, BackHandler, StatusBar } from 'react-native';
import api from '../src/utils/api';
import { enqueueOutbox } from '../src/utils/outboxQueue';
import { FileText, CheckCircle, XCircle, AlertCircle, X, ExternalLink, Plus, Search, Calendar, Clock, ChevronDown, Download, Users, CheckSquare, Square, Trash2, Check, User } from 'lucide-react-native';
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
import { useTabBar } from '../src/context/TabBarContext';

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
  const { colors: Colors, theme } = useTheme();
  const { showAlert } = useAlert();
  const isDark = theme === 'dark';
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);
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

  const { registerModal, unregisterModal } = useTabBar?.() || {};

  useEffect(() => {
    if (evidenceModalVisible && registerModal) {
      registerModal();
      return () => {
        unregisterModal?.();
      };
    }
  }, [evidenceModalVisible, registerModal, unregisterModal]);

  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [creationMode, setCreationMode] = useState('individual'); // 'individual' | 'bulk'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [gradeFilter, setGradeFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [absenceDate, setAbsenceDate] = useState('');
  const [dateError, setDateError] = useState('');

  const getTodayLocalString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  const [absenceScope, setAbsenceScope] = useState('full_day'); // 'full_day' | 'hourly'
  const [startTime, setStartTime] = useState('07:00 AM');
  const [endTime, setEndTime] = useState('09:30 AM');
  const [timePickerTarget, setTimePickerTarget] = useState(null); // 'start' | 'end' | null
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' (por defecto), '' (todas), 'approved', 'rejected'

  const renderJustificationCard = (req) => {
    const isPending = req.status === 'pending';
    const isApproved = req.status === 'approved';
    const isRejected = req.status === 'rejected';

    const rawReason = req.reason || '';
    const timeMatch = rawReason.match(/\[HORARIO:\s*([^\]]+)\]/i);
    const isFullDay = rawReason.includes('[JORNADA COMPLETA]') || (!timeMatch && req.absence_scope === 'full_day');
    const cleanReason = rawReason
      .replace(/\[HORARIO:\s*[^\]]+\]/gi, '')
      .replace(/\[JORNADA COMPLETA\]/gi, '')
      .trim() || t('coordinatorJustifications.noReasonSpecified', 'Sin motivo especificado');

    const solicitudText = isFullDay 
      ? t('coordinatorJustifications.fullDay', 'Día completo') 
      : (timeMatch ? timeMatch[1] : (req.start_time && req.end_time ? `${req.start_time} - ${req.end_time}` : t('coordinatorJustifications.fullDay', 'Día completo')));

    const statusLabel = isPending 
      ? t('dashboard.pending', 'Pendiente') 
      : isApproved 
        ? t('coordinatorJustifications.approved', 'Aprobada') 
        : t('coordinatorJustifications.rejected', 'Rechazada');

    return (
      <View 
        key={req.id} 
        style={[
          styles.card,
          isPending ? styles.cardPendingBorder : styles.cardSolidBorder
        ]}
      >
        {/* HEADER SUPERIOR: Nombre estudiante, código y estado */}
        <View style={[
          styles.cardHeader,
          isPending && styles.headerPending,
          isApproved && styles.headerApproved,
          isRejected && styles.headerRejected,
        ]}>
          <Text style={[
            styles.studentName,
            isPending && styles.namePending,
            isApproved && styles.nameApproved,
            isRejected && styles.nameRejected,
          ]} numberOfLines={1}>
            {req.profiles?.full_name || t('coordinatorJustifications.student', 'Estudiante')}
          </Text>

          <Text style={styles.studentCode}>
            {req.profiles?.institutional_code || 'S/C'}
          </Text>

          <View style={[
            styles.statusBadge,
            isPending && styles.badgePending,
            isApproved && styles.badgeApproved,
            isRejected && styles.badgeRejected,
          ]}>
            <Text style={[
              styles.statusText,
              isPending && styles.statusTextPending,
              isApproved && styles.statusTextApproved,
              isRejected && styles.statusTextRejected,
            ]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* CUERPO DEL RECUADRO CON FILAS HORIZONTALES */}
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('coordinatorJustifications.request', 'Solicitud')}:</Text>
            <Text style={styles.infoValue}>{solicitudText}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('coordinatorJustifications.reason', 'Motivo')}:</Text>
            <Text style={styles.infoValue}>{cleanReason}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('coordinatorJustifications.date', 'Fecha')}:</Text>
            <Text style={styles.infoValue}>{formatDate(req.absence_date)}</Text>
          </View>

          {req.coordinator_message ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('coordinatorJustifications.observation', 'Observación')}:</Text>
              <Text style={styles.infoValue}>{req.coordinator_message}</Text>
            </View>
          ) : null}

          {/* Botón Ver Evidencia */}
          {req.evidence_url ? (
            <TouchableOpacity 
              style={styles.evidenceBtn} 
              onPress={() => openEvidence(req.evidence_url)}
              activeOpacity={0.8}
            >
              <Text style={styles.evidenceBtnText}>
                {t('coordinatorJustifications.viewEvidence', 'Ver evidencia')}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Botones de Acción para Pendientes */}
          {isPending && (
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => openProcessModal(req, 'rejected')}
                activeOpacity={0.8}
              >
                <Text style={styles.rejectBtnText}>{t('coordinatorJustifications.reject', 'Rechazar')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => openProcessModal(req, 'approved')}
                activeOpacity={0.8}
              >
                <Text style={styles.approveBtnText}>{t('coordinatorJustifications.approve', 'Aprobar')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

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
        params: { status: statusFilter || undefined, page: pageNum, limit: 15 }
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
        message: t('coordinatorJustifications.studentsLoadError', 'No se pudieron cargar los estudiantes.')
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
        message: t('coordinatorJustifications.processRequestError', 'No se pudo procesar la solicitud.')
      });
    } finally {
      setProcessing(false);
    }
  };

  const toggleStudentSelection = (student) => {
    setSelectedStudents(prev => {
      const exists = prev.some(s => s.id === student.id);
      if (exists) {
        return prev.filter(s => s.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  const removeSelectedStudent = (studentId) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const selectAllFiltered = () => {
    setSelectedStudents(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const toAdd = filteredStudents.filter(s => !existingIds.has(s.id));
      return [...prev, ...toAdd];
    });
  };

  const clearSelectedStudents = () => {
    setSelectedStudents([]);
  };

  const createJustification = async () => {
    if (creationMode === 'individual') {
      if (!selectedStudent || !absenceDate || !reason.trim()) {
        if (!absenceDate) {
          setDateError(t('justifications.dateRequired', 'Por favor selecciona la fecha de inasistencia.'));
        }
        showAlert({
          type: 'warning',
          title: t('dashboard.error', 'Error'),
          message: t('dashboard.pleaseCompleteFields', 'Completa todos los campos')
        });
        return;
      }
    } else {
      if (selectedStudents.length === 0 || !absenceDate || !reason.trim()) {
        if (!absenceDate) {
          setDateError(t('justifications.dateRequired', 'Por favor selecciona la fecha de inasistencia.'));
        }
        showAlert({
          type: 'warning',
          title: t('dashboard.error', 'Error'),
          message: t('coordinatorJustifications.selectStudentRequired', 'Debes seleccionar al menos un estudiante, la fecha y el motivo de ausencia.')
        });
        return;
      }
    }

    const todayStr = getTodayLocalString();
    if (absenceDate > todayStr) {
      setDateError(t('justifications.invalidDateDesc', 'Solo se permiten justificaciones hasta la fecha actual.'));
      showAlert({
        type: 'warning',
        title: t('justifications.invalidDate', 'Fecha Inválida'),
        message: t('justifications.invalidDateDesc', 'Solo se permiten justificaciones hasta la fecha actual.')
      });
      return;
    }

    if (absenceScope === 'hourly') {
      const startMins = timeStringToMinutes(startTime);
      const endMins = timeStringToMinutes(endTime);
      if (endMins <= startMins) {
        showAlert({
          type: 'warning',
          title: t('coordinatorJustifications.invalidHoursTitle', 'Horario Inválido'),
          message: t('coordinatorJustifications.invalidHoursDesc', 'La hora fin (Hasta) debe ser posterior a la hora inicio (Desde).')
        });
        return;
      }
    }

    setCreating(true);
    const finalReason = absenceScope === 'hourly'
      ? `[HORARIO: ${startTime} - ${endTime}] ${reason.trim()}`
      : `[JORNADA COMPLETA] ${reason.trim()}`;

    try {

      if (creationMode === 'individual') {
        await api.post('/coordinator/justifications/student', {
          student_id: selectedStudent.id,
          absence_date: absenceDate,
          reason: finalReason
        });
        showAlert({
          type: 'success',
          title: t('dashboard.success', 'Éxito'),
          message: t('coordinatorJustifications.individualSuccess', 'Justificación individual registrada y aprobada correctamente')
        });
      } else {
        await api.post('/coordinator/justifications/bulk', {
          student_ids: selectedStudents.map(s => s.id),
          absence_date: absenceDate,
          reason: finalReason
        });
        showAlert({
          type: 'success',
          title: t('dashboard.success', 'Éxito'),
          message: t('coordinatorJustifications.bulkSuccess', 'Se registraron y aprobaron las justificaciones masivas correctamente')
        });
      }

      setSelectedStudent(null);
      setSelectedStudents([]);
      setGradeFilter('');
      setSectionFilter('');
      setSearchTerm('');
      setAbsenceDate('');
      setDateError('');
      setAbsenceScope('full_day');
      setStartTime('07:00 AM');
      setEndTime('09:30 AM');
      setReason('');
      setView('requests');
      setPage(1);
      fetchRequests(1, true);
    } catch (error) {
      console.warn('Error creating justification, checking network:', error);
      const isNetworkError = !error.response || error.code === 'ECONNABORTED' || error.message?.includes('Network Error');
      if (isNetworkError) {
        const endpoint = creationMode === 'individual' ? '/coordinator/justifications/student' : '/coordinator/justifications/bulk';
        const payload = creationMode === 'individual' 
          ? { student_id: selectedStudent.id, absence_date: absenceDate, reason: finalReason }
          : { student_ids: selectedStudents.map(s => s.id), absence_date: absenceDate, reason: finalReason };

        await enqueueOutbox({
          type: 'justification',
          endpoint,
          payload
        });

        showAlert({
          type: 'info',
          title: t('coordinatorJustifications.offlineSaved', 'Guardado Offline'),
          message: t('coordinatorJustifications.offlineSavedDesc', 'Sin conexión a internet. La justificación quedó en cola de salida y se enviará automáticamente al reconectar.')
        });

        setSelectedStudent(null);
        setSelectedStudents([]);
        setGradeFilter('');
        setSectionFilter('');
        setSearchTerm('');
        setAbsenceDate('');
        setDateError('');
        setAbsenceScope('full_day');
        setStartTime('07:00 AM');
        setEndTime('09:30 AM');
        setReason('');
        setView('requests');
      } else {
        showAlert({
          type: 'error',
          title: t('dashboard.error', 'Error'),
          message: error.response?.data?.error || 'No se pudo registrar la justificación.'
        });
      }
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
          dialogTitle: t('coordinatorJustifications.pdfTitle', 'Comprobante de Justificación (PDF)'),
          UTI: 'com.adobe.pdf'
        });
      } else {
        Linking.openURL(fileUri);
      }
    } catch (err) {
      console.error('Error al abrir PDF:', err);
      showAlert({
        type: 'error',
        title: t('common.error', 'Error'),
        message: t('coordinatorJustifications.cantOpenPdf', 'No se pudo abrir el documento PDF en el dispositivo.')
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
          title: t('justifications.invalidDate', 'Fecha Inválida'),
          message: t('justifications.invalidDateDesc', 'Solo se permiten justificaciones hasta la fecha actual.')
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

  const availableGrades = React.useMemo(() => {
    if (!Array.isArray(students)) return [];
    const grades = [...new Set(students.map(s => s.grade).filter(Boolean))];
    return grades.sort((a, b) => parseInt(a) - parseInt(b));
  }, [students]);

  const availableSections = React.useMemo(() => {
    if (!Array.isArray(students)) return [];
    const sections = [...new Set(students.map(s => s.section).filter(Boolean))];
    return sections.sort();
  }, [students]);

  const filteredStudents = React.useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.filter(s => {
      const matchesSearch = !searchTerm || 
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.institutional_code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrade = !gradeFilter || s.grade === gradeFilter;
      const matchesSection = !sectionFilter || s.section === sectionFilter;
      return matchesSearch && matchesGrade && matchesSection;
    });
  }, [students, searchTerm, gradeFilter, sectionFilter]);


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
            <View style={{ backgroundColor: isDark ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={12} color={isDark ? '#38bdf8' : '#0284c7'} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#38bdf8' : '#0284c7' }}>{timeMatch[1]}</Text>
            </View>
          )}
          {isFullDay && (
            <View style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} color={isDark ? '#cbd5e1' : '#475569'} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#cbd5e1' : '#475569' }}>
                {t('coordinatorJustifications.fullDay', 'Día Completo')}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.reasonText}>
          <Text style={styles.boldText}>{t('coordinatorJustifications.reason', 'Motivo')}:</Text> {cleanReason || rawReason}
        </Text>
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
    { label: t('dashboard.pending', 'Pendientes'), value: 'pending' },
    { label: t('users.tabAll', 'Todas'), value: '' },
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
            <Text style={[styles.tabText, view === 'requests' && styles.activeTabText]}>{t('justifications.requests', 'Solicitudes')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, view === 'create' && styles.activeTab]} 
            onPress={() => setView('create')}
          >
            <Text style={[styles.tabText, view === 'create' && styles.activeTabText]}>{t('justifications.manualEntry', 'Ingreso Manual')}</Text>
          </TouchableOpacity>
        </View>
      </PageHeader>

      {view === 'requests' ? (
        <FlatList
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 120 }}
          data={requests}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderJustificationCard(item)}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={
            <View style={{ marginBottom: 12 }}>
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
              <Text style={styles.sectionTitle}>
                {statusFilter === 'pending'
                  ? `${t('dashboard.pending', 'Pendientes')} (${requests.length})`
                  : statusFilter === 'approved'
                    ? `${t('coordinatorJustifications.approved', 'Aprobadas')} (${requests.length})`
                    : statusFilter === 'rejected'
                      ? `${t('coordinatorJustifications.rejected', 'Rechazadas')} (${requests.length})`
                      : `${t('justifications.requests', 'Solicitudes')} (${requests.length})`
                }
              </Text>
            </View>
          }
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {statusFilter === 'pending'
                    ? t('dashboard.noRequestsYet', 'No hay solicitudes pendientes.')
                    : t('coordinatorJustifications.noHistory', 'No hay solicitudes en esta sección.')}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            page < totalPages ? (
              <TouchableOpacity 
                style={{ padding: 16, alignItems: 'center', backgroundColor: Colors.gray[100], borderRadius: 12, marginTop: 10 }}
                onPress={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>{t('common.loadMore', 'Cargar Más')}</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
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
            <Text style={styles.sectionTitle}>
              {creationMode === 'individual' 
                ? t('justifications.registerManual', 'Registrar Justificación Manual') 
                : t('justifications.registerBulk', 'Registrar Justificación Masiva (Excursión / Grupal)')}
            </Text>
            
            <View style={styles.formContainer}>
              {/* Selector de Modo: Individual vs Masiva */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('bulkJustifications.mode', 'Modalidad de Registro')}</Text>
                <View style={styles.creationModeContainer}>
                  <TouchableOpacity
                    style={[styles.creationModeBtn, creationMode === 'individual' && styles.creationModeBtnActive]}
                    onPress={() => setCreationMode('individual')}
                    activeOpacity={0.8}
                  >
                    <User size={16} color={creationMode === 'individual' ? '#FFF' : Colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.creationModeBtnText, creationMode === 'individual' && styles.creationModeBtnTextActive]}>
                      {t('bulkJustifications.individual', 'Individual')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.creationModeBtn, creationMode === 'bulk' && styles.creationModeBtnActive]}
                    onPress={() => setCreationMode('bulk')}
                    activeOpacity={0.8}
                  >
                    <Users size={16} color={creationMode === 'bulk' ? '#FFF' : Colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.creationModeBtnText, creationMode === 'bulk' && styles.creationModeBtnTextActive]}>
                      {t('bulkJustifications.bulk', 'Masiva')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {creationMode === 'individual' ? (
                /* MODO INDIVIDUAL */
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('coordinatorJustifications.searchStudent', 'Buscar Estudiante *')}</Text>
                  <View style={styles.searchBox}>
                    <Search size={18} color={Colors.text.muted} />
                    <TextInput 
                      style={styles.searchInput}
                      placeholder={t('coordinatorJustifications.searchStudentPlaceholder', 'Nombre o código...')}
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                    />
                  </View>
                  
                  {selectedStudent && (
                    <View style={styles.selectedStudentBadge}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedStudentName}>{selectedStudent.full_name}</Text>
                        <Text style={styles.selectedStudentCode}>{selectedStudent.institutional_code} · {selectedStudent.grade}º {selectedStudent.section}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedStudent(null)} style={styles.removeSelectedBtn}>
                        <X size={16} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  )}

                  <ScrollView 
                    style={styles.studentList} 
                    contentContainerStyle={{ paddingBottom: 16 }}
                    nestedScrollEnabled
                  >
                    {filteredStudents.slice(0, 8).map(s => (
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
              ) : (
                /* MODO MASIVO (GRUPAL) */
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('coordinatorJustifications.studentSelection', 'Selección de Estudiantes *')}</Text>
                  
                  {/* Filtro por Grado */}
                  <Text style={styles.subFilterLabel}>{t('bulkJustifications.filterClassroom', 'Filtrar por Aula')} - {t('bulkJustifications.grade', 'Grado')}:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    <TouchableOpacity
                      style={[styles.filterChip, gradeFilter === '' && styles.filterChipActive]}
                      onPress={() => setGradeFilter('')}
                    >
                      <Text style={[styles.filterChipText, gradeFilter === '' && styles.filterChipTextActive]}>{t('bulkJustifications.allGrades', 'Todos los grados')}</Text>
                    </TouchableOpacity>
                    {availableGrades.map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.filterChip, gradeFilter === g && styles.filterChipActive]}
                        onPress={() => setGradeFilter(prev => prev === g ? '' : g)}
                      >
                        <Text style={[styles.filterChipText, gradeFilter === g && styles.filterChipTextActive]}>{g}º {t('bulkJustifications.grade', 'Grado')}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Filtro por Sección */}
                  <Text style={styles.subFilterLabel}>{t('bulkJustifications.section', 'Sección')}:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    <TouchableOpacity
                      style={[styles.filterChip, sectionFilter === '' && styles.filterChipActive]}
                      onPress={() => setSectionFilter('')}
                    >
                      <Text style={[styles.filterChipText, sectionFilter === '' && styles.filterChipTextActive]}>{t('bulkJustifications.allSections', 'Todas las secciones')}</Text>
                    </TouchableOpacity>
                    {availableSections.map(sec => (
                      <TouchableOpacity
                        key={sec}
                        style={[styles.filterChip, sectionFilter === sec && styles.filterChipActive]}
                        onPress={() => setSectionFilter(prev => prev === sec ? '' : sec)}
                      >
                        <Text style={[styles.filterChipText, sectionFilter === sec && styles.filterChipTextActive]}>{t('bulkJustifications.section', 'Sección')} {sec}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Buscador de texto */}
                  <View style={[styles.searchBox, { marginTop: 6 }]}>
                    <Search size={18} color={Colors.text.muted} />
                    <TextInput 
                      style={styles.searchInput}
                      placeholder={t('dashboard.search', 'Buscar por nombre o código...')}
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                    />
                  </View>

                  {/* Botones de acción rápida */}
                  <View style={styles.quickActionRow}>
                    <TouchableOpacity
                      style={styles.quickActionBtn}
                      onPress={selectAllFiltered}
                      activeOpacity={0.8}
                    >
                      <CheckSquare size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.quickActionText}>
                        {t('bulkJustifications.selectFiltered', { count: filteredStudents.length, defaultValue: `Seleccionar filtrados (${filteredStudents.length})` })}
                      </Text>
                    </TouchableOpacity>
                    {selectedStudents.length > 0 && (
                      <TouchableOpacity
                        style={[styles.quickActionBtn, styles.quickActionDanger]}
                        onPress={clearSelectedStudents}
                        activeOpacity={0.8}
                      >
                        <Trash2 size={16} color="#dc2626" style={{ marginRight: 6 }} />
                        <Text style={[styles.quickActionText, { color: '#dc2626' }]}>{t('bulkJustifications.clear', 'Limpiar')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Resumen de seleccionados */}
                  <View style={styles.selectionCounterCard}>
                    <Users size={18} color={Colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.selectionCounterText}>
                      <Text style={{ fontWeight: 'bold' }}>{selectedStudents.length}</Text> {t('bulkJustifications.studentsCount', { count: selectedStudents.length, defaultValue: `${selectedStudents.length} estudiantes seleccionados` })}
                    </Text>
                  </View>

                  {/* Chips de seleccionados */}
                  {selectedStudents.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedChipsScroll}>
                      {selectedStudents.map(s => (
                        <View key={s.id} style={styles.studentSelectedChip}>
                          <Text style={styles.studentSelectedChipText} numberOfLines={1}>
                            {s.full_name} ({s.grade}º{s.section})
                          </Text>
                          <TouchableOpacity onPress={() => removeSelectedStudent(s.id)} style={{ marginLeft: 4 }}>
                            <X size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}

                  {/* Lista de estudiantes con Checkboxes */}
                  <ScrollView 
                    style={[styles.studentList, { maxHeight: 240 }]} 
                    contentContainerStyle={{ paddingBottom: 16 }}
                    nestedScrollEnabled
                  >
                    {filteredStudents.length === 0 ? (
                      <View style={{ padding: 16, alignItems: 'center' }}>
                        <Text style={{ color: Colors.text.muted, fontSize: 13 }}>{t('coordinatorJustifications.noStudentsFound', 'No se encontraron estudiantes con los filtros aplicados')}</Text>
                      </View>
                    ) : (
                      filteredStudents.map(s => {
                        const isChecked = selectedStudents.some(sel => sel.id === s.id);
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={[styles.studentCheckboxItem, isChecked && styles.studentCheckboxItemActive]}
                            onPress={() => toggleStudentSelection(s)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.checkboxContainer}>
                              {isChecked ? (
                                <CheckSquare size={20} color={Colors.primary} />
                              ) : (
                                <Square size={20} color={Colors.gray[400]} />
                              )}
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={[styles.studentItemText, isChecked && { fontWeight: 'bold', color: Colors.primary }]}>
                                {s.full_name}
                              </Text>
                              <Text style={styles.studentItemCode}>
                                {s.institutional_code} · {s.grade}º Grado "{s.section}"
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              )}
              
              {/* Modalidad de Inasistencia */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('bulkJustifications.scope', 'Tipo de Inasistencia')}</Text>
                <View style={styles.scopeSelector}>
                  <TouchableOpacity
                    style={[styles.scopeBtn, absenceScope === 'full_day' && styles.scopeBtnActive]}
                    onPress={() => setAbsenceScope('full_day')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.scopeBtnText, absenceScope === 'full_day' && styles.scopeBtnTextActive]}>
                      {t('bulkJustifications.fullDay', 'Día Completo')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scopeBtn, absenceScope === 'hourly' && styles.scopeBtnActive]}
                    onPress={() => setAbsenceScope('hourly')}
                    activeOpacity={0.8}
                  >
                    <Clock size={16} color={absenceScope === 'hourly' ? '#FFF' : Colors.text.muted} style={{ marginRight: 6 }} />
                    <Text style={[styles.scopeBtnText, absenceScope === 'hourly' && styles.scopeBtnTextActive]}>
                      {t('bulkJustifications.bySchedule', 'Por Horario')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <DatePickerSelector
                label={t('justifications.absenceDate', 'Fecha de Ausencia / Actividad *')}
                value={absenceDate}
                error={dateError}
                maxDate={getTodayLocalString()}
                onChange={(dateStr) => {
                  const todayStr = getTodayLocalString();
                  if (dateStr > todayStr) {
                    setDateError(t('justifications.invalidDateDesc', 'Solo se permiten justificaciones hasta la fecha actual.'));
                    showAlert({
                      type: 'warning',
                      title: t('justifications.invalidDate', 'Fecha Inválida'),
                      message: t('justifications.invalidDateDesc', 'Solo se permiten justificaciones hasta la fecha actual.')
                    });
                    return;
                  }
                  setDateError('');
                  setAbsenceDate(dateStr);
                }}
                placeholder={t('dashboard.selectDate', 'Seleccionar fecha')}
              />

              {/* Rango de Horario (Selector Táctil) */}
              {absenceScope === 'hourly' && (
                <View style={styles.timeRangeContainer}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.formLabel}>{t('bulkJustifications.from', 'Desde (Hora Inicio)')}</Text>
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
                    <Text style={styles.formLabel}>{t('bulkJustifications.to', 'Hasta (Hora Fin)')}</Text>
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
                <Text style={styles.formLabel}>{t('justifications.reason', 'Motivo de Ausencia *')}</Text>
                <TextInput
                  style={[styles.formInput, styles.reasonInput]}
                  placeholder={creationMode === 'bulk' ? t('bulkJustifications.futureDateHint', "Ej: Excursión escolar al Museo de Ciencias, torneo deportivo intercolegial...") : t('justifications.reasonPlaceholder', "Escribe detalladamente el motivo de la ausencia...")}
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
                  <Text style={styles.submitBtnText}>
                    {creationMode === 'individual'
                      ? t('justifications.saveAndApprove', 'Guardar y Aprobar')
                      : t('bulkJustifications.submitBulk', { count: selectedStudents.length, defaultValue: `Guardar Justificación Masiva (${selectedStudents.length} Alumnos)` })}
                  </Text>
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
                {statusToSet === 'approved' ? t('coordinatorJustifications.approveRequest', 'Aprobar Solicitud') : t('coordinatorJustifications.rejectRequest', 'Rechazar Solicitud')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <Text style={styles.modalSubtitle}>
                {t('coordinatorJustifications.student', 'Estudiante')}: <Text style={{ fontWeight: 'bold' }}>{selectedReq?.profiles?.full_name}</Text>
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('coordinatorJustifications.observationOptional', 'Observación (Opcional)')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('coordinatorJustifications.decisionObservationPlaceholder', 'Añade un comentario sobre la decisión...')}
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
                  <Text style={styles.submitBtnText}>{t('common.confirm', 'Confirmar')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </BottomModal>

      {/* Time Picker Modal */}
      <BottomModal visible={timePickerVisible} onClose={() => setTimePickerVisible(false)}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {timePickerTarget === 'start' ? t('bulkJustifications.startTimeTitle', 'Hora de Inicio (Desde)') : t('bulkJustifications.endTimeTitle', 'Hora de Fin (Hasta)')}
              </Text>
              <Text style={styles.modalSubtitle}>
                {timePickerTarget === 'start' ? t('bulkJustifications.selectStartTimeHint', 'Selecciona la hora lectiva de inicio') : t('bulkJustifications.selectEndTimeHint', { startTime, defaultValue: `Selecciona la hora de fin (posterior a ${startTime})` })}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setTimePickerVisible(false)}>
              <X size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={{ maxHeight: 300 }} 
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
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
                            title: t('bulkJustifications.invalidSchedule', 'Horario Inválido'),
                            message: t('bulkJustifications.invalidScheduleDesc', 'La hora fin (Hasta) no puede ser anterior ni igual a la hora inicio (Desde).')
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
                {t('coordinatorJustifications.attachedEvidence', 'Evidencia Adjunta')}
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
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{t('common.download', 'Descargar')}</Text>
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
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{t('common.open', 'Abrir')}</Text>
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
                        resizeMode="contain"
                        style={{ width: '100%', height: '100%' }}
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
                        {t('coordinatorJustifications.externalLink', 'Enlace Externo')}
                      </Text>
                      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24 }}>
                        {t('coordinatorJustifications.externalLinkDesc', 'El archivo está disponible mediante un enlace o servicio externo.')}
                      </Text>
                      <TouchableOpacity
                        style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' }}
                        onPress={() => Linking.openURL(info.url)}
                      >
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>{t('coordinatorJustifications.openExternalLink', 'Abrir Enlace Externo')}</Text>
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
                      {t('coordinatorJustifications.attachedDocument', 'Documento Adjunto')}
                    </Text>
                    <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24 }}>
                      {t('coordinatorJustifications.attachedDocumentDesc', 'Comprobante registrado en la solicitud. Puedes abrirlo con una aplicación compatible.')}
                    </Text>
                    {info.url && info.url.length > 20 && (
                      <TouchableOpacity
                        style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                        onPress={() => handleOpenPdfMobile(info.url)}
                      >
                        <Download size={18} color="#FFF" />
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>{t('coordinatorJustifications.openOrDownload', 'Abrir o Descargar')}</Text>
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

const createStyles = (Colors, theme) => {
  const isDark = theme === 'dark';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const bodyBg = isDark ? '#18181B' : '#FFFFFF';

  return StyleSheet.create({
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
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    fontSize: 13,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '700',
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

  // 2-TONE CARD STYLES
  card: {
    backgroundColor: bodyBg,
    borderRadius: BorderRadius.xl,
    marginBottom: 16,
    overflow: 'hidden',
    ...Shadows.card,
  },
  cardPendingBorder: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: isDark ? '#F59E0B' : '#D97706',
  },
  cardSolidBorder: {
    borderStyle: 'solid',
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#000000',
  },

  // HEADER SUPERIOR (TIPO BANNER DE COLOR)
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: cardBorder,
  },
  headerPending: {
    backgroundColor: isDark ? 'rgba(234, 179, 8, 0.18)' : '#FEF3C7',
  },
  headerApproved: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5',
  },
  headerRejected: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FFE4E6',
  },

  studentName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  namePending: {
    color: isDark ? '#FDE047' : '#92400E',
  },
  nameApproved: {
    color: isDark ? '#6EE7B7' : '#065F46',
  },
  nameRejected: {
    color: isDark ? '#FCA5A5' : '#9F1239',
  },
  studentCode: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#64748B',
    marginTop: 2,
    marginBottom: 6,
  },

  // PILL / BADGE DE ESTADO
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgePending: {
    backgroundColor: isDark ? 'rgba(234, 179, 8, 0.3)' : '#FDE68A',
  },
  badgeApproved: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
  },
  badgeRejected: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECDD3',
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusTextPending: {
    color: isDark ? '#FEF08A' : '#78350F',
  },
  statusTextApproved: {
    color: isDark ? '#A7F3D0' : '#064E3B',
  },
  statusTextRejected: {
    color: isDark ? '#FECDD3' : '#881337',
  },

  // CUERPO DE LA TARJETA (TABLA HORIZONTAL LIMPIA)
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoLabel: {
    width: 125, // Separación horizontal generosa
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#64748B',
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#F1F5F9' : '#1E293B',
    lineHeight: 18,
  },

  // BOTÓN DE EVIDENCIA
  evidenceBtn: {
    alignSelf: 'flex-start',
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginTop: 4,
    marginBottom: 8,
  },
  evidenceBtnText: {
    color: isDark ? '#93C5FD' : '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },

  // ACCIONES
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: BorderRadius.lg,
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: isDark ? '#3F3F46' : '#18181B',
    backgroundColor: '#18181B',
  },
  rejectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: Typography.size.sm,
  },
  approveBtn: {
    backgroundColor: Colors.primary,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: Typography.size.sm,
  },
  
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
    fontSize: 16,
    color: Colors.text.primary,
  },
  submitBtn: { padding: 16, borderRadius: BorderRadius.lg, alignItems: 'center' },
  submitApprove: { backgroundColor: Colors.primary },
  submitReject: { 
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: isDark ? '#3F3F46' : '#18181B',
  },
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
  modalContent: { width: '100%', maxHeight: '100%', flexShrink: 1, display: 'flex', flexDirection: 'column', backgroundColor: Colors.card || '#FFF', borderTopLeftRadius: BorderRadius['2xl'] || 24, borderTopRightRadius: BorderRadius['2xl'] || 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 24, paddingBottom: 16 },
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

  // Bulk & Mode Styles
  creationModeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[100] || '#f1f5f9',
    borderRadius: BorderRadius.md || 12,
    padding: 4,
  },
  creationModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.sm || 8,
  },
  creationModeBtnActive: {
    backgroundColor: Colors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  creationModeBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  creationModeBtnTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  selectedStudentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: (Colors.primary || '#0B1956') + '15',
    borderWidth: 1,
    borderColor: Colors.primary || '#0B1956',
    borderRadius: BorderRadius.md || 10,
    padding: 12,
    marginBottom: 8,
  },
  selectedStudentName: {
    fontSize: Typography.size.sm,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  selectedStudentCode: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 2,
  },
  removeSelectedBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
  },
  subFilterLabel: {
    fontSize: Typography.size.xs,
    fontWeight: 'bold',
    color: Colors.text.secondary,
    marginTop: 6,
    marginBottom: 4,
  },
  filterScroll: {
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full || 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
  },
  quickActionDanger: {
    backgroundColor: '#fee2e2',
  },
  quickActionText: {
    fontSize: Typography.size.xs,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  selectionCounterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: (Colors.primary || '#0B1956') + '12',
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: (Colors.primary || '#0B1956') + '30',
  },
  selectionCounterText: {
    fontSize: Typography.size.sm,
    color: Colors.primary,
  },
  selectedChipsScroll: {
    flexDirection: 'row',
    marginBottom: 10,
    maxHeight: 38,
  },
  studentSelectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    marginRight: 6,
  },
  studentSelectedChipText: {
    fontSize: Typography.size.xs,
    color: '#FFF',
    fontWeight: '600',
    maxWidth: 160,
  },
  studentCheckboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
    backgroundColor: Colors.card,
  },
  studentCheckboxItemActive: {
    backgroundColor: (Colors.primary || '#0B1956') + '08',
  },
  checkboxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
};

