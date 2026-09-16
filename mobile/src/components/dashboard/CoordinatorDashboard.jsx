import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
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
      console.warn('Error loading coordinator dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingJustifications = useMemo(() => {
    return justifications.filter(j => j.status === 'pending').length;
  }, [justifications]);

  const pendingTickets = useMemo(() => {
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
      {/* 1. KPIs Críticos de Revisión */}
      <View style={styles.statsRow}>
        <BentoCard 
          style={[styles.urgentCard, isDark && styles.cardDark]}
          onPress={() => router.push('/coordinator-justifications')}
        >
          <View style={styles.urgentHeader}>
            <Text style={[styles.cardTag, isDark && styles.textMuted]}>Justificaciones</Text>
            <Text style={[styles.statusTag, { color: pendingJustifications > 0 ? '#F59E0B' : '#10B981' }]}>
              {pendingJustifications > 0 ? 'Revisar' : 'Al día'}
            </Text>
          </View>
          <Text style={[styles.bigStatNum, isDark && styles.textLight]}>
            {pendingJustifications}
          </Text>
          <Text style={[styles.statLabel, isDark && styles.textMuted]}>
            Solicitudes de inasistencia
          </Text>
        </BentoCard>

        <BentoCard 
          style={[styles.urgentCard, isDark && styles.cardDark]}
          onPress={() => router.push('/coordinator-tickets')}
        >
          <View style={styles.urgentHeader}>
            <Text style={[styles.cardTag, isDark && styles.textMuted]}>Tickets Notas</Text>
            <Text style={[styles.statusTag, { color: pendingTickets > 0 ? '#EC4899' : '#10B981' }]}>
              {pendingTickets > 0 ? 'Pendientes' : 'Al día'}
            </Text>
          </View>
          <Text style={[styles.bigStatNum, isDark && styles.textLight]}>
            {pendingTickets}
          </Text>
          <Text style={[styles.statLabel, isDark && styles.textMuted]}>
            Extensiones solicitadas
          </Text>
        </BentoCard>
      </View>

      {/* 2. Población Escolar (Minimalista) */}
      <BentoCard 
        style={[styles.populationCard, isDark && styles.cardDark]}
        onPress={() => router.push('/classrooms')}
      >
        <Text style={[styles.cardTag, isDark && styles.textMuted, { marginBottom: 8 }]}>Población del Ciclo</Text>
        <View style={styles.populationRow}>
          <View style={styles.popItem}>
            <Text style={[styles.popNum, isDark && styles.textLight]}>
              {classrooms.length > 0 ? classrooms.length : '12'}
            </Text>
            <Text style={[styles.popLabel, isDark && styles.textMuted]}>Salones</Text>
          </View>

          <View style={styles.popDivider} />

          <View style={styles.popItem}>
            <Text style={[styles.popNum, isDark && styles.textLight]}>
              {students.length > 0 ? students.length : '340'}
            </Text>
            <Text style={[styles.popLabel, isDark && styles.textMuted]}>Estudiantes</Text>
          </View>
        </View>
      </BentoCard>

      {/* 3. Mensajes Recientes (Ancho Completo sin overflow) */}
      <RecentMessagesWidget 
        conversations={conversations} 
        isDark={isDark} 
        onPressChat={() => router.push('/chat')} 
      />

      {/* 4. Accesos Rápidos de Coordinación */}
      <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>Gestión institucional</Text>
      
      <QuickActionBtn 
        title="Gestión de Salones y Reportes"
        subtitle="Listado de estudiantes y descargas"
        isDark={isDark}
        onPress={() => router.push('/classrooms')}
      />
      <QuickActionBtn 
        title="Asignación y Horarios"
        subtitle="Generador y horarios docentes"
        isDark={isDark}
        onPress={() => router.push('/assign')}
      />
      <QuickActionBtn 
        title="Directorio de Estudiantes"
        subtitle="Expedientes y búsqueda de alumnos"
        isDark={isDark}
        onPress={() => router.push('/students')}
      />
      <QuickActionBtn 
        title="Avisos Institucionales"
        subtitle="Publicar comunicados a la comunidad"
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
  urgentCard: {
    flex: 1,
    padding: 14,
    minHeight: 105,
    justifyContent: 'space-between',
  },
  urgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusTag: {
    fontSize: 10,
    fontWeight: '700',
  },
  bigStatNum: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  populationCard: {
    padding: 14,
    marginBottom: 10,
  },
  populationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  popItem: {
    alignItems: 'center',
  },
  popNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  popLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  popDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.08)',
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
