import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Home, Users, FileText, BookOpen, Calendar, Bell, Megaphone, Utensils, Camera } from 'lucide-react-native';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  // ── RetoFecha: Calcular edad a partir de birth_date ──
  const getAge = () => {
    if (!profile?.birth_date) return null;
    const today = new Date();
    const birth = new Date(profile.birth_date + 'T12:00:00');
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = getAge();
  // ── FIN RetoFecha ──

  const getRoleModules = () => {
    const lunchModule = { name: t('menu.lunch', 'Almuerzos'), path: '/lunch', icon: Utensils, color: '#10b981', desc: t('home.lunchDesc', 'Encargar tu almuerzo del día') };

    const commonModules = [
      { name: t('menu.interpreter', 'Intérprete (ISL)'), path: '/interpreter', icon: Camera, color: '#06b6d4', desc: t('home.interpreterDesc', 'Traductor de señas en tiempo real') },
      { name: t('menu.events', 'Eventos'), path: '/events', icon: Calendar, color: '#ec4899', desc: t('home.eventsDesc', 'Fechas y actividades institucionales') },
      { name: t('menu.announcements', 'Avisos'), path: '/announcements', icon: Bell, color: '#f59e0b', desc: t('home.announcementsDesc', 'Comunicados oficiales') }
    ];

    switch (profile?.role) {
      case 'super_admin':
        return [
          lunchModule,
          { name: t('menu.users', 'Usuarios'), path: '/users', icon: Users, color: '#3b82f6', desc: t('home.usersDesc', 'Gestionar usuarios del sistema') },
          { name: t('menu.conduct_catalog', 'Catálogo Conducta'), path: '/conduct', icon: FileText, color: '#8b5cf6', desc: t('home.conductCatalogDesc', 'Administrar códigos disciplinarios') },
          ...commonModules
        ];
      case 'coordinator':
        return [
          lunchModule,
          { name: t('menu.classrooms', 'Salones'), path: '/classrooms', icon: BookOpen, color: '#0ea5e9', desc: 'Ver salones y descargar reportes' },
          { name: t('menu.students', 'Estudiantes'), path: '/students', icon: Users, color: '#8b5cf6', desc: t('home.studentsDesc', 'Ver listado de estudiantes') },
          { name: t('menu.justifications', 'Justificaciones'), path: '/coordinator-justifications', icon: FileText, color: '#f59e0b', desc: t('home.coordinatorJustificationsDesc', 'Aprobar ausencias') },
          { name: t('menu.grade_tickets', 'Tickets de Notas'), path: '/coordinator-tickets', icon: FileText, color: '#ec4899', desc: t('home.gradeTicketsDesc', 'Aprobar extensión de notas') },
          { name: t('menu.assign_classes', 'Asignar Clases'), path: '/assign', icon: BookOpen, color: '#10b981', desc: t('home.assignDesc', 'Asignar docentes') },
          ...commonModules
        ];
      case 'teacher':
        return [
          lunchModule,
          { name: t('menu.schedule', 'Mi Horario'), path: '/schedule', icon: Calendar, color: '#3b82f6', desc: t('home.scheduleDesc', 'Clases programadas') },
          { name: t('menu.activeClass', 'Clase Activa'), path: '/class', icon: BookOpen, color: '#f59e0b', desc: t('home.activeClassDesc', 'Gestionar asistencia') },
          { name: t('menu.grades', 'Notas'), path: '/teacher-grades', icon: FileText, color: '#10b981', desc: t('home.teacherGradesDesc', 'Calificar estudiantes') },
          ...commonModules
        ];
      case 'student':
        return [
          lunchModule,
          { name: t('menu.schedule', 'Horario'), path: '/schedule', icon: Calendar, color: '#3b82f6', desc: t('home.studentScheduleDesc', 'Ver tus clases') },
          { name: t('menu.diary', 'Diario Pedagógico'), path: '/diary', icon: BookOpen, color: '#8b5cf6', desc: t('home.diaryDesc', 'Inasistencias y códigos') },
          { name: t('menu.grades', 'Mis Notas'), path: '/grades', icon: FileText, color: '#10b981', desc: t('home.gradesDesc', 'Ver calificaciones') },
          { name: t('menu.justifications', 'Justificaciones'), path: '/justifications', icon: FileText, color: '#f59e0b', desc: t('home.justificationsDesc', 'Solicitar permisos') },
          ...commonModules
        ];
      case 'cafetin':
        return [
          { name: t('menu.cafetin', 'Gestión Cafetín'), path: '/cafetin', icon: Utensils, color: '#10b981', desc: t('home.cafetinDesc', 'Menú del día, pedidos y despacho QR') },
        ];
      default:
        return [];
    }
  };

  const modules = getRoleModules();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <Text style={styles.welcomeText}>
            {t('home.welcome', '¡Hola, {{name}}!', { name: profile?.full_name?.split(' ')[0] || t('dashboard.student', 'Estudiante') })}
          </Text>
        </View>
        <Text style={styles.subtitle}>{t('home.subtitle', 'Bienvenido a Cokie College')}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{profile?.role?.replace('_', ' ').toUpperCase()}</Text>
          </View>
          {profile?.level ? (
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{profile.level}</Text>
            </View>
          ) : null}
          {/* ── RetoFecha: Pill de edad ── */}
          {age !== null ? (
            <View style={styles.ageBadge}>
              <Text style={styles.ageBadgeText}>{age} años</Text>
            </View>
          ) : null}
          {/* ── FIN RetoFecha ── */}
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{t('home.availableModules', 'Módulos Disponibles')}</Text>
        
        <View style={styles.grid}>
          {modules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <TouchableOpacity 
                key={i} 
                style={styles.card} 
                onPress={() => router.push(mod.path)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconContainer, { backgroundColor: mod.color + '18' }]}>
                  <Icon size={26} color={mod.color} />
                </View>
                <Text style={styles.cardTitle}>{mod.name}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{mod.desc}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 24,
    paddingTop: 28,
    backgroundColor: theme === 'dark' ? Colors.card : '#0B1956',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 32,
    borderBottomWidth: theme === 'dark' ? 1 : 0,
    borderBottomColor: Colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '800',
    color: theme === 'dark' ? Colors.primary : '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: theme === 'dark' ? Colors.text.secondary : 'rgba(255,255,255,0.8)',
    marginTop: 4,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  roleBadge: {
    backgroundColor: theme === 'dark' ? Colors.primary + '25' : 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme === 'dark' ? Colors.primary : 'rgba(255,255,255,0.3)',
  },
  roleBadgeText: {
    color: theme === 'dark' ? Colors.primary : '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  levelBadge: {
    backgroundColor: 'rgba(246, 190, 47, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F6BE2F',
  },
  levelBadgeText: {
    color: theme === 'dark' ? '#F6BE2F' : '#FFE082',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // ── RetoFecha: Estilo de la pill de edad ──
  ageBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  ageBadgeText: {
    color: theme === 'dark' ? '#60a5fa' : '#93c5fd',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // ── FIN RetoFecha ──
  content: {
    padding: 20,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
    marginLeft: 4,
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  card: {
    minWidth: 140,
    flex: 1,
    flexBasis: 160,
    maxWidth: 300,
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.04,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'center',
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[200],
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justify.content: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 11,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 15,
  }
});
