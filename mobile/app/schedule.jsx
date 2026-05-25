import { useState, useEffect } from 'react';
<<<<<<< HEAD
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
=======
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../src/utils/api';
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34

export default function ScheduleScreen() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
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
=======
  const [activeDay, setActiveDay] = useState(1);

  const days = [
    { id: 1, name: 'LUN' },
    { id: 2, name: 'MAR' },
    { id: 3, name: 'MIE' },
    { id: 4, name: 'JUE' },
    { id: 5, name: 'VIE' }
  ];

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const response = await api.get('/student/schedule');
      setSchedules(response.data);
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const currentSchedules = schedules
    .filter(s => parseInt(s.day_of_week) === activeDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

<<<<<<< HEAD
  if (loading && schedules.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
=======
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const getSubjectColor = (name) => {
    const n = name.toLowerCase();
    if (n.includes('ingl') || n.includes('english')) return '#48DBFB';
    if (n.includes('mate') || n.includes('math')) return '#FF6B6B';
    if (n.includes('quim') || n.includes('chem')) return '#A55EE1';
    if (n.includes('fisi') || n.includes('phys')) return '#FFD93D';
    if (n.includes('soci') || n.includes('hist')) return '#1DD1A1';
    if (n.includes('biol') || n.includes('bio')) return '#10AC84';
    if (n.includes('leng') || n.includes('lit')) return '#FF9F43';
    return '#0B1956';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B1956" />
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
<<<<<<< HEAD
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
=======
        <Text style={styles.headerTitle}>Mi Horario de clases</Text>
        <Text style={styles.headerSubtitle}>Selecciona un día</Text>
      </View>

      <View style={styles.daySelectorContainer}>
        <View style={styles.daySelector}>
          {days.map(day => (
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            <TouchableOpacity
              key={day.id}
              style={[styles.dayBtn, activeDay === day.id && styles.dayBtnActive]}
              onPress={() => setActiveDay(day.id)}
            >
<<<<<<< HEAD
              <Text style={[styles.dayText, activeDay === day.id && styles.dayTextActive]}>
=======
              <Text style={[styles.dayBtnText, activeDay === day.id && styles.dayBtnTextActive]}>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                {day.name}
              </Text>
            </TouchableOpacity>
          ))}
<<<<<<< HEAD
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
=======
        </View>
      </View>

      <ScrollView style={styles.listContainer}>
        {currentSchedules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay clases programadas.</Text>
          </View>
        ) : (
          currentSchedules.map((schedule, idx) => (
            <View key={schedule.id || idx} style={[styles.card, { borderLeftColor: getSubjectColor(schedule.subjects?.name || ''), borderLeftWidth: 6 }]}>
              <View style={styles.timeCol}>
                <Text style={styles.timeText}>{formatTime(schedule.start_time)}</Text>
                <Text style={styles.timeText}>{formatTime(schedule.end_time)}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.subjectName}>{schedule.subjects?.name || 'Materia'}</Text>
                <Text style={styles.teacherName}>{schedule.profiles?.full_name || 'Profesor'}</Text>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              </View>
            </View>
          ))
        )}
<<<<<<< HEAD
        <View style={{height: 40}} />
=======
        <View style={{ height: 40 }} />
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
<<<<<<< HEAD
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
=======
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  header: {
    backgroundColor: '#0B1956',
    padding: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, textTransform: 'uppercase' },
  daySelectorContainer: {
    alignItems: 'center',
    marginTop: -25,
  },
  daySelector: {
    flexDirection: 'row',
    backgroundColor: '#0B1956',
    borderRadius: 25,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  dayBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  },
  dayBtnActive: {
    backgroundColor: '#FFF',
  },
<<<<<<< HEAD
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
=======
  dayBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 'bold',
    fontSize: 12,
  },
  dayBtnTextActive: {
    color: '#0B1956',
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontWeight: '500',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    overflow: 'hidden',
  },
  timeCol: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    borderStyle: 'dashed',
    width: 90,
  },
  timeText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoCol: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  subjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  teacherName: {
    fontSize: 13,
    color: '#888',
  },
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
});
