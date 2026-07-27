import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions, StatusBar, Platform, ScrollView } from 'react-native';
import { Home, Users, FileText, BookOpen, Calendar, LogOut, X, Utensils, Bell } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function CustomDrawer({ visible, onClose }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'ios'
    ? Math.max(insets.top + 10, 50)
    : (StatusBar.currentHeight || insets.top || 24);
  const bottomPadding = Platform.OS === 'ios'
    ? Math.max(insets.bottom + 5, 10)
    : Math.max(insets.bottom + 70, 10);

  const slideAnim = useRef(new Animated.Value(-width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const { theme, colors } = useTheme();

  const drawerBg = theme === 'dark' ? colors.card : '#0B1956';
  const textColor = theme === 'dark' ? colors.text.primary : '#FFF';
  const subTextColor = theme === 'dark' ? colors.text.secondary : 'rgba(255,255,255,0.6)';
  const activeItemBg = theme === 'dark' ? colors.primary : '#FFF';
  const activeItemText = theme === 'dark' ? colors.text.inverse : '#0B1956';
  const inactiveItemText = theme === 'dark' ? colors.text.secondary : '#FFF';
  const borderColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)';
  const avatarBg = theme === 'dark' ? colors.background : '#FFF';
  const avatarText = theme === 'dark' ? colors.primary : '#0B1956';

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

  const commonMenuItems = [
    { name: t('menu.events', 'Eventos'), path: '/events', icon: Calendar },
    { name: t('menu.announcements', 'Avisos'), path: '/announcements', icon: Bell }
  ];

  const menuItems = {
    super_admin: [
      { name: t('menu.home', 'Inicio'), path: '/home', icon: Home },
      { name: t('menu.lunch', 'Almuerzos'), path: '/lunch', icon: Utensils },
      { name: t('menu.users', 'Usuarios'), path: '/users', icon: Users },
      { name: t('menu.conduct_catalog', 'Catálogo Conducta'), path: '/conduct', icon: FileText },
      ...commonMenuItems
    ],
    coordinator: [
      { name: t('menu.home', 'Inicio'), path: '/home', icon: Home },
      { name: t('menu.lunch', 'Almuerzos'), path: '/lunch', icon: Utensils },
      { name: t('menu.students', 'Estudiantes'), path: '/students', icon: Users },
      { name: t('menu.justifications', 'Justificaciones'), path: '/coordinator-justifications', icon: FileText },
      { name: t('menu.grade_tickets', 'Tickets de Notas'), path: '/coordinator-tickets', icon: FileText },
      { name: t('menu.assign_classes', 'Asignar Clases'), path: '/assign', icon: BookOpen },
      ...commonMenuItems
    ],
    teacher: [
      { name: t('menu.home', 'Inicio'), path: '/home', icon: Home },
      { name: t('menu.lunch', 'Almuerzos'), path: '/lunch', icon: Utensils },
      { name: t('menu.schedule', 'Mi Horario'), path: '/schedule', icon: Calendar },
      { name: t('menu.activeClass', 'Clase Activa'), path: '/class', icon: BookOpen },
      { name: t('menu.grades', 'Notas'), path: '/teacher-grades', icon: FileText },
      ...commonMenuItems
    ],
    student: [
      { name: t('menu.home', 'Inicio'), path: '/home', icon: Home },
      { name: t('menu.lunch', 'Almuerzos'), path: '/lunch', icon: Utensils },
      { name: t('menu.grades', 'Mis Notas'), path: '/grades', icon: FileText },
      { name: t('menu.diary', 'Diario Pedagógico'), path: '/diary', icon: BookOpen },
      { name: t('menu.schedule', 'Horario'), path: '/schedule', icon: Calendar },
      { name: t('menu.justifications', 'Justificaciones'), path: '/justifications', icon: FileText },
      ...commonMenuItems
    ],
    cafetin: [
      { name: t('menu.home', 'Inicio'), path: '/home', icon: Home },
      { name: t('menu.cafetin', 'Gestión Cafetín'), path: '/cafetin', icon: Utensils },
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
        
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }], zIndex: 100, backgroundColor: drawerBg, paddingTop: topPadding }]}>
           <View style={[styles.header, { borderBottomColor: borderColor }]}>
             <View style={{ flex: 1 }}>
               <Text style={[styles.brand, { color: textColor }]}>Cokie<Text style={[styles.brandAccent, { color: theme === 'dark' ? colors.primary : '#FFF' }]}>College</Text></Text>
               <Text style={[styles.subBrand, { color: subTextColor }]}>{t('drawer.subBrand', 'Plataforma Estudiantil')}</Text>
             </View>
             <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
               <X size={24} color={textColor} />
             </TouchableOpacity>
           </View>

          <View style={[styles.profileSection, { borderBottomColor: borderColor, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)' }]}>
            <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
              <Text style={[styles.avatarText, { color: avatarText }]}>{profile.full_name.charAt(0)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: textColor }]} numberOfLines={1}>{profile.full_name}</Text>
              <Text style={[styles.profileRole, { color: subTextColor }]}>{profile.role.replace('_', ' ')}</Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={styles.navContainer}>
              {currentMenu.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.navItem, 
                      isActive && { backgroundColor: activeItemBg, borderLeftColor: theme === 'dark' ? colors.primary : '#FFF', borderLeftWidth: 4 }
                    ]}
                    onPress={() => handleNavigate(item.path)}
                    activeOpacity={0.7}
                  >
                    <Icon size={22} color={isActive ? activeItemText : inactiveItemText} style={styles.navIcon} />
                    <Text style={[styles.navText, { color: isActive ? activeItemText : inactiveItemText }, isActive && { fontWeight: '800' }]}>{item.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: borderColor, paddingBottom: bottomPadding }]}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
              <LogOut size={22} color="#ff6b6b" style={styles.navIcon} />
              <Text style={styles.logoutText}>{t('menu.logout', 'Cerrar Sesión')}</Text>
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
