import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Calendar, 
  BookOpen, 
  Bell, 
  Sparkles, 
  Clock, 
  UtensilsCrossed, 
  GraduationCap 
} from 'lucide-react-native';
import api from '../../utils/api';
import { 
  LiveClassWidget, 
  BentoStatCard, 
  BentoCard,
  WideBannerCard, 
  ActionCard, 
  RecentMessagesWidget 
} from './DashboardShared';

export default function StudentDashboard({ isDark = false }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState(4);
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

      // 1. Resolver el periodo activo actual por fecha (El Salvador)
      let resolvedPeriod = 4;
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        if (todayStr >= '2026-08-17' && todayStr <= '2026-10-24') resolvedPeriod = 4;
        else if (todayStr >= '2026-06-01' && todayStr <= '2026-08-16') resolvedPeriod = 3;
        else if (todayStr >= '2026-03-22' && todayStr <= '2026-05-31') resolvedPeriod = 2;
        else resolvedPeriod = 1;
      } catch (e) {}

      try {
        const pRes = await api.get('/student/active-period');
        if (pRes?.data?.activePeriod) {
          resolvedPeriod = pRes.data.activePeriod;
        }
      } catch (e) {}

      setActivePeriod(resolvedPeriod);

      // 2. Cargar datos específicos del periodo activo
      const [schedRes, avgRes, diaryRes, chatRes, lunchRes] = await Promise.allSettled([
        api.get('/student/schedule'),
        api.get(`/student/averages?period=${resolvedPeriod}`),
        api.get(`/student/diary?period=${resolvedPeriod}`),
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

  // Promedio general estrictamente del periodo activo
  const generalAverage = useMemo(() => {
    if (!averages || averages.length === 0) return null;

    // Filtrar estrictamente por el periodo activo si el backend devolvió múltiples periodos
    const periodFiltered = averages.filter(a => !a.period || parseInt(a.period) === parseInt(activePeriod));
    const targetList = periodFiltered.length > 0 ? periodFiltered : averages;

    const valid = targetList
      .map(a => {
        if (a.final_average !== null && a.final_average !== undefined) return parseFloat(a.final_average);
        if (typeof a.average === 'number' && !isNaN(a.average)) return a.average;
        return null;
      })
      .filter(val => val !== null && !isNaN(val));

    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, curr) => acc + curr, 0);
    return (sum / valid.length).toFixed(1);
  }, [averages, activePeriod]);

  // Asistencia real calculada sobre el periodo activo
  const attendanceStats = useMemo(() => {
    const list = Array.isArray(diary?.attendance) ? diary.attendance : [];
    const periodAttendance = list.filter(a => !a.period || parseInt(a.period) === parseInt(activePeriod));

    const unexcused = periodAttendance.filter(a => a.status === 'absent').length;
    const justified = periodAttendance.filter(a => a.status === 'justified').length;
    const present = periodAttendance.filter(a => a.status === 'present').length;

    // Si hay toma de lista por clase completa registrada ('present' abundante):
    if (present >= 15) {
      const total = present + unexcused + justified;
      const pct = total > 0 ? Math.round(((present + justified) / total) * 100) : 100;
      return {
        percentage: `${pct}%`,
        unexcused,
        justified,
        text: unexcused === 0 
          ? (justified > 0 ? `${justified} falta${justified > 1 ? 's' : ''} justificada${justified > 1 ? 's' : ''}` : 'Asistencia perfecta')
          : `${unexcused} falta${unexcused > 1 ? 's' : ''} sin justificar`
      };
    }

    // Modelo institucional estándar por excepción (solo se registran inasistencias en la base de datos):
    // ~45 días lectivos por periodo. Cada inasistencia injustificada descuenta del 100%
    const baseDays = 45;
    const pct = Math.max(0, Math.min(100, Math.round(((baseDays - unexcused) / baseDays) * 100)));

    return {
      percentage: `${pct}%`,
      unexcused,
      justified,
      text: unexcused === 0 
        ? (justified > 0 ? `${justified} falta${justified > 1 ? 's' : ''} justificada${justified > 1 ? 's' : ''}` : 'Asistencia perfecta')
        : `${unexcused} falta${unexcused > 1 ? 's' : ''} sin justificar`
    };
  }, [diary, activePeriod]);

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
      <LiveClassWidget 
        schedules={schedules} 
        isDark={isDark} 
        onPressClass={() => router.push('/schedule')}
        placeholderIcon={BookOpen}
      />

      {/* 2. Bento Estadísticas: Promedio (Azul Marino) y Asistencia (Rosa Cokie / Lavanda) */}
      <View style={styles.statsRow}>
        <BentoStatCard 
          tag="Promedio"
          value={generalAverage ? generalAverage : '—'}
          subtitle={generalAverage ? (parseFloat(generalAverage) >= 8.5 ? 'Excelente rendimiento' : `Periodo ${activePeriod}`) : 'Sin notas aún'}
          variant="yellow"
          isDark={isDark}
          fallbackIcon={GraduationCap}
          onPress={() => router.push('/grades')}
        />

        <BentoStatCard 
          tag="Asistencia"
          value={attendanceStats.percentage}
          subtitle={attendanceStats.text}
          variant="lavender"
          isDark={isDark}
          fallbackIcon={Clock}
          onPress={() => router.push('/justifications')}
        />
      </View>

      {/* 3. Almuerzo y Justificaciones (Dos bloques flex) */}
      <View style={styles.actionRowFlex}>
        <View style={{ flex: 1 }}>
          <BentoCard 
            variant="rose" 
            isDark={isDark} 
            onPress={() => router.push('/lunch')}
            style={{ padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 110, marginBottom: 14 }}
          >
            <UtensilsCrossed size={32} color="#EC4899" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FCE7F3' : '#831843' }}>
              Almuerzo
            </Text>
          </BentoCard>
        </View>

        <View style={{ flex: 1 }}>
          <BentoCard 
            variant="navy" 
            isDark={isDark} 
            onPress={() => router.push({ pathname: '/justifications', params: { create: 'true' } })}
            style={{ padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 110, marginBottom: 14 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginTop: -2 }}>+</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
              Justificación
            </Text>
          </BentoCard>
        </View>
      </View>

      {/* 4. Mensajes Recientes de CokieChat */}
      <RecentMessagesWidget 
        conversations={conversations} 
        isDark={isDark} 
        onPressChat={() => router.push('/chat')} 
      />

      {/* 5. Accesos Frecuentes con Ranuras para Iconos/Imágenes */}
      <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>Accesos rápidos</Text>
      
      <ActionCard 
        title="Diario Pedagógico"
        subtitle="Historial de inasistencias y códigos de conducta"
        isDark={isDark}
        fallbackIcon={BookOpen}
        iconColor="#FFFFFF"
        slotBgColor={isDark ? '#27272A' : '#18181B'}
        borderColor="black"
        onPress={() => router.push('/diary')}
      />

      <View style={styles.actionRowFlex}>
        <View style={{ flex: 1 }}>
          <ActionCard 
            title="Mi horario"
            isDark={isDark}
            fallbackIcon={Calendar}
            iconColor="#FFFFFF"
            slotBgColor={isDark ? '#27272A' : '#18181B'}
            borderColor="black"
            onPress={() => router.push('/schedule')}
          />
        </View>

        <View style={{ flex: 1 }}>
          <ActionCard 
            title="Avisos"
            isDark={isDark}
            fallbackIcon={Bell}
            iconColor="#FFFFFF"
            slotBgColor={isDark ? '#27272A' : '#18181B'}
            borderColor="black"
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
  textMuted: {
    color: '#94A3B8',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionRowFlex: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 12,
    marginLeft: 2,
  },
});
