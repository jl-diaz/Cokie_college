import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// Detectar si estamos en Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isAndroidExpoGo = Platform.OS === 'android' && isExpoGo;

// En Android Expo Go (SDK 53+), importar expo-notifications crashea la app en tiempo de carga
let Notifications = null;
if (!isAndroidExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    // Silencioso en entornos no compatibles
  }
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const { profile } = useAuth();

  useEffect(() => {
    let isMounted = true;

    if (isAndroidExpoGo || Platform.OS === 'web' || !Notifications) {
      if (isAndroidExpoGo) {
        console.warn('[PushNotifications] En Expo Go (Android), el servicio remoto push está inhabilitado por Expo. Funcionará automáticamente en la APK compilada.');
      }
      return;
    }

    registerForPushNotificationsAsync().then(token => {
      if (token && isMounted) {
        setExpoPushToken(token);
      }
    });

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notif => {
        setNotification(notif);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response received:', response);
      });
    } catch (e) {
      console.warn('Notification listeners warning:', e.message);
    }

    return () => {
      isMounted = false;
      try {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    if (expoPushToken && profile?.id) {
      saveTokenToDatabase(expoPushToken, profile.id);
    }
  }, [expoPushToken, profile?.id]);

  const saveTokenToDatabase = async (token, userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
      
      if (error) {
        console.error('Error saving push token to database:', error);
      } else {
        console.log('Push token successfully saved to Supabase for user:', userId);
      }
    } catch (error) {
      console.error('Exception saving push token:', error);
    }
  };

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web' || !Notifications || isAndroidExpoGo) {
    return null;
  }

  if (!Device.isDevice) {
    console.log('Dispositivo físico requerido para notificaciones push');
    return null;
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (e) {
      console.warn('Channel error:', e);
    }
  }

  let token = null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted.');
      return null;
    }

    const rawProjectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const projectId = (rawProjectId && rawProjectId !== 'your-eas-project-id') 
      ? rawProjectId 
      : 'fd2a2f1c-190e-4d55-90ec-58fa0db18620';

    const tokenObj = await Notifications.getExpoPushTokenAsync({ projectId });
    token = tokenObj?.data;
    console.log('Expo Push Token generado correctamente:', token);
  } catch (e) {
    console.warn('No se pudo generar el token push:', e.message);
  }

  return token;
}


