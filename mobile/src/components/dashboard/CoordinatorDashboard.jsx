import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  FileText, 
  Award, 
  Users, 
  Calendar, 
  Layers, 
  Bell, 
  Clock 
} from 'lucide-react-native';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { 
  BentoStatCard, 
  WideBannerCard, 
  ActionCard, 
  RecentMessagesWidget 
} from './DashboardShared';

export default function CoordinatorDashboard({ isDark = false }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [pendingJustificationsCount, setPendingJustificationsCount] = useState(0);
  const [pendingTicketsCount, setPendingTicketsCount] = useState(0);
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [conversations, setConversations] = useState([]);

  const fetchCoordinatorData = async () => {
    try {
      const [justRes, ticketRes, classRes, studRes, chatRes] = await Promise.allSettled([
        api.get('/coordinator/justifications', { params: { status: 'pending', limit: 100 } }),
        api.get('/coordinator/grade-tickets', { params: { status: 'pending', limit: 100 } }),
        api.get('/coordinator/classrooms'),
        api.get('/coordinator/students'),
        api.get('/chat/conversations')
      ]);

      if (justRes.status === 'fulfilled' && justRes.value.data) {
        const jd = justRes.value.data;
        if (typeof jd.total === 'number') {
          setPendingJustificationsCount(jd.total);
        } else {
          const list = Array.isArray(jd) ? jd : (jd.data || []);
          setPendingJustificationsCount(list.filter(j => j.status === 'pending').length);
        }
      }
      if (ticketRes.status === 'fulfilled' && ticketRes.value.data) {
        const td = ticketRes.value.data;
        if (typeof td.total === 'number') {
          setPendingTicketsCount(td.total);
        } else {
          const list = Array.isArray(td) ? td : (td.data || []);
          setPendingTicketsCount(list.filter(t => t.status === 'pending').length);
        }
      }
      if (classRes.status === 'fulfilled' && classRes.value.data) {
        const cd = classRes.value.data;
        setClassrooms(Array.isArray(cd) ? cd : (cd.data || []));
      }
      if (studRes.status === 'fulfilled' && studRes.value.data) {
        const sd = studRes.value.data;
        setStudents(Array.isArray(sd) ? sd : (sd.data || []));
      }
      if (chatRes.status === 'fulfilled' && chatRes.value.data) {
        const chd = chatRes.value.data;
        setConversations(Array.isArray(chd) ? chd : (chd.data || []));
      }
    } catch (err) {
      console.warn('Error loading coordinator dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoordinatorData();
  }, []);

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
      {/* 1. KPIs Críticos: Justificaciones y Tickets de Notas */}
      <View style={styles.statsRow}>
        <BentoStatCard 
          tag={t('menu.justifications', 'Justificaciones')}
          value={`${pendingJustificationsCount}`}
          subtitle={pendingJustificationsCount > 0 ? t('coordinatorJustifications.pendingRequests', 'Solicitudes pendientes') : t('common.upToDate', 'Al día')}
          variant="yellow"
          isDark={isDark}
          fallbackIcon={FileText}
          onPress={() => router.push('/coordinator-justifications')}
        />

        <BentoStatCard 
          tag={t('menu.grade_tickets', 'Tickets Notas')}
          value={`${pendingTicketsCount}`}
          subtitle={pendingTicketsCount > 0 ? t('coordinatorTickets.pendingApproval', 'Por autorizar') : t('common.upToDate', 'Al día')}
          variant="lavender"
          isDark={isDark}
          fallbackIcon={Award}
          onPress={() => router.push('/coordinator-tickets')}
        />
      </View>

      {/* 2. Población Escolar (Dos Bloques: Alumnos y Salones) */}
      <View style={styles.statsRow}>
        <BentoStatCard 
          tag={t('users.tabStudents', 'Alumnos')}
          value={`${students.length}`}
          subtitle={t('coordinatorDashboard.levelOnly', 'Solo en su nivel')}
          variant="black"
          isDark={isDark}
          fallbackIcon={Users}
          onPress={() => router.push('/students')}
        />
        
        <BentoStatCard 
          tag={t('menu.classrooms', 'Salones')}
          value={`${classrooms.length}`}
          subtitle={t('coordinatorDashboard.sectionsAssigned', 'Secciones a cargo')}
          variant="navy"
          isDark={isDark}
          fallbackIcon={Layers}
          onPress={() => router.push('/classrooms')}
        />
      </View>

      {/* 3. Mensajes Recientes de CokieChat */}
      <RecentMessagesWidget 
        isDark={isDark} 
        onPressChat={() => router.push('/chat')} 
      />

      {/* 4. Accesos de Gestión Institucional */}
      <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>
        {t('dashboard.institutionalManagement', 'Gestión institucional')}
      </Text>
      
      <View style={styles.actionRowFlex}>
        <View style={{ flex: 1 }}>
          <ActionCard 
            title={t('menu.mySchedule', 'Mi horario')}
            isDark={isDark}
            fallbackIcon={Calendar}
            iconColor="#FFFFFF"
            slotBgColor={isDark ? '#27272A' : '#18181B'}
            borderColor={isDark ? 'rgba(255,255,255,0.08)' : 'black'}
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
            borderColor={isDark ? 'rgba(255,255,255,0.08)' : 'black'}
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
