import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';
import { supabase } from '../src/utils/supabase';
import { AlertCircle, Calendar, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import TrafficLightCard from '../src/components/TrafficLightCard';
import PageHeader from '../src/components/PageHeader';

export default function DiaryScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);
  const [diaryData, setDiaryData] = useState({ conduct: [], attendance: [] });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const { studentId, isCoordinatorView } = useLocalSearchParams();

  useEffect(() => {
    fetchDiary();
  }, [selectedPeriod, studentId]);

  const formatLocalDate = (dateStr) => {
    if (!dateStr) return '';
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const clean = dateStr.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
      }
    }
    return new Date(dateStr).toLocaleDateString();
  };

  const fetchDiary = async () => {
    setLoading(true);
    try {
      let endpoint = '/student/diary';
      if (isCoordinatorView === 'true' && studentId) {
        endpoint = `/coordinator/students/${studentId}/diary`;
      }
      const response = await api.get(endpoint, { params: { period: selectedPeriod } });
      const rawData = response.data || { conduct: [], attendance: [] };
      let conductList = rawData.conduct || [];
      let attendanceList = rawData.attendance || [];

      // Fallback para resolver docentes/coordinadores en conductList si aún no vienen
      const missingTeacherIds = [...new Set(conductList.filter(c => !c.teacher && c.teacher_id).map(c => c.teacher_id))];
      if (missingTeacherIds.length > 0) {
        try {
          const { data: teacherProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('id', missingTeacherIds);
          if (teacherProfiles && teacherProfiles.length > 0) {
            conductList = conductList.map(c => {
              if (!c.teacher && c.teacher_id) {
                const found = teacherProfiles.find(p => p.id === c.teacher_id);
                if (found) return { ...c, teacher: found };
              }
              return c;
            });
          }
        } catch (tErr) {
          console.error('Error fetching teacher profiles fallback:', tErr);
        }
      }

      // Si hay registros de día completo en la misma fecha, unificarlos para mostrar solo 1 card
      const seenFullDayDates = new Set();
      const filteredAttendance = [];
      attendanceList.forEach(att => {
        const rawMsg = att.coordinator_message || '';
        const isFullDay = rawMsg.includes('[JORNADA COMPLETA]') || att.subjects?.name === 'Día completo';
        const dateStr = att.date ? att.date.split('T')[0] : '';
        if (isFullDay && dateStr) {
          if (!seenFullDayDates.has(dateStr)) {
            seenFullDayDates.add(dateStr);
            filteredAttendance.push({ ...att, subjects: { name: 'Día completo' }, isFullDay: true });
          }
        } else {
          filteredAttendance.push(att);
        }
      });

      setDiaryData({ conduct: conductList, attendance: filteredAttendance });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Positivo': return { bg: theme === 'dark' ? 'rgba(46, 204, 113, 0.1)' : '#eafaf1', text: '#2ecc71', border: 'rgba(46, 204, 113, 0.2)' };
      case 'Leve': return { bg: theme === 'dark' ? 'rgba(243, 156, 18, 0.1)' : '#fef9ec', text: '#f39c12', border: 'rgba(243, 156, 18, 0.2)' };
      case 'Grave': return { bg: theme === 'dark' ? 'rgba(231, 76, 60, 0.1)' : '#fdf0ef', text: '#e74c3c', border: 'rgba(231, 76, 60, 0.2)' };
      case 'Muy Grave': return { bg: theme === 'dark' ? 'rgba(142, 68, 173, 0.1)' : 'rgba(11, 25, 86, 0.1)', text: theme === 'dark' ? '#8E44AD' : '#0B1956', border: theme === 'dark' ? 'rgba(142, 68, 173, 0.2)' : 'rgba(11, 25, 86, 0.2)' };
      default: return { bg: Colors.background, text: Colors.text.muted, border: Colors.gray[200] };
    }
  };

  const absences = diaryData.attendance.filter(a => a.status === 'absent' || a.status === 'justified');

  if (loading && diaryData.conduct.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const headerBgColor = theme === 'dark' ? Colors.card : (Colors.headerC || Colors.primary || '#0B1956');

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
    >
      <View style={{ position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: headerBgColor }} />
      <PageHeader 
        title={t('titles.diary', 'Diario Pedagógico')} 
        subtitle={t('titles.diarySubtitle', 'Seguimiento de conducta y asistencia')} 
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
              <Text style={[styles.periodText, selectedPeriod === p && styles.periodTextActive]}>{t('dashboard.period')} {p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.content}>
        {/* Semáforo de Conducta (4 Colores) */}
        <TrafficLightCard 
          conductRecords={diaryData.conduct} 
          attendanceRecords={diaryData.attendance} 
        />

        {/* Conduct Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <AlertCircle color="#f5a623" size={20} />
            <Text style={styles.sectionTitle}>{t('dashboard.conductRecord')}</Text>
          </View>
          
          {diaryData.conduct.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('dashboard.noConductRecords')}</Text>
            </View>
          ) : (
            diaryData.conduct.map(record => {
              const colors = getCategoryColor(record.conduct_codes?.category);
              return (
                <View key={record.id} style={[styles.recordCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <View style={styles.recordHeader}>
                    <Text style={[styles.recordName, { color: theme === 'dark' ? '#FFF' : '#333' }]}>{record.conduct_codes?.name}</Text>
                    <View style={styles.badge}>
                      <Text style={[styles.badgeText, { color: colors.text }]}>{record.conduct_codes?.category}</Text>
                    </View>
                  </View>
                  {record.observation && <Text style={styles.recordObs}>{record.observation}</Text>}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 6 }}>
                    <Text style={styles.recordDate}>{formatLocalDate(record.created_at)}</Text>
                    {record.teacher?.full_name ? (
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
                        {record.teacher.role === 'coordinator' ? '🏛️ Coord: ' : '👨‍🏫 Docente: '}
                        {record.teacher.full_name}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Attendance Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Calendar color="#f5a623" size={20} />
            <Text style={styles.sectionTitle}>{t('dashboard.attendanceRecord')}</Text>
          </View>

          {absences.length === 0 ? (
            <View style={[styles.emptyCard, { alignItems: 'center' }]}>
              <View style={styles.goodIcon}>
                <CheckCircle color="#2ecc71" size={24} />
              </View>
              <Text style={[styles.emptyText, { textAlign: 'center' }]}>{t('dashboard.excellentAttendance')}</Text>
            </View>
          ) : (
            absences.map(att => {
              const isJustified = att.status === 'justified';
              const rawMsg = att.coordinator_message || '';
              const timeMatch = rawMsg.match(/\[HORARIO:\s*([^\]]+)\]/i);
              const isFullDay = rawMsg.includes('[JORNADA COMPLETA]') || att.subjects?.name === 'Día completo';
              const cleanMsg = rawMsg
                .replace(/\[HORARIO:\s*[^\]]+\]/gi, '')
                .replace(/\[JORNADA COMPLETA\]/gi, '')
                .trim();

              return (
                <View key={att.id} style={[styles.absenceCard, isJustified && { backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1 }]}>
                  <View style={[styles.absenceIcon, isJustified && { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    {isJustified ? (
                      <CheckCircle color="#10b981" size={18} />
                    ) : (
                      <Calendar color="#e74c3c" size={18} />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {/* Header Row: Fecha a la izquierda y Pill a la derecha */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={styles.absenceDate}>{formatLocalDate(att.date)}</Text>
                      <View style={{ 
                        backgroundColor: isJustified ? '#dcfce7' : '#fee2e2',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12
                      }}>
                        <Text style={{ 
                          fontSize: 10.5, 
                          fontWeight: 'bold', 
                          color: isJustified ? '#166534' : '#991b1b'
                        }}>
                          {isJustified ? 'Justificada' : 'Inasistencia'}
                        </Text>
                      </View>
                    </View>

                    {/* Scope tags row: Horario o Día completo */}
                    {(timeMatch || isFullDay) && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        {timeMatch && (
                          <View style={{
                            backgroundColor: '#e0f2fe',
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 8
                          }}>
                            <Text style={{
                              fontSize: 10,
                              fontWeight: '600',
                              color: '#0284c7'
                            }}>
                              🕒 {timeMatch[1]}
                            </Text>
                          </View>
                        )}
                        {isFullDay && (
                          <View style={{
                            backgroundColor: '#f1f5f9',
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 8
                          }}>
                            <Text style={{
                              fontSize: 10,
                              fontWeight: '600',
                              color: '#475569'
                            }}>
                              📅 Día completo
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Materias o Día Completo */}
                    <Text style={styles.absenceLabel}>
                      {isFullDay ? 'Día completo' : (att.subjects?.name || (isJustified ? 'Inasistencia Justificada' : 'Clase'))}
                    </Text>

                    {isJustified && cleanMsg ? (
                      <Text style={{ fontSize: 11, color: Colors.text.muted, marginTop: 3, fontStyle: 'italic' }}>
                        Nota: {cleanMsg}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  periodSelectorContainer: {
    alignItems: 'center',
    marginTop: -10,
    zIndex: 10,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: theme === 'dark' ? Colors.card : Colors.primary,
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
    color: theme === 'dark' ? '#FFF' : Colors.primary,
  },
  content: {
    padding: 20,
  },
  section: {
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
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  emptyCard: {
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: 16,
  },
  emptyText: {
    color: Colors.text.muted,
    fontWeight: '500',
  },
  recordCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
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
    color: Colors.text.primary,
    flex: 1,
    marginRight: 10,
  },
  badge: {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)',
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
    color: Colors.text.secondary,
    fontSize: 14,
    marginBottom: 10,
  },
  recordDate: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.text.muted,
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  goodIcon: {
    width: 48,
    height: 48,
    backgroundColor: theme === 'dark' ? 'rgba(46, 204, 113, 0.15)' : '#eafaf1',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  absenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    marginBottom: 12,
  },
  absenceIcon: {
    width: 40,
    height: 40,
    backgroundColor: theme === 'dark' ? 'rgba(231, 76, 60, 0.15)' : '#fdf0ef',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  absenceDate: {
    fontWeight: 'bold',
    color: Colors.text.primary,
    fontSize: 16,
  },
  absenceLabel: {
    fontSize: 12,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: 2,
  },
});
