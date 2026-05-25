import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';
import { AlertCircle, Calendar, CheckCircle, Clock, User } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function DiaryScreen() {
  const [diaryData, setDiaryData] = useState({ conduct: [], attendance: [] });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const { studentId, isCoordinatorView } = useLocalSearchParams();

  useEffect(() => {
    fetchDiary();
  }, [selectedPeriod, studentId]);

  const fetchDiary = async () => {
    setLoading(true);
    try {
      let endpoint = '/student/diary';
      if (isCoordinatorView === 'true' && studentId) {
        endpoint = `/coordinator/students/${studentId}/diary`;
      }
      const response = await api.get(endpoint, { params: { period: selectedPeriod } });
      setDiaryData(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
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

  const absences = diaryData.attendance.filter(a => a.status === 'absent');

  if (loading && diaryData.conduct.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isCoordinatorView === 'true' ? 'Diario del Alumno' : 'Diario Pedagógico'}</Text>
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
              <Text style={[styles.periodText, selectedPeriod === p && styles.periodTextActive]}>P{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.content}>
        {/* Conduct Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <AlertCircle color={Colors.primary} size={22} />
            <Text style={styles.sectionTitle}>Registro de Conducta</Text>
          </View>
          
          {diaryData.conduct.length === 0 ? (
            <View style={styles.emptyCard}>
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
                </View>
              );
            })
          )}
        </View>

        {/* Attendance Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Calendar color={Colors.primary} size={22} />
            <Text style={styles.sectionTitle}>Registro de Inasistencias</Text>
          </View>

          {absences.length === 0 ? (
            <View style={[styles.emptyCard, { alignItems: 'center' }]}>
              <View style={styles.goodIcon}>
                <CheckCircle color={Colors.status.approved} size={24} />
              </View>
              <Text style={[styles.emptyText, { textAlign: 'center' }]}>¡Excelente asistencia! Sin faltas en este periodo.</Text>
            </View>
          ) : (
            absences.map(att => (
              <View key={att.id} style={styles.absenceCard}>
                <View style={styles.absenceIcon}>
                  <Calendar color={Colors.status.rejected} size={18} />
                </View>
                <View>
                  <Text style={styles.absenceDate}>{new Date(att.date).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
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
  periodSelectorContainer: {
    alignItems: 'center',
    marginTop: -25,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    padding: 6,
    ...Shadows.elevated,
  },
  periodBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.full,
  },
  periodBtnActive: {
    backgroundColor: '#FFF',
  },
  periodText: {
    color: 'rgba(255,255,255,0.7)',
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
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  recordName: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    flex: 1,
    marginRight: Spacing.sm,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    marginBottom: Spacing.md,
  },
  absenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(11, 25, 86, 0.05)',
    marginBottom: Spacing.md,
  },
  absenceIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#fdf0ef',
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
    marginTop: 2,
  },
});
