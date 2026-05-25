import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import api from '../src/utils/api';
import { Calendar, Clock, MapPin, BookOpen, ArrowLeft } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

const DAYS = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
  { id: 6, name: 'Sábado' },
  { id: 7, name: 'Domingo' }
];

export default function ScheduleScreen() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(new Date().getDay() || 1);
  const { profile } = useAuth();
  const router = useRouter();
  
  const { teacher_id, teacher_name, student_id, student_name } = useLocalSearchParams();

  useEffect(() => {
    fetchSchedule();
  }, [teacher_id, student_id]);

  const fetchSchedule = async () => {
    try {
      let endpoint = profile?.role === 'teacher' ? '/teacher/schedule' : '/student/schedule';
      
      if (profile?.role === 'coordinator' && !teacher_id && !student_id) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      if (teacher_id) {
        endpoint = `/coordinator/teachers/${teacher_id}/schedule`;
      } else if (student_id) {
        endpoint = `/coordinator/students/${student_id}/schedule`;
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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const currentSchedules = schedules
    .filter(s => parseInt(s.day_of_week) === activeDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (loading && schedules.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {(teacher_id || student_id) && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#FFF" size={24} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {teacher_id ? `Horario de ${teacher_name || 'Profesor'}` : student_id ? `Horario de ${student_name || 'Alumno'}` : 'Horario de Clases'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {teacher_id || student_id ? 'Programación semanal' : 'Tu programación semanal'}
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
                {day.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {currentSchedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar size={48} color={Colors.gray[300]} style={{marginBottom: 16}} />
            <Text style={styles.emptyText}>No hay clases programadas para este día.</Text>
          </View>
        ) : (
          currentSchedules.map((item, idx) => (
            <View key={item.id || idx} style={styles.scheduleCard}>
              <View style={[styles.timeColumn, { backgroundColor: Colors.primary + '08' }]}>
                <Clock size={16} color={Colors.primary} />
                <Text style={styles.startTime}>{item.start_time.substring(0, 5)}</Text>
                <Text style={styles.endTime}>{item.end_time.substring(0, 5)}</Text>
              </View>
              
              <View style={styles.infoColumn}>
                <View style={styles.subjectRow}>
                  <BookOpen size={18} color={Colors.primary} style={{marginRight: 8}} />
                  <Text style={styles.subjectName}>{item.subjects?.name || 'Materia'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MapPin size={14} color={Colors.text.muted} style={{marginRight: 4}} />
                  <Text style={styles.detailText}>Aula {item.classroom || 'Por asignar'}</Text>
                  {(item.grade || item.section) && (
                    <>
                      <View style={styles.dot} />
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
          ))
        )}
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 0,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    zIndex: 10,
  },
  headerTitle: { 
    color: Colors.text.inverse, 
    fontSize: Typography.size.xl, 
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
    marginTop: 20
  },
  headerSubtitle: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: Typography.size.xs, 
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  daySelector: {
    marginTop: 24,
    marginBottom: 20,
  },
  daySelectorContent: {
    paddingHorizontal: Spacing.xl,
    gap: 10,
  },
  dayBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dayBtnActive: {
    backgroundColor: '#FFF',
  },
  dayText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.sm,
  },
  dayTextActive: {
    color: Colors.primary,
  },
  content: {
    padding: Spacing.xl,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: 40,
    alignItems: 'center',
    ...Shadows.card,
    marginTop: 20,
  },
  emptyText: {
    color: Colors.text.muted,
    textAlign: 'center',
    fontSize: Typography.size.md,
    lineHeight: 22,
  },
  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  timeColumn: {
    width: 80,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.gray[100],
  },
  startTime: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
    marginTop: 6,
  },
  endTime: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 2,
  },
  infoColumn: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectName: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: Typography.size.xs,
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
    fontSize: Typography.size.xs,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  }
});
