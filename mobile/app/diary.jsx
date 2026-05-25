import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
<<<<<<< HEAD
import { useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';
import { AlertCircle, Calendar, CheckCircle, Clock, User } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
=======
import api from '../src/utils/api';
import { AlertCircle, Calendar, CheckCircle } from 'lucide-react-native';
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34

export default function DiaryScreen() {
  const [diaryData, setDiaryData] = useState({ conduct: [], attendance: [] });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
<<<<<<< HEAD
  const { studentId, isCoordinatorView } = useLocalSearchParams();

  useEffect(() => {
    fetchDiary();
  }, [selectedPeriod, studentId]);
=======

  useEffect(() => {
    fetchDiary();
  }, [selectedPeriod]);
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34

  const fetchDiary = async () => {
    setLoading(true);
    try {
<<<<<<< HEAD
      let endpoint = '/student/diary';
      if (isCoordinatorView === 'true' && studentId) {
        endpoint = `/coordinator/students/${studentId}/diary`;
      }
      const response = await api.get(endpoint, { params: { period: selectedPeriod } });
=======
      const response = await api.get('/student/diary', { params: { period: selectedPeriod } });
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      setDiaryData(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
<<<<<<< HEAD
      case 'Positivo': return { bg: '#eafaf1', text: Colors.status.approved, border: 'rgba(46, 204, 113, 0.2)' };
      case 'Leve': return { bg: '#fef9ec', text: Colors.status.pending, border: 'rgba(243, 156, 18, 0.2)' };
      case 'Grave': return { bg: '#fdf0ef', text: Colors.status.rejected, border: 'rgba(231, 76, 60, 0.2)' };
      case 'Muy Grave': return { bg: 'rgba(11, 25, 86, 0.1)', text: Colors.primary, border: 'rgba(11, 25, 86, 0.2)' };
      default: return { bg: Colors.background, text: Colors.text.muted, border: Colors.gray[200] };
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Información no disponible';
    const date = new Date(dateStr);
    return date.toLocaleString('es-SV', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(' a las', ' •');
  };

=======
      case 'Positivo': return { bg: '#eafaf1', text: '#2ecc71', border: 'rgba(46, 204, 113, 0.2)' };
      case 'Leve': return { bg: '#fef9ec', text: '#f39c12', border: 'rgba(243, 156, 18, 0.2)' };
      case 'Grave': return { bg: '#fdf0ef', text: '#e74c3c', border: 'rgba(231, 76, 60, 0.2)' };
      case 'Muy Grave': return { bg: 'rgba(11, 25, 86, 0.1)', text: '#0B1956', border: 'rgba(11, 25, 86, 0.2)' };
      default: return { bg: '#F5F7FA', text: '#888', border: '#E0E0E0' };
    }
  };

>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  const absences = diaryData.attendance.filter(a => a.status === 'absent');

  if (loading && diaryData.conduct.length === 0) {
    return (
      <View style={styles.center}>
<<<<<<< HEAD
        <ActivityIndicator size="large" color={Colors.primary} />
=======
        <ActivityIndicator size="large" color="#0B1956" />
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
<<<<<<< HEAD
        <Text style={styles.headerTitle}>{isCoordinatorView === 'true' ? 'Diario del Alumno' : 'Diario Pedagógico'}</Text>
=======
        <Text style={styles.headerTitle}>Diario Pedagógico</Text>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
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
<<<<<<< HEAD
              <Text style={[styles.periodText, selectedPeriod === p && styles.periodTextActive]}>P{p}</Text>
=======
              <Text style={[styles.periodText, selectedPeriod === p && styles.periodTextActive]}>Periodo {p}</Text>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.content}>
        {/* Conduct Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
<<<<<<< HEAD
            <AlertCircle color={Colors.primary} size={22} />
=======
            <AlertCircle color="#f5a623" size={20} />
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            <Text style={styles.sectionTitle}>Registro de Conducta</Text>
          </View>
          
          {diaryData.conduct.length === 0 ? (
            <View style={styles.emptyCard}>
<<<<<<< HEAD
              <Text style={styles.emptyText}>Sin registros de conducta</Text>
            </View>
          ) : (
            diaryData.conduct.map(record => {
              const colors = getCategoryColor(record.codigo?.nivel_gravedad);
              return (
                <View key={record.id} style={[styles.recordCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <View style={styles.recordHeader}>
                    <Text style={[styles.recordName, { color: Colors.text.primary }]}>{record.codigo?.nombre}</Text>
                    <View style={styles.badge}>
                      <Text style={[styles.badgeText, { color: colors.text }]}>{record.codigo?.nivel_gravedad}</Text>
                    </View>
                  </View>

                  <View style={styles.traceInfo}>
                    <View style={styles.traceItem}>
                      <Clock size={12} color={Colors.text.muted} />
                      <Text style={styles.traceText}>{formatDateTime(record.fecha_aplicacion)}</Text>
                    </View>
                    
                    <View style={styles.traceItem}>
                      <User size={12} color={Colors.text.muted} />
                      <Text style={styles.traceText}>
                        {record.maestro_aplicador 
                          ? `Aplicado por: Prof. ${record.maestro_aplicador.nombre} ${record.maestro_aplicador.apellido} — ${record.maestro_aplicador.materia_principal}`
                          : 'Información no disponible'}
                      </Text>
                    </View>
                  </View>

                  {record.observacion ? (
                    <Text style={styles.recordObs}>{record.observacion}</Text>
                  ) : null}
=======
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
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                </View>
              );
            })
          )}
        </View>

        {/* Attendance Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
<<<<<<< HEAD
            <Calendar color={Colors.primary} size={22} />
=======
            <Calendar color="#f5a623" size={20} />
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            <Text style={styles.sectionTitle}>Registro de Inasistencias</Text>
          </View>

          {absences.length === 0 ? (
            <View style={[styles.emptyCard, { alignItems: 'center' }]}>
              <View style={styles.goodIcon}>
<<<<<<< HEAD
                <CheckCircle color={Colors.status.approved} size={24} />
              </View>
              <Text style={[styles.emptyText, { textAlign: 'center' }]}>¡Excelente asistencia! Sin faltas en este periodo.</Text>
=======
                <CheckCircle color="#2ecc71" size={24} />
              </View>
              <Text style={[styles.emptyText, { textAlign: 'center' }]}>¡Excelente asistencia! No tienes faltas en este periodo.</Text>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            </View>
          ) : (
            absences.map(att => (
              <View key={att.id} style={styles.absenceCard}>
                <View style={styles.absenceIcon}>
<<<<<<< HEAD
                  <Calendar color={Colors.status.rejected} size={18} />
                </View>
                <View>
                  <Text style={styles.absenceDate}>{new Date(att.date).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
=======
                  <Calendar color="#e74c3c" size={18} />
                </View>
                <View>
                  <Text style={styles.absenceDate}>{new Date(att.date).toLocaleDateString()}</Text>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
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
<<<<<<< HEAD
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    paddingBottom: Spacing['4xl'],
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    alignItems: 'center',
  },
  headerTitle: { color: Colors.text.inverse, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.size.xs, marginTop: 4, textTransform: 'uppercase' },
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
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  periodSelectorContainer: {
    alignItems: 'center',
    marginTop: -25,
  },
  periodSelector: {
    flexDirection: 'row',
<<<<<<< HEAD
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    padding: 6,
    ...Shadows.elevated,
  },
  periodBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.full,
=======
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
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  },
  periodBtnActive: {
    backgroundColor: '#FFF',
  },
  periodText: {
    color: 'rgba(255,255,255,0.7)',
<<<<<<< HEAD
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.sm,
  },
  periodTextActive: {
    color: Colors.primary,
  },
  content: {
    padding: Spacing.xl,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.card,
=======
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
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
<<<<<<< HEAD
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  emptyCard: {
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  emptyText: {
    color: Colors.text.muted,
    fontWeight: Typography.weight.medium,
  },
  recordCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
=======
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
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
<<<<<<< HEAD
    marginBottom: Spacing.sm,
  },
  recordName: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    flex: 1,
    marginRight: Spacing.sm,
=======
    marginBottom: 8,
  },
  recordName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
<<<<<<< HEAD
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: Typography.size.xs - 2,
    fontWeight: Typography.weight.extraBold,
    textTransform: 'uppercase',
  },
  traceInfo: {
    marginBottom: Spacing.md,
    gap: 4,
  },
  traceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  traceText: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    fontWeight: Typography.weight.medium,
  },
  recordObs: {
    color: Colors.text.secondary,
    fontSize: Typography.size.sm,
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  recordDate: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
=======
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
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
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
<<<<<<< HEAD
    marginBottom: Spacing.md,
=======
    marginBottom: 12,
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  },
  absenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
<<<<<<< HEAD
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(11, 25, 86, 0.05)',
    marginBottom: Spacing.md,
=======
    backgroundColor: '#F5F7FA',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(11, 25, 86, 0.05)',
    marginBottom: 12,
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  },
  absenceIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#fdf0ef',
<<<<<<< HEAD
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  absenceDate: {
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    fontSize: Typography.size.lg,
  },
  absenceLabel: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    fontWeight: Typography.weight.bold,
=======
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
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    marginTop: 2,
  },
});
