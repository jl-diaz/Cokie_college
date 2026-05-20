import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../src/utils/api';
import { AlertCircle, Calendar, CheckCircle } from 'lucide-react-native';

export default function DiaryScreen() {
  const [diaryData, setDiaryData] = useState({ conduct: [], attendance: [] });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(1);

  useEffect(() => {
    fetchDiary();
  }, [selectedPeriod]);

  const fetchDiary = async () => {
    setLoading(true);
    try {
      const response = await api.get('/student/diary', { params: { period: selectedPeriod } });
      setDiaryData(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Positivo': return { bg: '#eafaf1', text: '#2ecc71', border: 'rgba(46, 204, 113, 0.2)' };
      case 'Leve': return { bg: '#fef9ec', text: '#f39c12', border: 'rgba(243, 156, 18, 0.2)' };
      case 'Grave': return { bg: '#fdf0ef', text: '#e74c3c', border: 'rgba(231, 76, 60, 0.2)' };
      case 'Muy Grave': return { bg: 'rgba(11, 25, 86, 0.1)', text: '#0B1956', border: 'rgba(11, 25, 86, 0.2)' };
      default: return { bg: '#F5F7FA', text: '#888', border: '#E0E0E0' };
    }
  };

  const absences = diaryData.attendance.filter(a => a.status === 'absent');

  if (loading && diaryData.conduct.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B1956" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Diario Pedagógico</Text>
        <Text style={styles.headerSubtitle}>Conducta e inasistencias</Text>
      </View>

      <View style={styles.periodSelectorContainer}>
        <View style={styles.periodSelector}>
          {[1, 2, 3, 4].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, selectedPeriod === p && styles.periodBtnActive]}
              onPress={() => setSelectedPeriod(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodText, selectedPeriod === p && styles.periodTextActive]}>Periodo {p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.content}>
        {/* Conduct Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <AlertCircle color="#f5a623" size={20} />
            <Text style={styles.sectionTitle}>Registro de Conducta</Text>
          </View>
          
          {diaryData.conduct.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hay registros de conducta en este periodo.</Text>
            </View>
          ) : (
            diaryData.conduct.map(record => {
              const colors = getCategoryColor(record.conduct_codes?.category);
              return (
                <View key={record.id} style={[styles.recordCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <View style={styles.recordHeader}>
                    <Text style={[styles.recordName, { color: '#333' }]}>{record.conduct_codes?.name}</Text>
                    <View style={styles.badge}>
                      <Text style={[styles.badgeText, { color: colors.text }]}>{record.conduct_codes?.category}</Text>
                    </View>
                  </View>
                  {record.observation && <Text style={styles.recordObs}>{record.observation}</Text>}
                  <Text style={styles.recordDate}>{new Date(record.created_at).toLocaleDateString()}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Attendance Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Calendar color="#f5a623" size={20} />
            <Text style={styles.sectionTitle}>Registro de Inasistencias</Text>
          </View>

          {absences.length === 0 ? (
            <View style={[styles.emptyCard, { alignItems: 'center' }]}>
              <View style={styles.goodIcon}>
                <CheckCircle color="#2ecc71" size={24} />
              </View>
              <Text style={[styles.emptyText, { textAlign: 'center' }]}>¡Excelente asistencia! No tienes faltas en este periodo.</Text>
            </View>
          ) : (
            absences.map(att => (
              <View key={att.id} style={styles.absenceCard}>
                <View style={styles.absenceIcon}>
                  <Calendar color="#e74c3c" size={18} />
                </View>
                <View>
                  <Text style={styles.absenceDate}>{new Date(att.date).toLocaleDateString()}</Text>
                  <Text style={styles.absenceLabel}>Inasistencia</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
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
  periodSelectorContainer: {
    alignItems: 'center',
    marginTop: -25,
  },
  periodSelector: {
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
  periodBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  periodBtnActive: {
    backgroundColor: '#FFF',
  },
  periodText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 'bold',
    fontSize: 12,
  },
  periodTextActive: {
    color: '#0B1956',
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0B1956',
    marginLeft: 8,
  },
  emptyCard: {
    backgroundColor: '#F5F7FA',
    padding: 20,
    borderRadius: 16,
  },
  emptyText: {
    color: '#888',
    fontWeight: '500',
  },
  recordCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recordName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  recordObs: {
    color: '#555',
    fontSize: 14,
    marginBottom: 10,
  },
  recordDate: {
    fontSize: 10,
    fontWeight: 'bold',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  goodIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#eafaf1',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  absenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(11, 25, 86, 0.05)',
    marginBottom: 12,
  },
  absenceIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#fdf0ef',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  absenceDate: {
    fontWeight: 'bold',
    color: '#0B1956',
    fontSize: 16,
  },
  absenceLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: 2,
  },
});
