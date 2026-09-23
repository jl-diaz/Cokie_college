import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Grid, Sparkles, User, ShieldAlert } from 'lucide-react-native';

import TeacherDashboard from '../src/components/dashboard/TeacherDashboard';
import StudentDashboard from '../src/components/dashboard/StudentDashboard';
import CoordinatorDashboard from '../src/components/dashboard/CoordinatorDashboard';
import AdminDashboard from '../src/components/dashboard/AdminDashboard';
import CafetinDashboard from '../src/components/dashboard/CafetinDashboard';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { colors: Colors, theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isDark = theme === 'dark';

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] || (profile?.role === 'student' ? 'Estudiante' : 'Usuario');

  const roleLabel = React.useMemo(() => {
    switch (profile?.role) {
      case 'teacher':
        return 'Profesor';
      case 'student':
        return 'Estudiante';
      case 'coordinator':
        return 'Coordinador';
      case 'super_admin':
        return 'Administrador';
      case 'cafetin':
        return 'Cafetín';
      default:
        return profile?.role?.replace('_', ' ') || 'Usuario';
    }
  }, [profile?.role]);

  const levelOrGradeLabel = React.useMemo(() => {
    if (profile?.role === 'student') {
      if (profile?.grade && profile?.section) {
        return `${profile.grade}º "${profile.section}"`;
      }
      return profile?.level || 'Educación Básica';
    }
    return profile?.level || (profile?.role === 'teacher' ? 'Tercer ciclo' : 'Institución');
  }, [profile]);

  const clickCount = React.useRef(0);
  const clickTimeout = React.useRef(null);

  const handleRoleClick = () => {
    clickCount.current += 1;
    if (clickCount.current >= 5) {
      clickCount.current = 0;
      router.push('/easter-egg');
    }
    
    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => {
      clickCount.current = 0;
    }, 1200);
  };

  return (
    <View style={[styles.root, { backgroundColor: isDark ? Colors.background : '#F8FAFC' }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={isDark ? Colors.primary : '#F7D8FF'} 
            colors={isDark ? [Colors.primary, '#18181B'] : ['#F7D8FF', '#0B1956']} 
          />
        }
      >
        {/* 1. Header Dinámico estilo Imagen 1 */}
        <View style={[styles.headerContainer, { backgroundColor: isDark ? '#121212' : (Colors.headerC || '#0B1956') }]}>
          <Text style={styles.greetingTitle}>
            ¡Hola <Text style={[styles.nameHighlight, isDark && { color: Colors.primaryLight || Colors.primary }]}>{firstName}</Text>!
          </Text>

          <View style={styles.subtitleWrapper}>
            <Text style={styles.subtitleText}>
              {profile?.role === 'student' 
                ? '¿Qué pendientes tienes hoy?' 
                : (profile?.role === 'teacher' 
                  ? '¿Qué clases tienes hoy?' 
                  : 'Gestión y coordinación del día')}
            </Text>
            <View style={styles.subtitleUnderline} />
          </View>

          <View style={styles.badgeRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={handleRoleClick}>
              <View style={[styles.rolePill, isDark && { backgroundColor: Colors.primary }]}>
                <Text style={[styles.rolePillText, isDark && { color: '#FFFFFF' }]}>{roleLabel}</Text>
              </View>
            </TouchableOpacity>

            {levelOrGradeLabel ? (
              <View style={[styles.levelPill, isDark && { backgroundColor: 'transparent', borderColor: Colors.primaryLight || Colors.primary }]}>
                <Text style={[styles.levelPillText, isDark && { color: '#FFFFFF' }]}>{levelOrGradeLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 2. Contenido del Resumen según el Rol */}
        <View key={refreshKey} style={styles.dashboardBody}>
          {profile?.role === 'teacher' && (
            <TeacherDashboard isDark={isDark} />
          )}

          {profile?.role === 'student' && (
            <StudentDashboard isDark={isDark} />
          )}

          {profile?.role === 'coordinator' && (
            <CoordinatorDashboard isDark={isDark} />
          )}

          {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
            <AdminDashboard isDark={isDark} />
          )}

          {profile?.role === 'cafetin' && (
            <CafetinDashboard isDark={isDark} />
          )}

          {/* Fallback para otros roles no contemplados */}
          {profile?.role !== 'teacher' && 
           profile?.role !== 'student' && 
           profile?.role !== 'coordinator' && 
           profile?.role !== 'super_admin' && 
           profile?.role !== 'admin' && 
           profile?.role !== 'cafetin' && (
            <View style={styles.fallbackContainer}>
              <View style={[styles.fallbackCard, isDark && styles.fallbackCardDark]}>
                <Sparkles size={28} color={isDark ? (Colors.primaryLight || Colors.primary) : '#F7D8FF'} />
                <Text style={[styles.fallbackTitle, isDark && styles.textLight]}>
                  Bienvenido al Panel Central
                </Text>
                <Text style={[styles.fallbackDesc, isDark && styles.textMuted]}>
                  Tienes acceso a los módulos institucionales y herramientas avanzadas de Cokie College.
                </Text>
                <TouchableOpacity 
                  style={[styles.fallbackBtn, isDark && { backgroundColor: Colors.primary }]}
                  onPress={() => router.push('/modules')}
                  activeOpacity={0.8}
                >
                  <Grid size={16} color="#FFFFFF" />
                  <Text style={styles.fallbackBtnText}>Ver Módulos Disponibles</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 95, // Margen para que el TabBar no tape nada
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 16 : 22,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  greetingTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  nameHighlight: {
    color: '#F7D8FF', // Rosa Cokie
  },
  subtitleWrapper: {
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 16,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E2E8F0',
    letterSpacing: 0.2,
  },
 
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    backgroundColor: '#F7D8FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B1956',
  },
  levelPill: {
    backgroundColor: '#F7D8FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F7D8FF',
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B1956',
  },
  dashboardBody: {
    flex: 1,
    marginTop: 4,
  },
  fallbackContainer: {
    padding: 20,
    alignItems: 'center',
  },
  fallbackCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  fallbackCardDark: {
    backgroundColor: '#18181B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    textAlign: 'center',
  },
  fallbackDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 10,
    lineHeight: 18,
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0B1956',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 10,
  },
  fallbackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  textLight: {
    color: '#FFFFFF',
  },
  textMuted: {
    color: '#94A3B8',
  },
});
