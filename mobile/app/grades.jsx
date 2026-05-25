import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';
import { ChevronDown, ChevronUp, Award, Book } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function GradesScreen() {
  const [grades, setGrades] = useState([]);
  const [averages, setAverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const { studentId, isCoordinatorView } = useLocalSearchParams();

  useEffect(() => {
    fetchGradesAndAverages();
  }, [selectedPeriod, studentId]);

  const fetchGradesAndAverages = async () => {
    try {
      setLoading(true);
      let gradesEndpoint = '/student/grades';
      let averagesEndpoint = '/student/averages';
      
      if (isCoordinatorView === 'true' && studentId) {
        gradesEndpoint = `/coordinator/students/${studentId}/grades`;
        averagesEndpoint = `/coordinator/students/${studentId}/averages`;
      }
      
      const [gradesRes, averagesRes] = await Promise.all([
        api.get(gradesEndpoint, { params: { period: selectedPeriod } }),
        api.get(averagesEndpoint, { params: { period: selectedPeriod } })
      ]);
      setGrades(gradesRes.data);
      setAverages(averagesRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Group grades by subject
  const groupedGrades = grades.reduce((acc, grade) => {
    const subjectName = grade.subjects?.name || 'Desconocida';
    if (!acc[subjectName]) acc[subjectName] = [];
    acc[subjectName].push(grade);
    return acc;
  }, {});

  // Get average from backend for a subject
  const getSubjectAverage = (subjectName) => {
    const subjectGrades = groupedGrades[subjectName] || [];
    
    // Calculate progress based on activities with grades vs total possible activities
    const uniqueActivities = {};
    subjectGrades.forEach(g => {
      const activityName = g.evaluation_activities?.name;
      const percentage = g.evaluation_activities?.percentage || 0;
      if (activityName && !uniqueActivities[activityName]) {
        uniqueActivities[activityName] = percentage;
      }
    });
    const progress = Object.values(uniqueActivities).reduce((sum, p) => sum + p, 0);
    
    const avg = averages.find(a => a.subjects?.name === subjectName);
    if (avg) {
      return {
        average: parseFloat(avg.final_average || 0).toFixed(2),
        progress: Math.min(progress, 100)
      };
    }
    
    return {
      average: "0.00",
      progress: progress
    };
  };

  const getOverallAverage = () => {
    if (averages.length > 0) {
      const validAverages = averages
        .map(a => parseFloat(a.final_average || 0));
      
      if (validAverages.length > 0) {
        const sum = validAverages.reduce((acc, val) => acc + val, 0);
        return (sum / validAverages.length).toFixed(2);
      }
    }
    return "0.00";
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const overall = getOverallAverage();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isCoordinatorView === 'true' ? 'Notas del Alumno' : 'Sistema de Calificaciones'}</Text>
        <Text style={styles.headerSubtitle}>{isCoordinatorView === 'true' ? 'Notas registradas del estudiante' : 'Tus notas registradas'}</Text>

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
      </View>

      <ScrollView style={styles.content}>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconBox}>
            <Award size={32} color={Colors.primary} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Promedio Global Parcial</Text>
            <Text style={styles.summaryValue}>{overall} / 10</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Tus Materias</Text>

        {Object.keys(groupedGrades).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aún no tienes calificaciones registradas en este periodo.</Text>
          </View>
        ) : (
          Object.keys(groupedGrades).map((subject, idx) => {
            const subjectGrades = groupedGrades[subject];
            const stats = getSubjectAverage(subject);
            const isExpanded = expandedSubject === subject;

            return (
              <View key={idx} style={styles.subjectCard}>
                <TouchableOpacity 
                  style={styles.subjectHeader} 
                  onPress={() => setExpandedSubject(isExpanded ? null : subject)}
                  activeOpacity={0.7}
                >
                  <View style={styles.subjectTitleRow}>
                    <Book size={20} color={Colors.primary} />
                    <Text style={styles.subjectName}>{subject}</Text>
                  </View>
                  <View style={styles.subjectStatsRow}>
                    <View style={styles.gradeBadge}>
                      <Text style={styles.gradeBadgeText}>{stats.average}</Text>
                    </View>
                    {isExpanded ? <ChevronUp size={20} color={Colors.text.muted} /> : <ChevronDown size={20} color={Colors.text.muted} />}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCol, {flex: 2}]}>Evaluación</Text>
                      <Text style={styles.tableCol}>Valor</Text>
                      <Text style={[styles.tableCol, {textAlign: 'right'}]}>Nota</Text>
                    </View>
                    {subjectGrades.map((g, i) => (
                      <View key={g.id || i} style={styles.tableRow}>
                        <Text style={[styles.tableCell, {flex: 2}]} numberOfLines={1}>
                          {g.evaluation_activities?.name || 'Asignación'}
                        </Text>
                        <Text style={styles.tableCell}>{g.evaluation_activities?.percentage || 0}%</Text>
                        <Text style={[styles.tableCell, styles.cellBold, {textAlign: 'right'}]}>{g.grade}</Text>
                      </View>
                    ))}
                    
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: Math.min(stats.progress, 100) + '%' }]} />
                      </View>
                      <Text style={styles.progressText}>{stats.progress}% evaluado del curso</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  periodTabs: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  periodTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  periodTabActive: {
    backgroundColor: '#FFF',
  },
  periodTabText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.sm,
  },
  periodTabTextActive: {
    color: Colors.primary,
  },
  content: {
    padding: Spacing.xl,
    marginTop: -30,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.card,
    alignItems: 'center',
  },
  summaryIconBox: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.extraBold,
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
    marginBottom: Spacing.lg,
    marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  subjectCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    ...Shadows.card,
    overflow: 'hidden',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  subjectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subjectName: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
    marginLeft: Spacing.md,
  },
  subjectStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  gradeBadgeText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.extraBold,
    color: '#166534',
  },
  expandedContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
    backgroundColor: Colors.gray[50],
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  tableCol: {
    flex: 1,
    fontSize: Typography.size.xs - 1,
    fontWeight: Typography.weight.bold,
    color: Colors.text.muted,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  tableCell: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  cellBold: {
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
  },
  progressContainer: {
    marginTop: Spacing.lg,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primaryLight,
    borderRadius: 3,
  },
  progressText: {
    fontSize: Typography.size.xs - 1,
    color: Colors.text.muted,
    textAlign: 'right',
  }
});
