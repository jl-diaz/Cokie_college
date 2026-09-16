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
            tintColor="#EC4899" 
            colors={['#EC4899', '#0B1956']} 
          />
        }
      >
        {/* 1. Header Dinámico estilo Imagen 1 */}
        <View style={[styles.headerContainer, { backgroundColor: isDark ? '#111827' : (Colors.headerC || '#0B1956') }]}>
          <Text style={styles.greetingTitle}>
            ¡Hola <Text style={styles.nameHighlight}>{firstName}</Text>!
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
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{roleLabel}</Text>
            </View>

            {levelOrGradeLabel ? (
              <View style={styles.levelPill}>
                <Text style={styles.levelPillText}>{levelOrGradeLabel}</Text>
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

          {/* Fallback para Administrador / Cafetín u otros roles */}
          {profile?.role !== 'teacher' && profile?.role !== 'student' && profile?.role !== 'coordinator' && (
            <View style={styles.fallbackContainer}>
              <View style={[styles.fallbackCard, isDark && styles.fallbackCardDark]}>
                <Sparkles size={28} color="#EC4899" />
                <Text style={[styles.fallbackTitle, isDark && styles.textLight]}>
                  Bienvenido al Panel Central
                </Text>
                <Text style={[styles.fallbackDesc, isDark && styles.textMuted]}>
                  Tienes acceso a los módulos institucionales y herramientas avanzadas de Cokie College.
                </Text>
                <TouchableOpacity 
                  style={styles.fallbackBtn}
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  greetingTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  nameHighlight: {
    color: '#EC4899', // Rosa Cokie
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
  subtitleUnderline: {
    height: 2,
    backgroundColor: '#38BDF8', // Cyan/Sky accent
    width: '100%',
    marginTop: 4,
    borderRadius: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
