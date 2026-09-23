import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Users, 
  Layers, 
  ShieldCheck, 
  Calendar, 
  Grid, 
  Bell, 
  Award,
  BookOpen
} from 'lucide-react-native';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { 
  BentoStatCard, 
  WideBannerCard, 
  ActionCard, 
  RecentMessagesWidget 
} from './DashboardShared';

export default function AdminDashboard({ isDark = false }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({ total: 0, users: [] });
  const [classrooms, setClassrooms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [usersRes, classRes, periodsRes, chatRes] = await Promise.allSettled([
        api.get('/admin/users?limit=100'),
        api.get('/coordinator/classrooms'),
        api.get('/admin/academic-periods'),
        api.get('/chat/conversations')
      ]);

      if (usersRes.status === 'fulfilled' && usersRes.value.data) {
        const d = usersRes.value.data;
        setUserStats({
          total: d.total || (Array.isArray(d) ? d.length : 0),
          users: d.data || (Array.isArray(d) ? d : [])
        });
      }
      if (classRes.status === 'fulfilled' && Array.isArray(classRes.value.data)) {
        setClassrooms(classRes.value.data);
      }
      if (periodsRes.status === 'fulfilled' && Array.isArray(periodsRes.value.data)) {
        setPeriods(periodsRes.value.data);
      }
      if (chatRes.status === 'fulfilled' && Array.isArray(chatRes.value.data)) {
        setConversations(chatRes.value.data);
      }
    } catch (err) {
      console.warn('Error loading admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const activePeriod = useMemo(() => {
    if (!periods || periods.length === 0) return 'Periodo 1';
    const now = new Date();
    const active = periods.find(p => {
      if (p.is_active) return true;
      if (p.start_date && p.end_date) {
        const s = new Date(p.start_date);
        const e = new Date(p.end_date);
        return now >= s && now <= e;
      }
      return false;
    });
    return active ? `Periodo ${active.period_number}` : (periods[0] ? `Periodo ${periods[0].period_number}` : 'Periodo 1');
  }, [periods]);

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="small" color="#EC4899" />
        <Text style={[styles.loadingText, isDark && styles.textMuted]}>
          {t('dashboard.loadingAdmin', 'Cargando panel de administración...')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Banner Superior Global */}
      <WideBannerCard 
        title={t('dashboard.globalAdmin', 'Administración Global')} 
        actionLabel={t('dashboard.managePlatform', 'Gestionar plataforma')}
        variant="blue"
        isDark={isDark}
        onPress={() => router.push('/users')}
      />

      <View style={styles.statsRow}>
        <BentoStatCard 
          tag={t('menu.users', 'Usuarios')}
          value={userStats.total > 0 ? `${userStats.total}` : '0'}
          subtitle={t('dashboard.registeredAccounts', 'Cuentas registradas')}
          variant="yellow"
          isDark={isDark}
          fallbackIcon={Users}
          borderColor={isDark ? 'rgba(255,255,255,0.08)' : 'black'}
          onPress={() => router.push('/users')}
        />

        <BentoStatCard 
          tag={t('menu.classrooms', 'Salones')}
          value={classrooms.length > 0 ? `${classrooms.length}` : '0'}
          subtitle={t('dashboard.cycleSections', 'Secciones del ciclo')}
          variant="lavender"
          isDark={isDark}
          fallbackIcon={Layers}
          onPress={() => router.push('/classrooms')}
        />
      </View>

      {/* 3. Mensajes Recientes de CokieChat */}
      <RecentMessagesWidget 
        conversations={conversations} 
        isDark={isDark} 
        onPressChat={() => router.push('/chat')} 
      />

      {/* 4. Accesos Rápidos de Administración */}
      <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>
        {t('dashboard.systemManagement', 'Gestión del sistema')}
      </Text>

      {/* 5. Tarjeta Vertical: Gestión de Usuarios */}
      <ActionCard 
        title={t('dashboard.userManagement', 'Gestión de Usuarios')}
        subtitle={t('dashboard.userManagementSub', 'Crear cuentas, editar perfiles y asignar roles institucionales')}
        isDark={isDark}
        fallbackIcon={Users}
        iconColor="#FFFFFF"
        slotBgColor={isDark ? '#27272A' : '#18181B'}
        borderColor={isDark ? 'rgba(255,255,255,0.08)' : 'black'}
        onPress={() => router.push('/users')}
        style={{ marginBottom: 12 }}
      />
    
      {/* 6. Fila Flex: Módulos y Avisos */}
      <View style={styles.actionRowFlex}>
        <View style={{ flex: 1 }}>
          <ActionCard 
            title={t('titles.modules', 'Módulos')}
            isDark={isDark}
            fallbackIcon={Grid}
            iconColor="#FFFFFF"
            slotBgColor={isDark ? '#27272A' : '#18181B'}
            borderColor={isDark ? 'rgba(255,255,255,0.08)' : 'black'}
            onPress={() => router.push('/modules')}
          />
        </View>

        <View style={{ flex: 1 }}>
          <ActionCard 
            title={t('menu.announcements', 'Avisos')}
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
