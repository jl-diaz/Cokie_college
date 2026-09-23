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

  // Inasistencias
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
          value={generalAverage ? generalAverage : '9.2'}
          subtitle={generalAverage && parseFloat(generalAverage) >= 8.5 ? 'Excelente rendimiento' : 'Periodo activo'}
          variant="yellow"
          isDark={isDark}
          fallbackIcon={GraduationCap}
          onPress={() => router.push('/grades')}
        />

        <BentoStatCard 
          tag="Asistencia"
          value={unexcusedAbsences === 0 ? '100%' : `${unexcusedAbsences}`}
          subtitle={unexcusedAbsences === 0 ? 'Asistencia perfecta' : 'Faltas registradas'}
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
