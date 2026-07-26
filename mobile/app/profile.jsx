import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import PageHeader from '../src/components/PageHeader';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, logout } = useAuth();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title={t('titles.profile', 'Mi Perfil')}
        subtitle={t('titles.profileSubtitle', 'Información personal y cuenta')}
      />

      <View style={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0) || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || t('dashboard.student', 'Usuario')}</Text>
          <Text style={styles.email}>{profile?.email || ''}</Text>
          {profile?.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{profile.role.replace('_', ' ').toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={styles.menu}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>{t('menu.logout', 'Cerrar Sesión')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginVertical: 30,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  email: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  roleText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  menu: {
    marginTop: 30,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
