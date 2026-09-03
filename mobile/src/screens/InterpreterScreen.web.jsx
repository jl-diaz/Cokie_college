import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Mic, MicOff, SwitchCamera, Volume2, Sparkles } from 'lucide-react-native';
import PageHeader from '../components/PageHeader';
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
  const [lastTranslation, setLastTranslation] = useState('');
  const [subtitleHistory, setSubtitleHistory] = useState([]);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isCapturingRef = useRef(false);

  // Función para desbloquear el audio en navegadores web al primer clic del usuario
  const unlockWebAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
        const silentUtterance = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(silentUtterance);
      } catch (e) {}
    }
  };

  useEffect(() => {
    const serverUrl = process.env.EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL || 'https://cokie-college.onrender.com';
    WebSocketService.connect(serverUrl);

    const handleTranslation = (text) => {
      setLastTranslation(text);
      setSubtitleHistory(prev => [text, ...prev.slice(0, 4)]);

      // Web Speech API instantánea con reactivación de motor
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel(); // Limpiar cola anterior
          window.speechSynthesis.resume(); // Forzar estado activo
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'es-MX';
          utterance.rate = 1.0;
          utterance.volume = 1.0;
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Error en Web Speech:', e);
        }
      }
    };

    WebSocketService.addListener(handleTranslation);

    return () => {
      WebSocketService.removeListener(handleTranslation);
      WebSocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    let currentStream = null;

    if (isActive) {
      const constraints = {
        video: { 
          facingMode: facing === 'front' ? 'user' : 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };

      navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          currentStream = stream;
          setHasPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.warn('Auto-play error:', e));
          }
        })
        .catch((err) => {
          console.error("Error pidiendo cámara en web:", err);
          setHasPermission(false);
        });
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, facing]);

  useEffect(() => {
    let intervalId;

    if (hasPermission && isActive) {
      intervalId = setInterval(() => {
        if (!videoRef.current || isCapturingRef.current) return;
        const video = videoRef.current;
        
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          isCapturingRef.current = true;
          try {
            if (!canvasRef.current) {
              canvasRef.current = document.createElement('canvas');
            }
            const canvas = canvasRef.current;
            if (canvas.width !== 480) {
              canvas.width = 480;
              canvas.height = Math.round(480 * (video.videoHeight / video.videoWidth));
            }

            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.35);
            const base64 = dataUrl.split(',')[1];
            
            if (base64) {
              WebSocketService.sendFrame(base64);
            }
          } catch (e) {
            console.warn('Error capturando frame web:', e);
          } finally {
            isCapturingRef.current = false;
          }
        }
      }, 200); // 200ms (~5 FPS) ultra rápido en web
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
        <Text style={styles.text}>{t('interpreter.noPermission', 'No hay permisos de cámara o no se encontró webcam')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '' }} />
      <PageHeader title={t('titles.interpreter', 'Intérprete ISL')} />

      <View style={styles.cameraContainer}>
        <video 
          ref={videoRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          autoPlay
          playsInline
          muted
        />
        
        {/* Botón flotante para alternar cámara */}
        <TouchableOpacity onPress={() => { unlockWebAudio(); toggleCameraType(); }} style={styles.floatingRotateButton}>
          <SwitchCamera color="#fff" size={26} />
        </TouchableOpacity>
        
        {/* Banner de instrucciones */}
        <View style={styles.instructionBadge}>
          <Sparkles color="#F6BE2F" size={16} style={{ marginRight: 6 }} />
          <Text style={styles.instructionText}>
            {t('interpreter.instructions', 'Modo Exposición Web: Coloca las manos frente a la cámara')}
          </Text>
        </View>

        {/* Banner gigante de subtítulos en vivo */}
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
          onPress={() => { unlockWebAudio(); setIsActive(!isActive); }}
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
