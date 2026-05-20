import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../src/utils/api';

export default function ScheduleScreen() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const currentSchedules = schedules
    .filter(s => parseInt(s.day_of_week) === activeDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Horario de clases</Text>
        <Text style={styles.headerSubtitle}>Selecciona un día</Text>
      </View>

      <View style={styles.daySelectorContainer}>
        <View style={styles.daySelector}>
          {days.map(day => (
            <TouchableOpacity
              key={day.id}
              style={[styles.dayBtn, activeDay === day.id && styles.dayBtnActive]}
              onPress={() => setActiveDay(day.id)}
            >
              <Text style={[styles.dayBtnText, activeDay === day.id && styles.dayBtnTextActive]}>
                {day.name}
              </Text>
            </TouchableOpacity>
          ))}
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
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  },
  dayBtnActive: {
    backgroundColor: '#FFF',
  },
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
});
