import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import '../src/utils/textDecoderPolyfill';
import React, { useState, useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, View, Text, Platform, Pressable } from 'react-native';
import { Menu, Sun, Moon, Bell, Globe, ArrowLeft } from 'lucide-react-native';
import { useRouter, useRootNavigationState, useSegments, usePathname } from 'expo-router';
import '../src/i18n';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { AlertProvider } from '../src/context/AlertContext';
import CustomDrawer from '../src/components/CustomDrawer';
import DarkColorModal from '../src/components/DarkColorModal';
import NotificationsModal from '../src/components/NotificationsModal';
import TabBar from '../src/components/TabBar';
import api from '../src/utils/api';

function LayoutInner() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, toggleTheme, colors, openColorModal } = useTheme();
  const { t, i18n } = useTranslation();
  const { notification } = usePushNotifications();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const segments = useSegments();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isSplash = !segments[0] || segments[0] === 'index';

    if (!authLoading && !user && !inAuthGroup && !isSplash) {
      router.replace('/(auth)/login');
    }
  }, [user, authLoading, rootNavigationState?.key, segments]);



  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      const data = Array.isArray(res.data) ? res.data : [];
      const count = data.filter(n => !n.read).length;
      setUnreadCount(count);
    } catch (err) {
      // Ignorar
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 45000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, notification, user]);

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    await i18n.changeLanguage(newLang);
    import('@react-native-async-storage/async-storage').then(AsyncStorage => {
      AsyncStorage.default.setItem('language', newLang);
    });
  };

  const hasBadge = unreadCount > 0 || !!notification;

  const isWeb = Platform.OS === 'web';

  const renderHeaderLeftBtn = (routeName) => {
    if (routeName === 'index' || routeName === '(auth)/login' || routeName === 'home') return null;
    return (
      <TouchableOpacity
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/home');
          }
        }}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(0, 0, 0, 0.22)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.14)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={0.7}
      >
        <ArrowLeft size={20} color="#FFFFFF" />
      </TouchableOpacity>
    );
  };

  const renderHeaderRightCapsule = (routeName) => {
    if (routeName === 'index' || routeName === '(auth)/login') return null;
    return (
      <View style={{
        width: 145,
        minWidth: 145,
        maxWidth: 145,
        height: 34,
        flexShrink: 0,
        flexGrow: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0, 0, 0, 0.22)',
        borderRadius: 20,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.14)',
      }}>
        <TouchableOpacity 
          onPress={toggleLanguage} 
          style={{ height: 26, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={0.7}
        >
          <Globe size={15} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 10, marginLeft: 3, fontWeight: 'bold' }}>
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
          {theme === 'dark' ? <Sun size={16} color="#FFFFFF" /> : <Moon size={16} color="#FFFFFF" />}
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setNotifModalVisible(true)}
          style={{ width: 26, height: 26, justifyContent: 'center', alignItems: 'center', position: 'relative' }}
          activeOpacity={0.7}
        >
          <Bell size={16} color="#FFFFFF" />
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
              borderColor: '#FFFFFF',
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
          <Menu size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const content = (
    <>
      <StatusBar style="light" />
      <Stack
          screenOptions={({ route }) => ({
            headerStyle: {
              backgroundColor: colors.headerC,
              ...(Platform.OS === 'web' && { 
                  height: 60,
              })
            },
            headerShadowVisible: false,
            headerTintColor: '#FFFFFF',
            headerTitleAlign: 'center',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
            },
            headerLeft: () => renderHeaderLeftBtn(route.name),
            headerRight: () => renderHeaderRightCapsule(route.name),
            unstable_headerLeftItems: () => {
              const el = renderHeaderLeftBtn(route.name);
              if (!el) return [];
              return [
                {
                  type: 'custom',
                  hidesSharedBackground: true,
                  element: el,
                },
              ];
            },
            unstable_headerRightItems: () => {
              const el = renderHeaderRightCapsule(route.name);
              if (!el) return [];
              return [
                {
                  type: 'custom',
                  hidesSharedBackground: true,
                  element: el,
                },
              ];
            },
          })}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen 
            name="home" 
            options={{ 
              title: (''),
              headerLeft: () => null,
              unstable_headerLeftItems: () => [],
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
          <Stack.Screen name="coordinator-tickets" options={{ title: ('') }} />
          <Stack.Screen name="apply-conduct" options={{ title: ('') }} />
          <Stack.Screen name="coordinator" options={{ title: ('') }} />
          <Stack.Screen name="teacher-grades" options={{ title: ('') }} />
          <Stack.Screen name="events" options={{ title: ('') }} />
          <Stack.Screen name="announcements" options={{ title: ('') }} />
          <Stack.Screen name="cafetin" options={{ title: ('') }} />
          <Stack.Screen name="lunch" options={{ title: ('') }} />
          <Stack.Screen name="interpreter" options={{ title: ('') }} />
          <Stack.Screen name="subject-hours" options={{ title: ('') }} />
          <Stack.Screen name="academic-periods" options={{ title: ('') }} />
          <Stack.Screen name="modules" options={{ title: ('') }} />
          <Stack.Screen name="chat" options={{ title: ('') }} />
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
    </>
  );
  const pathname = usePathname();
  const showTabBar = ['/home', '/interpreter', '/chat', '/modules', '/profile'].includes(pathname);

  return (
    <View style={{ flex: 1, width: '100%', backgroundColor: colors.background, overflow: 'hidden' }}>
      <View style={{ flex: 1 }}>{content}</View>
      {showTabBar && <TabBar currentRoute={pathname} />}
    </View>
  );
}

import { TabBarProvider } from '../src/context/TabBarContext';

export default function Layout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AlertProvider>
          <TabBarProvider>
            <LayoutInner />
          </TabBarProvider>
        </AlertProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
