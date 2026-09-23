import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Clock, 
  Users, 
  Calendar, 
  ClipboardCheck, 
  Award, 
  Bell, 
  BookOpen 
} from 'lucide-react-native';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { 
  LiveClassWidget, 
  BentoStatCard, 
  ActionCard, 
  RecentMessagesWidget 
} from './DashboardShared';

export default function TeacherDashboard({ isDark = false }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const [schedRes, classRes, chatRes] = await Promise.allSettled([
        api.get('/teacher/schedule'),
        api.get('/teacher/classrooms'),
        api.get('/chat/conversations')
      ]);

      if (schedRes.status === 'fulfilled' && schedRes.value.data) {
        const sd = schedRes.value.data;
        setSchedules(Array.isArray(sd) ? sd : (sd.data || []));
      }
      if (classRes.status === 'fulfilled' && classRes.value.data) {
        const cd = classRes.value.data;
        setClassrooms(Array.isArray(cd) ? cd : (cd.data || []));
      }
      if (chatRes.status === 'fulfilled' && chatRes.value.data) {
        const chd = chatRes.value.data;
        setConversations(Array.isArray(chd) ? chd : (chd.data || []));
      }
    } catch (err) {
      console.warn('Error loading teacher dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Clases que el profesor tiene el día de hoy
  const todayClassesCount = useMemo(() => {
    const currentDay = new Date().getDay();
    if (currentDay === 0 || currentDay === 6) return 0;
    return schedules.filter(s => parseInt(s.day_of_week) === currentDay).length;
  }, [schedules]);

  // Secciones únicas donde da clase
  const uniqueSectionsCount = useMemo(() => {
    const set = new Set();
    schedules.forEach(s => {
      if (s.grade && s.section) {
        set.add(`${s.grade}º ${s.section}`);
      }
    });
    return set.size;
  }, [schedules]);

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="small" color="#EC4899" />
        <Text style={[styles.loadingText, isDark && styles.textMuted]}>
          {t('dashboard.loadingTeacher', 'Cargando tu jornada...')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Horario en Vivo: Clase Actual y Siguiente */}
      <LiveClassWidget 
        schedules={schedules} 
        isDark={isDark} 
        onPressClass={() => router.push('/class')} 
        placeholderIcon={BookOpen}
      />

      {/* 2. Métricas Bento: Clases de hoy (Amarillo) y Salones asignados (Lavanda) */}
      <View style={styles.statsRow}>
        <BentoStatCard 
          tag={t('dashboard.todayClasses', 'Clases de hoy')}
          value={todayClassesCount > 0 ? `${todayClassesCount}` : '0'}
          subtitle={todayClassesCount > 0 ? t('dashboard.scheduledHours', 'Horas programadas') : t('dashboard.noClassesToday', 'Sin clases hoy')}
          variant="yellow"
          isDark={isDark}
          onPress={() => router.push('/schedule')}
        />

        <BentoStatCard 
          tag={t('dashboard.classrooms', 'Salones')}
          value={uniqueSectionsCount > 0 ? `${uniqueSectionsCount}` : `${classrooms.length > 0 ? classrooms.length : '0'}`}
          subtitle={t('dashboard.sectionsAssigned', 'Secciones a cargo')}
          variant="lavender"
          isDark={isDark}
          fallbackIcon={Users}
          onPress={() => router.push('/class')}
        />
      </View>

      {/* 3. Mensajes Recientes de CokieChat */}
      <RecentMessagesWidget 
        conversations={conversations} 
        isDark={isDark} 
        onPressChat={() => router.push('/chat')} 
      />
      <View style={styles.actionRowFlex}>
        <View style={{ flex: 1 }}>
          <ActionCard 
            title={t('menu.mySchedule', 'Mi horario')}
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
            title={t('menu.announcements', 'Avisos')}
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
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 10,
    marginLeft: 2,
  },
});
