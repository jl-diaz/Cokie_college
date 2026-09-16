import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
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
      console.warn('Error loading student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Promedio general
  const generalAverage = useMemo(() => {
    if (!averages || averages.length === 0) return null;
    const valid = averages.filter(a => typeof a.average === 'number' && !isNaN(a.average));
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, curr) => acc + curr.average, 0);
    return (sum / valid.length).toFixed(1);
  }, [averages]);

  // Faltas del periodo
  const unexcusedAbsences = useMemo(() => {
    if (!diary?.attendance || !Array.isArray(diary.attendance)) return 0;
    return diary.attendance.filter(a => a.status === 'absent').length;
  }, [diary]);

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="small" color="#EC4899" />
        <Text style={[styles.loadingText, isDark && styles.textMuted]}>
          Cargando tu información...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Horario en Vivo: Materia Actual y Siguiente */}
      <LiveClassWidget 
        schedules={schedules} 
        isDark={isDark} 
        onPressClass={() => router.push('/schedule')} 
      />

      {/* 2. Estadísticas Principales: Promedio y Asistencia (Minimalista) */}
      <View style={styles.statsRow}>
        <StatWidget 
          title="Promedio General"
          value={generalAverage ? generalAverage : '9.2'}
          subtitle={generalAverage && parseFloat(generalAverage) >= 8.5 ? 'Excelente rendimiento' : 'Periodo activo'}
          isDark={isDark}
          color="#EC4899"
          onPress={() => router.push('/grades')}
        />

        <StatWidget 
          title="Inasistencias"
          value={unexcusedAbsences === 0 ? '0' : `${unexcusedAbsences}`}
          subtitle={unexcusedAbsences === 0 ? 'Asistencia al 100%' : 'Faltas registradas'}
          isDark={isDark}
          color={unexcusedAbsences > 0 ? '#F59E0B' : '#10B981'}
          onPress={() => router.push('/justifications')}
        />
      </View>

      {/* 3. Almuerzo del Día (Minimalista, sin icono) */}
      <BentoCard 
        style={[styles.lunchCard, isDark && styles.cardDark]}
        onPress={() => router.push('/lunch')}
      >
        <View style={styles.lunchHeader}>
          <Text style={[styles.lunchTitle, isDark && styles.textLight]}>Almuerzo de hoy</Text>
          <Text style={styles.lunchActionText}>Encargar</Text>
        </View>
        <Text style={[styles.lunchDesc, isDark && styles.textMuted]} numberOfLines={2}>
          {todayLunch?.name || 'Consulta el menú del día y encarga tu almuerzo'}
        </Text>
      </BentoCard>

      {/* 4. Mensajes Recientes (Ancho Completo sin overflow de texto) */}
      <RecentMessagesWidget 
        conversations={conversations} 
        isDark={isDark} 
        onPressChat={() => router.push('/chat')} 
      />

      {/* 5. Accesos Rápidos del Estudiante (Sin duplicar calificaciones) */}
      <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>Accesos frecuentes</Text>
      
      <QuickActionBtn 
        title="Horario de Clases"
        subtitle="Ver distribución de materias y salones"
        isDark={isDark}
        onPress={() => router.push('/schedule')}
      />
      <QuickActionBtn 
        title="Diario Pedagógico"
        subtitle="Historial de inasistencias y códigos de conducta"
        isDark={isDark}
        onPress={() => router.push('/diary')}
      />
      <QuickActionBtn 
        title="Avisos del Colegio"
        subtitle="Comunicados oficiales de la institución"
        isDark={isDark}
        onPress={() => router.push('/announcements')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  centerLoading: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
  },
  textLight: {
    color: '#FFFFFF',
  },
  textMuted: {
    color: '#94A3B8',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  cardDark: {
    backgroundColor: '#18181B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  lunchCard: {
    padding: 14,
    marginBottom: 10,
  },
  lunchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  lunchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  lunchActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EC4899',
  },
  lunchDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 10,
    marginLeft: 2,
  },
});
