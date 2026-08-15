import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard 
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';
import { 
  BookOpen, 
  Check, 
  X, 
  ShieldAlert, 
  Award, 
  FileText, 
  ChevronDown, 
  Search, 
  CheckCheck, 
  UserX, 
  ChevronRight
} from 'lucide-react-native';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../src/context/AlertContext';
import { useAuth } from '../src/context/AuthContext';
import PageHeader from '../src/components/PageHeader';

export default function ClassScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const { showAlert } = useAlert();
  const { profile } = useAuth();
  const styles = useMemo(() => createStyles(Colors, theme), [Colors, theme]);
  const params = useLocalSearchParams();

  const [schedules, setSchedules] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingConduct, setSavingConduct] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeScheduleInfo, setActiveScheduleInfo] = useState(null);

  // Conduct codes modal
  const [conductModalVisible, setConductModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [conductCodes, setConductCodes] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [observation, setObservation] = useState('');
  const [codeDropdownOpen, setCodeDropdownOpen] = useState(false);

  useEffect(() => {
    fetchSchedulesAndCodes();
  }, []);

  const fetchSchedulesAndCodes = async () => {
    setLoading(true);
    try {
      const isCoord = profile?.role === 'coordinator';
      const codesEndpoint = isCoord ? '/coordinator/conduct-codes' : '/teacher/conduct-codes';

      let scheduleList = [];
      let uniqueClasses = [];
      let codeList = [];

      if (isCoord) {
        try {
          const classroomsRes = await api.get('/coordinator/classrooms');
          const classrooms = Array.isArray(classroomsRes.data) ? classroomsRes.data : [];
          uniqueClasses = classrooms.map((c, i) => ({
            id: `coord-cls-${c.grade}-${c.section}`,
            grade: c.grade,
            section: c.section,
            subject_id: `cls-${c.grade}-${c.section}`,
            subjects: { name: `${c.grade}º '${c.section}'` }
          }));
        } catch (clsErr) {
          console.error('Error fetching coordinator classrooms:', clsErr);
        }
      } else {
        try {
          const schedRes = await api.get('/teacher/schedule');
          scheduleList = Array.isArray(schedRes.data) ? schedRes.data : [];
          
          scheduleList.forEach(s => {
            if (!uniqueClasses.find(c => c.subject_id === s.subject_id && c.grade === s.grade && c.section === s.section)) {
              uniqueClasses.push(s);
            }
          });
        } catch (sErr) {
          console.error('Error fetching teacher schedule:', sErr);
        }
      }

      try {
        const codesRes = await api.get(codesEndpoint);
        codeList = Array.isArray(codesRes.data?.data) ? codesRes.data.data : (Array.isArray(codesRes.data) ? codesRes.data : []);
      } catch (cErr) {
        console.error('Error fetching conduct codes:', cErr);
      }

      setSchedules(uniqueClasses);
      setConductCodes(codeList);

      // Priority 1: Check if navigated from Salones module with params (grade & section)
      if (params?.grade && params?.section) {
        const matchingClass = uniqueClasses.find(
          c => c.grade.toString() === params.grade.toString() && c.section.toUpperCase() === params.section.toUpperCase()
        );
        if (matchingClass) {
          await handleSelectClass(matchingClass);
          return;
        } else {
          const syntheticClass = {
            grade: params.grade,
            section: params.section,
            subject_id: `cls-${params.grade}-${params.section}`,
            subjects: { name: `${params.grade}º '${params.section}'` }
          };
          await handleSelectClass(syntheticClass);
          return;
        }
      }

      // Check active class by current day & time for teachers
      if (!isCoord && scheduleList.length > 0) {
        const now = new Date();
        const currentDay = now.getDay() || 7;
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTime = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}:00`;

        const active = scheduleList.find(s => {
          return parseInt(s.day_of_week) === currentDay && 
                 s.start_time <= currentTime && 
                 s.end_time >= currentTime;
        });

        if (active) {
          setActiveScheduleInfo(active);
          await handleSelectClass(active);
          return;
        }
      }

      // Si hay salones disponibles y ninguno está seleccionado, seleccionar el primero
      if (uniqueClasses.length > 0) {
        await handleSelectClass(uniqueClasses[0]);
      }
    } catch (error) {
      console.error('Error fetching schedules or codes:', error);
      showAlert({
        type: 'error',
        title: 'Error de Conexión',
        message: 'No se pudieron cargar los datos de la clase.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    setLoading(true);
    setSearchQuery('');
    try {
      const studentEndpoint = profile?.role === 'coordinator' ? '/coordinator/students' : '/teacher/class-students';
      const response = await api.get(studentEndpoint, {
        params: { grade: cls.grade, section: cls.section }
      });
      const mapped = (response.data || []).map(s => ({ ...s, status: 'present' }));
      setStudents(mapped);
    } catch (error) {
      console.error('Error loading students:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los alumnos de la clase.'
      });
      setSelectedClass(null);
    } finally {
      setLoading(false);
    }
  };

  const isSelectedClassActive = useMemo(() => {
    if (profile?.role === 'coordinator') return true;
    if (!selectedClass || !activeScheduleInfo) return false;
    return (
      selectedClass.subject_id === activeScheduleInfo.subject_id &&
      selectedClass.grade.toString() === activeScheduleInfo.grade.toString() &&
      selectedClass.section.toUpperCase() === activeScheduleInfo.section.toUpperCase()
    );
  }, [selectedClass, activeScheduleInfo, profile]);

  const toggleStatus = (id) => {
    if (!isSelectedClassActive) {
      showAlert({
        type: 'warning',
        title: 'Clase no activa',
        message: 'Solo se puede registrar asistencia durante la hora correspondiente a la clase activa en curso. Puedes consultar la lista de alumnos y aplicar códigos de conducta.'
      });
      return;
    }
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'present' ? 'absent' : 'present' };
      }
      return s;
    }));
  };

  const markAllStatus = (statusToSet) => {
    if (!isSelectedClassActive) {
      showAlert({
        type: 'warning',
        title: 'Clase no activa',
        message: 'Solo se puede registrar asistencia durante la hora correspondiente a la clase activa en curso. Puedes consultar la lista de alumnos y aplicar códigos de conducta.'
      });
      return;
    }
    setStudents(prev => prev.map(s => ({ ...s, status: statusToSet })));
  };

  const handleSaveAttendance = async () => {
    if (!isSelectedClassActive) {
      showAlert({
        type: 'warning',
        title: 'Clase no activa',
        message: 'Solo se puede registrar asistencia durante la hora correspondiente a la clase activa en curso.'
      });
      return;
    }
    if (students.length === 0) return;
    setSaving(true);
    try {
      const attendances = students.map(s => ({
        student_id: s.id,
        subject_id: selectedClass.subject_id,
        status: s.status,
        date: new Date().toISOString()
      }));
      await api.post('/teacher/attendance', { attendances });
      showAlert({
        type: 'success',
        title: '¡Asistencia Guardada!',
        message: `Asistencia de ${students.length} estudiantes registrada correctamente.`
      });
    } catch (error) {
      console.error('Error saving attendance:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || 'No se pudo guardar la asistencia.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenConductModal = (student) => {
    setSelectedStudent(student);
    setSelectedCode('');
    setObservation('');
    setCodeDropdownOpen(false);
    setConductModalVisible(true);
  };

  const handleSaveConductRecord = async () => {
    if (!selectedCode) {
      showAlert({
        type: 'warning',
        title: 'Campo Requerido',
        message: 'Selecciona un código de conducta de la lista.'
      });
      return;
    }

    setSavingConduct(true);
    try {
      const endpoint = profile?.role === 'coordinator' ? '/coordinator/conduct-records' : '/teacher/conduct-records';
      await api.post(endpoint, {
        student_id: selectedStudent.id,
        code_id: selectedCode,
        observation: observation
      });
      showAlert({
        type: 'success',
        title: 'Reporte Registrado',
        message: `Código de conducta aplicado a ${selectedStudent.full_name}.`
      });
      setConductModalVisible(false);
    } catch (error) {
      console.error('Error saving conduct record:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || 'No se pudo guardar el reporte de conducta.'
      });
    } finally {
      setSavingConduct(false);
    }
  };

  const getConductCodeLabel = (id) => {
    const found = conductCodes.find(c => c.id === id);
    return found ? `${found.code} - ${found.name}` : 'Seleccionar Código de Conducta';
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => 
      s.full_name?.toLowerCase().includes(q) || 
      s.institutional_code?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const attendanceStats = useMemo(() => {
    const presentCount = students.filter(s => s.status === 'present').length;
    const absentCount = students.length - presentCount;
    return { presentCount, absentCount };
  }, [students]);

  if (loading && !selectedClass && schedules.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader 
        title={selectedClass ? `${selectedClass.grade}º '${selectedClass.section}' — ${selectedClass.subjects?.name || 'Clase'}` : 'Clase Activa'}
        subtitle={selectedClass ? 'Control de asistencia y conducta del aula' : 'Selección de aula y toma de asistencia en tiempo real'}
        showBack={selectedClass !== null}
        onBackPress={() => setSelectedClass(null)}
      />

      {!selectedClass ? (
        // --- Schedule / Class Selection View ---
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Active Class Live Banner */}
          {activeScheduleInfo ? (
            <TouchableOpacity 
              style={styles.activeLiveCard}
              onPress={() => handleSelectClass(activeScheduleInfo)}
              activeOpacity={0.9}
            >
              <View style={styles.liveBadgeRow}>
                <View style={styles.liveIndicatorDot} />
                <Text style={styles.liveBadgeText}>CLASE EN CURSO AHORA</Text>
              </View>
              <Text style={styles.liveSubjectTitle}>
                {activeScheduleInfo.subjects?.name || 'Materia En Curso'}
              </Text>
              <Text style={styles.liveSubjectDetail}>
                {activeScheduleInfo.grade}º Grado '{activeScheduleInfo.section}' — {activeScheduleInfo.start_time?.substring(0, 5)} a {activeScheduleInfo.end_time?.substring(0, 5)}
              </Text>
              <View style={styles.liveActionRow}>
                <Text style={styles.liveActionText}>Ingresar a Asistencia y Códigos</Text>
                <ChevronRight size={18} color="#FFF" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.activeLiveCard, { backgroundColor: theme === 'dark' ? Colors.card : '#f8fafc', borderWidth: 1, borderColor: Colors.gray[200] }]}>
              <View style={styles.liveBadgeRow}>
                <Text style={[styles.liveBadgeText, { color: Colors.text.muted }]}>ESTADO ACTUAL</Text>
              </View>
              <Text style={[styles.liveSubjectTitle, { color: Colors.text.primary, fontSize: 18 }]}>
                No tienes clase asignada en este momento
              </Text>
              <Text style={[styles.liveSubjectDetail, { color: Colors.text.muted, marginTop: 6 }]}>
                En el horario actual no hay ninguna clase programada en tu horario docente.
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Todas Tus Clases Asignadas</Text>

          {schedules.length === 0 ? (
            <View style={styles.emptyContainer}>
              <BookOpen size={48} color={Colors.text.muted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>No tienes clases asignadas en el sistema.</Text>
            </View>
          ) : (
            schedules.map((cls, idx) => (
              <TouchableOpacity
                key={cls.id || `${cls.subject_id}-${cls.grade}-${cls.section}-${idx}`}
                style={styles.classCard}
                onPress={() => handleSelectClass(cls)}
                activeOpacity={0.8}
              >
                <View style={styles.classIconBox}>
                  <BookOpen size={24} color={Colors.primary} />
                </View>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{cls.subjects?.name || 'Asignatura'}</Text>
                  <Text style={styles.classDetail}>{cls.grade}º Grado — Sección '{cls.section}'</Text>
                </View>
                <View style={styles.chevronBox}>
                  <ChevronRight size={20} color={Colors.text.muted} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        // --- Attendance List View ---
        <View style={styles.flex1}>
          {/* Stats Bar & Quick Actions */}
          <View style={styles.statsBar}>
            <View style={styles.statsChips}>
              <View style={[styles.statChip, styles.statChipPresent]}>
                <Check size={14} color="#166534" style={{ marginRight: 4 }} />
                <Text style={styles.statTextPresent}>{attendanceStats.presentCount} Presentes</Text>
              </View>
              <View style={[styles.statChip, styles.statChipAbsent]}>
                <X size={14} color="#991b1b" style={{ marginRight: 4 }} />
                <Text style={styles.statTextAbsent}>{attendanceStats.absentCount} Ausentes</Text>
              </View>
            </View>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity 
                style={[styles.quickBtn, styles.quickBtnPresent]} 
                onPress={() => markAllStatus('present')}
              >
                <CheckCheck size={16} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.quickBtnText}>Todos Asiste</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.quickBtn, styles.quickBtnAbsent]} 
                onPress={() => markAllStatus('absent')}
              >
                <UserX size={16} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.quickBtnText}>Todos Falta</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={18} color={Colors.text.muted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar estudiante por nombre o código..."
              placeholderTextColor={Colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={Colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.studentsList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.studentCard}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>
                      {item.full_name ? item.full_name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>

                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName} numberOfLines={1}>{item.full_name}</Text>
                    <Text style={styles.studentCode}>{item.institutional_code || 'S/C'}</Text>
                  </View>

                  <View style={styles.studentActions}>
                    <TouchableOpacity 
                      style={[
                        styles.statusBadgeBtn, 
                        item.status === 'present' ? styles.statusBadgePresent : styles.statusBadgeAbsent
                      ]}
                      onPress={() => toggleStatus(item.id)}
                      activeOpacity={0.8}
                    >
                      {item.status === 'present' ? (
                        <>
                          <Check size={14} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.statusBadgeText}>Asiste</Text>
                        </>
                      ) : (
                        <>
                          <X size={14} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.statusBadgeText}>Falta</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.conductBtn}
                      onPress={() => handleOpenConductModal(item)}
                    >
                      <ShieldAlert size={18} color="#d97706" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No se encontraron estudiantes con ese nombre.' : 'No hay estudiantes registrados en este curso.'}
                  </Text>
                </View>
              }
            />
          )}

          {students.length > 0 && (
            <View style={styles.footer}>
              {isSelectedClassActive ? (
                <TouchableOpacity 
                  style={styles.saveBtn} 
                  onPress={handleSaveAttendance}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <CheckCheck color="#FFF" size={20} style={{ marginRight: 8 }} />
                      <Text style={styles.saveBtnText}>Guardar Asistencia</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={{ backgroundColor: theme === 'dark' ? Colors.card : '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.gray[200], alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: Colors.text.muted, textAlign: 'center', fontWeight: '600' }}>
                    Modo Consulta y Reporte de Conducta (La asistencia solo se guarda durante la clase activa en curso)
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Conduct Modal */}
      <Modal visible={conductModalVisible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setConductModalVisible(false)}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldAlert size={22} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Reportar Conducta</Text>
              </View>
              <TouchableOpacity onPress={() => setConductModalVisible(false)} style={styles.closeHeaderBtn}>
                <X size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={styles.studentBannerCard}>
                <Text style={styles.studentLabelTitle}>Estudiante Seleccionado:</Text>
                <Text style={styles.studentNameHighlight}>{selectedStudent?.full_name}</Text>
                <Text style={styles.studentCodeHighlight}>{selectedStudent?.institutional_code || 'S/C'}</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Código de Conducta *</Text>
                <TouchableOpacity 
                  style={styles.dropdownTrigger} 
                  onPress={() => setCodeDropdownOpen(!codeDropdownOpen)}
                >
                  <Award size={18} color={Colors.primary} style={styles.inputIcon} />
                  <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                    {getConductCodeLabel(selectedCode)}
                  </Text>
                  <ChevronDown size={18} color={Colors.text.muted} />
                </TouchableOpacity>

                {codeDropdownOpen && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                      {conductCodes.map(c => (
                        <TouchableOpacity
                          key={c.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedCode(c.id);
                            setCodeDropdownOpen(false);
                          }}
                        >
                          <Text style={styles.dropdownItemCode}>{c.code}</Text>
                          <Text style={styles.dropdownItemText}>{c.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Observaciones / Detalle (Opcional)</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <FileText size={18} color={Colors.text.muted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Escribe aquí los detalles del reporte de conducta..."
                    placeholderTextColor={Colors.text.muted}
                    multiline
                    numberOfLines={4}
                    value={observation}
                    onChangeText={setObservation}
                    style={[styles.input, styles.textArea]}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleSaveConductRecord}
              disabled={savingConduct}
            >
              {savingConduct ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Aplicar Código de Conducta</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.lg, paddingBottom: 60 },
  sectionTitle: { 
    fontSize: Typography.size.md, 
    fontWeight: Typography.weight.bold, 
    color: Colors.primary, 
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
    letterSpacing: 0.2
  },

  // Active Live Banner
  activeLiveCard: {
    backgroundColor: '#0B1956',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.elevated,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f87171',
    letterSpacing: 0.8,
  },
  liveSubjectTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: '#FFF',
  },
  liveSubjectDetail: {
    fontSize: Typography.size.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    marginBottom: 14,
  },
  liveActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  liveActionText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: '#FFF',
    marginRight: 4,
  },

  // Class Selection List
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[200],
  },
  classIconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: theme === 'dark' ? Colors.gray[100] : '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  classInfo: { flex: 1 },
  className: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.primary },
  classDetail: { fontSize: Typography.size.sm, color: Colors.text.muted, marginTop: 2 },
  chevronBox: { padding: 4 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.text.muted, textAlign: 'center', fontSize: Typography.size.sm },

  // Stats & Quick Actions Bar
  statsBar: {
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200] || '#e2e8f0',
  },
  statsChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statChipPresent: { backgroundColor: '#dcfce7' },
  statChipAbsent: { backgroundColor: '#fee2e2' },
  statTextPresent: { fontSize: 11, fontWeight: Typography.weight.bold, color: '#166534' },
  statTextAbsent: { fontSize: 11, fontWeight: Typography.weight.bold, color: '#991b1b' },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
  },
  quickBtnPresent: { backgroundColor: '#16a34a' },
  quickBtnAbsent: { backgroundColor: '#dc2626' },
  quickBtnText: { color: '#FFF', fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.primary },

  // Student Card Items
  studentsList: { padding: Spacing.lg, paddingBottom: 90 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[200],
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { color: '#FFF', fontWeight: 'bold', fontSize: Typography.size.md },
  studentInfo: { flex: 1, marginRight: Spacing.xs },
  studentName: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  studentCode: { fontSize: Typography.size.xs, color: Colors.text.muted, marginTop: 2 },
  studentActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  statusBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.lg,
  },
  statusBadgePresent: { backgroundColor: '#16a34a' },
  statusBadgeAbsent: { backgroundColor: '#dc2626' },
  statusBadgeText: { color: '#FFF', fontSize: 12, fontWeight: Typography.weight.bold },

  conductBtn: {
    padding: 8,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    ...Shadows.elevated,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: Typography.size.md, fontWeight: Typography.weight.bold },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    padding: 0,
    margin: 0,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius['2xl'] || 24,
    borderTopRightRadius: BorderRadius['2xl'] || 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '85%',
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.xl,
    borderTopWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[200],
    ...Shadows.elevated,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.primary },
  closeHeaderBtn: { padding: 4 },
  modalForm: { flexGrow: 1 },
  studentBannerCard: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  studentLabelTitle: { fontSize: 11, fontWeight: '700', color: Colors.text.muted, textTransform: 'uppercase' },
  studentNameHighlight: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.primary, marginTop: 2 },
  studentCodeHighlight: { fontSize: Typography.size.xs, color: Colors.text.secondary },
  formGroup: { marginBottom: Spacing.lg },
  label: { fontSize: 11, fontWeight: '700', color: Colors.text.muted, marginBottom: 6, textTransform: 'uppercase' },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  dropdownTriggerText: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.primary },
  dropdownList: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginTop: 6,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    ...Shadows.card,
  },
  dropdownItem: { 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.gray[100] || '#f1f5f9' 
  },
  dropdownItemCode: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  dropdownItemText: { fontSize: Typography.size.sm, color: Colors.text.primary, marginTop: 1 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minHeight: 90,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  textAreaWrapper: { alignItems: 'flex-start' },
  inputIcon: { marginRight: 8, marginTop: 2 },
  input: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.primary },
  textArea: { textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  submitBtnText: { color: '#FFF', fontSize: Typography.size.md, fontWeight: Typography.weight.bold }
});
