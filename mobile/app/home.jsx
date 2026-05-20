import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Home, Users, FileText, BookOpen, Calendar } from 'lucide-react-native';

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
          { name: 'Estudiantes', path: '/students', icon: Users, color: '#3b82f6', desc: 'Ver listado de estudiantes' },
          { name: 'Justificaciones', path: '/justifications', icon: FileText, color: '#f59e0b', desc: 'Aprobar ausencias' },
          { name: 'Asignar Clases', path: '/assign', icon: BookOpen, color: '#10b981', desc: 'Asignar docentes' }
        ];
      case 'teacher':
        return [
          { name: 'Mi Horario', path: '/schedule', icon: Calendar, color: '#3b82f6', desc: 'Clases programadas' },
          { name: 'Clase Activa', path: '/class', icon: BookOpen, color: '#f59e0b', desc: 'Gestionar asistencia' },
          { name: 'Notas', path: '/grades', icon: FileText, color: '#10b981', desc: 'Calificar estudiantes' }
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
        <Text style={styles.welcomeText}>¡Hola, {profile?.full_name || 'Estudiante'}!</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  content: {
    padding: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B1956',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    alignItems: 'center',
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
    color: '#0B1956',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: '#8a8da0',
    textAlign: 'center',
    lineHeight: 16,
  }
});
