import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Users, FileText, BookOpen, Calendar, Bell, Sparkles, Clock, Utensils, Camera } from 'lucide-react-native';

export default function ModulesScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const getRoleModules = () => {
    const lunchModule = { name: t('menu.lunch', 'Almuerzos'), path: '/lunch', icon: Utensils, color: '#10b981', desc: t('home.lunchDesc', 'Encargar tu almuerzo del día') };

    const commonModules = [
      { name: t('menu.interpreter', 'Intérprete ISL (BETA)'), path: '/interpreter', icon: Camera, color: '#06b6d4', desc: t('home.interpreterDesc', 'Traductor de señas en tiempo real') },
      { name: t('menu.events', 'Eventos'), path: '/events', icon: Calendar, color: '#ec4899', desc: t('home.eventsDesc', 'Fechas y actividades institucionales') },
      { name: t('menu.announcements', 'Avisos'), path: '/announcements', icon: Bell, color: '#f59e0b', desc: t('home.announcementsDesc', 'Comunicados oficiales') }
    ];

    switch (profile?.role) {
      case 'super_admin':
        return [
          lunchModule,
          { name: t('menu.users', 'Usuarios'), path: '/users', icon: Users, color: '#3b82f6', desc: t('home.usersDesc', 'Gestionar usuarios del sistema') },
          { name: t('menu.gesture_studio', 'Estudio de Gestos e IA'), path: '/gesture-studio', icon: Sparkles, color: '#8b5cf6', desc: t('home.gestureStudioDesc', 'Gestionar dialecto, grabar señas y entrenar la IA') },
          { name: t('menu.subject_hours', 'Horas de materias'), path: '/subject-hours', icon: Clock, color: '#6366f1', desc: t('home.subjectHoursDesc', 'Carga horaria semanal para horarios') },
          { name: t('menu.academic_periods', 'Periodos académicos'), path: '/academic-periods', icon: Calendar, color: '#0ea5e9', desc: t('home.academicPeriodsDesc', 'Fechas de inicio y fin de periodos') },
          { name: t('menu.conduct_catalog', 'Catálogo Conducta'), path: '/conduct', icon: FileText, color: '#a855f7', desc: t('home.conductCatalogDesc', 'Administrar códigos disciplinarios') },
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
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Modulos</Text>
      </View>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          {modules.map((mod, i) => {
            const isImageLeft = i % 2 === 0;

            return (
              <TouchableOpacity 
                key={i} 
                style={styles.card} 
                onPress={() => router.push(mod.path)}
                activeOpacity={0.8}
              >
                {isImageLeft && (
                  <View style={styles.imagePlaceholder} />
                )}
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{mod.name}</Text>
                  <Text style={styles.cardDesc}>{mod.desc}</Text>
                </View>
                {!isImageLeft && (
                  <View style={styles.imagePlaceholder} />
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors, theme) => {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme === 'dark' ? Colors.background : '#0A1450',
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 0,
      paddingBottom: 100,
    },
    list: {
      gap: 12,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      minHeight: 140,
      marginHorizontal: 0,
      overflow: 'hidden',
    },
    imagePlaceholder: {
      width: '40%',
      backgroundColor: '#D1D5DB', // light gray
      borderRadius: 24,
      margin: 4,
    },
    cardContent: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#000000',
      marginBottom: 6,
    },
    cardDesc: {
      fontSize: 13,
      color: '#4B5563',
    }
  });
};
