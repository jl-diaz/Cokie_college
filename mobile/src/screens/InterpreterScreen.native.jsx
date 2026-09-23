import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Image, 
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useRouter, Stack, useIsFocused, usePathname } from 'expo-router';
import { 
  Mic, 
  MicOff, 
  SwitchCamera, 
  Volume2, 
  Sparkles, 
  Glasses, 
  Smartphone, 
  Settings, 
  Headphones, 
  Radio, 
  Check, 
  AlertCircle,
  Wifi
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import WebSocketService from '../services/WebSocketService';

export default function InterpreterScreenNative() {
  const pathname = usePathname();
  const screenFocused = useIsFocused();
  const isFocused = screenFocused && (pathname === '/interpreter' || pathname.startsWith('/interpreter'));
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

  // ── SELECTORES DE FUENTE DE VIDEO Y SALIDA DE AUDIO ───────────────────────
  const [videoSource, setVideoSource] = useState('phone'); // 'phone' | 'glasses'
  const [audioOutput, setAudioOutput] = useState('phone'); // 'phone' | 'glasses'
  const [esp32Ip, setEsp32Ip] = useState('192.168.4.1');
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [ipInput, setIpInput] = useState('192.168.4.1');
  const [glassesConnected, setGlassesConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [glassesFrameUri, setGlassesFrameUri] = useState(null);

  const cameraRef = useRef(null);
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

  // Cargar configuración guardada de los lentes
  useEffect(() => {
    (async () => {
      try {
        const savedIp = await AsyncStorage.getItem('cokielens_ip');
        if (savedIp) {
          setEsp32Ip(savedIp);
          setIpInput(savedIp);
        }
        const savedAudio = await AsyncStorage.getItem('cokielens_audio_output');
        if (savedAudio) {
          setAudioOutput(savedAudio);
        }
        const savedSource = await AsyncStorage.getItem('cokielens_video_source');
        if (savedSource) {
          setVideoSource(savedSource);
        }
      } catch (e) {}
    })();
  }, []);

  // Al perder el foco, resetear estados y parar locución
  useEffect(() => {
    if (!isFocused) {
      setIsCameraReady(false);
      Speech.stop().catch(() => {});
    }
  }, [isFocused]);

  // Configurar audio y solicitar permiso solo si está en pantalla
  useEffect(() => {
    if (!isFocused) return;
    (async () => {
      if (!permission) {
        await requestPermission();
      }
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });
      } catch (e) {
        console.warn("No se pudo configurar el audio:", e);
      }
    })();
  }, [isFocused, permission]);

  // Inicializar WebSocket sólo cuando la pantalla esté enfocada
  useEffect(() => {
    if (!isFocused) return;

    const serverUrl = process.env.EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL || 'https://cokie-college.onrender.com';
    WebSocketService.connect(serverUrl);

    // ── GESTIÓN DE TRADUCCIONES Y LOCUCIÓN INSTANTÁNEA ───────────────────────
    const handleTranslation = async (text) => {
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
      
      // Evitar repetir la misma palabra dos veces seguidas
      if (lastSpokenRef.current === translatedText) {
        return;
      }
      lastSpokenRef.current = translatedText;

      // 1. SALIDA DE AUDIO: Teléfono / Audífonos conectados
      if (audioOutputRef.current === 'phone') {
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
      Speech.stop().catch(() => {});
    };
  }, [isFocused, t, i18n.language]);

  // ── BUCLE 1: CAPTURA DESDE CÁMARA DEL TELÉFONO ────────────────────────────
  useEffect(() => {
    let intervalId;

    if (isFocused && isActive && videoSource === 'phone' && isCameraReady && hasPermission) {
      intervalId = setInterval(async () => {
        if (!cameraRef.current || isCapturingRef.current) return;
        
        isCapturingRef.current = true;
        try {
          const photo = await cameraRef.current.takePictureAsync({
            base64: true,
            quality: 0.10,
            skipProcessing: true,
            shutterSound: false,
            exif: false,
            pictureSize: '352x288',
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
      }, 150);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isFocused, isActive, videoSource, isCameraReady, hasPermission]);

  // ── BUCLE 2: CAPTURA ULTRA RÁPIDA DESDE LENTES COKIELENS (ESP32-CAM) ───────
  // No utiliza takePictureAsync. Consume fotogramas JPEG directamente del ESP32 en 15ms.
  useEffect(() => {
    let intervalId;

    if (isFocused && isActive && videoSource === 'glasses') {
      const cleanIp = esp32Ip.replace('http://', '').replace('/', '').trim();
      const captureUrl = `http://${cleanIp}/capture`;

      intervalId = setInterval(async () => {
        if (isCapturingRef.current) return;
        isCapturingRef.current = true;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1400);

          const response = await fetch(captureUrl, { 
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            setGlassesConnected(true);
            const blob = await response.blob();
            
            // Convertir blob a base64 de manera robusta
            const reader = new FileReader();
            reader.onload = () => {
              const base64Data = reader.result;
              if (typeof base64Data === 'string' && base64Data.length > 50) {
                setGlassesFrameUri(base64Data);
                const commaIdx = base64Data.indexOf(',');
                const rawBase64 = commaIdx !== -1 ? base64Data.substring(commaIdx + 1) : base64Data;
                if (rawBase64) {
                  WebSocketService.sendFrame(rawBase64);
                }
              }
            };
            reader.onerror = () => {};
            reader.readAsDataURL(blob);
          } else {
            setGlassesConnected(false);
          }
        } catch (err) {
          setGlassesConnected(false);
        } finally {
          isCapturingRef.current = false;
        }
      }, 180);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isFocused, isActive, videoSource, esp32Ip]);

  function toggleCameraType() {
    setFacingMode(current => (current === 'front' ? 'back' : 'front'));
  }

  const handleSaveIp = async () => {
    const clean = ipInput.replace('http://', '').replace('/', '').trim();
    setEsp32Ip(clean);
    await AsyncStorage.setItem('cokielens_ip', clean);
    setIsConfigModalVisible(false);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      let clean = ipInput.replace('http://', '').replace('/', '').trim();
      if (!clean) clean = '192.168.4.1';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      let res;
      try {
        res = await fetch(`http://${clean}/status`, { signal: controller.signal });
      } catch (err) {
        // Fallback automático si cokielens.local falla en Android: intentar con IP AP
        if (clean === 'cokielens.local') {
          clean = '192.168.4.1';
          const retryController = new AbortController();
          const retryTimeout = setTimeout(() => retryController.abort(), 3000);
          res = await fetch(`http://${clean}/status`, { signal: retryController.signal });
          clearTimeout(retryTimeout);
          setIpInput(clean);
          setEsp32Ip(clean);
          await AsyncStorage.setItem('cokielens_ip', clean);
        } else {
          throw err;
        }
      }
      clearTimeout(timeoutId);
      
      if (res && res.ok) {
        const json = await res.json();
        setTestResult({ success: true, message: `Conectado a ${json.device || 'CokieLens'} (${json.ip || clean})` });
        setGlassesConnected(true);
      } else {
        setTestResult({ success: false, message: 'Respuesta inválida del dispositivo' });
      }
    } catch (e) {
      setTestResult({ success: false, message: 'No se pudo conectar. Verifica que estés conectado al Wi-Fi de los lentes o que la IP sea correcta.' });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const selectVideoSource = async (source) => {
    setVideoSource(source);
    await AsyncStorage.setItem('cokielens_video_source', source);
  };

  const selectAudioOutput = async (output) => {
    setAudioOutput(output);
    await AsyncStorage.setItem('cokielens_audio_output', output);
  };

  if (hasPermission === null && videoSource === 'phone') {
    return <View style={styles.container} />;
  }
  
  if (hasPermission === false && videoSource === 'phone') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.text}>{t('interpreter.noPermission', 'No hay permisos de cámara')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '' }} />

      {/* ── BARRA SUPERIOR DE SELECTORES (CÁMARA Y AUDIO) ── */}
      <View style={styles.controlBar}>
        {/* Selector de Entrada de Video */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segmentBtn, videoSource === 'phone' && styles.segmentBtnActive]}
            onPress={() => selectVideoSource('phone')}
          >
            <Smartphone size={15} color={videoSource === 'phone' ? '#FFF' : Colors.text.secondary} />
            <Text style={[styles.segmentTxt, videoSource === 'phone' && styles.segmentTxtActive]}>
              Teléfono
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.segmentBtn, videoSource === 'glasses' && styles.segmentBtnActive]}
            onPress={() => selectVideoSource('glasses')}
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
            style={[styles.segmentBtn, audioOutput === 'phone' && styles.segmentBtnActive]}
            onPress={() => selectAudioOutput('phone')}
          >
            <Volume2 size={15} color={audioOutput === 'phone' ? '#FFF' : Colors.text.secondary} />
            <Text style={[styles.segmentTxt, audioOutput === 'phone' && styles.segmentTxtActive]}>
              Altavoz
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.segmentBtn, audioOutput === 'glasses' && styles.segmentBtnActive]}
            onPress={() => selectAudioOutput('glasses')}
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

      {/* ── ÁREA DE VIDEO (TELÉFONO O LENTES) ── */}
      <View style={styles.cameraContainer}>
        {videoSource === 'phone' ? (
          isFocused ? (
            <>
              <CameraView 
                ref={cameraRef}
                style={StyleSheet.absoluteFill} 
                facing={facingMode}
                onCameraReady={() => setIsCameraReady(true)}
                animateShutter={false}
              />
              {/* Botón flotante para alternar frontal / trasera */}
              <TouchableOpacity onPress={toggleCameraType} style={styles.floatingRotateButton}>
                <SwitchCamera color="#fff" size={24} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
          )
        ) : (
          <View style={styles.glassesPreviewContainer}>
            {glassesFrameUri ? (
              <Image 
                source={{ uri: glassesFrameUri }} 
                style={StyleSheet.absoluteFill} 
                resizeMode="cover"
              />
            ) : (
              <View style={styles.glassesPlaceholder}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={styles.glassesPlaceholderText}>
                  Conectando con Lentes CokieLens en {esp32Ip}...
                </Text>
              </View>
            )}

            {/* Indicador flotante de los lentes */}
            <View style={styles.glassesBadge}>
              <Glasses size={16} color="#38bdf8" style={{ marginRight: 6 }} />
              <Text style={styles.glassesBadgeText}>
                {glassesConnected ? 'Lentes CokieLens en Vivo' : 'Buscando Lentes...'}
              </Text>
              <View style={[styles.miniDot, { backgroundColor: glassesConnected ? '#10b981' : '#ef4444' }]} />
            </View>
          </View>
        )}

        {/* Banner de subtítulos en vivo */}
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Glasses color="#38bdf8" size={24} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Configurar Lentes CokieLens</Text>
              </View>

              <Text style={styles.modalHelp}>
                Ingresa la IP de tu ESP32-CAM o selecciona una opción rápida:
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity 
                  onPress={() => setIpInput('192.168.4.1')}
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    paddingHorizontal: 8,
                    backgroundColor: ipInput === '192.168.4.1' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: ipInput === '192.168.4.1' ? '#38bdf8' : 'transparent',
                    alignItems: 'center'
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 11, color: '#FFF', fontWeight: 'bold' }}>192.168.4.1</Text>
                  <Text style={{ fontSize: 9, color: '#94a3b8' }}>Wi-Fi de Lentes (AP)</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setIpInput('cokielens.local')}
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    paddingHorizontal: 8,
                    backgroundColor: ipInput === 'cokielens.local' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: ipInput === 'cokielens.local' ? '#38bdf8' : 'transparent',
                    alignItems: 'center'
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 11, color: '#FFF', fontWeight: 'bold' }}>cokielens.local</Text>
                  <Text style={{ fontSize: 9, color: '#94a3b8' }}>mDNS Local</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                value={ipInput}
                onChangeText={setIpInput}
                placeholder="Ej: 192.168.4.1 o 192.168.1.50"
                placeholderTextColor="#94a3b8"
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
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
        </KeyboardAvoidingView>
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
    paddingHorizontal: 9,
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

  // Contenedor de cámara y vista de lentes
  cameraContainer: { flex: 1, overflow: 'hidden', position: 'relative' },
  glassesPreviewContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassesPlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  glassesPlaceholderText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
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
