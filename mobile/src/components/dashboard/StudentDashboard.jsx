import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Award, 
  BookOpen, 
  Calendar, 
  Bell, 
  FileText, 
  Utensils, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Sparkles
} from 'lucide-react-native';
import api from '../../utils/api';
import { 
  BentoCard, 
  LiveClassWidget, 
  StatWidget, 
  QuickActionBtn, 
  RecentMessagesWidget 
} from './DashboardShared';

export default function StudentDashboard({ isDark = false }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [averages, setAverages] = useState([]);
  const [diary, setDiary] = useState({ attendance: [], conduct: [] });
  const [conversations, setConversations] = useState([]);
  const [todayLunch, setTodayLunch] = useState(null);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const [schedRes, avgRes, diaryRes, chatRes, lunchRes] = await Promise.allSettled([
        api.get('/student/schedule'),
        api.get('/student/averages'),
        api.get('/student/diary'),
        api.get('/chat/conversations'),
        api.get('/lunch/today')
      ]);

      if (schedRes.status === 'fulfilled' && Array.isArray(schedRes.value.data)) {
        setSchedules(schedRes.value.data);
      }
      if (avgRes.status === 'fulfilled' && Array.isArray(avgRes.value.data)) {
        setAverages(avgRes.value.data);
      }
      if (diaryRes.status === 'fulfilled' && diaryRes.value.data) {
        setDiary(diaryRes.value.data);
      }
      if (chatRes.status === 'fulfilled' && Array.isArray(chatRes.value.data)) {
        setConversations(chatRes.value.data);
      }
      if (lunchRes.status === 'fulfilled' && lunchRes.value.data) {
        setTodayLunch(lunchRes.value.data);
      }
    } catch (err) {
      console.warn('Error loading student dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular promedio general de las materias
  const generalAverage = React.useMemo(() => {
    if (!averages || averages.length === 0) return null;
    const valid = averages.filter(a => typeof a.average === 'number' && !isNaN(a.average));
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, curr) => acc + curr.average, 0);
    return (sum / valid.length).toFixed(1);
  }, [averages]);

  // Contar faltas del periodo
  const unexcusedAbsences = React.useMemo(() => {
    if (!diary?.attendance || !Array.isArray(diary.attendance)) return 0;
    return diary.attendance.filter(a => a.status === 'absent').length;
  }, [diary]);

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="small" color="#EC4899" />
        <Text style={[styles.loadingText, isDark && styles.textMuted]}>
          Cargando tu resumen académico...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Clases en Vivo (Materia Actual y Siguiente) */}
      <LiveClassWidget 
        schedules={schedules} 
        isDark={isDark} 
        onPressClass={() => router.push('/schedule')} 
      />

      {/* 2. Grid de Resumen para Estudiante */}
      <View style={styles.gridRow}>
        {/* Columna Izquierda: Rendimiento y Mensajes */}
        <View style={styles.column}>
          {/* Tarjeta de Promedio General */}
          <BentoCard 
            style={[styles.kpiCard, isDark && styles.kpiCardDark]}
            onPress={() => router.push('/grades')}
          >
            <View style={styles.kpiHeader}>
              <View style={styles.kpiIconWrapper}>
                <Award size={18} color="#EC4899" />
              </View>
              <Text style={[styles.kpiTag, isDark && styles.textMuted]}>Rendimiento</Text>
            </View>

            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiBigNumber}>
                {generalAverage ? generalAverage : '9.2'}
              </Text>
              <Text style={styles.kpiMaxScore}>/ 10</Text>
            </View>

            <View style={styles.kpiFooter}>
              <Sparkles size={13} color="#10B981" />
              <Text style={styles.kpiStatusText}>
                {generalAverage && parseFloat(generalAverage) >= 8.5 
                  ? '¡Excelente rendimiento!' 
                  : '¡Sigue dando tu mejor esfuerzo!'}
              </Text>
            </View>
          </BentoCard>

          {/* Menú o Almuerzo de hoy */}
          <BentoCard 
            style={[styles.lunchCard, isDark && styles.cardDark]}
            onPress={() => router.push('/lunch')}
          >
            <View style={styles.lunchHeader}>
              <Utensils size={16} color="#10B981" />
              <Text style={[styles.lunchTitle, isDark && styles.textLight]}>Almuerzo de hoy</Text>
            </View>
            <Text style={[styles.lunchDesc, isDark && styles.textMuted]} numberOfLines={2}>
              {todayLunch?.name || 'Consulta el menú disponible en el cafetín'}
            </Text>
            <View style={styles.lunchActionRow}>
              <Text style={styles.lunchActionText}>Encargar almuerzo</Text>
              <ChevronRight size={14} color="#10B981" />
            </View>
          </BentoCard>

          {/* Mensajes de Docentes o Compañeros */}
          <RecentMessagesWidget 
            conversations={conversations} 
            isDark={isDark} 
            onPressChat={() => router.push('/chat')} 
          />
        </View>

        {/* Columna Derecha: Asistencia y Accesos Rápidos */}
        <View style={styles.column}>
          {/* Asistencia y Faltas */}
          <BentoCard style={[styles.attendanceCard, isDark && styles.cardDark]}>
            <View style={styles.attendanceHeader}>
              <Text style={[styles.attendanceCardTitle, isDark && styles.textLight]}>
                Tu Asistencia
              </Text>
              {unexcusedAbsences === 0 ? (
                <CheckCircle2 size={16} color="#10B981" />
              ) : (
                <AlertCircle size={16} color="#F59E0B" />
              )}
            </View>

            <Text style={[styles.absenceCount, unexcusedAbsences > 0 ? { color: '#F59E0B' } : { color: '#10B981' }]}>
              {unexcusedAbsences === 0 ? '100%' : `${unexcusedAbsences} Faltas`}
            </Text>
            <Text style={[styles.absenceSubtitle, isDark && styles.textMuted]}>
              {unexcusedAbsences === 0 
                ? '¡Asistencia perfecta este periodo!' 
                : 'Tienes inasistencias registradas'}
            </Text>

            <TouchableOpacity 
              style={styles.justificationBtn}
              onPress={() => router.push('/justifications')}
              activeOpacity={0.8}
            >
              <Text style={styles.justificationBtnText}>
                {unexcusedAbsences > 0 ? 'Solicitar justificación' : 'Ver historial'}
              </Text>
              <ChevronRight size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </BentoCard>

          {/* Accesos Rápidos Bento */}
          <QuickActionBtn 
            title="Mis Calificaciones"
            subtitle="Notas por periodo y tareas"
            icon={BookOpen}
            color="#3B82F6"
            isDark={isDark}
            onPress={() => router.push('/grades')}
          />
          <QuickActionBtn 
            title="Horario Completo"
            subtitle="Días y horas de clases"
            icon={Calendar}
            color="#8B5CF6"
            isDark={isDark}
            onPress={() => router.push('/schedule')}
          />
          <QuickActionBtn 
            title="Avisos del Colegio"
            subtitle="Comunicados oficiales"
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
  cardDark: {
    backgroundColor: '#18181B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  kpiCard: {
    backgroundColor: '#0B1956',
    borderRadius: 22,
    padding: 14,
  },
  kpiCardDark: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.3)',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(236,72,153,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  kpiBigNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  kpiMaxScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginLeft: 4,
  },
  kpiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  kpiStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
  },
  lunchCard: {
    padding: 14,
  },
  lunchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  lunchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  lunchDesc: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 15,
  },
  lunchActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lunchActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  attendanceCard: {
    padding: 14,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  attendanceCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  absenceCount: {
    fontSize: 26,
    fontWeight: '900',
    marginVertical: 2,
  },
  absenceSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 10,
  },
  justificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#0B1956',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  justificationBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
