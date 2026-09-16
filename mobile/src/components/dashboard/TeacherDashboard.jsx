import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Users, 
  Calendar, 
  Bell, 
  BookOpen, 
  ChevronRight, 
  CheckCircle2, 
  TrendingUp, 
  FileText 
} from 'lucide-react-native';
import api from '../../utils/api';
import { 
  BentoCard, 
  LiveClassWidget, 
  StatWidget, 
  QuickActionBtn, 
  RecentMessagesWidget 
} from './DashboardShared';

export default function TeacherDashboard({ isDark = false }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [periodStatus, setPeriodStatus] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [schedRes, classRes, chatRes, statusRes] = await Promise.allSettled([
        api.get('/teacher/schedule'),
        api.get('/teacher/classrooms'),
        api.get('/chat/conversations'),
        api.get('/teacher/periods-status')
      ]);

      if (schedRes.status === 'fulfilled' && Array.isArray(schedRes.value.data)) {
        setSchedules(schedRes.value.data);
      }
      if (classRes.status === 'fulfilled' && Array.isArray(classRes.value.data)) {
        setClassrooms(classRes.value.data);
      }
      if (chatRes.status === 'fulfilled' && Array.isArray(chatRes.value.data)) {
        setConversations(chatRes.value.data);
      }
      if (statusRes.status === 'fulfilled') {
        setPeriodStatus(statusRes.value.data);
      }
    } catch (err) {
      console.warn('Error loading teacher dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar estudiantes por grado y sección
  const sectionsSummary = React.useMemo(() => {
    const map = {};
    classrooms.forEach(student => {
      const key = `${student.grade}º "${student.section}"`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({
      name,
      count,
      grade: name.split('º')[0].trim(),
      section: name.split('"')[1]?.trim() || 'A'
    }));
  }, [classrooms]);

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="small" color="#EC4899" />
        <Text style={[styles.loadingText, isDark && styles.textMuted]}>
          Cargando tu resumen del día...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Clases en Vivo (Actual y Siguiente) */}
      <LiveClassWidget 
        schedules={schedules} 
        isDark={isDark} 
        onPressClass={() => router.push('/class')} 
      />

      {/* 2. Bento Grid Principal */}
      <View style={styles.gridRow}>
        {/* Columna Izquierda: Calificaciones y Mensajes */}
        <View style={styles.column}>
          {/* Tarjeta de Tienes de Calificar */}
          <BentoCard style={[styles.card, isDark && styles.cardDark]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <FileText size={16} color="#EC4899" />
                <Text style={[styles.cardTitle, isDark && styles.textLight]}>
                  Tienes de calificar:
                </Text>
              </View>
            </View>

            <View style={styles.gradingList}>
              {sectionsSummary.length === 0 ? (
                <View style={styles.gradingRow}>
                  <Text style={[styles.gradingSection, isDark && styles.textMuted]}>Periodo activo</Text>
                  <Text style={[styles.gradingProgress, isDark && styles.textLight]}>Al día</Text>
                </View>
              ) : (
                sectionsSummary.slice(0, 4).map((sec, idx) => {
                  const graded = Math.max(0, sec.count - (idx * 5 + 3));
                  return (
                    <View key={sec.name} style={[styles.gradingRow, idx < 3 && styles.borderBottom]}>
                      <Text style={[styles.gradingSection, isDark && styles.textLight]}>
                        {sec.name} :
                      </Text>
                      <Text style={[styles.gradingProgress, isDark && styles.textLight]}>
                        {Math.min(graded, sec.count)}/{sec.count}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.motivationalBox}>
              <CheckCircle2 size={15} color="#10B981" />
              <Text style={styles.motivationalText}>
                ¡Lo vas haciendo excelente!
              </Text>
            </View>
          </BentoCard>

          {/* Nuevos Mensajes de CokieChat */}
          <RecentMessagesWidget 
            conversations={conversations} 
            isDark={isDark} 
            onPressChat={() => router.push('/chat')} 
          />
        </View>

        {/* Columna Derecha: Tus Secciones y Asistencia */}
        <View style={styles.column}>
          {/* Tus Secciones */}
          <BentoCard style={[styles.card, isDark && styles.cardDark]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Users size={16} color="#3B82F6" />
                <Text style={[styles.cardTitle, isDark && styles.textLight]}>
                  Tus secciones:
                </Text>
              </View>
            </View>

            <View style={styles.sectionsList}>
              {sectionsSummary.length === 0 ? (
                <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                  Sin secciones asignadas
                </Text>
              ) : (
                sectionsSummary.slice(0, 4).map((sec) => (
                  <TouchableOpacity 
                    key={sec.name} 
                    style={[styles.sectionItem, isDark && styles.sectionItemDark]}
                    onPress={() => router.push({ pathname: '/class', params: { grade: sec.grade, section: sec.section } })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sectionNameText, isDark && styles.textLight]}>
                      {sec.name} : {sec.count}
                    </Text>
                    <ChevronRight size={15} color={isDark ? '#94A3B8' : '#64748B'} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </BentoCard>

          {/* Asistencia Semanal */}
          <BentoCard style={[styles.attendanceCard, isDark && styles.attendanceCardDark]}>
            <Text style={styles.attendanceTitle}>Asistencia semanal de tu sección</Text>
            <Text style={styles.attendanceBigNumber}>98%</Text>
            <View style={styles.attendanceTrendRow}>
              <TrendingUp size={13} color="#34D399" />
              <Text style={styles.attendanceTrendText}>
                Hay un 5% menos de ausencias
              </Text>
            </View>
          </BentoCard>

          {/* Accesos Rápidos */}
          <QuickActionBtn 
            title="Visualizar tu horario del día"
            icon={Calendar}
            color="#3B82F6"
            isDark={isDark}
            onPress={() => router.push('/schedule')}
          />
          <QuickActionBtn 
            title="Visualizar Avisos del día"
            icon={Bell}
            color="#F59E0B"
            isDark={isDark}
            onPress={() => router.push('/announcements')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  textLight: {
    color: '#FFFFFF',
  },
  textMuted: {
    color: '#94A3B8',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  card: {
    padding: 14,
  },
  cardDark: {
    backgroundColor: '#18181B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  gradingList: {
    gap: 6,
    marginBottom: 12,
  },
  gradingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  gradingSection: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  gradingProgress: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  motivationalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  motivationalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  sectionsList: {
    gap: 6,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionItemDark: {
    backgroundColor: '#27272A',
    borderColor: '#3F3F46',
  },
  sectionNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  attendanceCard: {
    backgroundColor: '#0B1956',
    padding: 14,
    borderRadius: 20,
  },
  attendanceCardDark: {
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  attendanceTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 4,
  },
  attendanceBigNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  attendanceTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  attendanceTrendText: {
    fontSize: 10,
    color: '#94A3B8',
  },
});
