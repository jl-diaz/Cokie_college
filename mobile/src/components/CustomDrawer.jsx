import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Home, Users, FileText, BookOpen, Calendar, LogOut, X } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function CustomDrawer({ visible, onClose }) {
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -width,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  if (!profile) return null;

  const menuItems = {
    super_admin: [
      { name: 'Inicio', path: '/home', icon: Home },
      { name: 'Usuarios', path: '/users', icon: Users },
      { name: 'Catálogo Conducta', path: '/conduct', icon: FileText },
    ],
    coordinator: [
      { name: 'Inicio', path: '/home', icon: Home },
      { name: 'Estudiantes', path: '/students', icon: Users },
      { name: 'Justificaciones', path: '/justifications', icon: FileText },
      { name: 'Asignar Clases', path: '/assign', icon: BookOpen },
    ],
    teacher: [
      { name: 'Inicio', path: '/home', icon: Home },
      { name: 'Mi Horario', path: '/schedule', icon: Calendar },
      { name: 'Clase Activa', path: '/class', icon: BookOpen },
      { name: 'Notas', path: '/grades', icon: FileText },
    ],
    student: [
      { name: 'Inicio', path: '/home', icon: Home },
      { name: 'Mis Notas', path: '/grades', icon: FileText },
      { name: 'Diario Pedagógico', path: '/diary', icon: BookOpen },
      { name: 'Horario', path: '/schedule', icon: Calendar },
      { name: 'Justificaciones', path: '/justifications', icon: FileText },
    ]
  };

  const currentMenu = menuItems[profile.role] || [];

  const handleNavigate = (path) => {
    onClose();
    setTimeout(() => {
      router.push(path);
    }, 150); // Esperar que cierre el drawer un poco
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.overlayContainer}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        
<Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }], zIndex: 100 }]}>
           <View style={styles.header}>
             <View style={{ flex: 1 }}>
               <Text style={styles.brand}>Cokie<Text style={styles.brandAccent}>College</Text></Text>
               <Text style={styles.subBrand}>Plataforma Estudiantil</Text>
             </View>
             <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
               <X size={24} color="#FFF" />
             </TouchableOpacity>
           </View>

          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.full_name.charAt(0)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>{profile.full_name}</Text>
              <Text style={styles.profileRole}>{profile.role.replace('_', ' ')}</Text>
            </View>
          </View>

          <View style={styles.navContainer}>
            {currentMenu.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => handleNavigate(item.path)}
                  activeOpacity={0.7}
                >
                  <Icon size={22} color={isActive ? "#0B1956" : "#FFF"} style={styles.navIcon} />
                  <Text style={[styles.navText, isActive && styles.navTextActive]}>{item.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
              <LogOut size={22} color="#ff6b6b" style={styles.navIcon} />
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: width * 0.75,
    height: height,
    backgroundColor: '#0B1956',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 20,
    paddingTop: 65,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  brand: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
  },
  brandAccent: {
    color: '#FFF',
  },
  subBrand: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  profileSection: {
    flexDirection: 'row',
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#0B1956',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileRole: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  navContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#FFF',
    borderLeftWidth: 4,
    borderLeftColor: '#FFF',
  },
  navIcon: {
    marginRight: 16,
  },
  navText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  navTextActive: {
    color: '#0B1956',
    fontWeight: '800',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 60,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    color: '#ff6b6b',
    fontSize: 15,
    fontWeight: '700',
  }
});
