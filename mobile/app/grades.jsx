import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';
import { ChevronDown, ChevronUp, Award, Book } from 'lucide-react-native';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import PageHeader from '../src/components/PageHeader';
import { generateAndDownloadStudentReport } from '../src/utils/pdfGenerator';
import { useAlert } from '../src/context/AlertContext';
import { useAuth } from '../src/context/AuthContext';

export default function GradesScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);
  const [grades, setGrades] = useState([]);
  const [averages, setAverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [studentDetails, setStudentDetails] = useState({});
  const { profile } = useAuth();
  const params = useLocalSearchParams();
  const { studentId: paramStudentId, id, isCoordinatorView: paramIsCoordinatorView, isCoordinator, name, grade, section, code } = params;
  const studentId = paramStudentId || id || profile?.id;
  const isCoordinatorView = paramIsCoordinatorView === 'true' || isCoordinator === 'true';
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchGradesAndAverages();
  }, [selectedPeriod, studentId]);

  const fetchGradesAndAverages = async () => {
    try {
      setLoading(true);
      let gradesEndpoint = '/student/grades';
      let averagesEndpoint = '/student/averages';
      
      if (isCoordinatorView && studentId) {
        gradesEndpoint = `/coordinator/students/${studentId}/grades`;
        averagesEndpoint = `/coordinator/students/${studentId}/averages`;
      }
      
      const [gradesRes, averagesRes] = await Promise.all([
        api.get(gradesEndpoint, { params: { period: selectedPeriod } }),
        api.get(averagesEndpoint, { params: { period: selectedPeriod } })
      ]);
      setGrades(gradesRes.data);
      setAverages(averagesRes.data || []);
      
      if (isCoordinatorView) {
        setStudentDetails({ 
          full_name: name || 'Estudiante',
          grade: grade || '',
          section: section || 'A',
          institutional_code: code || ''
        });
      } else {
        setStudentDetails(profile || {});
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (selectedPeriod > 2) {
      showAlert({
        type: 'warning',
        title: 'Periodo Incompleto',
        message: 'El boletín de este periodo aún no está disponible para descargar.'
      });
      return;
    }
    try {
      setLoading(true);
      await generateAndDownloadStudentReport(studentId, selectedPeriod, studentDetails);
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: 'No se pudo generar el boletín PDF.' });
    } finally {
      setLoading(false);
    }
  };

  const groupedGrades = grades.reduce((acc, grade) => {
    const subjectName = grade.subjects?.name || 'Desconocida';
    if (!acc[subjectName]) acc[subjectName] = [];
    acc[subjectName].push(grade);
    return acc;
  }, {});

  const getSubjectAverage = (subjectName) => {
    const subjectGrades = groupedGrades[subjectName] || [];
    
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

  const getGradeColor = (average) => {
    const num = parseFloat(average);
    if (num >= 8) return { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' };
    if (num >= 6) return { bg: '#fefce8', border: '#fde68a', text: '#854d0e' };
    return { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' };
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
    <ScrollView style={styles.container}>
      <PageHeader 
        title={t('titles.grades', 'Calificaciones y Notas')} 
        subtitle={isCoordinatorView ? t('titles.gradesSubtitleCoordinator', 'Consulta de notas del estudiante') : t('titles.gradesSubtitle', 'Resumen de rendimiento académico')} 
      />

      <View style={styles.periodSelectorContainer}>
        <View style={styles.periodSelector}>
          {[1, 2, 3, 4].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, selectedPeriod === p && styles.periodBtnActive]}
              onPress={() => setSelectedPeriod(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodText, selectedPeriod === p && styles.periodTextActive]}>
                {t('dashboard.period')} {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isCoordinatorView && (
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <TouchableOpacity 
            style={[styles.downloadBtn, { backgroundColor: Colors.primary }]} 
            onPress={handleDownloadPDF}
            activeOpacity={0.8}
          >
            <Book size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Descargar Boletín P{selectedPeriod} (PDF)</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconBox}>
            <Award size={32} color={Colors.primary} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>{t('dashboard.partialGlobalAverage')}</Text>
            <Text style={styles.summaryValue}>{overall} / 10</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('dashboard.yourSubjects')}</Text>

        {Object.keys(groupedGrades).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('dashboard.noGradesYet')}</Text>
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
                    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(stats.average).bg, borderColor: getGradeColor(stats.average).border }]}>
                      <Text style={[styles.gradeBadgeText, { color: getGradeColor(stats.average).text }]}>{stats.average}</Text>
                    </View>
                    {isExpanded ? <ChevronUp size={20} color={Colors.text.muted} /> : <ChevronDown size={20} color={Colors.text.muted} />}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCol, {flex: 2}]}>{t('dashboard.evaluation')}</Text>
                      <Text style={styles.tableCol}>{t('dashboard.value')}</Text>
                      <Text style={[styles.tableCol, {textAlign: 'right'}]}>{t('dashboard.grade')}</Text>
                    </View>
                    {subjectGrades.map((g, i) => (
                      <View key={g.id || i} style={styles.tableRow}>
                        <Text style={[styles.tableCell, {flex: 2}]} numberOfLines={1}>
                          {g.evaluation_activities?.name || t('dashboard.evaluation')}
                        </Text>
                        <Text style={styles.tableCell}>{g.evaluation_activities?.percentage || 0}%</Text>
                        <Text style={[styles.tableCell, styles.cellBold, {textAlign: 'right'}]}>{g.grade}</Text>
                      </View>
                    ))}
                    
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: Math.min(stats.progress, 100) + '%' }]} />
                      </View>
                      <Text style={styles.progressText}>{stats.progress}{t('dashboard.evaluatedOfCourse')}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background},
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: theme === 'dark' ? Colors.card : '#0B1956',
    padding: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    borderBottomWidth: theme === 'dark' ? 1 : 0,
    borderBottomColor: Colors.gray[200],
  },
  headerTitle: { color: theme === 'dark' ? Colors.primary : '#FFF', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: theme === 'dark' ? Colors.text.secondary : 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, textTransform: 'uppercase' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  periodSelectorContainer: {
    alignItems: 'center',
    marginTop: -10,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: theme === 'dark' ? Colors.background : '#0B1956',
    borderRadius: 25,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[200],
  },
  periodBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  periodBtnActive: {
    backgroundColor: theme === 'dark' ? Colors.card : '#FFF',
  },
  periodText: {
    color: theme === 'dark' ? Colors.text.muted : 'rgba(255,255,255,0.7)',
    fontWeight: 'bold',
    fontSize: 12,
  },
  periodTextActive: {
    color: theme === 'dark' ? Colors.primary : '#0B1956',
  },
  content: {
    padding: 20,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[100],
    alignItems: 'center',
  },
  summaryIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
    marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[100],
  },
  emptyText: {
    color: Colors.text.muted,
    textAlign: 'center',
  },
  subjectCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[100],
    overflow: 'hidden',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  subjectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
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
    fontWeight: 'bold',
    color: '#166534',
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    fontSize: 12,
    fontWeight: 'bold',
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
    fontSize: 14,
    color: Colors.text.secondary,
  },
  cellBold: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  progressContainer: {
    marginTop: 16,
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
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'right',
  }
});
