import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Home, Users, FileText, BookOpen, Calendar } from 'lucide-react-native';
<<<<<<< HEAD
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
=======
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34

export default function HomeScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  const getRoleModules = () => {
    switch (profile?.role) {
      case 'super_admin':
        return [
          { name: 'Usuarios', path: '/users', icon: Users, color: '#3b82f6', desc: 'Gestionar usuarios del sistema' },
          { name: 'Catálogo Conducta', path: '/conduct', icon: FileText, color: '#8b5cf6', desc: 'Administrar códigos' }
        ];
      case 'coordinator':
        return [
<<<<<<< HEAD
          { name: 'Maestros', path: '/coordinator', icon: Users, color: '#3b82f6', desc: 'Maestros de tu nivel' },
          { name: 'Estudiantes', path: '/students', icon: Users, color: '#8b5cf6', desc: 'Ver listado de estudiantes' },
          { name: 'Salones', path: '/classrooms', icon: BookOpen, color: '#ec4899', desc: 'Ver todos los salones' },
          { name: 'Justificaciones', path: '/coordinator-justifications', icon: FileText, color: '#f59e0b', desc: 'Aprobar ausencias' },
=======
          { name: 'Estudiantes', path: '/students', icon: Users, color: '#3b82f6', desc: 'Ver listado de estudiantes' },
          { name: 'Justificaciones', path: '/justifications', icon: FileText, color: '#f59e0b', desc: 'Aprobar ausencias' },
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
          { name: 'Asignar Clases', path: '/assign', icon: BookOpen, color: '#10b981', desc: 'Asignar docentes' }
        ];
      case 'teacher':
        return [
          { name: 'Mi Horario', path: '/schedule', icon: Calendar, color: '#3b82f6', desc: 'Clases programadas' },
<<<<<<< HEAD
          { name: 'Salones', path: '/classrooms', icon: BookOpen, color: '#ec4899', desc: 'Ver todos los salones' },
          { name: 'Clase Activa', path: '/class', icon: BookOpen, color: '#f59e0b', desc: 'Gestionar asistencia' },
          { name: 'Notas', path: '/teacher-grades', icon: FileText, color: '#10b981', desc: 'Calificar estudiantes' }
=======
          { name: 'Clase Activa', path: '/class', icon: BookOpen, color: '#f59e0b', desc: 'Gestionar asistencia' },
          { name: 'Notas', path: '/grades', icon: FileText, color: '#10b981', desc: 'Calificar estudiantes' }
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
        ];
      case 'student':
        return [
          { name: 'Horario', path: '/schedule', icon: Calendar, color: '#3b82f6', desc: 'Ver tus clases' },
          { name: 'Diario Pedagógico', path: '/diary', icon: BookOpen, color: '#8b5cf6', desc: 'Actividades y tareas' },
          { name: 'Mis Notas', path: '/grades', icon: FileText, color: '#10b981', desc: 'Ver calificaciones' },
          { name: 'Justificaciones', path: '/justifications', icon: FileText, color: '#f59e0b', desc: 'Solicitar permisos' }
        ];
      default:
        return [];
    }
  };

  const modules = getRoleModules();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
<<<<<<< HEAD
        <Text style={styles.welcomeText}>¡Hola, {profile?.full_name?.split(' ')[0] || 'Estudiante'}!</Text>
=======
        <Text style={styles.welcomeText}>¡Hola, {profile?.full_name || 'Estudiante'}!</Text>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
        <Text style={styles.subtitle}>Bienvenido a Cokie College</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Módulos Disponibles</Text>
        
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
<<<<<<< HEAD
                <View style={[styles.iconContainer, { backgroundColor: mod.color + '15' }]}>
=======
                <View style={[styles.iconContainer, { backgroundColor: mod.color + '20' }]}>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
<<<<<<< HEAD
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.xl,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    paddingBottom: Spacing['4xl'],
  },
  welcomeText: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.extraBold,
    color: Colors.text.inverse,
  },
  subtitle: {
    fontSize: Typography.size.md,
=======
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 24,
    backgroundColor: '#0B1957',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 40,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 15,
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  content: {
<<<<<<< HEAD
    padding: Spacing.xl,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
=======
    padding: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B1956',
    marginBottom: 16,
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
<<<<<<< HEAD
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.card,
=======
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
<<<<<<< HEAD
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
=======
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1956',
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    textAlign: 'center',
    marginBottom: 6,
  },
  cardDesc: {
<<<<<<< HEAD
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
=======
    fontSize: 12,
    color: '#8a8da0',
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    textAlign: 'center',
    lineHeight: 16,
  }
});
