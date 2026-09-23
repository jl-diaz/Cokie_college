import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Users, FileText, BookOpen, Calendar, Bell, Sparkles, Clock, Utensils, Camera } from 'lucide-react-native';

const IMAGES = {
  img1: require('../assets/1.png'),
  img2: require('../assets/2.png'),
  img3: require('../assets/3.png'),
  img4: require('../assets/4.png'),
  img5: require('../assets/5.png'),
  img6: require('../assets/6.png'),
  img7: require('../assets/7.png'),
  img8: require('../assets/8.png'),
  img9: require('../assets/9.png'),
  hapes: require('../assets/hapes.png'),
};

const AnimatedBlockCard = ({ children, index, style, onPress }) => {
  const translateY = React.useRef(new Animated.Value(30)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: index * 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [index]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <TouchableOpacity 
        style={style} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ModulesScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);

  const getRoleModules = () => {
    const lunchModule = { 
      name: t('menu.lunch', 'Almuerzos'), 
      path: '/lunch', 
      icon: Utensils, 
      color: Colors.primary, 
      desc: t('home.lunchDesc', 'Encargar tu almuerzo del día'),
      image: IMAGES.img1
    };

    const eventsModule = { 
      name: t('menu.events', 'Eventos'), 
      path: '/events', 
      icon: Calendar, 
      color: '#ec4899', 
      desc: t('home.eventsDesc', 'Fechas y actividades institucionales'),
      image: IMAGES.img5
    };

    const announcementsModule = { 
      name: t('menu.announcements', 'Avisos'), 
      path: '/announcements', 
      icon: Bell, 
      color: '#f59e0b', 
      desc: t('home.announcementsDesc', 'Comunicados oficiales'),
      image: IMAGES.img6
    };

    const commonModules = [eventsModule, announcementsModule];

    switch (profile?.role) {
      case 'super_admin':
      case 'admin':
        return [
          lunchModule,
          { name: t('menu.users', 'Usuarios'), path: '/users', icon: Users, color: '#3b82f6', desc: t('home.usersDesc', 'Gestionar usuarios del sistema'), image: IMAGES.img8 },
          { name: t('menu.gesture_studio', 'Estudio de Gestos e IA'), path: '/gesture-studio', icon: Sparkles, color: '#8b5cf6', desc: t('home.gestureStudioDesc', 'Gestionar dialecto, grabar señas y entrenar la IA'), image: IMAGES.img9 },
          { name: t('menu.subject_hours', 'Horas de materias'), path: '/subject-hours', icon: Clock, color: '#6366f1', desc: t('home.subjectHoursDesc', 'Carga horaria semanal para horarios'), image: IMAGES.img2 },
          { name: t('menu.conduct_catalog', 'Catálogo Conducta'), path: '/conduct', icon: FileText, color: '#a855f7', desc: t('home.conductCatalogDesc', 'Administrar códigos disciplinarios'), image: IMAGES.img3 },
          { name: t('menu.academic_periods', 'Periodos académicos'), path: '/academic-periods', icon: Calendar, color: '#0ea5e9', desc: t('home.academicPeriodsDesc', 'Fechas de inicio y fin de periodos'), image: IMAGES.img7 },
          eventsModule,
          announcementsModule
        ];
      case 'coordinator':
        return [
          lunchModule,
          { name: t('menu.classrooms', 'Salones'), path: '/classrooms', icon: BookOpen, color: '#0ea5e9', desc: t('home.classroomsDesc', 'Ver salones y descargar reportes'), image: IMAGES.hapes },
          { name: t('menu.students', 'Estudiantes'), path: '/students', icon: Users, color: '#8b5cf6', desc: t('home.studentsDesc', 'Ver listado de estudiantes'), image: IMAGES.img8 },
          { name: t('menu.grade_tickets', 'Tickets de Notas'), path: '/coordinator-tickets', icon: FileText, color: '#ec4899', desc: t('home.gradeTicketsDesc', 'Aprobar extensión de notas'), image: IMAGES.img4 },
          { name: t('menu.assign_classes', 'Asignar Clases'), path: '/assign', icon: BookOpen, color: Colors.primary, desc: t('home.assignDesc', 'Asignar docentes'), image: IMAGES.img3 },
          { name: t('menu.justifications', 'Justificaciones'), path: '/coordinator-justifications', icon: FileText, color: '#f59e0b', desc: t('home.coordinatorJustificationsDesc', 'Aprobar ausencias'), image: IMAGES.img7 },
          eventsModule,
          announcementsModule
        ];
      case 'teacher':
        return [
          lunchModule,
          { name: t('menu.schedule', 'Mi Horario'), path: '/schedule', icon: Calendar, color: '#3b82f6', desc: t('home.scheduleDesc', 'Clases programadas'), image: IMAGES.img2 },
          { name: t('menu.activeClass', 'Clase Activa'), path: '/class', icon: BookOpen, color: '#f59e0b', desc: t('home.activeClassDesc', 'Gestionar asistencia'), image: IMAGES.hapes },
          { name: t('menu.grades', 'Notas'), path: '/teacher-grades', icon: FileText, color: Colors.primary, desc: t('home.teacherGradesDesc', 'Calificar estudiantes'), image: IMAGES.img4 },
          eventsModule,
          announcementsModule
        ];
      case 'student':
        return [
          lunchModule,
          { name: t('menu.schedule', 'Horario'), path: '/schedule', icon: Calendar, color: '#3b82f6', desc: t('home.studentScheduleDesc', 'Ver tus clases'), image: IMAGES.img2 },
          { name: t('menu.diary', 'Diario Pedagógico'), path: '/diary', icon: BookOpen, color: '#8b5cf6', desc: t('home.diaryDesc', 'Inasistencias y códigos'), image: IMAGES.img3 },
          { name: t('menu.grades', 'Mis Notas'), path: '/grades', icon: FileText, color: Colors.primary, desc: t('home.gradesDesc', 'Ver calificaciones'), image: IMAGES.img4 },
          eventsModule,
          announcementsModule,
          { name: t('menu.justifications', 'Justificaciones'), path: '/justifications', icon: FileText, color: '#f59e0b', desc: t('home.justificationsDesc', 'Solicitar permisos'), image: IMAGES.img7 }
        ];
      case 'cafetin':
        return [
          { name: t('menu.cafetin', 'Gestión Cafetín'), path: '/cafetin', icon: Utensils, color: Colors.primary, desc: t('home.cafetinDesc', 'Menú del día, pedidos y despacho QR'), image: IMAGES.img1 },
          eventsModule,
          announcementsModule
        ];
      default:
        return [
          lunchModule,
          ...commonModules
        ];
    }
  };

  const modules = getRoleModules();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('titles.modules', 'Módulos')}</Text>
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
              <AnimatedBlockCard 
                key={mod.path || i} 
                index={i}
                style={styles.card} 
                onPress={() => router.push(mod.path)}
              >
                {isImageLeft && (
                  <View style={styles.imagePlaceholder}>
                    <Image 
                      source={mod.image || IMAGES.img1} 
                      style={styles.moduleImage} 
                      resizeMode="cover"
                    />
                  </View>
                )}
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{mod.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={3}>{mod.desc}</Text>
                </View>
                {!isImageLeft && (
                  <View style={styles.imagePlaceholder}>
                    <Image 
                      source={mod.image || IMAGES.img1} 
                      style={styles.moduleImage} 
                      resizeMode="cover"
                    />
                  </View>
                )}
              </AnimatedBlockCard>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors, isDark) => {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: isDark ? Colors.background : '#0A1450',
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
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
      paddingBottom: 120,
    },
    list: {
      gap: 12,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: isDark ? Colors.card : '#FFFFFF',
      borderRadius: 28,
      height: 155,
      marginHorizontal: 0,
      overflow: 'hidden',
      padding: 6,
      alignItems: 'center',
    },
    imagePlaceholder: {
      width: '42%',
      height: 143,
      backgroundColor: 'transparent',
      borderRadius: 22,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    moduleImage: {
      width: '100%',
      height: '100%',
      borderRadius: 22,
    },
    cardContent: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 10,
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? Colors.text.primary : '#000000',
      marginBottom: 6,
    },
    cardDesc: {
      fontSize: 13,
      lineHeight: 18,
      color: isDark ? Colors.text.secondary : '#4B5563',
    }
  });
};
