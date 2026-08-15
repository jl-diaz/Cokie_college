import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import api from '../src/utils/api';
import { Calendar, Clock, MapPin, BookOpen, ArrowLeft, Coffee, LogOut } from 'lucide-react-native';
import { useTheme } from '../src/context/ThemeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from 'react-i18next';
import PageHeader from '../src/components/PageHeader';

const DAYS = [
  { id: 1, nameKey: 'days.monday' },
  { id: 2, nameKey: 'days.tuesday' },
  { id: 3, nameKey: 'days.wednesday' },
  { id: 4, nameKey: 'days.thursday' },
  { id: 5, nameKey: 'days.friday' }
];

export default function ScheduleScreen() {
  const { t, i18n } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const router = useRouter();
  const { teacher_id, teacher_name, student_id, student_name, grade, section } = useLocalSearchParams();

  useEffect(() => {
    fetchSchedule();
  }, [teacher_id, student_id, grade, section]);

  const fetchSchedule = async () => {
    try {
      let endpoint = profile?.role === 'teacher' ? '/teacher/schedule' : '/student/schedule';
      
      if (grade && section) {
        endpoint = `/coordinator/classrooms/schedule?grade=${grade}&section=${section}`;
      } else if (teacher_id) {
        endpoint = `/coordinator/teachers/${teacher_id}/schedule`;
      } else if (student_id) {
        endpoint = `/coordinator/students/${student_id}/schedule`;
      } else if (profile?.role === 'coordinator') {
        setSchedules([]);
        setLoading(false);
        return;
      }
      
      const response = await api.get(endpoint);
      const rawSchedules = Array.isArray(response.data) ? response.data : [];
      const uniqueSchedules = [];
      const seen = new Set();
      
      rawSchedules.forEach(s => {
        const key = `${s.day_of_week}-${s.start_time}-${s.subject_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueSchedules.push(s);
        }
      });

      setSchedules(uniqueSchedules);
    } catch (error) {
      console.error('Error al cargar horario:', error);
    } finally {
      setLoading(false);
    }
  };

  const todayDayIndex = new Date().getDay(); // 0 = Domingo, 6 = Sábado
  const isWeekendToday = todayDayIndex === 0 || todayDayIndex === 6;

  // Si se ingresa en fin de semana, activeDay inicia en null para mostrar únicamente el mensaje de descanso
  const [activeDay, setActiveDay] = useState(isWeekendToday ? null : (todayDayIndex >= 1 && todayDayIndex <= 5 ? todayDayIndex : 1));

  const fixedItems = [
    { id: 'fixed-1', start_time: '08:30:00', end_time: '09:00:00', isFixed: true, type: 'recess', title: 'Receso' },
    { id: 'fixed-2', start_time: '10:30:00', end_time: '11:00:00', isFixed: true, type: 'recess', title: 'Receso' },
    { id: 'fixed-3', start_time: '12:00:00', end_time: '12:00:00', isFixed: true, type: 'exit', title: 'Salida' }
  ];

  const currentSchedules = activeDay ? [
    ...schedules.filter(s => parseInt(s.day_of_week) === activeDay),
    ...fixedItems
  ].sort((a, b) => a.start_time.localeCompare(b.start_time)) : [];

  if (loading && schedules.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {(teacher_id || student_id || (grade && section)) && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#FFF" size={24} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {grade && section
            ? `Horario • ${grade}º Grado '${section}'`
            : teacher_id 
            ? `${t('titles.schedule')} ${teacher_name || t('dashboard.teacher') || 'Profesor'}` 
            : student_id 
              ? `${t('titles.schedule')} ${student_name || t('dashboard.student') || 'Estudiante'}` 
              : t('titles.schedule')}
        </Text>
        <Text style={styles.headerSubtitle}>
          {grade && section
            ? 'Distribución horaria y docentes del grupo escolar'
            : (teacher_id || student_id ? t('titles.scheduleSubtitleCoordinator') : t('titles.scheduleSubtitle'))}
        </Text>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.daySelector}
          contentContainerStyle={styles.daySelectorContent}
        >
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day.id}
              style={[styles.dayBtn, activeDay === day.id && styles.dayBtnActive]}
              onPress={() => setActiveDay(day.id)}
            >
              <Text style={[styles.dayText, activeDay === day.id && styles.dayTextActive]}>
                {t(day.nameKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {/* Mostrar mensaje de fin de semana SOLO cuando no hay día seleccionado */}
        {activeDay === null ? (
          <View style={styles.weekendCard}>
            <View style={styles.weekendIconBg}>
              <Coffee size={28} color={theme === 'dark' ? Colors.primary : '#15803D'} />
            </View>
            <View style={styles.weekendTextContainer}>
              <Text style={styles.weekendTitle}>
                {t('dashboard.weekendTitle', '¡Es fin de semana!')}
              </Text>
              <Text style={styles.weekendSubtitle}>
                {t('dashboard.weekendRest', 'Aprovecha a descansar y recargar energías. Selecciona un día para consultar el horario.')}
              </Text>
            </View>
          </View>
        ) : currentSchedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar size={48} color={Colors.gray[300]} style={{marginBottom: 16}} />
            <Text style={styles.emptyText}>{t('dashboard.noClassesToday')}</Text>
          </View>
        ) : (
          currentSchedules.map((item, idx) => {
            if (item.isFixed) {
              const isExit = item.type === 'exit';
              return (
                <View 
                  key={item.id || idx} 
                  style={[
                    styles.scheduleCard, 
                    { 
                      backgroundColor: isExit ? (theme === 'dark' ? '#2A1B1B' : '#FFF5F5') : (theme === 'dark' ? '#1B2A23' : '#F0FDF4'),
                      borderColor: isExit ? '#FCA5A5' : '#86EFAC',
                      borderWidth: 1
                    }
                  ]}
                >
                  <View style={[styles.timeColumn, { backgroundColor: isExit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }]}>
                    <Clock size={16} color={isExit ? '#EF4444' : '#16A34A'} />
                    <Text style={[styles.startTime, { color: isExit ? '#EF4444' : '#16A34A' }]}>{item.start_time.substring(0, 5)}</Text>
                    {!isExit && <Text style={styles.endTime}>{item.end_time.substring(0, 5)}</Text>}
                  </View>
                  
                  <View style={styles.infoColumn}>
                    <View style={styles.subjectRow}>
                      {isExit ? (
                        <LogOut size={18} color="#EF4444" style={{marginRight: 8}} />
                      ) : (
                        <Coffee size={18} color="#16A34A" style={{marginRight: 8}} />
                      )}
                      <Text style={[styles.subjectName, { color: isExit ? '#B91C1C' : '#15803D' }]}>{item.title}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: isExit ? '#EF4444' : '#16A34A', fontWeight: '500' }}>
                      {isExit ? 'Fin de la jornada escolar' : 'Tiempo libre y descanso'}
                    </Text>
                  </View>
                </View>
              );
            }

            return (
              <View key={item.id || idx} style={styles.scheduleCard}>
                <View style={[styles.timeColumn, { backgroundColor: Colors.primary + '08' }]}>
                  <Clock size={16} color={Colors.primary} />
                  <Text style={styles.startTime}>{item.start_time.substring(0, 5)}</Text>
                  <Text style={styles.endTime}>{item.end_time.substring(0, 5)}</Text>
                </View>
                
                <View style={styles.infoColumn}>
                  <View style={styles.subjectRow}>
                    <BookOpen size={18} color={Colors.primary} style={{marginRight: 8}} />
                    <Text style={styles.subjectName}>{item.subjects?.name || t('dashboard.subject')}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    {(item.grade || item.section) && (
                      <>
                        <Text style={styles.detailText}>{item.grade}º {item.section}</Text>
                      </>
                    )}
                  </View>

                  {item.profiles && (
                    <View style={styles.teacherRow}>
                      <View style={styles.teacherAvatar}>
                        <Text style={styles.teacherInitial}>{item.profiles.full_name[0]}</Text>
                      </View>
                      <Text style={styles.teacherName}>{item.profiles.full_name}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{height: 40}} />
      </View>
    </ScrollView>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: theme === 'dark' ? Colors.card : '#0B1956',
    paddingTop: 20,
    padding: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 10,
  },
  headerTitle: { 
    color: theme === 'dark' ? Colors.primary : '#FFF', 
    fontSize: 20, 
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 0,
  },
  headerSubtitle: { 
    color: theme === 'dark' ? Colors.text.secondary : 'rgba(255,255,255,0.8)', 
    fontSize: 12, 
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  daySelector: {
    marginTop: 24,
    marginBottom: 0,
  },
  daySelectorContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  dayBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dayBtnActive: {
    backgroundColor: '#FFF',
  },
  dayText: {
    color: theme === 'dark' ? Colors.text.muted : 'rgba(255,255,255,0.7)',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dayTextActive: {
    color: theme === 'dark' ? Colors.primary : '#0B1956',
  },
  content: {
    padding: 20,
  },
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
  emptyText: {
    color: Colors.text.muted,
    textAlign: 'center',
    fontSize: 16,
  },
  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[100],
  },
  timeColumn: {
    width: 100,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.gray[100],
  },
  startTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 6,
  },
  endTime: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  infoColumn: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.gray[300],
    marginHorizontal: 8,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[50],
  },
  teacherAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  teacherInitial: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  teacherName: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  weekendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? Colors.card : '#F0FDF4',
    borderColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.3)' : '#86EFAC',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  weekendIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  weekendTextContainer: {
    flex: 1,
  },
  weekendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? Colors.primary : '#15803D',
    marginBottom: 2,
  },
  weekendSubtitle: {
    fontSize: 13,
    color: theme === 'dark' ? Colors.text.secondary : '#166534',
    lineHeight: 18,
  }
});
