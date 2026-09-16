import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
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

      if (schedRes.status === 'fulfilled' && Array.isArray(schedRes.value.data)) {
        setSchedules(schedRes.value.data);
      }
      if (classRes.status === 'fulfilled' && Array.isArray(classRes.value.data)) {
        setClassrooms(classRes.value.data);
      }
      if (chatRes.status === 'fulfilled' && Array.isArray(chatRes.value.data)) {
        setConversations(chatRes.value.data);
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
          Cargando tu jornada...
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
      />

      {/* 2. Métricas Reales de la Jornada (Bento Minimalista) */}
      <View style={styles.statsRow}>
        <StatWidget 
          title="Clases de hoy"
          value={todayClassesCount > 0 ? `${todayClassesCount}` : '0'}
          subtitle={todayClassesCount > 0 ? 'Horas programadas' : 'Sin clases hoy'}
          isDark={isDark}
          color="#0EA5E9"
          onPress={() => router.push('/schedule')}
        />

        <StatWidget 
          title="Salones asignados"
          value={uniqueSectionsCount > 0 ? `${uniqueSectionsCount}` : `${classrooms.length > 0 ? classrooms.length : '0'}`}
          subtitle="Secciones a cargo"
          isDark={isDark}
          color="#EC4899"
          onPress={() => router.push('/class')}
        />
      </View>

      {/* 3. Mensajes Recientes de CokieChat (Ancho Completo sin overflow) */}
      <RecentMessagesWidget 
        conversations={conversations} 
        isDark={isDark} 
        onPressChat={() => router.push('/chat')} 
      />

      {/* 4. Herramientas Rápidas del Docente (Funcionales) */}
      <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>Herramientas docentes</Text>
      
      <QuickActionBtn 
        title="Pasar Asistencia / Clase Activa"
        subtitle="Control de asistencia y méritos disciplinarios"
        isDark={isDark}
        onPress={() => router.push('/class')}
      />
      <QuickActionBtn 
        title="Calificaciones y Evaluaciones"
        subtitle="Ingresar notas de tareas, proyectos y exámenes"
        isDark={isDark}
        onPress={() => router.push('/teacher-grades')}
      />
      <QuickActionBtn 
        title="Mi Horario Semanal"
        subtitle="Ver distribución de materias de la semana"
        isDark={isDark}
        onPress={() => router.push('/schedule')}
      />
      <QuickActionBtn 
        title="Avisos Institucionales"
        subtitle="Comunicados oficiales de dirección y coordinación"
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
    marginBottom: 12,
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
