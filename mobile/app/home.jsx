import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Home, Users, FileText, BookOpen, Calendar } from 'lucide-react-native';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const getRoleModules = () => {
    switch (profile?.role) {
      case 'super_admin':
        return [
          { name: t('menu.users', 'Usuarios'), path: '/users', icon: Users, color: '#3b82f6', desc: t('home.usersDesc', 'Gestionar usuarios del sistema') },
          { name: t('menu.conduct_catalog', 'Catálogo Conducta'), path: '/conduct', icon: FileText, color: '#8b5cf6', desc: t('home.conductCatalogDesc', 'Administrar códigos disciplinarios') }
        ];
      case 'coordinator':
        return [
          { name: t('menu.teachers', 'Maestros'), path: '/coordinator/teachers', icon: Users, color: '#3b82f6', desc: t('home.teachersDesc', 'Maestros de tu nivel') },
          { name: t('menu.students', 'Estudiantes'), path: '/students', icon: Users, color: '#8b5cf6', desc: t('home.studentsDesc', 'Ver listado de estudiantes') },
          { name: t('menu.justifications', 'Justificaciones'), path: '/coordinator-justifications', icon: FileText, color: '#f59e0b', desc: t('home.coordinatorJustificationsDesc', 'Aprobar ausencias') },
          { name: t('menu.assign_classes', 'Asignar Clases'), path: '/assign', icon: BookOpen, color: '#10b981', desc: t('home.assignDesc', 'Asignar docentes') }
        ];
      case 'teacher':
        return [
          { name: t('menu.schedule', 'Mi Horario'), path: '/schedule', icon: Calendar, color: '#3b82f6', desc: t('home.scheduleDesc', 'Clases programadas') },
          { name: t('menu.classrooms', 'Salones'), path: '/classrooms', icon: BookOpen, color: '#ec4899', desc: t('home.classroomsDesc', 'Ver todos los salones') },
          { name: t('menu.activeClass', 'Clase Activa'), path: '/class', icon: BookOpen, color: '#f59e0b', desc: t('home.activeClassDesc', 'Gestionar asistencia') },
          { name: t('menu.grades', 'Notas'), path: '/teacher-grades', icon: FileText, color: '#10b981', desc: t('home.teacherGradesDesc', 'Calificar estudiantes') }
        ];
      case 'student':
        return [
          { name: t('menu.schedule', 'Horario'), path: '/schedule', icon: Calendar, color: '#3b82f6', desc: t('home.studentScheduleDesc', 'Ver tus clases') },
          { name: t('menu.diary', 'Diario Pedagógico'), path: '/diary', icon: BookOpen, color: '#8b5cf6', desc: t('home.diaryDesc', 'Inasistencias y códigos') },
          { name: t('menu.grades', 'Mis Notas'), path: '/grades', icon: FileText, color: '#10b981', desc: t('home.gradesDesc', 'Ver calificaciones') },
          { name: t('menu.justifications', 'Justificaciones'), path: '/justifications', icon: FileText, color: '#f59e0b', desc: t('home.justificationsDesc', 'Solicitar permisos') }
        ];
      default:
        return [];
    }
  };

  const modules = getRoleModules();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          {t('home.welcome', '¡Hola, {{name}}!', { name: profile?.full_name || t('dashboard.student', 'Estudiante') })}
        </Text>
        <Text style={styles.subtitle}>{t('home.subtitle', 'Bienvenido a Cokie College')}</Text>
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
                activeOpacity={0.8}
              >
                <View style={[styles.iconContainer, { backgroundColor: mod.color + '20' }]}>
                  <Icon size={28} color={mod.color} />
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
    backgroundColor: theme === 'dark' ? Colors.card : Colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 40,
    borderBottomWidth: theme === 'dark' ? 1 : 0,
    borderBottomColor: Colors.gray[200],
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '800',
    color: theme === 'dark' ? Colors.primary : '#FFFFFF',
  },
  subtitle: {
    fontSize: 15,
    color: theme === 'dark' ? Colors.text.secondary : 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  content: {
    padding: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 10,
    elevation: 4,
    alignItems: 'center',
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[200],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 16,
  }
});
