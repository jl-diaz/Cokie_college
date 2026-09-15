import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ActivityIndicator 
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { 
  Mic, 
  MicOff, 
  SwitchCamera, 
  Volume2, 
  Sparkles, 
  Glasses, 
  Monitor, 
  Settings, 
  Headphones, 
  Wifi, 
  Check, 
  AlertCircle 
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import WebSocketService from '../services/WebSocketService';

export default function InterpreterScreenWeb() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [hasPermission, setHasPermission] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [facing, setFacing] = useState('front');
  const [lastTranslation, setLastTranslation] = useState('');
  const [subtitleHistory, setSubtitleHistory] = useState([]);

  // Selectores de fuente de video y salida de audio
  const [videoSource, setVideoSource] = useState('webcam'); // 'webcam' | 'glasses'
  const [audioOutput, setAudioOutput] = useState('browser'); // 'browser' | 'glasses'
  const [esp32Ip, setEsp32Ip] = useState('cokielens.local');
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [ipInput, setIpInput] = useState('cokielens.local');
  const [glassesConnected, setGlassesConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const videoRef = useRef(null);
  const glassesImgRef = useRef(null);
  const canvasRef = useRef(null);
  const isCapturingRef = useRef(false);
  const lastSpokenRef = useRef('');
  const audioOutputRef = useRef(audioOutput);
  const esp32IpRef = useRef(esp32Ip);

  useEffect(() => {
    audioOutputRef.current = audioOutput;
  }, [audioOutput]);

  useEffect(() => {
    esp32IpRef.current = esp32Ip;
  }, [esp32Ip]);

  // Cargar configuración guardada en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedIp = localStorage.getItem('cokielens_ip');
      if (savedIp) {
        setEsp32Ip(savedIp);
        setIpInput(savedIp);
      }
      const savedAudio = localStorage.getItem('cokielens_audio_output');
      if (savedAudio) {
        setAudioOutput(savedAudio);
      }
      const savedSource = localStorage.getItem('cokielens_video_source');
      if (savedSource) {
        setVideoSource(savedSource);
      }
    }
  }, []);

  // Función para desbloquear audio en navegadores al primer clic
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

    // ── GESTIÓN DE TRADUCCIÓN Y SALIDA DE AUDIO ──
    const handleTranslation = (text) => {
      let translatedText = text;
      if (text.startsWith('sign.')) {
        const translationKey = text.replace('sign.', 'signs.');
        const i18nVal = t(translationKey, { defaultValue: '' });
        if (i18nVal) {
          translatedText = i18nVal;
        } else {
          // Limpiar formato técnico si es un gesto nuevo (ej: 'sign.puerta' -> 'Puerta')
          const raw = text.replace('sign.', '').replace(/_/g, ' ');
          translatedText = raw.charAt(0).toUpperCase() + raw.slice(1);
        }
      }

      setLastTranslation(translatedText);
      setSubtitleHistory(prev => {
        if (prev.length > 0 && prev[0] === translatedText) return prev;
        return [translatedText, ...prev].slice(0, 5);
      });

      if (lastSpokenRef.current === translatedText) {
        return;
      }
      lastSpokenRef.current = translatedText;

      // 1. SALIDA DE AUDIO: Navegador / Audífonos del dispositivo
      if (audioOutputRef.current === 'browser') {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();
            const utterance = new SpeechSynthesisUtterance(translatedText);
            utterance.lang = i18n.language === 'en' ? 'en-US' : 'es-MX';
            utterance.rate = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.warn('Error en Web Speech:', e);
          }
        }
      } 
      // 2. SALIDA DE AUDIO: Lentes CokieLens (ESP32)
      else if (audioOutputRef.current === 'glasses') {
        try {
          const clean = esp32IpRef.current.replace('http://', '').replace('/', '');
          fetch(`http://${clean}/play`, {
            method: 'POST',
            body: translatedText,
            headers: { 'Content-Type': 'text/plain' }
          }).catch(e => console.log('Envío a lentes:', e));
        } catch (err) {
          console.warn('Error enviando audio a los lentes:', err);
        }
      }
    };

    WebSocketService.addListener(handleTranslation);

    return () => {
      WebSocketService.removeListener(handleTranslation);
      WebSocketService.disconnect();
    };
  }, []);

  // ── GESTIÓN DE WEBCAM DEL NAVEGADOR ──
  useEffect(() => {
    let currentStream = null;

    if (isActive && videoSource === 'webcam') {
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
  }, [isActive, facing, videoSource]);

  // ── BUCLE 1: CAPTURA DESDE WEBCAM A TRAVÉS DE CANVAS ──
  useEffect(() => {
    let intervalId;

    if (hasPermission && isActive && videoSource === 'webcam') {
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
            if (canvas.width !== 360) {
              canvas.width = 360;
              canvas.height = Math.round(360 * (video.videoHeight / video.videoWidth));
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
      }, 180);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [hasPermission, isActive, videoSource]);

  // ── BUCLE 2: CAPTURA DESDE LENTES COKIELENS (ESP32-CAM) EN WEB ──
  useEffect(() => {
    let intervalId;

    if (isActive && videoSource === 'glasses') {
      const cleanIp = esp32Ip.replace('http://', '').replace('/', '');
      const captureUrl = `http://${cleanIp}/capture`;

      intervalId = setInterval(async () => {
        if (isCapturingRef.current) return;
        isCapturingRef.current = true;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);

          const res = await fetch(captureUrl, { 
            signal: controller.signal,
            cache: 'no-store' 
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            setGlassesConnected(true);
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Data = reader.result;
              if (base64Data) {
                const rawBase64 = base64Data.split(',')[1];
                if (rawBase64) {
                  WebSocketService.sendFrame(rawBase64);
                }
              }
            };
            reader.readAsDataURL(blob);
          } else {
            setGlassesConnected(false);
          }
        } catch (e) {
          setGlassesConnected(false);
        } finally {
          isCapturingRef.current = false;
        }
      }, 160);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, videoSource, esp32Ip]);

  function toggleCameraType() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  const handleSaveIp = () => {
    const clean = ipInput.trim();
    setEsp32Ip(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cokielens_ip', clean);
    }
    setIsConfigModalVisible(false);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const clean = ipInput.replace('http://', '').replace('/', '').trim();
      const res = await fetch(`http://${clean}/status`);
      if (res.ok) {
        const json = await res.json();
        setTestResult({ success: true, message: `Conectado a ${json.device || 'CokieLens'}` });
        setGlassesConnected(true);
      } else {
        setTestResult({ success: false, message: 'Respuesta inválida del dispositivo' });
      }
    } catch (e) {
      setTestResult({ success: false, message: 'No se pudo conectar. Verifica que esté encendido y en el mismo Wi-Fi.' });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const selectVideoSource = (source) => {
    setVideoSource(source);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cokielens_video_source', source);
    }
  };

  const selectAudioOutput = (output) => {
    setAudioOutput(output);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cokielens_audio_output', output);
    }
  };

  if (hasPermission === null && videoSource === 'webcam') {
    return <View style={styles.container} />;
  }
  
  if (hasPermission === false && videoSource === 'webcam') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.text}>{t('interpreter.noPermission', 'No hay permisos de cámara o no se encontró webcam')}</Text>
      </View>
    );
  }

  const cleanIp = esp32Ip.replace('http://', '').replace('/', '');

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '' }} />

      {/* ── BARRA DE CONTROL SUPERIOR (CÁMARA Y AUDIO) ── */}
      <View style={styles.controlBar}>
        {/* Selector de Entrada de Video */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segmentBtn, videoSource === 'webcam' && styles.segmentBtnActive]}
            onPress={() => { unlockWebAudio(); selectVideoSource('webcam'); }}
          >
            <Monitor size={15} color={videoSource === 'webcam' ? '#FFF' : Colors.text.secondary} />
            <Text style={[styles.segmentTxt, videoSource === 'webcam' && styles.segmentTxtActive]}>
              Webcam
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.segmentBtn, videoSource === 'glasses' && styles.segmentBtnActive]}
            onPress={() => { unlockWebAudio(); selectVideoSource('glasses'); }}
          >
            <Glasses size={16} color={videoSource === 'glasses' ? '#FFF' : Colors.text.secondary} />
            <Text style={[styles.segmentTxt, videoSource === 'glasses' && styles.segmentTxtActive]}>
              Lentes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selector de Salida de Audio */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segmentBtn, audioOutput === 'browser' && styles.segmentBtnActive]}
            onPress={() => { unlockWebAudio(); selectAudioOutput('browser'); }}
          >
            <Volume2 size={15} color={audioOutput === 'browser' ? '#FFF' : Colors.text.secondary} />
            <Text style={[styles.segmentTxt, audioOutput === 'browser' && styles.segmentTxtActive]}>
              Altavoz
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.segmentBtn, audioOutput === 'glasses' && styles.segmentBtnActive]}
            onPress={() => { unlockWebAudio(); selectAudioOutput('glasses'); }}
          >
            <Headphones size={15} color={audioOutput === 'glasses' ? '#FFF' : Colors.text.secondary} />
            <Text style={[styles.segmentTxt, audioOutput === 'glasses' && styles.segmentTxtActive]}>
              Lentes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Botón de Ajustes de Lentes */}
        <TouchableOpacity 
          style={styles.settingsIconBtn} 
          onPress={() => setIsConfigModalVisible(true)}
        >
          <Settings size={18} color="#FFF" />
          {videoSource === 'glasses' && (
            <View style={[styles.statusDot, { backgroundColor: glassesConnected ? '#10b981' : '#ef4444' }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── ÁREA DE VIDEO ── */}
      <View style={styles.cameraContainer}>
        {videoSource === 'webcam' ? (
          <>
            <video 
              ref={videoRef}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              autoPlay
              playsInline
              muted
            />
            <TouchableOpacity onPress={() => { unlockWebAudio(); toggleCameraType(); }} style={styles.floatingRotateButton}>
              <SwitchCamera color="#fff" size={24} />
            </TouchableOpacity>
          </>
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#020617', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img 
              ref={glassesImgRef}
              src={`http://${cleanIp}/stream`}
              alt="CokieLens Stream"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                setGlassesConnected(false);
              }}
              onLoad={() => {
                setGlassesConnected(true);
              }}
            />
            <View style={styles.glassesBadge}>
              <Glasses size={16} color="#38bdf8" style={{ marginRight: 6 }} />
              <Text style={styles.glassesBadgeText}>
                {glassesConnected ? 'Lentes CokieLens en Vivo' : 'Buscando Lentes...'}
              </Text>
              <View style={[styles.miniDot, { backgroundColor: glassesConnected ? '#10b981' : '#ef4444' }]} />
            </View>
          </div>
        )}

        {/* Subtítulos gigantes */}
        <View style={styles.subtitleOverlay}>
          <View style={styles.subtitleHeader}>
            <Volume2 color="#10b981" size={18} />
            <Text style={styles.subtitleHeaderTitle}>TRADUCCIÓN EN TIEMPO REAL</Text>
          </View>

          {lastTranslation ? (
            <Text style={styles.subtitleMainText}>
              "{lastTranslation}"
            </Text>
          ) : (
            <Text style={styles.subtitlePlaceholder}>
              Esperando señas o movimientos...
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

      {/* ── MODAL DE CONFIGURACIÓN DE LOS LENTES (ESP32-CAM) ── */}
      <Modal
        visible={isConfigModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConfigModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Glasses color="#38bdf8" size={24} style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>Configurar Lentes CokieLens</Text>
            </View>

            <Text style={styles.modalHelp}>
              Ingresa el nombre mDNS (cokielens.local) o la dirección IP de tu ESP32-CAM:
            </Text>

            <TextInput
              style={styles.input}
              value={ipInput}
              onChangeText={setIpInput}
              placeholder="Ej: cokielens.local o 192.168.1.50"
              placeholderTextColor="#94a3b8"
            />

            {testResult && (
              <View style={[styles.testBadge, testResult.success ? styles.testSuccess : styles.testFail]}>
                {testResult.success ? <Check size={16} color="#10b981" /> : <AlertCircle size={16} color="#ef4444" />}
                <Text style={styles.testBadgeText}>{testResult.message}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.testBtn} 
                onPress={handleTestConnection}
                disabled={isTestingConnection}
              >
                {isTestingConnection ? (
                  <ActivityIndicator size="small" color="#38bdf8" />
                ) : (
                  <>
                    <Wifi size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                    <Text style={styles.testBtnText}>Probar Conexión</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveIp}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  text: { color: Colors.text.primary },

  // Barra de control superior
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme === 'dark' ? '#0f172a' : '#0B1956',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 2,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  segmentBtnActive: {
    backgroundColor: '#3b82f6',
  },
  segmentTxt: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  segmentTxtActive: {
    color: '#FFF',
  },
  settingsIconBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    position: 'relative',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 3,
    right: 3,
  },

  cameraContainer: { flex: 1, overflow: 'hidden', position: 'relative' },
  glassesBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  glassesBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  floatingRotateButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 25, 86, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    elevation: 8,
    zIndex: 20,
  },

  // Subtítulos
  subtitleOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(11, 25, 86, 0.88)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  subtitleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  subtitleHeaderTitle: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 1,
    marginLeft: 6,
  },
  subtitleMainText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 4,
  },
  subtitlePlaceholder: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 6,
  },
  historyContainer: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 6,
  },
  historyText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },

  // Footer
  footer: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  micButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  micButtonDisabled: {
    backgroundColor: '#64748b',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    borderRadius: 20,
    padding: 22,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#ffffff' : '#0f172a',
  },
  modalHelp: {
    fontSize: 13,
    color: theme === 'dark' ? '#94a3b8' : '#64748b',
    marginBottom: 14,
    lineHeight: 18,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: theme === 'dark' ? '#ffffff' : '#0f172a',
    backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc',
    marginBottom: 14,
  },
  testBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  testSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  testFail: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  testBadgeText: {
    fontSize: 12,
    marginLeft: 8,
    color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  testBtnText: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 13,
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
