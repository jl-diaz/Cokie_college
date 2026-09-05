import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, Camera, useCameraPermissions } from 'expo-camera';
import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useRouter, Stack } from 'expo-router';
import { Mic, MicOff, SwitchCamera, Volume2, Sparkles } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'react-i18next';
import WebSocketService from '../services/WebSocketService';

export default function InterpreterScreenNative() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = permission?.granted ?? null;
  const [isActive, setIsActive] = useState(true);
  const [facingMode, setFacingMode] = useState('front');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [lastTranslation, setLastTranslation] = useState('');
  const [subtitleHistory, setSubtitleHistory] = useState([]);
  
  const cameraRef = useRef(null);
  const isCapturingRef = useRef(false);
  const lastSpokenRef = useRef('');

  useEffect(() => {
    (async () => {
      if (!permission) {
        await requestPermission();
      }
      
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
        });
      } catch (e) {
        console.warn("No se pudo configurar el audio:", e);
      }
    })();

    const serverUrl = process.env.EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL || 'https://cokie-college.onrender.com';
    WebSocketService.connect(serverUrl);
    // Desactivar audio duplicado del servidor porque expo-speech gestiona la locución nativa
    WebSocketService.disableBackendAudio = true;

    // Escuchar traducciones en tiempo real para voz única e instantánea y subtítulos
    const handleTranslation = async (text) => {
      // Map 'sign.x' to 'signs.x' for i18n
      const translationKey = text.startsWith('sign.') ? text.replace('sign.', 'signs.') : text;
      // Get translation, fallback to original text if not found
      const translatedText = t(translationKey, { defaultValue: text });
      
      setLastTranslation(translatedText);
      setSubtitleHistory(prev => {
        if (prev.length > 0 && prev[0] === translatedText) return prev;
        return [translatedText, ...prev].slice(0, 5);
      });
      
      // Avoid speaking the exact same word twice consecutively
      if (lastSpokenRef.current === translatedText) {
        return;
      }
      lastSpokenRef.current = translatedText;

      // Detener cualquier habla en curso y emitir la nueva seña
      try {
        await Speech.stop();
        Speech.speak(translatedText, {
          language: i18n.language === 'en' ? 'en-US' : 'es-MX',
          pitch: 1.0,
          rate: 1.0,
        });
      } catch (err) {
        console.warn('Error en Speech nativo:', err);
      }
    };

    WebSocketService.addListener(handleTranslation);

    return () => {
      WebSocketService.disableBackendAudio = false;
      WebSocketService.removeListener(handleTranslation);
      WebSocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    let intervalId;

    if (isActive && isCameraReady && hasPermission) {
      intervalId = setInterval(async () => {
        if (!cameraRef.current || isCapturingRef.current) return;
        
        isCapturingRef.current = true;
        try {
          // Captura rápida de fotograma usando takePictureAsync sin sonido de obturador
          const photo = await cameraRef.current.takePictureAsync({
            base64: true,
            quality: 0.18,
            skipProcessing: true,
            shutterSound: false,
            pictureSize: '640x480',
          });

          if (photo?.base64) {
            WebSocketService.sendFrame(photo.base64);
          }
        } catch (e) {
          if (!e.message?.includes('unmounted')) {
            console.log('Error capturando frame nativo:', e);
          }
        } finally {
          isCapturingRef.current = false;
        }
      }, 200); // 200ms (~5 FPS) ultra rápido
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
      <PageHeader title={t('titles.interpreter', 'Intérprete ISL')} />

      <View style={styles.cameraContainer}>
        <CameraView 
          ref={cameraRef}
          style={StyleSheet.absoluteFill} 
          facing={facingMode}
          onCameraReady={() => setIsCameraReady(true)}
          animateShutter={false}
        />
        
        {/* Botón flotante para girar cámara */}
        <TouchableOpacity onPress={toggleCameraType} style={styles.floatingRotateButton}>
          <SwitchCamera color="#fff" size={26} />
        </TouchableOpacity>
        
        {/* Instrucciones superiores */}
        <View style={styles.instructionBadge}>
          <Sparkles color="#F6BE2F" size={16} style={{ marginRight: 6 }} />
          <Text style={styles.instructionText}>
            {t('interpreter.instructions', 'Modo Exposición: Coloca las manos y rostro frente a la cámara')}
          </Text>
        </View>

        {/* Subtítulos gigantes para salón de clases */}
        <View style={styles.subtitleOverlay}>
          <View style={styles.subtitleHeader}>
            <Volume2 color="#10b981" size={20} />
            <Text style={styles.subtitleHeaderTitle}>TRADUCCIÓN EN TIEMPO REAL</Text>
          </View>

          {lastTranslation ? (
            <Text style={styles.subtitleMainText}>
              "{lastTranslation}"
            </Text>
          ) : (
            <Text style={styles.subtitlePlaceholder}>
              Interpretando señas de la exposición...
            </Text>
          )}

          {/* Historial reciente */}
          {subtitleHistory.length > 1 && (
            <View style={styles.historyContainer}>
              <Text style={styles.historyText} numberOfLines={1}>
                Anterior: {subtitleHistory.slice(1).join(' • ')}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.micButton, !isActive && styles.micButtonDisabled]} 
          onPress={() => setIsActive(!isActive)}
        >
          {isActive ? <Mic color="#fff" size={30} /> : <MicOff color="#fff" size={30} />}
        </TouchableOpacity>
        <Text style={styles.footerText}>
          {isActive 
            ? t('interpreter.active', 'Traduciendo y hablando en vivo...') 
            : t('interpreter.paused', 'Intérprete Pausado')}
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
    top: 50,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(11, 25, 86, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 20,
  },
  instructionBadge: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 80,
    backgroundColor: 'rgba(11, 25, 86, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(246, 190, 47, 0.4)',
    zIndex: 10,
  },
  instructionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  subtitleOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(11, 15, 25, 0.88)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F6BE2F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  subtitleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  subtitleHeaderTitle: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitleMainText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    textAlign: 'center',
  },
  subtitlePlaceholder: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  historyContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  historyText: {
    color: '#F6BE2F',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    height: 110, 
    backgroundColor: theme === 'dark' ? Colors.card : '#0B1956',
    alignItems: 'center', 
    justifyContent: 'center',
    paddingBottom: 10,
  },
  micButton: {
    width: 58, 
    height: 58, 
    borderRadius: 29, 
    backgroundColor: '#10b981',
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 6,
    shadowColor: '#10b981', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, 
    shadowRadius: 6, 
    elevation: 8,
  },
  micButtonDisabled: { 
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  footerText: { 
    color: theme === 'dark' ? Colors.text.secondary : 'rgba(255,255,255,0.9)', 
    fontSize: 13, 
    fontWeight: '700' 
  }
});
