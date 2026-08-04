import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { useRouter, Stack } from 'expo-router';
import { Mic, MicOff, SwitchCamera } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import WebSocketService from '../services/WebSocketService';

export default function InterpreterScreenNative() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [hasPermission, setHasPermission] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [facingMode, setFacingMode] = useState('front');
  const cameraRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn("No se pudo configurar el audio:", e);
      }
    })();

    const serverUrl = process.env.EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL;
    WebSocketService.connect(serverUrl);

    return () => {
      WebSocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    let intervalId;

    if (isActive && isCameraReady && hasPermission) {
      intervalId = setInterval(async () => {
        if (!cameraRef.current) return;
        try {
          const photo = await cameraRef.current.takePictureAsync({
            base64: true,
            quality: 0.3,
            skipProcessing: true,
          });
          if (photo && photo.base64) {
            const base64Data = `data:image/jpeg;base64,${photo.base64}`;
            WebSocketService.sendFrame(base64Data);
          }
        } catch (e) {
          if (!e.message.includes('unmounted')) {
            console.log('Error capturando frame:', e);
          }
        }
      }, 250); // 4 cuadros por segundo
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, isCameraReady, hasPermission]);

  function toggleCameraType() {
    setFacingMode(current => (current === 'front' ? 'back' : 'front'));
  }

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }
  
  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.text}>{t('interpreter.noPermission', 'No hay permisos de cámara')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '' }} />

      <View style={styles.cameraContainer}>
        <CameraView 
          ref={cameraRef}
          style={StyleSheet.absoluteFill} 
          facing={facingMode}
          onCameraReady={() => setIsCameraReady(true)}
          animateShutter={false} // Intento de silenciar obturador nativo
        />
        
        <TouchableOpacity onPress={toggleCameraType} style={styles.floatingRotateButton}>
          <SwitchCamera color="#fff" size={28} />
        </TouchableOpacity>
        
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>
            {t('interpreter.instructions', 'Coloca tus manos y rostro en el encuadre.')}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.micButton, !isActive && styles.micButtonDisabled]} 
          onPress={() => setIsActive(!isActive)}
        >
          {isActive ? <Mic color="#fff" size={32} /> : <MicOff color="#fff" size={32} />}
        </TouchableOpacity>
        <Text style={styles.footerText}>
          {isActive 
            ? t('interpreter.active', 'Traduciendo y hablando...') 
            : t('interpreter.paused', 'Pausado')}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  text: { color: Colors.text.primary },
  cameraContainer: { flex: 1, overflow: 'hidden', position: 'relative' },
  floatingRotateButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  overlay: {
    position: 'absolute', top: 130, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 16, borderRadius: 12, alignItems: 'center'
  },
  overlayText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  footer: {
    height: 120, backgroundColor: theme === 'dark' ? Colors.card : '#0B1956',
    alignItems: 'center', justifyContent: 'center',
  },
  micButton: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#10b981',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 8,
  },
  micButtonDisabled: { 
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  footerText: { color: theme === 'dark' ? Colors.text.secondary : 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' }
});
