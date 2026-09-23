import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../src/utils/api';
import { supabase } from '../src/utils/supabase';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
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
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const { studentId, isCoordinatorView } = useLocalSearchParams();

  useEffect(() => {
    let resolved = 4;
    try {
      const today = new Date().toISOString().split('T')[0];
      if (today >= '2026-08-17' && today <= '2026-10-24') resolved = 4;
      else if (today >= '2026-06-01' && today <= '2026-08-16') resolved = 3;
      else if (today >= '2026-03-22' && today <= '2026-05-31') resolved = 2;
      else resolved = 1;
    } catch (e) {}

    api.get('/student/active-period')
      .then(res => {
        if (res.data?.activePeriod) {
          setSelectedPeriod(res.data.activePeriod);
        } else {
          setSelectedPeriod(resolved);
        }
      })
      .catch(() => setSelectedPeriod(resolved));
  }, []);

  // Estado para controlar qué acordeones de conducta están abiertos
  const [expandedCategories, setExpandedCategories] = useState({
    Positivo: true,
    Leve: true,
    Grave: true,
    'Muy Grave': true
  });

  const toggleCategory = (catKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catKey]: !prev[catKey]
    }));
  };

  useEffect(() => {
    if (selectedPeriod !== null) {
      fetchDiary();
    }
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

  const absences = diaryData.attendance.filter(a => a.status === 'absent' || a.status === 'justified');

  // Agrupación de conductas por categoría
  const conductByCategory = React.useMemo(() => {
    const map = {
      Positivo: [],
      Leve: [],
      Grave: [],
      'Muy Grave': []
    };
    (diaryData.conduct || []).forEach(record => {
      const cat = record.conduct_codes?.category || 'Leve';
      if (!map[cat]) map[cat] = [];
      map[cat].push(record);
    });
    return map;
  }, [diaryData.conduct]);

  const categories = [
    { 
      key: 'Positivo', 
      label: t('semaforo.positives', 'Positivo'), 
      pillColor: '#0284C7',
      badgeBg: theme === 'dark' ? 'rgba(2, 132, 199, 0.2)' : '#E0F2FE',
      badgeText: theme === 'dark' ? '#7DD3FC' : '#0369A1'
    },
    { 
      key: 'Leve', 
      label: t('semaforo.leves', 'Leve'), 
      pillColor: theme === 'dark' ? '#A1A1AA' : '#18181B',
      badgeBg: theme === 'dark' ? '#27272A' : '#F4F4F5',
      badgeText: theme === 'dark' ? '#E4E4E7' : '#18181B'
    },
    { 
      key: 'Grave', 
      label: t('semaforo.graves', 'Grave'), 
      pillColor: '#BE185D',
      badgeBg: theme === 'dark' ? 'rgba(190, 24, 93, 0.2)' : '#FCE7F3',
      badgeText: theme === 'dark' ? '#F472B6' : '#9D174D'
    },
    { 
      key: 'Muy Grave', 
      label: t('semaforo.muyGraves', 'Muy Grave'), 
      pillColor: theme === 'dark' ? '#71717A' : '#18181B',
      badgeBg: theme === 'dark' ? '#27272A' : '#18181B',
      badgeText: theme === 'dark' ? '#F4F4F5' : '#FFFFFF'
    },
  ];

  if ((loading || selectedPeriod === null) && diaryData.conduct.length === 0) {
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
      contentContainerStyle={styles.scrollContent}
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
        {/* Semáforo de Conducta */}
        <TrafficLightCard 
          conductRecords={diaryData.conduct} 
          attendanceRecords={diaryData.attendance} 
        />

        {/* Conduct Section - Secciones independientes en estilo acordeón */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{t('dashboard.conductRecord', 'Historial de Conducta')}</Text>
          </View>

          {diaryData.conduct.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('dashboard.noConductRecords', 'No hay registros de conducta en este periodo')}</Text>
            </View>
          ) : (
            categories.map(cat => {
              const records = conductByCategory[cat.key] || [];
              const count = records.length;
              const isOpen = expandedCategories[cat.key];

              return (
                <View key={cat.key} style={[styles.accordionContainer, { borderColor: theme === 'dark' ? '#27272A' : '#E4E4E7' }]}>
                  {/* Cabecera táctil del acordeón */}
                  <TouchableOpacity 
                    style={[
                      styles.accordionHeader, 
                      { backgroundColor: theme === 'dark' ? '#18181B' : '#F8FAFC' },
                      isOpen && styles.accordionHeaderOpen
                    ]}
                    onPress={() => toggleCategory(cat.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.accordionHeaderLeft}>
                      <Text style={[styles.accordionTitle, { color: theme === 'dark' ? '#FFFFFF' : Colors.text.primary }]}>
                        {cat.label}
                      </Text>
                    </View>

                    {isOpen ? (
                      <ChevronUp size={18} color={theme === 'dark' ? '#A1A1AA' : '#64748B'} />
                    ) : (
                      <ChevronDown size={18} color={theme === 'dark' ? '#A1A1AA' : '#64748B'} />
                    )}
                  </TouchableOpacity>

                  {/* Contenido desplegable del acordeón */}
                  {isOpen && (
                    <View style={styles.accordionBody}>
                      {count === 0 ? (
                        <View style={styles.accordionEmpty}>
                          <Text style={styles.accordionEmptyText}>
                            {t('diary.noRecordsForCategory', { category: cat.label.toLowerCase(), defaultValue: `Sin registros de ${cat.label.toLowerCase()}` })}
                          </Text>
                        </View>
                      ) : (
                        records.map((record, index) => {
                          const isLast = index === records.length - 1;
                          return (
                            <View 
                              key={record.id} 
                              style={[
                                styles.cleanRecordItem, 
                                !isLast && styles.grayDivider
                              ]}
                            >
                              <View style={styles.cleanRecordHeader}>
                                <Text style={[styles.cleanRecordName, { color: theme === 'dark' ? '#FFFFFF' : Colors.text.primary }]}>
                                  {record.conduct_codes?.name}
                                </Text>
                                <View style={[styles.categoryPill, { backgroundColor: cat.badgeBg }]}>
                                  <Text style={[styles.categoryPillText, { color: cat.badgeText }]}>
                                    {cat.label}
                                  </Text>
                                </View>
                              </View>

                              {record.observation ? (
                                <Text style={styles.cleanRecordObs}>{record.observation}</Text>
                              ) : null}

                              {record.teacher?.full_name ? (
                                <Text style={styles.cleanRecordTeacherUnderObs}>
                                  {record.teacher.role === 'coordinator' ? 'Coord: ' : 'Docente: '}
                                  {record.teacher.full_name}
                                </Text>
                              ) : null}

                              <View style={styles.cleanRecordFooter}>
                                <Text style={styles.cleanRecordDate}>
                                  {formatLocalDate(record.created_at)}
                                </Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Attendance Section - Sin iconos y separadas por línea negra */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{t('dashboard.attendanceRecord', 'Registro de Asistencia')}</Text>
          </View>

          {absences.length === 0 ? (
            <View style={[styles.emptyCard, { alignItems: 'center' }]}>
              <Text style={[styles.emptyText, { textAlign: 'center' }]}>
                {t('dashboard.excellentAttendance', 'Sin ausencias registradas en este periodo')}
              </Text>
            </View>
          ) : (
            <View style={[styles.attendanceListContainer, { borderColor: theme === 'dark' ? '#27272A' : '#18181B' }]}>
              {absences.map((att, index) => {
                const isJustified = att.status === 'justified';
                const rawMsg = att.coordinator_message || '';
                const timeMatch = rawMsg.match(/\[HORARIO:\s*([^\]]+)\]/i);
                const isFullDay = rawMsg.includes('[JORNADA COMPLETA]') || att.subjects?.name === 'Día completo';
                const cleanMsg = rawMsg
                  .replace(/\[HORARIO:\s*[^\]]+\]/gi, '')
                  .replace(/\[JORNADA COMPLETA\]/gi, '')
                  .trim();
                const isLast = index === absences.length - 1;

                return (
                  <View 
                    key={att.id} 
                    style={[
                      styles.cleanAbsenceItem, 
                      !isLast && styles.blackDivider
                    ]}
                  >
                    <View style={styles.cleanAbsenceHeader}>
                      <Text style={[styles.absenceDate, { color: theme === 'dark' ? '#FFFFFF' : Colors.text.primary }]}>
                        {formatLocalDate(att.date)}
                      </Text>
                      <View style={[
                        styles.absenceStatusPill, 
                        { backgroundColor: isJustified ? (theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7') : (theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') }
                      ]}>
                        <Text style={{ 
                          fontSize: 10.5, 
                          fontWeight: '800', 
                          textTransform: 'uppercase',
                          letterSpacing: 0.4,
                          color: isJustified ? (theme === 'dark' ? '#6EE7B7' : '#166534') : (theme === 'dark' ? '#FCA5A5' : '#991B1B')
                        }}>
                          {isJustified ? 'Justificada' : 'Inasistencia'}
                        </Text>
                      </View>
                    </View>

                    {/* Scope tags: Horario o Día completo sin emojis */}
                    {(timeMatch || isFullDay) && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                        {timeMatch && (
                          <View style={{
                            backgroundColor: theme === 'dark' ? '#1E293B' : '#E0F2FE',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6
                          }}>
                            <Text style={{
                              fontSize: 10.5,
                              fontWeight: '700',
                              color: theme === 'dark' ? '#38BDF8' : '#0284C7'
                            }}>
                              {timeMatch[1]}
                            </Text>
                          </View>
                        )}
                        {isFullDay && (
                          <View style={{
                            backgroundColor: theme === 'dark' ? '#27272A' : '#F1F5F9',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6
                          }}>
                            <Text style={{
                              fontSize: 10.5,
                              fontWeight: '700',
                              color: theme === 'dark' ? '#D4D4D8' : '#475569'
                            }}>
                              {t('justifications.fullDay', 'Día completo')}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Materias o Día Completo */}
                    <Text style={styles.absenceLabel}>
                      {isFullDay ? t('justifications.fullDay', 'Día completo') : (att.subjects?.name || (isJustified ? t('diary.justifiedAbsence', 'Inasistencia Justificada') : t('diary.class', 'Clase')))}
                    </Text>

                    {isJustified && cleanMsg ? (
                      <Text style={{ fontSize: 11.5, color: Colors.text.muted, marginTop: 4, fontStyle: 'italic' }}>
                        {t('common.note', 'Nota')}: {cleanMsg}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (Colors, theme) => {
  const headerBgColor = theme === 'dark' ? Colors.card : (Colors.headerC || Colors.primary || '#0B1956');
  return StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: headerBgColor },
  scrollContent: { flexGrow: 1, backgroundColor: Colors.background },
  periodSelectorContainer: {
    alignItems: 'center',
    marginTop: -10,
    zIndex: 10,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: theme === 'dark' ? Colors.card : Colors.primary,
    borderRadius: 25,
    padding: 6,
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
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme === 'dark' ? Colors.gray[200] : 'rgba(0,0,0,0.06)',
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

  // Acordeones de Conducta
  accordionContainer: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: Colors.card,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  accordionHeaderOpen: {
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#27272A' : '#F1F5F9',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  accordionEmpty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  accordionEmptyText: {
    fontSize: 12,
    color: Colors.text.muted,
    fontStyle: 'italic',
  },

  // Items de conducta limpios (sin fondo de color, divididos por franja gris)
  cleanRecordItem: {
    paddingVertical: 14,
  },
  grayDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#27272A' : '#E4E4E7',
  },
  cleanRecordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cleanRecordName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cleanRecordObs: {
    fontSize: 13.5,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  cleanRecordTeacherUnderObs: {
    fontSize: 12,
    fontWeight: '700',
    color: theme === 'dark' ? '#E4E4E7' : '#334155',
    marginBottom: 6,
  },
  cleanRecordFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  cleanRecordDate: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Registro de Asistencia limpio (sin iconos, divididos por línea negra)
  attendanceListContainer: {
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: Colors.card,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  cleanAbsenceItem: {
    paddingVertical: 14,
  },
  blackDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: theme === 'dark' ? '#27272A' : '#18181B',
  },
  cleanAbsenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  absenceDate: {
    fontWeight: '800',
    fontSize: 15,
  },
  absenceStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  absenceLabel: {
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  });
};
