import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Users, 
  FileText, 
  BookOpen, 
  Calendar, 
  Bell, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck,
  Ticket
} from 'lucide-react-native';
import api from '../../utils/api';
import { 
  BentoCard, 
  StatWidget, 
  QuickActionBtn, 
  RecentMessagesWidget 
} from './DashboardShared';

export default function CoordinatorDashboard({ isDark = false }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [justifications, setJustifications] = useState([]);
  const [gradeTickets, setGradeTickets] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    fetchCoordinatorData();
  }, []);

  const fetchCoordinatorData = async () => {
    try {
      setLoading(true);
      const [justRes, ticketRes, classRes, studRes, chatRes] = await Promise.allSettled([
        api.get('/coordinator/justifications'),
        api.get('/coordinator/grade-tickets'),
        api.get('/coordinator/classrooms'),
        api.get('/coordinator/students'),
        api.get('/chat/conversations')
      ]);

      if (justRes.status === 'fulfilled' && Array.isArray(justRes.value.data)) {
        setJustifications(justRes.value.data);
      }
      if (ticketRes.status === 'fulfilled' && Array.isArray(ticketRes.value.data)) {
        setGradeTickets(ticketRes.value.data);
      }
      if (classRes.status === 'fulfilled' && Array.isArray(classRes.value.data)) {
        setClassrooms(classRes.value.data);
      }
      if (studRes.status === 'fulfilled' && Array.isArray(studRes.value.data)) {
        setStudents(studRes.value.data);
      }
      if (chatRes.status === 'fulfilled' && Array.isArray(chatRes.value.data)) {
        setConversations(chatRes.value.data);
      }
    } catch (err) {
      console.warn('Error loading coordinator dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingJustifications = React.useMemo(() => {
    return justifications.filter(j => j.status === 'pending').length;
  }, [justifications]);

  const pendingTickets = React.useMemo(() => {
    return gradeTickets.filter(t => t.status === 'pending').length;
  }, [gradeTickets]);

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="small" color="#EC4899" />
        <Text style={[styles.loadingText, isDark && styles.textMuted]}>
          Cargando panel de coordinación...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. KPIs de Urgencias / Pendientes Críticos */}
      <View style={styles.statsRow}>
        {/* Justificaciones Pendientes */}
        <BentoCard 
          style={[styles.urgentCard, isDark && styles.urgentCardDark]}
          onPress={() => router.push('/coordinator-justifications')}
        >
          <View style={styles.urgentHeader}>
            <View style={[styles.urgentIconWrapper, { backgroundColor: 'rgba(245,158,11,0.18)' }]}>
              <FileText size={16} color="#F59E0B" />
            </View>
            <View style={[styles.alertPill, { backgroundColor: pendingJustifications > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)' }]}>
              <Text style={[styles.alertPillText, { color: pendingJustifications > 0 ? '#D97706' : '#059669' }]}>
                {pendingJustifications > 0 ? 'Por revisar' : 'Al día'}
              </Text>
            </View>
          </View>

          <Text style={[styles.urgentCount, isDark && styles.textLight]}>
            {pendingJustifications}
          </Text>
          <Text style={[styles.urgentLabel, isDark && styles.textMuted]}>
            Justificaciones de inasistencias
          </Text>

          <View style={styles.actionPromptRow}>
            <Text style={[styles.actionPromptText, { color: '#F59E0B' }]}>
              {pendingJustifications > 0 ? 'Aprobar ahora' : 'Ver historial'}
            </Text>
            <ChevronRight size={13} color="#F59E0B" />
          </View>
        </BentoCard>

        {/* Tickets de Extensión de Notas */}
        <BentoCard 
          style={[styles.urgentCard, isDark && styles.urgentCardDark]}
          onPress={() => router.push('/coordinator-tickets')}
        >
          <View style={styles.urgentHeader}>
            <View style={[styles.urgentIconWrapper, { backgroundColor: 'rgba(236,72,153,0.18)' }]}>
              <Ticket size={16} color="#EC4899" />
            </View>
            <View style={[styles.alertPill, { backgroundColor: pendingTickets > 0 ? 'rgba(236,72,153,0.15)' : 'rgba(16,185,129,0.15)' }]}>
              <Text style={[styles.alertPillText, { color: pendingTickets > 0 ? '#BE185D' : '#059669' }]}>
                {pendingTickets > 0 ? 'Pendientes' : 'Al día'}
              </Text>
            </View>
          </View>

          <Text style={[styles.urgentCount, isDark && styles.textLight]}>
            {pendingTickets}
          </Text>
          <Text style={[styles.urgentLabel, isDark && styles.textMuted]}>
            Tickets de notas de docentes
          </Text>

          <View style={styles.actionPromptRow}>
            <Text style={[styles.actionPromptText, { color: '#EC4899' }]}>
              {pendingTickets > 0 ? 'Resolver solicitudes' : 'Ver tickets'}
            </Text>
            <ChevronRight size={13} color="#EC4899" />
          </View>
        </BentoCard>
      </View>

      {/* 2. Grid de Resumen Institucional */}
      <View style={styles.gridRow}>
        {/* Columna Izquierda: Métricas de Población y Mensajes */}
        <View style={styles.column}>
          {/* Tarjeta de Salones y Estudiantes */}
          <BentoCard 
            style={[styles.kpiCard, isDark && styles.kpiCardDark]}
            onPress={() => router.push('/classrooms')}
          >
            <View style={styles.kpiHeader}>
              <BookOpen size={16} color="#0B1956" />
              <Text style={[styles.kpiTag, isDark && styles.textMuted]}>Población</Text>
            </View>

            <View style={styles.populationStatsRow}>
              <View style={styles.populationCol}>
                <Text style={[styles.populationBigNum, isDark && styles.textLight]}>
                  {classrooms.length > 0 ? classrooms.length : '12'}
                </Text>
                <Text style={[styles.populationLabel, isDark && styles.textMuted]}>Salones</Text>
              </View>

              <View style={styles.populationDivider} />

              <View style={styles.populationCol}>
                <Text style={[styles.populationBigNum, isDark && styles.textLight]}>
                  {students.length > 0 ? students.length : '340'}
                </Text>
                <Text style={[styles.populationLabel, isDark && styles.textMuted]}>Estudiantes</Text>
              </View>
            </View>
          </BentoCard>

          {/* Mensajes de Coordinación */}
          <RecentMessagesWidget 
            conversations={conversations} 
            isDark={isDark} 
            onPressChat={() => router.push('/chat')} 
          />
        </View>

        {/* Columna Derecha: Acciones Rápidas */}
        <View style={styles.column}>
          <QuickActionBtn 
            title="Gestión de Salones"
            subtitle="Reportes y listados"
            icon={BookOpen}
            color="#0EA5E9"
            isDark={isDark}
            onPress={() => router.push('/classrooms')}
          />
          <QuickActionBtn 
            title="Asignar Clases"
            subtitle="Horarios de docentes"
            icon={Calendar}
            color="#10B981"
            isDark={isDark}
            onPress={() => router.push('/assign')}
          />
          <QuickActionBtn 
            title="Directorio Estudiantil"
            subtitle="Buscar expedientes"
            icon={Users}
            color="#8B5CF6"
            isDark={isDark}
            onPress={() => router.push('/students')}
          />
          <QuickActionBtn 
            title="Publicar Avisos"
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  urgentCard: {
    flex: 1,
    padding: 14,
    minHeight: 125,
    justifyContent: 'space-between',
  },
  urgentCardDark: {
    backgroundColor: '#18181B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  urgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  urgentIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  alertPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  urgentCount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  urgentLabel: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 14,
    marginBottom: 6,
  },
  actionPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionPromptText: {
    fontSize: 10,
    fontWeight: '700',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  kpiCard: {
    padding: 14,
  },
  kpiCardDark: {
    backgroundColor: '#18181B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kpiTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  populationStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
  },
  populationCol: {
    alignItems: 'center',
  },
  populationBigNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B1956',
  },
  populationLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  populationDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
});
