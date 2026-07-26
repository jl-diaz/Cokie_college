import React, { useState, useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, View, Text } from 'react-native';
import { Menu, Sun, Moon, Bell, Globe } from 'lucide-react-native';
import '../src/i18n';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { AlertProvider } from '../src/context/AlertContext';
import CustomDrawer from '../src/components/CustomDrawer';
import DarkColorModal from '../src/components/DarkColorModal';
import NotificationsModal from '../src/components/NotificationsModal';
import api from '../src/utils/api';

function LayoutInner() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, toggleTheme, colors, openColorModal } = useTheme();
  const { t, i18n } = useTranslation();
  const { notification } = usePushNotifications();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      const data = Array.isArray(res.data) ? res.data : [];
      const count = data.filter(n => !n.read).length;
      setUnreadCount(count);
    } catch (err) {
      // Ignorar si el usuario no ha iniciado sesión aún
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 12000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, notification]);

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    await i18n.changeLanguage(newLang);
    import('@react-native-async-storage/async-storage').then(AsyncStorage => {
      AsyncStorage.default.setItem('language', newLang);
    });
  };

  const hasBadge = unreadCount > 0 || !!notification;

  return (
    <AuthProvider>
      <AlertProvider>
        <StatusBar style={theme === 'dark' ? "light" : "auto"} />
        <Stack
          screenOptions={({ route }) => ({
            headerStyle: {
              backgroundColor: colors.headerC,
            },
            headerTintColor: colors.text.headerTxtC,
            headerTitleAlign: 'center',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
            },
            headerRightContainerStyle: {
              paddingRight: 10,
              justifyContent: 'center',
              alignItems: 'flex-end',
            },
            headerLeftContainerStyle: {
              paddingLeft: 10,
              justifyContent: 'center',
              alignItems: 'flex-start',
            },
            headerRight: () => {
               if (route.name === 'index' || route.name === '(auth)/login') return null;
               return (
                 <View style={{
                   flexDirection: 'row',
                   alignItems: 'center',
                   alignSelf: 'flex-end',
                   backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                   borderRadius: 20,
                   paddingHorizontal: 4,
                   paddingVertical: 2,
                   borderWidth: 1,
                   borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                 }}>
                   <TouchableOpacity 
                     onPress={toggleLanguage} 
                     style={{ height: 26, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                     activeOpacity={0.7}
                   >
                     <Globe size={15} color={colors.text.headerTxtC} />
                     <Text style={{ color: colors.text.headerTxtC, fontSize: 10, marginLeft: 3, fontWeight: 'bold' }}>
                       {i18n.language?.toUpperCase() || 'ES'}
                     </Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     onPress={toggleTheme}
                     onLongPress={openColorModal}
                     delayLongPress={300}
                     style={{ width: 26, height: 26, justifyContent: 'center', alignItems: 'center' }}
                     activeOpacity={0.7}
                   >
                     {theme === 'dark' ? <Sun size={16} color={colors.text.headerTxtC} /> : <Moon size={16} color={colors.text.inverse} />}
                   </TouchableOpacity>
                   <TouchableOpacity 
                     onPress={() => setNotifModalVisible(true)}
                     style={{ width: 26, height: 26, justifyContent: 'center', alignItems: 'center', position: 'relative' }}
                     activeOpacity={0.7}
                   >
                     <Bell size={16} color={colors.text.headerTxtC} />
                     {hasBadge && (
                       <View style={{
                         position: 'absolute',
                         top: 1,
                         right: 1,
                         minWidth: unreadCount > 0 ? 12 : 7,
                         height: unreadCount > 0 ? 12 : 7,
                         borderRadius: unreadCount > 0 ? 6 : 3.5,
                         backgroundColor: '#EF4444',
                         borderWidth: 1,
                         borderColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
                         justifyContent: 'center',
                         alignItems: 'center',
                         paddingHorizontal: 1
                       }}>
                         {unreadCount > 0 && (
                           <Text style={{ color: '#FFF', fontSize: 7, fontWeight: 'bold', lineHeight: 9, textAlign: 'center' }}>
                             {unreadCount > 9 ? '9+' : unreadCount}
                           </Text>
                         )}
                       </View>
                     )}
                   </TouchableOpacity>
                   <TouchableOpacity 
                     onPress={() => setDrawerVisible(true)} 
                     style={{ width: 26, height: 26, justifyContent: 'center', alignItems: 'center' }}
                     activeOpacity={0.7}
                   >
                     <Menu size={18} color={colors.text.headerTxtC} />
                   </TouchableOpacity>
                 </View>
               );
            }
          })}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen 
            name="home" 
            options={{ 
              title: t('titles.home', 'Inicio'), 
              headerLeft: () => null,
              headerTitleAlign: 'center',
              headerTitle: () => (
                <Text style={{ color: colors.text.headerTxtC, fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
                  {t('titles.home', 'Inicio')}
                </Text>
              )
            }} 
          />
          <Stack.Screen name="diary" options={{ title: ('') }} />
          <Stack.Screen name="justifications" options={{ title: ('') }} />
          <Stack.Screen name="schedule" options={{ title: ('') }} />
          <Stack.Screen name="grades" options={{ title: ('') }} />
          <Stack.Screen name="profile" options={{ title: ('') }} />
          <Stack.Screen name="users" options={{ title: ('') }} />
          <Stack.Screen name="conduct" options={{ title: ('') }} />
          <Stack.Screen name="students" options={{ title: ('') }} />
          <Stack.Screen name="assign" options={{ title: ('') }} />
          <Stack.Screen name="class" options={{ title: ('') }} />
          <Stack.Screen name="classrooms" options={{ title: ('') }} />
          <Stack.Screen name="coordinator-justifications" options={{ title: ('') }} />
          <Stack.Screen name="coordinator" options={{ title: ('') }} />
          <Stack.Screen name="teacher-grades" options={{ title: ('') }} />
          <Stack.Screen name="events" options={{ title: ('') }} />
          <Stack.Screen name="announcements" options={{ title: ('') }} />
          <Stack.Screen name="cafetin" options={{ title: ('') }} />
          <Stack.Screen name="lunch" options={{ title: ('') }} />
        </Stack>
        <CustomDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
        <NotificationsModal 
          visible={notifModalVisible} 
          onClose={() => {
            setNotifModalVisible(false);
            fetchUnreadCount();
          }} 
          onReadChange={(count) => setUnreadCount(count)}
        />
        <DarkColorModal />
      </AlertProvider>
    </AuthProvider>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <LayoutInner />
    </ThemeProvider>
  );
}