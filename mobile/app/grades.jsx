import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import api from '../src/utils/api';
import { ChevronDown, ChevronUp, Award, Book } from 'lucide-react-native';

export default function GradesScreen() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      const response = await api.get('/student/grades');
      setGrades(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Group grades by subject
  const groupedGrades = grades.reduce((acc, grade) => {
    const subjectName = grade.class_assignments?.subjects?.name || 'Desconocida';
    if (!acc[subjectName]) acc[subjectName] = [];
    acc[subjectName].push(grade);
    return acc;
  }, {});

  // Calculate subject averages based on weight
  const getSubjectAverage = (subjectGrades) => {
    let totalWeight = 0;
    let weightedSum = 0;
    subjectGrades.forEach(g => {
      const weight = g.class_assignments?.weight || 0;
      weightedSum += (g.grade * (weight / 100));
      totalWeight += weight;
    });
    
    return {
      average: (weightedSum).toFixed(2),
      progress: totalWeight
    };
  };

  const getOverallAverage = () => {
    const keys = Object.keys(groupedGrades);
    if (keys.length === 0) return "0.00";
    let sum = 0;
    keys.forEach(k => {
      sum += parseFloat(getSubjectAverage(groupedGrades[k]).average);
    });
    return (sum / keys.length).toFixed(2);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B1956" />
      </View>
    );
  }

  const overall = getOverallAverage();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sistema de Calificaciones</Text>
        <Text style={styles.headerSubtitle}>Tus notas registradas</Text>
      </View>

      <ScrollView style={styles.content}>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconBox}>
            <Award size={32} color="#0B1956" />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Promedio Global Parcial</Text>
            <Text style={styles.summaryValue}>{overall} / 100</Text>
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
            const stats = getSubjectAverage(subjectGrades);
            const isExpanded = expandedSubject === subject;

            return (
              <View key={idx} style={styles.subjectCard}>
                <TouchableOpacity 
                  style={styles.subjectHeader} 
                  onPress={() => setExpandedSubject(isExpanded ? null : subject)}
                  activeOpacity={0.7}
                >
                  <View style={styles.subjectTitleRow}>
                    <Book size={20} color="#0B1956" />
                    <Text style={styles.subjectName}>{subject}</Text>
                  </View>
                  <View style={styles.subjectStatsRow}>
                    <View style={styles.gradeBadge}>
                      <Text style={styles.gradeBadgeText}>{stats.average}</Text>
                    </View>
                    {isExpanded ? <ChevronUp size={20} color="#8a8da0" /> : <ChevronDown size={20} color="#8a8da0" />}
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
                          {g.class_assignments?.title || 'Asignación'}
                        </Text>
                        <Text style={styles.tableCell}>{g.class_assignments?.weight}%</Text>
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
  container: { flex: 1, backgroundColor: '#F5F7FA' },
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
  content: {
    padding: 20,
    marginTop: -30,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#0B1956',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 5,
    alignItems: 'center',
  },
  summaryIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#e6eaf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8a8da0',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0B1956',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B1956',
    marginBottom: 16,
    marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8a8da0',
    textAlign: 'center',
    lineHeight: 20,
  },
  subjectCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  subjectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1956',
    marginLeft: 12,
  },
  subjectStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  gradeBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  expandedContent: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableCol: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
  },
  cellBold: {
    fontWeight: '700',
    color: '#0B1956',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'right',
  }
});
