import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Modal 
} from 'react-native';
import api from '../src/utils/api';
import {  Book, ChevronRight, FileText, CheckCircle, Trash2, Clock, PlusCircle, AlertTriangle, ShieldCheck , ArrowLeft } from 'lucide-react-native';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';

export default function TeacherGradesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors: Colors } = useTheme();
  const { showAlert, showConfirm } = useAlert();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  
  const [schedules, setSchedules] = useState([]);
  const [activities, setActivities] = useState([]);
  const [periodsStatus, setPeriodsStatus] = useState([]);
  
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [students, setStudents] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());

  // Ticket Modal State
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [ticketReason, setTicketReason] = useState('');
  const [selectedDays, setSelectedDays] = useState(1); // 1, 3, or 7
  const [submittingTicket, setSubmittingTicket] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Update timer ticker every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [schedRes, actRes, periodsRes] = await Promise.all([
        api.get('/teacher/schedule'),
        api.get('/teacher/activities'),
        api.get('/teacher/periods-status').catch(() => ({ data: [] }))
      ]);

      const uniqueClasses = [];
      schedRes.data.forEach(s => {
        if (!uniqueClasses.find(c => c.subject_id === s.subject_id && c.grade === s.grade && c.section === s.section)) {
          uniqueClasses.push(s);
        }
      });
      
      setSchedules(uniqueClasses);
      setActivities(actRes.data);
      setPeriodsStatus(periodsRes.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: 'No se pudieron cargar las clases o actividades.'
      });
    } finally {
      setLoading(false);
    }
  };

  const currentPeriodInfo = useMemo(() => {
    return periodsStatus.find(p => p.period_number === selectedPeriod) || null;
  }, [periodsStatus, selectedPeriod]);

  // Calculate live countdown string
  const countdownText = useMemo(() => {
    if (!currentPeriodInfo || !currentPeriodInfo.effective_deadline) {
      return null;
    }
    const deadline = new Date(currentPeriodInfo.effective_deadline);
    const diff = deadline.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Plazo finalizado';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const pad = (n) => n.toString().padStart(2, '0');

    if (days > 0) {
      return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    }
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }, [currentPeriodInfo, now]);

  const canSubmitGrades = useMemo(() => {
    if (!currentPeriodInfo) return true;
    return currentPeriodInfo.can_submit;
  }, [currentPeriodInfo]);

  const loadStudents = async (activity) => {
    setSelectedActivity(activity);
    setLoading(true);
    try {
      const response = await api.get('/teacher/grades-by-activity', {
        params: { 
          subject_id: selectedClass.subject_id, 
          activity_id: activity.id,
          period: selectedPeriod,
          grade: selectedClass.grade,
          section: selectedClass.section
        }
      });
      setStudents(response.data);
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: 'No se pudieron cargar los estudiantes'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId, newValue) => {
    const val = newValue.replace(/[^0-9.]/g, ''); // Solo números y punto
    setStudents(students.map(s => 
      s.id === studentId ? { ...s, grade: val } : s
    ));
  };

  const saveChanges = async () => {
    if (!canSubmitGrades) {
      showAlert({
        type: 'warning',
        title: t('dashboard.error', 'Plazo Vencido'),
        message: 'El periodo de ingreso de notas ha finalizado. No se pueden guardar calificaciones.'
      });
      return;
    }

    // Validar rango 0.00 a 10.00 en cada estudiante
    for (const s of students) {
      const num = parseFloat(s.grade);
      if (isNaN(num) || num < 0 || num > 10) {
        showAlert({
          type: 'error',
          title: t('dashboard.error', 'Error de Validación'),
          message: `La nota para ${s.full_name} (${s.grade}) debe estar entre 0.00 y 10.00.`
        });
        return;
      }
    }

    setSaving(true);
    try {
      const grades = students.map(s => ({
        student_id: s.id,
        subject_id: selectedClass.subject_id,
        activity_id: selectedActivity.id,
        grade: parseFloat(s.grade) || 0
      }));
      await api.post('/teacher/grades', { grades, period: selectedPeriod });
      showAlert({
        type: 'success',
        title: t('dashboard.success', '¡Notas Guardadas!'),
        message: 'Calificaciones registradas correctamente en el sistema.'
      });
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: error.response?.data?.error || 'No se pudieron guardar las notas'
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteGrade = async (gradeId) => {
    if (!canSubmitGrades) {
      showAlert({
        type: 'warning',
        title: 'Plazo Vencido',
        message: 'El periodo de ingreso de notas ha finalizado.'
      });
      return;
    }

    showConfirm({
      type: 'danger',
      title: 'Eliminar Nota',
      message: '¿Estás seguro de que deseas eliminar esta nota?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await api.delete(`/teacher/grades/${gradeId}`);
          setStudents(students.map(s => s.grade_id === gradeId ? { ...s, grade: 0, grade_id: null } : s));
          showAlert({
            type: 'success',
            title: '¡Eliminada!',
            message: 'Nota eliminada correctamente'
          });
        } catch (error) {
          console.error(error);
          showAlert({
            type: 'error',
            title: 'Error',
            message: error.response?.data?.error || 'No se pudo eliminar la nota'
          });
        }
      }
    });
  };

  const handleCreateTicket = async () => {
    if (!ticketReason.trim()) {
      showAlert({
        type: 'warning',
        title: 'Campo Requerido',
        message: 'Por favor ingresa una justificación o razón para el tiempo extra.'
      });
      return;
    }

    try {
      setSubmittingTicket(true);
      await api.post('/teacher/tickets', {
        period: selectedPeriod,
        reason: ticketReason.trim(),
        days_requested: selectedDays
      });

      showAlert({
        type: 'success',
        title: 'Ticket Enviado',
        message: 'Tu solicitud de días extra ha sido enviada al coordinador de tu nivel. Recibirás una notificación cuando sea procesada.'
      });
      setTicketModalVisible(false);
      setTicketReason('');
      fetchInitialData();
    } catch (error) {
      console.error('Error creating ticket:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || 'No se pudo crear el ticket de extensión.'
      });
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Back Navigation Handlers
  const handleBackPress = () => {
    if (selectedActivity) {
      setSelectedActivity(null);
    } else if (selectedClass) {
      setSelectedClass(null);
    }
  };

  const getHeaderTitles = () => {
    if (selectedActivity && selectedClass) {
      return {
        title: selectedActivity.name,
        subtitle: `${selectedClass.grade}º ${selectedClass.section} — ${selectedClass.subjects?.name || t('dashboard.subject', 'Materia')}`
      };
    }
    if (selectedClass) {
      return {
        title: `${selectedClass.grade}º ${selectedClass.section} — ${selectedClass.subjects?.name || t('dashboard.subject', 'Materia')}`,
        subtitle: `${t('teacherGrades.activitySelection', 'Selección de Actividades')} (${t('dashboard.period', 'Periodo')} ${selectedPeriod})`
      };
    }
    return {
      title: t('titles.grades', 'Registro de Notas'),
      subtitle: t('teacherGrades.subtitle', 'Evaluación y control de calificaciones por asignatura')
    };
  };

  const headerInfo = getHeaderTitles();

  const renderStudentItem = ({ item, index }) => (
    <View style={styles.studentCard}>
      <Text style={styles.studentIndex}>{index + 1}</Text>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.full_name}</Text>
        <Text style={styles.studentCode}>{item.institutional_code}</Text>
      </View>
      <TextInput
        style={[styles.gradeInput, !canSubmitGrades && styles.gradeInputDisabled]}
        keyboardType="numeric"
        placeholder="0.00"
        editable={canSubmitGrades}
        value={item.grade !== undefined && item.grade !== null ? item.grade.toString() : ''}
        onChangeText={(val) => handleGradeChange(item.id, val)}
      />
      {item.grade_id && canSubmitGrades && (
        <TouchableOpacity 
          style={styles.deleteBtn}
          onPress={() => deleteGrade(item.grade_id)}
        >
          <Trash2 size={18} color={Colors.status.absent} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderContent = () => {
    if (!selectedClass) {
      return (
        <FlatList
          data={schedules}
          keyExtractor={(item, idx) => `${item.subject_id}-${item.grade}-${item.section}-${idx}`}
          contentContainerStyle={styles.content}
          ListHeaderComponent={<Text style={styles.sectionTitle}>{t('teacherGrades.selectClass', 'Seleccione Clase')}</Text>}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('teacherGrades.noAssignedClasses', 'No tienes clases asignadas.')}</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => setSelectedClass(item)}
            >
              <View style={styles.iconBox}>
                <Book size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.subjects?.name || t('dashboard.subject', 'Materia')}</Text>
                <Text style={styles.cardDesc}>{item.grade}º {item.section}</Text>
              </View>
              <ChevronRight size={24} color={Colors.text.muted} />
            </TouchableOpacity>
          )}
        />
      );
    }

    if (!selectedActivity) {
      return (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View>
              <Text style={styles.sectionTitle}>{t('teacherGrades.selectActivity', 'Actividades de Evaluación')}</Text>
              <Text style={styles.subTitle}>{t('dashboard.period', 'Periodo')} {selectedPeriod}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => loadStudents(item)}
            >
              <View style={styles.iconBox}>
                <FileText size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardDesc}>{t('dashboard.value', 'Ponderación')}: {item.percentage}%</Text>
              </View>
              <ChevronRight size={24} color={Colors.text.muted} />
            </TouchableOpacity>
          )}
        />
      );
    }

    return (
      <FlatList
        data={students}
        renderItem={renderStudentItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.studentHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>{selectedActivity.name}</Text>
                <Text style={styles.subTitle}>{t('teacherGrades.gradeInputTitle', 'Ingreso de Calificaciones')}</Text>
              </View>
            </View>
            {loading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />}
          </View>
        }
        ListEmptyComponent={!loading && <Text style={styles.emptyText}>{t('class.noStudentsInClass', 'No hay estudiantes en esta clase.')}</Text>}
        ListFooterComponent={
          students.length > 0 && canSubmitGrades && (
            <TouchableOpacity style={styles.saveBtn} onPress={saveChanges} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <>
                  <CheckCircle color={Colors.text.inverse} size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>{t('teacherGrades.saveGrades', 'Guardar Notas')}</Text>
                </>
              )}
            </TouchableOpacity>
          )
        }
      />
    );
  };

  if (loading && schedules.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={styles.container}
    >
      <Stack.Screen 
        options={{
          headerLeft: () => {
            const canGoBackInternally = selectedClass !== null || selectedActivity !== null;
            return (
              <TouchableOpacity
                onPress={() => {
                  if (canGoBackInternally) {
                    handleBackPress();
                  } else {
                    if (router.canGoBack()) router.back();
                    else router.replace('/home');
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 8, marginLeft: 4 }}
              >
                <ArrowLeft size={24} color={Colors.text.headerTxtC || '#FFF'} />
              </TouchableOpacity>
            );
          }
        }}
      />
      <PageHeader 
        title={headerInfo.title} 
        subtitle={headerInfo.subtitle}
      />

      {/* Period Selection & Countdown Banner */}
      <View style={styles.topControlContainer}>
        {!selectedClass && (
          <View style={styles.periodTabs}>
            {[1, 2, 3, 4].map(p => (
              <TouchableOpacity 
                key={p} 
                onPress={() => setSelectedPeriod(p)}
                style={[styles.periodTab, selectedPeriod === p && styles.periodTabActive]}
              >
                <Text style={[styles.periodTabText, selectedPeriod === p && styles.periodTabTextActive]}>
                  P{p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Countdown Banner */}
        {currentPeriodInfo && (
          <View style={[
            styles.timerCard,
            canSubmitGrades && !currentPeriodInfo.is_extended && styles.timerCardActive,
            canSubmitGrades && currentPeriodInfo.is_extended && styles.timerCardExtended,
            !canSubmitGrades && styles.timerCardExpired
          ]}>
            <View style={styles.timerRow}>
              {canSubmitGrades && currentPeriodInfo.is_extended ? (
                <ShieldCheck size={20} color="#166534" style={{ marginRight: 8 }} />
              ) : canSubmitGrades ? (
                <Clock size={20} color="#1e40af" style={{ marginRight: 8 }} />
              ) : (
                <AlertTriangle size={20} color="#991b1b" style={{ marginRight: 8 }} />
              )}
              
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.timerTitle,
                  canSubmitGrades && currentPeriodInfo.is_extended && styles.textExtended,
                  canSubmitGrades && !currentPeriodInfo.is_extended && styles.textActive,
                  !canSubmitGrades && styles.textExpired
                ]}>
                  {canSubmitGrades && currentPeriodInfo.is_extended && t('teacherGrades.extendedPeriod', '🟢 PLAZO EXTENDIDO APROBADO')}
                  {canSubmitGrades && !currentPeriodInfo.is_extended && t('teacherGrades.timeRemaining', '⏱️ TIEMPO RESTANTE DE INGRESO')}
                  {!canSubmitGrades && t('teacherGrades.periodClosed', '🔴 INGRESO DE NOTAS CERRADO')}
                </Text>
                
                {countdownText && (
                  <Text style={[
                    styles.timerCountdown,
                    canSubmitGrades && currentPeriodInfo.is_extended && styles.textExtended,
                    canSubmitGrades && !currentPeriodInfo.is_extended && styles.textActive,
                    !canSubmitGrades && styles.textExpired
                  ]}>
                    {canSubmitGrades 
                      ? t('teacherGrades.closesIn', 'Cierra en: {{time}}', { time: countdownText })
                      : t('teacherGrades.periodExpired', 'La fecha de este periodo ya finalizó.')}
                  </Text>
                )}
              </View>
            </View>

            {/* Ticket Request Option if Expired */}
            {!canSubmitGrades && (
              <View style={styles.ticketSection}>
                {currentPeriodInfo.pending_ticket ? (
                  <View style={styles.pendingTicketNotice}>
                    <Clock size={16} color="#b45309" style={{ marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingTicketTitle}>{t('teacherGrades.pendingTicketTitle', 'Ticket Pendiente de Revisión')}</Text>
                      <Text style={styles.pendingTicketText}>
                        {t('teacherGrades.pendingTicketText', 'Solicitaste +{{days}} día(s). Esperando decisión del coordinador.', { days: currentPeriodInfo.pending_ticket.days_requested })}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.createTicketBtn}
                    onPress={() => setTicketModalVisible(true)}
                  >
                    <PlusCircle size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.createTicketBtnText}>{t('teacherGrades.createTicketBtn', 'Crear Ticket de Extensión')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {renderContent()}

      {/* Modal para Crear Ticket de Extensión */}
      <BottomModal visible={ticketModalVisible} onClose={() => setTicketModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('teacherGrades.requestExtraTime', 'Solicitar Tiempo Extra')}</Text>
            <Text style={styles.modalSubtitle}>{t('dashboard.period', 'Periodo')} {selectedPeriod}</Text>

            <Text style={styles.fieldLabel}>{t('teacherGrades.ticketReasonLabel', 'Motivo de la solicitud (Requerido):')}</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder={t('teacherGrades.ticketReasonPlaceholder', 'Explica el motivo por el cual requieres días adicionales para ingresar las notas...')}
              value={ticketReason}
              onChangeText={setTicketReason}
            />

            <Text style={styles.fieldLabel}>{t('teacherGrades.ticketDaysLabel', 'Días extra requeridos (A partir de aprobación):')}</Text>
            <View style={styles.daysSelector}>
              {[1, 3, 7].map(days => (
                <TouchableOpacity
                  key={days}
                  style={[styles.dayOptionBtn, selectedDays === days && styles.dayOptionBtnActive]}
                  onPress={() => setSelectedDays(days)}
                >
                  <Text style={[styles.dayOptionText, selectedDays === days && styles.dayOptionTextActive]}>
                    {days} {days === 1 ? 'Día' : 'Días'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity 
                style={styles.cancelModalBtn}
                onPress={() => setTicketModalVisible(false)}
                disabled={submittingTicket}
              >
                <Text style={styles.cancelModalBtnText}>{t('dashboard.cancel', 'Cancelar')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.submitModalBtn}
                onPress={handleCreateTicket}
                disabled={submittingTicket}
              >
                {submittingTicket ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitModalBtnText}>{t('teacherGrades.sendTicketBtn', 'Enviar Ticket')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BottomModal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  topControlContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  periodTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    marginBottom: Spacing.lg,
  },
  periodTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  periodTabActive: { backgroundColor: Colors.primary },
  periodTabText: { color: Colors.text.muted, fontWeight: Typography.weight.bold, fontSize: Typography.size.sm },
  periodTabTextActive: { color: '#FFF' },
  
  // Timer Card Styles
  timerCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  timerCardActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  timerCardExtended: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  timerCardExpired: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerCountdown: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    marginTop: 2,
  },
  textActive: { color: '#1e40af' },
  textExtended: { color: '#166534' },
  textExpired: { color: '#991b1b' },
  
  ticketSection: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: Spacing.md,
  },
  createTicketBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
  },
  createTicketBtnText: {
    color: '#FFF',
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.sm,
  },
  pendingTicketNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingTicketTitle: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#b45309',
  },
  pendingTicketText: {
    fontSize: Typography.size.xs,
    color: '#78350f',
  },

  content: { padding: Spacing.lg, paddingTop: Spacing.xs },
  sectionTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.primary, marginTop: Spacing.xs, marginBottom: Spacing.xs },
  subTitle: { fontSize: Typography.size.sm, color: Colors.text.muted, marginTop: 4, marginBottom: Spacing.xl },
  studentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: Colors.text.muted, marginTop: Spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: Colors.gray[100] || '#f1f5f9',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.primary },
  cardDesc: { fontSize: Typography.size.sm, color: Colors.text.muted, marginTop: 4 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  studentIndex: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.text.muted, width: 24 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.primary },
  studentCode: { fontSize: Typography.size.xs, color: Colors.text.muted },
  gradeInput: {
    width: 60,
    height: 40,
    backgroundColor: Colors.gray[50] || '#f8fafc',
    borderRadius: BorderRadius.sm,
    textAlign: 'center',
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
  },
  gradeInputDisabled: {
    backgroundColor: Colors.gray[200] || '#e2e8f0',
    color: Colors.text.muted,
  },
  deleteBtn: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  saveBtn: {
    backgroundColor: Colors.status.approved,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
    ...Shadows.elevated,
  },
  saveBtnText: { color: Colors.text.inverse, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },

  // Modal Styles
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
    maxHeight: '90%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius['2xl'] || 24,
    borderTopRightRadius: BorderRadius['2xl'] || 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.xl,
    ...Shadows.elevated,
  },
  modalTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
  },
  modalSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: Colors.gray[50] || '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: Spacing.lg,
  },
  daysSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  dayOptionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray[300] || '#cbd5e1',
    backgroundColor: Colors.gray[50] || '#f8fafc',
  },
  dayOptionBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayOptionText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  dayOptionTextActive: {
    color: '#FFF',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
  },
  cancelModalBtnText: {
    color: Colors.text.muted,
    fontWeight: Typography.weight.bold,
  },
  submitModalBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitModalBtnText: {
    color: '#FFF',
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.sm,
  }
});
