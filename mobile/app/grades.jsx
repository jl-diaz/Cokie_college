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
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [activeAcademicPeriod, setActiveAcademicPeriod] = useState(4);
  const [studentDetails, setStudentDetails] = useState({});
  const { profile } = useAuth();
  const params = useLocalSearchParams();
  const { studentId: paramStudentId, id, isCoordinatorView: paramIsCoordinatorView, isCoordinator, name, grade, section, code } = params;
  const studentId = paramStudentId || id || profile?.id;
  const isCoordinatorView = paramIsCoordinatorView === 'true' || isCoordinator === 'true';
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchActivePeriod();
  }, []);

  const fetchActivePeriod = async () => {
    try {
      const res = await api.get('/student/active-period');
      if (res.data?.activePeriod) {
        setActiveAcademicPeriod(res.data.activePeriod);
        setSelectedPeriod(res.data.activePeriod);
      } else {
        fallbackPeriodCalc();
      }
    } catch (e) {
      fallbackPeriodCalc();
    }
  };

  const fallbackPeriodCalc = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    let period = 4;
    if (month <= 3) period = 1;
    else if (month <= 5) period = 2;
    else if (month <= 8) period = 3;
    else period = 4;
    setActiveAcademicPeriod(period);
    setSelectedPeriod(period);
  };

  useEffect(() => {
    if (selectedPeriod !== null) {
      fetchGradesAndAverages();
    }
  }, [selectedPeriod, studentId]);

  const fetchGradesAndAverages = async () => {
    if (selectedPeriod === null) return;
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
      setGrades(gradesRes.data || []);
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
    if (grades.length === 0) {
      showAlert({
        type: 'warning',
        title: 'Sin calificaciones',
        message: 'No hay notas registradas en este periodo para generar el boletín.'
      });
      return;
    }
    try {
      setLoading(true);
      await generateAndDownloadStudentReport(studentId, selectedPeriod, studentDetails || profile);
      showAlert({
        type: 'success',
        title: 'Boletín Generado',
        message: 'El boletín se ha generado correctamente.'
      });
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
    if (avg && avg.final_average !== null && avg.final_average !== undefined) {
      return {
        average: parseFloat(avg.final_average).toFixed(2),
        progress: Math.min(progress, 100),
        hasGrade: true
      };
    }

    if (subjectGrades.length > 0 && progress > 0) {
      const sum = subjectGrades.reduce((acc, g) => acc + (parseFloat(g.grade || 0) * (parseFloat(g.evaluation_activities?.percentage || g.activities?.percentage || 0) / 100)), 0);
      const calculated = progress > 0 ? (sum / (progress / 100)).toFixed(2) : "0.00";
      return {
        average: calculated,
        progress: Math.min(progress, 100),
        hasGrade: true
      };
    }
    
    return {
      average: "—",
      progress: progress,
      hasGrade: false
    };
  };

  const getGradeColor = (average) => {
    if (!average || average === '—') {
      return { 
        bg: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9', 
        border: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0', 
        text: theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : '#64748B' 
      };
    }
    const num = parseFloat(average);
    if (isNaN(num)) {
      return { 
        bg: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9', 
        border: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0', 
        text: theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : '#64748B' 
      };
    }
    if (theme === 'dark') {
      return { 
        bg: 'rgba(255, 255, 255, 0.06)', 
        border: 'rgba(255, 255, 255, 0.12)', 
        text: Colors.text.secondary || '#CBD5E0' 
      };
    }
    if (num >= 8) return { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' };
    if (num >= 6) return { bg: '#fefce8', border: '#fde68a', text: '#854d0e' };
    return { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' };
  };

  const getOverallAverage = () => {
    const subjects = Object.keys(groupedGrades);
    if (subjects.length > 0) {
      const evaluatedSubjects = subjects.filter(subject => {
        const sub = getSubjectAverage(subject);
        return sub.hasGrade && sub.average !== "—" && !isNaN(parseFloat(sub.average));
      });
      if (evaluatedSubjects.length > 0) {
        const sum = evaluatedSubjects.reduce((acc, subject) => {
          return acc + parseFloat(getSubjectAverage(subject).average);
        }, 0);
        return (sum / evaluatedSubjects.length).toFixed(2);
      }
    }
    return "—";
  };

  if (loading || selectedPeriod === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const overall = getOverallAverage();

  const headerBgColor = theme === 'dark' ? Colors.card : (Colors.headerC || Colors.primary || '#0B1956');

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
    >
      <View style={{ position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: headerBgColor }} />
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
            <Award size={32} color={theme === 'dark' ? (Colors.text.secondary || '#CBD5E0') : Colors.primary} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>{t('dashboard.partialGlobalAverage')}</Text>
            <Text style={styles.summaryValue}>{overall !== '—' ? `${overall} / 10` : '—'}</Text>
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
                    <Book size={20} color={theme === 'dark' ? (Colors.text.secondary || '#CBD5E0') : Colors.primary} />
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

const createStyles = (Colors, theme) => {
  const headerBgColor = theme === 'dark' ? Colors.card : (Colors.headerC || Colors.primary || '#0B1956');
  return StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background},
  container: { flex: 1, backgroundColor: headerBgColor },
  scrollContent: { flexGrow: 1, backgroundColor: Colors.background },
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
    backgroundColor: theme === 'dark' ? Colors.card : '#0B1956',
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
    backgroundColor: theme === 'dark' ? Colors.primary : '#FFF',
  },
  periodText: {
    color: theme === 'dark' ? Colors.text.muted : 'rgba(255,255,255,0.7)',
    fontWeight: 'bold',
    fontSize: 12,
  },
  periodTextActive: {
    color: theme === 'dark' ? '#FFFFFF' : '#0B1956',
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
    color: theme === 'dark' ? (Colors.text.secondary || '#CBD5E0') : Colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? (Colors.text.secondary || '#CBD5E0') : Colors.primary,
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
    color: theme === 'dark' ? (Colors.text.secondary || '#CBD5E0') : Colors.primary,
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
    color: theme === 'dark' ? (Colors.text.secondary || '#CBD5E0') : Colors.primary,
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
};
