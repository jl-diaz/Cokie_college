import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Mic, MicOff, SwitchCamera } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import WebSocketService from '../services/WebSocketService';

export default function InterpreterScreenWeb() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [hasPermission, setHasPermission] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [facing, setFacing] = useState('front');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        setHasPermission(false);
      }
    })();

    const serverUrl = process.env.EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL;
    WebSocketService.connect(serverUrl);

    return () => {
      WebSocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    let stream = null;
    if (hasPermission && isActive) {
      navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facing === 'front' ? 'user' : 'environment' } 
      })
      .then(s => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => console.error("Error webcam:", err));
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [hasPermission, isActive, facing]);

  useEffect(() => {
    let intervalId;
    if (hasPermission && isActive) {
      intervalId = setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.3);
            const base64 = dataUrl.split(',')[1];
            
            if (base64) {
              WebSocketService.sendFrame(base64);
            }
          }
        }
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [hasPermission, isActive]);

  function toggleCameraType() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
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
        <video 
          ref={videoRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          autoPlay
          playsInline
          muted
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        <TouchableOpacity onPress={toggleCameraType} style={styles.floatingRotateButton}>
          <SwitchCamera color="#fff" size={28} />
        </TouchableOpacity>
        
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>
            {t('interpreter.instructions', 'Coloca tus manos y rostro en el encuadre')}
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Efecto glass
    backdropFilter: 'blur(10px)',
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
    position: 'absolute', top: 130, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12, borderRadius: 12, alignItems: 'center',
  },
  overlayText: { color: '#fff', fontSize: 14, fontWeight: '600' },
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
