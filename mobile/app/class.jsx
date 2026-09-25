import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard,
  Dimensions,
  Image
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import api from '../src/utils/api';
import {  
  BookOpen, 
  Check, 
  X, 
  ShieldAlert, 
  AlertTriangle,
  Award, 
  FileText, 
  ChevronDown, 
  Search, 
  CheckCheck, 
  ChevronRight,
  ArrowLeft,
  WifiOff,
  RefreshCw,
  UserX
} from 'lucide-react-native';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../src/context/AlertContext';
import { useAuth } from '../src/context/AuthContext';
import PageHeader from '../src/components/PageHeader';
import BottomModal from '../src/components/BottomModal';
import { SkeletonCard, SkeletonList } from '../src/components/Skeleton';
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '../src/utils/haptics';
import { 
  cacheClassroomStudents, 
  getCachedClassroomStudents, 
  enqueueOfflineAttendance, 
  getPendingAttendancesCount, 
  syncPendingAttendances 
} from '../src/utils/offlineAttendance';

export default function ClassScreen() {
  const router = useRouter();
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
  const [codeSearch, setCodeSearch] = useState('');

  // Offline Sync State
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [isOfflineLoaded, setIsOfflineLoaded] = useState(false);

  const refreshOfflineStatus = async () => {
    const count = await getPendingAttendancesCount();
    setPendingOfflineCount(count);
  };

  const handleSyncOffline = async () => {
    setSyncingOffline(true);
    try {
      const res = await syncPendingAttendances(api);
      if (res.syncedCount > 0) {
        hapticSuccess();
        showAlert({
          type: 'success',
          title: t('offline.syncedTitle', '¡Sincronización Exitosa!'),
          message: t('offline.syncedMsg', { count: res.syncedCount, defaultValue: `Se sincronizaron ${res.syncedCount} lotes de asistencia pendientes.` })
        });
      }
    } catch (err) {
      console.warn('Error syncing offline attendance:', err);
    } finally {
      setSyncingOffline(false);
      refreshOfflineStatus();
    }
  };

  useEffect(() => {
    fetchSchedulesAndCodes();
    refreshOfflineStatus();
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
        const codesRes = await api.get(codesEndpoint, { params: { limit: 200 } });
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

      
    } catch (error) {
      console.error('Error fetching schedules or codes:', error);
      showAlert({
        type: 'error',
        title: t('common.connectionError', 'Error de Conexión'),
        message: t('class.loadClassDataError', 'No se pudieron cargar los datos de la clase.')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    setLoading(true);
    setSearchQuery('');
    setIsOfflineLoaded(false);
    try {
      const studentEndpoint = profile?.role === 'coordinator' ? '/coordinator/students' : '/teacher/class-students';
      const response = await api.get(studentEndpoint, {
        params: { grade: cls.grade, section: cls.section }
      });
      const mapped = (response.data || []).map(s => ({ ...s, status: 'present' }));
      setStudents(mapped);
      // Guardar lista en caché local para soporte offline
      await cacheClassroomStudents(cls.grade, cls.section, mapped);
    } catch (error) {
      console.warn('Error loading students online, trying offline cache:', error.message);
      // Intento de recuperación desde memoria local offline
      const cached = await getCachedClassroomStudents(cls.grade, cls.section);
      if (cached && cached.length > 0) {
        setStudents(cached.map(s => ({ ...s, status: 'present' })));
        setIsOfflineLoaded(true);
        showAlert({
          type: 'info',
          title: t('offline.cachedRosterTitle', 'Modo Sin Conexión'),
          message: t('offline.cachedRosterMsg', 'Cargando lista de estudiantes desde la memoria local. Podrás registrar la asistencia y se sincronizará cuando recuperes señal.')
        });
      } else {
        showAlert({
          type: 'error',
          title: t('common.error', 'Error'),
          message: t('class.errorLoadingStudents', 'No se pudieron cargar los alumnos de la clase.')
        });
        setSelectedClass(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const isSelectedClassActive = useMemo(() => {
    if (profile?.role === 'coordinator') return false;
    if (!selectedClass || !activeScheduleInfo) return false;
    return (
      selectedClass.subject_id === activeScheduleInfo.subject_id &&
      selectedClass.grade.toString() === activeScheduleInfo.grade.toString() &&
      selectedClass.section.toUpperCase() === activeScheduleInfo.section.toUpperCase()
    );
  }, [selectedClass, activeScheduleInfo, profile]);

  const toggleStatus = (id) => {
    if (!isSelectedClassActive) {
      hapticWarning();
      showAlert({
        type: 'warning',
        title: t('class.classNotActive', 'Clase no activa'),
        message: t('class.classNotActiveDesc', 'Solo se puede registrar asistencia durante la hora correspondiente a la clase activa en curso. Puedes consultar la lista de alumnos y aplicar códigos de conducta.')
      });
      return;
    }
    hapticLight();
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'present' ? 'absent' : 'present' };
      }
      return s;
    }));
  };

  const markAllStatus = (statusToSet) => {
    if (!isSelectedClassActive) {
      hapticWarning();
      showAlert({
        type: 'warning',
        title: t('class.classNotActive', 'Clase no activa'),
        message: t('class.classNotActiveDesc', 'Solo se puede registrar asistencia durante la hora correspondiente a la clase activa en curso. Puedes consultar la lista de alumnos y aplicar códigos de conducta.')
      });
      return;
    }
    hapticMedium();
    setStudents(prev => prev.map(s => ({ ...s, status: statusToSet })));
  };

  const handleSaveAttendance = async () => {
    if (!isSelectedClassActive) {
      hapticWarning();
      showAlert({
        type: 'warning',
        title: t('class.classNotActive', 'Clase no activa'),
        message: t('class.classNotActiveDesc', 'Solo se puede registrar asistencia durante la hora correspondiente a la clase activa en curso.')
      });
      return;
    }
    if (students.length === 0) return;
    setSaving(true);
    const dateNow = new Date().toISOString();
    const attendances = students.map(s => ({
      student_id: s.id,
      subject_id: selectedClass.subject_id,
      status: s.status,
      date: dateNow
    }));

    try {
      await api.post('/teacher/attendance', { attendances });
      hapticSuccess();
      showAlert({
        type: 'success',
        title: t('class.savedTitle', '¡Asistencia Guardada!'),
        message: t('class.savedSuccess', { count: students.length, defaultValue: `Asistencia de ${students.length} estudiantes registrada correctamente.` })
      });
    } catch (error) {
      console.warn('Error online saving attendance, saving to offline queue:', error.message);
      // Fallback a cola offline persistente
      await enqueueOfflineAttendance({
        grade: selectedClass.grade,
        section: selectedClass.section,
        subjectId: selectedClass.subject_id,
        attendances,
        date: dateNow
      });
      refreshOfflineStatus();
      hapticSuccess();
      showAlert({
        type: 'warning',
        title: t('offline.savedLocallyTitle', 'Guardado Localmente (Offline)'),
        message: t('offline.savedLocallyMsg', 'No hay conexión a internet o el servidor tardó en responder. La asistencia se guardó en tu dispositivo y se sincronizará automáticamente.')
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenConductModal = (student) => {
    setSelectedStudent(student);
    setSelectedCode('');
    setObservation('');
    setCodeSearch('');
    setCodeDropdownOpen(false);
    setConductModalVisible(true);
  };

  const handleSaveConductRecord = async () => {
    if (!selectedCode) {
      hapticWarning();
      showAlert({
        type: 'warning',
        title: t('common.requiredField', 'Campo Requerido'),
        message: t('class.selectConductCodeWarning', 'Selecciona un código de conducta de la lista.')
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

      const studentName = selectedStudent?.full_name || 'el estudiante';

      // Cerramos el modal primero y ocultamos el teclado
      setConductModalVisible(false);
      if (Platform.OS !== 'web') Keyboard.dismiss();
      hapticSuccess();

      // Mostramos la alerta de éxito tras desmontar el BottomModal para evitar bloqueo nativo de Modals en Android
      setTimeout(() => {
        showAlert({
          type: 'success',
          title: 'Reporte Registrado',
          message: `Código de conducta aplicado exitosamente a ${studentName}.`
        });
      }, 350);
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

  const filteredConductCodes = useMemo(() => {
    if (!codeSearch.trim()) return conductCodes;
    const q = codeSearch.toLowerCase().trim();
    return conductCodes.filter(c => 
      c.code?.toLowerCase().includes(q) || 
      c.name?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    );
  }, [conductCodes, codeSearch]);

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
      <View style={styles.container}>
        <PageHeader 
          title={t('titles.activeClass', 'Clase Activa')} 
          subtitle={t('class.subtitle', 'Selección de aula y toma de asistencia en tiempo real')} 
        />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (selectedClass && !params?.grade) {
                  setSelectedClass(null);
                } else {
                  if (router.canGoBack()) router.back();
                  else router.replace('/home');
                }
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0, 0, 0, 0.22)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.14)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ),
          unstable_headerLeftItems: () => [
            {
              type: 'custom',
              hidesSharedBackground: true,
              element: (
                <TouchableOpacity
                  onPress={() => {
                    if (selectedClass && !params?.grade) {
                      setSelectedClass(null);
                    } else {
                      if (router.canGoBack()) router.back();
                      else router.replace('/home');
                    }
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(0, 0, 0, 0.22)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.14)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={20} color="#FFFFFF" />
                </TouchableOpacity>
              ),
            },
          ],
        }}
      />
      <PageHeader 
        title={selectedClass ? `${selectedClass.grade}º '${selectedClass.section}' — ${selectedClass.subjects?.name || 'Clase'}` : 'Clase Activa'}
        subtitle={selectedClass ? 'Control de asistencia y conducta del aula' : 'Selección de aula y toma de asistencia en tiempo real'}
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
                <Text style={styles.liveBadgeText}>{t('class.activeNow', 'CLASE EN CURSO AHORA')}</Text>
              </View>
              <Text style={styles.liveSubjectTitle}>
                {activeScheduleInfo.subjects?.name || 'Materia En Curso'}
              </Text>
              <Text style={styles.liveSubjectDetail}>
                {activeScheduleInfo.grade}º Grado '{activeScheduleInfo.section}' — {activeScheduleInfo.start_time?.substring(0, 5)} a {activeScheduleInfo.end_time?.substring(0, 5)}
              </Text>
              <View style={styles.liveActionRow}>
                <Text style={styles.liveActionText}>{t('class.enterAttendance', 'Ingresar a Asistencia y Códigos')}</Text>
                <ChevronRight size={18} color="#FFF" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.activeLiveCard, { backgroundColor: theme === 'dark' ? Colors.card : '#f8fafc', borderWidth: 1, borderColor: Colors.gray[200] }]}>
              <View style={styles.liveBadgeRow}>
                <Text style={[styles.liveBadgeText, { color: Colors.text.muted }]}>{t('common.currentStatus', 'ESTADO ACTUAL')}</Text>
              </View>
              <Text style={[styles.liveSubjectTitle, { color: Colors.text.primary, fontSize: 18 }]}>
                {t('class.noCurrentClass', 'No tienes clase asignada en este momento')}
              </Text>
              <Text style={[styles.liveSubjectDetail, { color: Colors.text.muted, marginTop: 6 }]}>
                {t('class.noCurrentClassSub', 'En el horario actual no hay ninguna clase programada en tu horario docente.')}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>{t('class.assignedClasses', 'Todas Tus Clases Asignadas')}</Text>

          {schedules.length === 0 ? (
            <View style={styles.emptyContainer}>
              <BookOpen size={48} color={Colors.text.muted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>{t('class.noAssignedClasses', 'No tienes clases asignadas en el sistema.')}</Text>
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
                  <Text style={styles.classDetail}>{t('common.gradeSectionFormat', { grade: cls.grade, section: cls.section, defaultValue: `${cls.grade}º Grado — Sección '${cls.section}'` })}</Text>
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
          {/* Offline Sync Banner */}
          {(pendingOfflineCount > 0 || isOfflineLoaded) && (
            <View style={[styles.offlineBanner, { marginHorizontal: Spacing.md, marginTop: Spacing.sm }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                <WifiOff size={16} color={theme === 'dark' ? '#fde68a' : '#b45309'} />
                <Text style={styles.offlineBannerText}>
                  {pendingOfflineCount > 0 
                    ? t('offline.pendingBatches', { count: pendingOfflineCount, defaultValue: `${pendingOfflineCount} asistencias pendientes de sincronizar` })
                    : t('offline.cachedRosterTitle', 'Modo Sin Conexión (Lista Local)')}
                </Text>
              </View>
              {pendingOfflineCount > 0 && (
                <TouchableOpacity 
                  style={styles.syncBtn} 
                  onPress={handleSyncOffline}
                  disabled={syncingOffline}
                  activeOpacity={0.8}
                >
                  {syncingOffline ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <RefreshCw size={12} color="#FFF" />
                      <Text style={styles.syncBtnText}>{t('offline.syncNow', 'Sincronizar')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* 1. Barra de Búsqueda */}
          <View style={styles.searchContainer}>
            <Search size={18} color={Colors.text.muted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('class.searchStudent', 'Buscar estudiante por nombre o código...')}
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

          {/* 2. Tarjetas de Asistencia (Presentes y Ausentes) */}
          <View style={styles.statsCardsRow}>
            {/* Tarjeta Presentes */}
            <View style={[styles.statCard, styles.statCardPresent]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardTagPresent}>
                  {t('class.present', 'Presentes')}
                </Text>
                
              </View>
              <Text style={styles.statCardBigNumPresent}>
                {attendanceStats.presentCount}
              </Text>
             
            </View>

            {/* Tarjeta Ausentes */}
            <View style={[styles.statCard, styles.statCardAbsent]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardTagAbsent}>
                  {t('class.absent', 'Ausentes')}
                </Text>
              </View>
              <Text style={styles.statCardBigNumAbsent}>
                {attendanceStats.absentCount}
              </Text>
            
            </View>
          </View>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity 
              style={[styles.quickBtn, styles.quickBtnPresent]} 
              onPress={() => markAllStatus('present')}
              activeOpacity={0.8}
            >
              <Text style={styles.quickBtnText}>{t('class.allPresentBtn', 'Todos Asiste')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickBtn, styles.quickBtnAbsent]} 
              onPress={() => markAllStatus('absent')}
              activeOpacity={0.8}
            >
              <Text style={styles.quickBtnText}>{t('class.allAbsentBtn', 'Todos Falta')}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.sm }}>
              <SkeletonList count={7} />
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
                          <Text style={styles.statusBadgeText}>{t('class.present', 'Asiste')}</Text>
                        </>
                      ) : (
                        <>
                          <X size={14} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.statusBadgeText}>{t('class.absent', 'Falta')}</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Espacio / Ranura para icono o imagen personalizada de reporte de conducta */}
                    <TouchableOpacity 
                      style={styles.conductBtn}
                      onPress={() => handleOpenConductModal(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.conductIconSlot}>
                        <Image 
                          source={require('../assets/advertencia.png')} 
                          style={styles.conductCustomImg} 
                          resizeMode="contain" 
                        />
                      </View>
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
                      <Text style={styles.saveBtnText}>{t('class.saveAttendance', 'Guardar Asistencia')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={{ backgroundColor: theme === 'dark' ? Colors.card : '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.gray[200], alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: Colors.text.muted, textAlign: 'center', fontWeight: '600' }}>
                    {t('class.readOnlyConductNotice', 'Modo Consulta y Reporte de Conducta (La asistencia solo se guarda durante la clase activa en curso)')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Conduct Modal */}
      <BottomModal visible={conductModalVisible} onClose={() => setConductModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('class.reportConduct', 'Reportar Conducta')}</Text>
              <TouchableOpacity onPress={() => setConductModalVisible(false)} style={styles.closeHeaderBtn}>
                <X size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={styles.studentBannerCard}>
                <Text style={styles.studentLabelTitle}>{t('class.selectedStudent', 'Estudiante Seleccionado:')}</Text>
                <Text style={styles.studentNameHighlight}>{selectedStudent?.full_name}</Text>
                <Text style={styles.studentCodeHighlight}>{selectedStudent?.institutional_code || 'S/C'}</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('class.conductCodeLabel', 'Código de Conducta *')}</Text>
                <TouchableOpacity 
                  style={styles.dropdownTrigger} 
                  onPress={() => setCodeDropdownOpen(!codeDropdownOpen)}
                  activeOpacity={0.8}
                >
                  <Award size={18} color={Colors.primary} style={styles.inputIcon} />
                  <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                    {getConductCodeLabel(selectedCode)}
                  </Text>
                  <ChevronDown 
                    size={18} 
                    color={Colors.text.muted} 
                    style={{ transform: [{ rotate: codeDropdownOpen ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>

                {codeDropdownOpen && (
                  <View style={styles.dropdownList}>
                    {/* Buscador de código o descripción */}
                    <View style={styles.codeSearchBox}>
                      <Search size={16} color={Colors.text.muted} style={{ marginRight: 8 }} />
                      <TextInput
                        placeholder={t('class.selectConductCode', 'Buscar por código (ej. L-01) o descripción...')}
                        placeholderTextColor={Colors.text.muted}
                        value={codeSearch}
                        onChangeText={setCodeSearch}
                        style={styles.codeSearchInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {codeSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setCodeSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <X size={16} color={Colors.text.muted} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {filteredConductCodes.length === 0 ? (
                        <View style={styles.emptyDropdownResult}>
                          <Text style={styles.emptyDropdownText}>{t('common.noMatchingCodes', 'No se encontraron códigos que coincidan.')}</Text>
                        </View>
                      ) : (
                        filteredConductCodes.map(c => {
                          const isSelected = selectedCode === c.id;
                          const catColor = getCategoryColor(c.category);
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[
                                styles.dropdownItem,
                                isSelected && { backgroundColor: theme === 'dark' ? 'rgba(59,130,246,0.15)' : '#eff6ff' }
                              ]}
                              onPress={() => {
                                setSelectedCode(c.id);
                                setCodeDropdownOpen(false);
                              }}
                            >
                              <View style={styles.dropdownItemHeader}>
                                <View style={[styles.dropdownItemCodeBadge, { backgroundColor: catColor + '20' }]}>
                                  <Text style={[styles.dropdownItemCode, { color: catColor }]}>{c.code}</Text>
                                </View>
                                {c.category ? (
                                  <Text style={[styles.dropdownCategoryText, { color: catColor }]}>{c.category}</Text>
                                ) : null}
                                {isSelected && <Check size={16} color="#10b981" style={{ marginLeft: 'auto' }} />}
                              </View>
                              <Text style={styles.dropdownItemText}>{c.name}</Text>
                              {c.description ? (
                                <Text style={styles.dropdownItemDesc} numberOfLines={2}>{c.description}</Text>
                              ) : null}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('common.observationsOptional', 'Observaciones / Detalle (Opcional)')}</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <FileText size={18} color={Colors.text.muted} style={styles.inputIcon} />
                  <TextInput
                    placeholder={t('class.observationsLabel', 'Escribe aquí los detalles del reporte de conducta...')}
                    placeholderTextColor={Colors.text.muted}
                    multiline
                    numberOfLines={4}
                    value={observation}
                    onChangeText={setObservation}
                    style={[styles.input, styles.textArea]}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleSaveConductRecord}
                disabled={savingConduct}
              >
                {savingConduct ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>{t('class.applyConductBtn', 'Aplicar Código de Conducta')}</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 28 }} />
            </ScrollView>
          </View>
        </BottomModal>
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
  searchInput: { flex: 1, fontSize: 16, color: Colors.text.primary },

  // Stats Cards Row (Presentes & Ausentes)
  statsCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    padding: 12,
    borderWidth: 1,
    ...Shadows.card,
  },
  statCardPresent: {
    backgroundColor: theme === 'dark' ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4',
    borderColor: theme === 'dark' ? 'rgba(22, 163, 74, 0.35)' : '#BBF7D0',
  },
  statCardAbsent: {
    backgroundColor: theme === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2',
    borderColor: theme === 'dark' ? 'rgba(220, 38, 38, 0.35)' : '#FECACA',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statCardTagPresent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statCardTagAbsent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991b1b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statCardIconCirclePresent: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardIconCircleAbsent: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardBigNumPresent: {
    fontSize: 26,
    fontWeight: '900',
    color: '#166534',
    letterSpacing: -0.5,
  },
  statCardBigNumAbsent: {
    fontSize: 26,
    fontWeight: '900',
    color: '#991b1b',
    letterSpacing: -0.5,
  },
  statCardSubtextPresent: {
    fontSize: 11,
    fontWeight: '600',
    color: theme === 'dark' ? '#86efac' : '#15803d',
    marginTop: 2,
  },
  statCardSubtextAbsent: {
    fontSize: 11,
    fontWeight: '600',
    color: theme === 'dark' ? '#fca5a5' : '#b91c1c',
    marginTop: 2,
  },

  // Quick Action Buttons Row
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: BorderRadius.lg,
    ...Shadows.card,
  },
  quickBtnPresent: { backgroundColor: '#16a34a' },
  quickBtnAbsent: { backgroundColor: '#dc2626' },
  quickBtnText: { color: '#FFF', fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

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
  statusBadgePresent: { backgroundColor: '#0ea5e9' },
  statusBadgeAbsent: { backgroundColor: '#dc2626' },
  statusBadgeText: { color: '#FFF', fontSize: 12, fontWeight: Typography.weight.bold },

  conductBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#3F3F46' : '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  conductIconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  conductCustomImg: {
    width: 22,
    height: 22,
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
    padding: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.primary },
  closeHeaderBtn: { padding: 4 },
  modalForm: { 
    flexGrow: 0,
    maxHeight: Platform.OS === 'web' ? 520 : Math.min(Dimensions.get('window').height * 0.68, 520),
  },
  studentBannerCard: {
    backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
    padding: 16,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : Colors.gray[200],
  },
  studentLabelTitle: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: Colors.text.muted, 
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  studentNameHighlight: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: Colors.text.primary, 
    lineHeight: 24,
    marginBottom: 4,
  },
  studentCodeHighlight: { 
    fontSize: 13, 
    fontWeight: '600',
    color: Colors.text.muted 
  },
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
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    ...Shadows.card,
  },
  codeSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 38,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  codeSearchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    paddingVertical: 0,
  },
  emptyDropdownResult: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDropdownText: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    fontStyle: 'italic',
  },
  dropdownItem: { 
    paddingVertical: 8, 
    paddingHorizontal: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.gray[100] || '#f1f5f9',
    borderRadius: BorderRadius.sm,
  },
  dropdownItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dropdownItemCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  dropdownItemCode: { 
    fontSize: 11, 
    fontWeight: '800' 
  },
  dropdownCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dropdownItemText: { 
    fontSize: Typography.size.sm, 
    fontWeight: '600',
    color: Colors.text.primary, 
    marginTop: 2 
  },
  dropdownItemDesc: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 1,
    lineHeight: 15,
  },
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme === 'dark' ? '#451a03' : '#fef3c7',
    borderColor: theme === 'dark' ? '#78350f' : '#fde68a',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme === 'dark' ? '#fde68a' : '#92400e',
    flex: 1,
  },
  syncBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    marginLeft: 8,
  },
  syncBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
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

const getCategoryColor = (category) => {
  switch (category) {
    case 'Positivo': return '#10b981';
    case 'Leve': return '#f59e0b';
    case 'Grave': return '#f97316';
    case 'Muy Grave': return '#ef4444';
    default: return '#3b82f6';
  }
};

