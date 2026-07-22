import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, View, Text } from 'react-native';
import { Menu, Sun, Moon, Bell, Globe } from 'lucide-react-native';
import '../src/i18n';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import CustomDrawer from '../src/components/CustomDrawer';
import DarkColorModal from '../src/components/DarkColorModal';
import NotificationsModal from '../src/components/NotificationsModal';

function LayoutInner() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const { theme, toggleTheme, colors, openColorModal } = useTheme();
  const { t, i18n } = useTranslation();
  const { notification } = usePushNotifications();

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    await i18n.changeLanguage(newLang);
    import('@react-native-async-storage/async-storage').then(AsyncStorage => {
      AsyncStorage.default.setItem('language', newLang);
    });
  };

  return (
    <AuthProvider>
      <StatusBar style={theme === 'dark' ? "light" : "auto"} />
      <Stack
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: colors.headerC,
          },
          headerTintColor: colors.text.headerTxtC,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: () => {
             if (route.name === 'index' || route.name === '(auth)/login') return null;
             return (
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <TouchableOpacity 
                   onPress={toggleLanguage} 
                   style={{ padding: 8, flexDirection: 'row', alignItems: 'center' }}
                 >
                   <Globe size={20} color={colors.text.headerTxtC} />
                   <Text style={{ color: colors.text.headerTxtC, fontSize: 10, marginLeft: 2, fontWeight: 'bold' }}>
                     {i18n.language?.toUpperCase() || 'ES'}
                   </Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   onPress={toggleTheme}
                   onLongPress={openColorModal}
                   delayLongPress={300}
                   style={{ padding: 8 }}
                   activeOpacity={0.7}
                 >
                   {theme === 'dark' ? <Sun size={22} color={colors.text.headerTxtC} /> : <Moon size={22} color={colors.text.inverse} />}
                 </TouchableOpacity>
                 <TouchableOpacity 
                   onPress={() => setNotifModalVisible(true)}
                   style={{ padding: 8, marginRight: 4 }}
                   activeOpacity={0.7}
                 >
                   <Bell size={22} color={colors.text.headerTxtC} />
                   {(notification || true) && (
                     <View style={{ position: 'absolute', top: 6, right: 8, width: 8, height: 8, backgroundColor: '#e74c3c', borderRadius: 4 }} />
                   )}
                 </TouchableOpacity>
                 <TouchableOpacity 
                   onPress={() => setDrawerVisible(true)} 
                   style={{ padding: 8 }}
                   activeOpacity={0.7}
                 >
                   <Menu size={24} color={colors.text.headerTxtC} />
                 </TouchableOpacity>
               </View>
             );
          }
        })}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ title: t('titles.home', 'Inicio'), headerLeft: () => null }} />
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
      </Stack>
      <CustomDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <NotificationsModal visible={notifModalVisible} onClose={() => setNotifModalVisible(false)} />
      <DarkColorModal />
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