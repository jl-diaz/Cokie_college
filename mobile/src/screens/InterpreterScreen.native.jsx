import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Image, 
  ActivityIndicator, 
  Platform, 
  KeyboardAvoidingView, 
  Linking,
  Animated,
  Easing,
  useWindowDimensions,
  ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useRouter, Stack, useIsFocused, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  SwitchCamera, 
  Volume2, 
  VolumeX, 
  Glasses, 
  Settings, 
  Check, 
  AlertCircle, 
  X,
  Activity,
  CheckCircle2,
  Video,
  VideoOff,
  RotateCcw,
  Languages,
  Sun,
  Moon,
  ChevronUp,
  ChevronDown,
  Smartphone
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebSocketService from '../services/WebSocketService';
import { useTabBar } from '../context/TabBarContext';
import SkeletonOverlay from '../components/SkeletonOverlay';
import {
  getAiServerUrl,
  subscribeAiServerUrl,
  getCurrentAiServerUrlSync
} from '../services/aiServerConfig';

export default function InterpreterScreenNative() {
  const pathname = usePathname();
  const screenFocused = useIsFocused();
  const isFocused = screenFocused && (pathname === '/interpreter' || pathname.startsWith('/interpreter'));
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors: Colors, theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { isTabBarHidden, setIsTabBarHidden, registerModal, unregisterModal } = useTabBar();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const styles = useMemo(() => createStyles(Colors, isDark, insets, isLargeScreen), [Colors, isDark, insets, isLargeScreen]);

  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = permission?.granted ?? null;

  // ── ESTADO DE ACTIVACIÓN DE CÁMARA ────────────────────────────────────────
  // La cámara sólo se activa si el usuario lo solicita explícitamente desde el dispositivo o lentes
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('front');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [pictureSize, setPictureSize] = useState(undefined);

  // ── ESTADOS DE IA Y TRADUCCIÓN ───────────────────────────────────────────
  const [aiServerStatus, setAiServerStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentSentence, setCurrentSentence] = useState('');
  const [lastTranslation, setLastTranslation] = useState('');
  const [liveLandmarks, setLiveLandmarks] = useState(null);

  // ── FUENTE DE VIDEO Y DISPOSITIVOS ───────────────────────────────────────
  const [videoSource, setVideoSource] = useState('phone'); // 'phone' | 'glasses'
  const [audioOutput, setAudioOutput] = useState('phone'); // 'phone' | 'glasses'
  const [esp32Ip, setEsp32Ip] = useState('192.168.4.1');
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [ipInput, setIpInput] = useState('192.168.4.1');
  const [glassesConnected, setGlassesConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [glassesFrameUri, setGlassesFrameUri] = useState(null);
  const [audioVolume, setAudioVolume] = useState(80); // 0 a 100%

  // ── REFERENCIAS Y TIMERS ──────────────────────────────────────────────────
  const cameraRef = useRef(null);
  const isCapturingRef = useRef(false);
  const lastSpokenRef = useRef('');
  const audioOutputRef = useRef(audioOutput);
  const esp32IpRef = useRef(esp32Ip);
  const audioVolumeRef = useRef(audioVolume);
  const soundCapsuleHeightRef = useRef(220);
  const analyzingTimeoutRef = useRef(null);
  const clearLastSpokenTimeoutRef = useRef(null);

  // Animaciones para botón de activación
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonPressScale = useRef(new Animated.Value(1)).current;

  // Registrar modal con TabBarContext para evitar solapamientos
  useEffect(() => {
    if (isConfigModalVisible) {
      registerModal();
      return () => unregisterModal();
    }
  }, [isConfigModalVisible, registerModal, unregisterModal]);

  // Sincronizar referencias
  useEffect(() => {
    audioOutputRef.current = audioOutput;
  }, [audioOutput]);
  useEffect(() => {
    esp32IpRef.current = esp32Ip;
  }, [esp32Ip]);
  useEffect(() => {
    audioVolumeRef.current = audioVolume;
  }, [audioVolume]);

  // ── GESTIÓN DE OCULTAMIENTO DE LA BARRA DE NAVEGACIÓN ─────────────────────
  // Al entrar al intérprete en teléfonos, la barra de navegación se oculta por defecto
  useEffect(() => {
    if (isFocused && !isLargeScreen) {
      setIsTabBarHidden(true);
      return () => {
        setIsTabBarHidden(false);
      };
    }
  }, [isFocused, isLargeScreen, setIsTabBarHidden]);

  // ── ANIMACIÓN CONTINUA DE BOTÓN DE ACTIVACIÓN ─────────────────────────────
  useEffect(() => {
    if (!isCameraActive) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCameraActive, pulseAnim]);

  // ── CAMBIAR IDIOMA (SISTEMA DE TRADUCCIÓN I18N) ───────────────────────────
  const toggleLanguage = async () => {
    const current = i18n?.language || 'es';
    const nextLang = current.startsWith('es') ? 'en' : 'es';
    await i18n.changeLanguage(nextLang);
    await AsyncStorage.setItem('language', nextLang);
  };

  // ── CARGAR CONFIGURACIÓN PERSISTENTE ──────────────────────────────────────
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
        const savedVol = await AsyncStorage.getItem('cokielens_volume');
        if (savedVol) {
          const parsed = Number(savedVol);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
            setAudioVolume(parsed);
            audioVolumeRef.current = parsed;
          }
        }
      } catch (e) {}
    })();
  }, []);

  // Al perder el foco, pausar cámara y detener voz
  useEffect(() => {
    if (!isFocused) {
      setIsCameraReady(false);
      Speech.stop().catch(() => {});
    }
  }, [isFocused]);

  // Audio setup y permisos de cámara
  useEffect(() => {
    if (!isFocused) return;
    (async () => {
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
  }, [isFocused]);

  // ── ESTADO DEL SERVIDOR IA VÍA WEBSOCKET ──────────────────────────────────
  useEffect(() => {
    if (!isFocused) return;
    const updateStatus = (status) => setAiServerStatus(status);
    WebSocketService.addStatusListener(updateStatus);
    return () => {
      WebSocketService.removeStatusListener(updateStatus);
    };
  }, [isFocused]);

  // ── WEBSOCKET Y PROCESAMIENTO DE ORACIONES / SUBTÍTULOS ───────────────────
  useEffect(() => {
    if (!isFocused) return;

    let isMounted = true;
    getAiServerUrl().then(url => {
      if (isMounted) WebSocketService.connect(url);
    });

    const unsub = subscribeAiServerUrl((newUrl) => {
      if (isMounted) WebSocketService.connect(newUrl);
    });

    // Manejador de oraciones formuladas por el backend
    const handleSentenceEvent = async (eventType, data) => {
      if (eventType === 'update') {
        setIsAnalyzing(true);
        if (data?.sentence) {
          setCurrentSentence(data.sentence);
        }
        if (analyzingTimeoutRef.current) clearTimeout(analyzingTimeoutRef.current);
        analyzingTimeoutRef.current = setTimeout(() => {
          setIsAnalyzing(false);
        }, 3200);
      } else if (eventType === 'complete') {
        setIsAnalyzing(false);
        if (data?.sentence) {
          setCurrentSentence(data.sentence);
          speakSentence(data.sentence);
        }
      } else if (eventType === 'cleared') {
        setCurrentSentence('');
        setIsAnalyzing(false);
      }
    };

    // Manejador de token único o traducción directa
    const handleTranslation = async (text, rawData) => {
      let translatedText = text;
      const currentLang = i18n?.language || 'es';

      if (rawData && typeof rawData === 'object') {
        if (currentLang === 'en' && rawData.name_en) {
          translatedText = rawData.name_en;
        } else if (rawData.name_es) {
          translatedText = rawData.name_es;
        }
      }

      if (translatedText.startsWith('sign.')) {
        const translationKey = translatedText.replace('sign.', 'signs.');
        const i18nVal = t(translationKey, { defaultValue: '' });
        if (i18nVal) {
          translatedText = i18nVal;
        } else {
          const raw = translatedText.replace('sign.', '').replace(/_/g, ' ');
          translatedText = raw.charAt(0).toUpperCase() + raw.slice(1);
        }
      }

      setLastTranslation(translatedText);
      setIsAnalyzing(true);

      if (analyzingTimeoutRef.current) clearTimeout(analyzingTimeoutRef.current);
      analyzingTimeoutRef.current = setTimeout(() => {
        setIsAnalyzing(false);
      }, 2800);

      // Si se reconoce un signo y no hay oración activa en curso, pronunciar
      if (translatedText && !currentSentence) {
        speakSentence(translatedText);
      }
    };

    const handleLandmarks = (landmarksData) => {
      setLiveLandmarks(landmarksData);
      if (landmarksData?.detected) {
        setIsAnalyzing(true);
        if (analyzingTimeoutRef.current) clearTimeout(analyzingTimeoutRef.current);
        analyzingTimeoutRef.current = setTimeout(() => {
          setIsAnalyzing(false);
        }, 2500);
      } else {
        // Al bajar las manos o pausar, limpiar el texto previo para permitir pronunciar la misma seña nuevamente
        if (clearLastSpokenTimeoutRef.current) clearTimeout(clearLastSpokenTimeoutRef.current);
        clearLastSpokenTimeoutRef.current = setTimeout(() => {
          lastSpokenRef.current = '';
        }, 1800);
      }
    };

    WebSocketService.addSentenceListener(handleSentenceEvent);
    WebSocketService.addListener(handleTranslation);
    WebSocketService.addLandmarksListener(handleLandmarks);

    return () => {
      isMounted = false;
      unsub();
      WebSocketService.removeSentenceListener(handleSentenceEvent);
      WebSocketService.removeListener(handleTranslation);
      WebSocketService.removeLandmarksListener(handleLandmarks);
      WebSocketService.disconnect();
      if (analyzingTimeoutRef.current) clearTimeout(analyzingTimeoutRef.current);
      Speech.stop().catch(() => {});
    };
  }, [isFocused, t, i18n, currentSentence]);

  // Selección y persistencia de bocina de salida
  const handleSelectAudioOutput = async (output) => {
    setAudioOutput(output);
    audioOutputRef.current = output;
    try {
      await AsyncStorage.setItem('cokielens_audio_output', output);
    } catch (e) {}
  };

  // Ejecución física del audio (Celular / CokieLens)
  const executeAudioPlay = async (textToSpeak) => {
    if (!textToSpeak) return;

    if (audioOutputRef.current === 'phone' || audioOutputRef.current === 'browser') {
      try {
        await Speech.stop();
        Speech.speak(textToSpeak, {
          language: (i18n?.language || 'es').startsWith('en') ? 'en-US' : 'es-MX',
          pitch: 1.0,
          rate: 1.0,
          volume: Math.max(0.1, (audioVolumeRef.current || 80) / 100),
        });
      } catch (err) {
        console.warn('Error en Speech nativo:', err);
      }
    } else if (audioOutputRef.current === 'glasses') {
      try {
        const clean = esp32IpRef.current.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
        fetch(`http://${clean}/play`, {
          method: 'POST',
          body: textToSpeak,
          headers: { 
            'Content-Type': 'text/plain',
            'X-Audio-Volume': String(audioVolumeRef.current || 80)
          }
        }).catch(e => {
          const serverUrl = getCurrentAiServerUrlSync();
          fetch(`${serverUrl}/api/esp32/audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ esp32_ip: clean, text: textToSpeak })
          }).catch(err2 => console.log('Envío a lentes vía backend proxy:', err2));
        });
      } catch (err) {
        console.warn('Error enviando audio a los lentes:', err);
      }
    }
  };

  // Locución con síntesis de voz o envío a lentes
  const speakSentence = async (textToSpeak) => {
    if (!textToSpeak) return;
    const trimmed = textToSpeak.trim();
    if (!trimmed || lastSpokenRef.current.toLowerCase() === trimmed.toLowerCase()) return;
    lastSpokenRef.current = trimmed;
    await executeAudioPlay(trimmed);
  };

  const forceSpeak = async (textToSpeak) => {
    if (!textToSpeak) return;
    const trimmed = textToSpeak.trim();
    if (!trimmed) return;
    lastSpokenRef.current = trimmed;
    await executeAudioPlay(trimmed);
  };

  const handleCameraReady = async () => {
    setIsCameraReady(true);
    try {
      if (cameraRef.current?.getAvailablePictureSizesAsync) {
        const sizes = await cameraRef.current.getAvailablePictureSizesAsync();
        if (sizes && sizes.length > 0) {
          const preferredSizes = ['352x288', '640x480', '480x360', '320x240', 'VGA', 'CIF'];
          let chosen = sizes.find(s => preferredSizes.includes(s));
          if (!chosen) {
            chosen = sizes.find(s => {
              const parts = s.split('x');
              if (parts.length === 2) {
                const area = parseInt(parts[0]) * parseInt(parts[1]);
                return area >= 70000 && area <= 350000;
              }
              return false;
            }) || sizes[sizes.length - 1];
          }
          if (chosen) setPictureSize(chosen);
        }
      }
    } catch (e) {}
  };

  // ── BUCLE 1: CAPTURA DESDE CÁMARA DEL TELÉFONO ────────────────────────────
  useEffect(() => {
    let intervalId;

    if (isFocused && isCameraActive && videoSource === 'phone' && isCameraReady && hasPermission) {
      intervalId = setInterval(async () => {
        if (!cameraRef.current || isCapturingRef.current) return;
        
        isCapturingRef.current = true;
        try {
          const photo = await cameraRef.current.takePictureAsync({
            base64: true,
            quality: 0.10,
            skipProcessing: true,
            fastMode: true,
            shutterSound: false,
            exif: false,
          });

          if (photo?.base64) {
            WebSocketService.sendFrame({
              image: photo.base64,
              platform: Platform.OS,
              facing: facingMode,
              source: 'phone'
            });
          }
        } catch (e) {
          if (!e.message?.includes('unmounted')) {
            console.log('Error capturando frame nativo:', e?.message || e);
          }
        } finally {
          isCapturingRef.current = false;
        }
      }, 100);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isFocused, isCameraActive, videoSource, isCameraReady, hasPermission, facingMode]);

  // ── BUCLE 2: CAPTURA DESDE LENTES COKIELENS (ESP32-CAM) ───────────────────
  useEffect(() => {
    let intervalId;
    let consecutiveErrors = 0;

    if (isFocused && isCameraActive && videoSource === 'glasses') {
      const cleanIp = esp32Ip.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim() || '192.168.4.1';
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
            consecutiveErrors = 0;
            setGlassesConnected(true);
            const blob = await response.blob();
            
            const base64Data = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });

            if (typeof base64Data === 'string' && base64Data.length > 50) {
              setGlassesFrameUri(base64Data);
              const commaIdx = base64Data.indexOf(',');
              const rawBase64 = commaIdx !== -1 ? base64Data.substring(commaIdx + 1) : base64Data;
              if (rawBase64) {
                WebSocketService.sendFrame({
                  image: rawBase64,
                  platform: Platform.OS,
                  facing: 'environment',
                  source: 'glasses'
                });
              }
            }
          } else {
            consecutiveErrors++;
            if (consecutiveErrors >= 3) setGlassesConnected(false);
          }
        } catch (err) {
          consecutiveErrors++;
          if (consecutiveErrors >= 3) {
            setGlassesConnected(false);
            if (cleanIp === 'cokielens.local') {
              setEsp32Ip('192.168.4.1');
              setIpInput('192.168.4.1');
              AsyncStorage.setItem('cokielens_ip', '192.168.4.1');
              consecutiveErrors = 0;
            }
          }
        } finally {
          isCapturingRef.current = false;
        }
      }, 120);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isFocused, isCameraActive, videoSource, esp32Ip]);

  function toggleCameraType() {
    setFacingMode(current => (current === 'front' ? 'back' : 'front'));
  }

  // Animación al presionar botón de activación
  const handleToggleCameraActivation = async () => {
    Animated.sequence([
      Animated.timing(buttonPressScale, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonPressScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    if (!isCameraActive && videoSource === 'phone' && !permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setIsCameraActive(prev => !prev);
  };

  const handleSaveIp = async () => {
    let clean = ipInput.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    if (!clean) clean = '192.168.4.1';
    setEsp32Ip(clean);
    setIpInput(clean);
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
        setTestResult({ 
          success: true, 
          message: t('interpreter.connectedToDevice', { device: json.device || 'CokieLens', ip: json.ip || clean, defaultValue: `Conectado a ${json.device || 'CokieLens'} (${json.ip || clean})` })
        });
        setGlassesConnected(true);
      } else {
        setTestResult({ success: false, message: t('interpreter.invalidDeviceResponse', 'Respuesta inválida del dispositivo') });
      }
    } catch (e) {
      setTestResult({ success: false, message: t('interpreter.connectionFailedCheckWifi', 'No se pudo conectar. Verifica que estés conectado al Wi-Fi de los lentes o que la IP sea correcta.') });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const selectVideoSource = async (source) => {
    setVideoSource(source);
    await AsyncStorage.setItem('cokielens_video_source', source);
  };

  const updateVolume = async (newVol) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
    setAudioVolume(clamped);
    audioVolumeRef.current = clamped;
    try {
      await AsyncStorage.setItem('cokielens_volume', String(clamped));
      const clean = esp32IpRef.current.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      if (clean) {
        fetch(`http://${clean}/volume?level=${clamped}`, { method: 'POST' }).catch(() => {});
      }
    } catch (e) {}
  };

  // ── SLIDER VERTICAL ESTILO IPHONE ─────────────────────────────────────────
  const handleIPhoneSliderTouch = (evt) => {
    const locationY = evt.nativeEvent.locationY;
    const totalHeight = soundCapsuleHeightRef.current || 220;
    const fillRatio = Math.max(0, Math.min(1, (totalHeight - locationY) / totalHeight));
    updateVolume(fillRatio * 100);
  };

  // Texto de la oración actual a mostrar
  const displayedText = currentSentence || lastTranslation || '';
  const currentLangCode = (i18n?.language || 'es').startsWith('es') ? 'ES' : 'EN';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── BARRA SUPERIOR: [ IDIOMA / TRADUCIR ] | [ WEBCAM / LENTES ] | [ MODO OSCURO / CLARO ] [ AJUSTES ] ── */}
      <View style={styles.topBar}>
        {/* Lado Izquierdo: Botón para Traducir / Cambiar Idioma */}
        <TouchableOpacity 
          style={styles.languagePillButton}
          onPress={toggleLanguage}
          activeOpacity={0.7}
          accessibilityLabel={t('interpreter.switchLanguage', 'Cambiar idioma')}
        >
          <Languages size={17} color={isDark ? '#F1F5F9' : '#0F172A'} style={{ marginRight: 5 }} />
          <Text style={styles.languagePillText}>{currentLangCode}</Text>
        </TouchableOpacity>

        {/* Centro: Segmentado [ Webcam | Lentes ] */}
        <View style={styles.segmentedCapsule}>
          <TouchableOpacity 
            style={[styles.segmentPill, videoSource === 'phone' && styles.segmentPillActive]}
            onPress={() => selectVideoSource('phone')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentPillText, videoSource === 'phone' && styles.segmentPillTextActive]}>
              {t('interpreter.sourceWebcamTab', 'Webcam')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.segmentPill, videoSource === 'glasses' && styles.segmentPillActive]}
            onPress={() => selectVideoSource('glasses')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentPillText, videoSource === 'glasses' && styles.segmentPillTextActive]}>
              {t('interpreter.sourceGlassesTab', 'Lentes')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lado Derecho: Botón Modo Claro/Oscuro y Botón Ajustes */}
        <View style={styles.topRightActions}>
          <TouchableOpacity 
            style={styles.topBarIconButton}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityLabel={isDark ? t('interpreter.themeLight', 'Modo claro') : t('interpreter.themeDark', 'Modo oscuro')}
          >
            {isDark ? (
              <Sun size={20} color="#F1F5F9" />
            ) : (
              <Moon size={20} color="#0F172A" />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.topBarIconButton} 
            onPress={() => setIsConfigModalVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel={t('interpreter.configGlassesTitle', 'Configurar Lentes CokieLens')}
          >
            <Settings size={20} color={isDark ? '#F1F5F9' : '#0F172A'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CONTENIDO PRINCIPAL: HORIZONTAL EN DISPOSITIVOS GRANDES / VERTICAL EN TELÉFONOS ── */}
      <View style={[styles.mainLayout, isLargeScreen && styles.mainLayoutLarge]}>
        {/* FRAME DE CÁMARA */}
        <View style={[styles.cameraWrapper, isLargeScreen && styles.cameraWrapperLarge]}>
          <View style={styles.cameraFrame}>
            {isCameraActive ? (
              // CÁMARA ACTIVA
              videoSource === 'phone' ? (
                isFocused ? (
                  <>
                    <CameraView 
                      ref={cameraRef}
                      style={StyleSheet.absoluteFill} 
                      facing={facingMode}
                      pictureSize={pictureSize || '640x480'}
                      onCameraReady={handleCameraReady}
                      animateShutter={false}
                    />

                    {/* UN SOLO CÍRCULO PARA INVERTIR LA CÁMARA */}
                    <TouchableOpacity 
                      onPress={toggleCameraType} 
                      style={styles.floatingFlipCircle}
                      activeOpacity={0.7}
                    >
                      <SwitchCamera color="#FFFFFF" size={20} />
                    </TouchableOpacity>

                    {/* Botón sutil para pausar/desactivar cámara */}
                    <TouchableOpacity 
                      onPress={() => setIsCameraActive(false)} 
                      style={styles.floatingPauseCircle}
                      activeOpacity={0.7}
                    >
                      <VideoOff color="#FFFFFF" size={17} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1C1C1C' }]} />
                )
              ) : (
                // VISTA DE LENTES COKIELENS
                <View style={styles.glassesLiveContainer}>
                  {glassesFrameUri ? (
                    <Image 
                      source={{ uri: glassesFrameUri }} 
                      style={StyleSheet.absoluteFill} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.glassesWaitingBox}>
                      <ActivityIndicator size="large" color="#426BC2" />
                      <Text style={styles.glassesWaitingText}>
                        {glassesConnected 
                          ? t('interpreter.receivingGlassesVideo', 'Recibiendo video de CokieLens...') 
                          : t('interpreter.connectingGlasses', { ip: esp32Ip, defaultValue: `Conectando con Lentes en ${esp32Ip}...` })}
                      </Text>
                    </View>
                  )}

                  {/* Botón flotante para pausar cámara de lentes */}
                  <TouchableOpacity 
                    onPress={() => setIsCameraActive(false)} 
                    style={styles.floatingPauseCircle}
                    activeOpacity={0.7}
                  >
                    <VideoOff color="#FFFFFF" size={17} />
                  </TouchableOpacity>
                </View>
              )
            ) : (
              // CÁMARA INACTIVA: PANTALLA DE ACTIVACIÓN CON ANIMACIÓN
              <View style={styles.cameraInactiveContainer}>
                <View style={styles.inactiveIconCircle}>
                  <Video size={40} color={isDark ? '#426BC2' : '#132472'} />
                </View>
                <Text style={styles.inactiveTitle}>
                  {videoSource === 'phone' 
                    ? t('interpreter.deviceCamera', 'Cámara de Dispositivo') 
                    : t('interpreter.sourceGlasses', 'Lentes CokieLens')}
                </Text>
                <Text style={styles.inactiveSubtitle}>
                  {videoSource === 'phone' 
                    ? t('interpreter.activateCameraDesc', 'Activa la cámara para comenzar la interpretación de señas en tiempo real')
                    : t('interpreter.readySyncGlasses', { ip: esp32Ip, defaultValue: `Listo para sincronizar con ESP32-CAM en ${esp32Ip}` })}
                </Text>

                {/* Botón animado de activación */}
                <Animated.View style={{ transform: [{ scale: Animated.multiply(pulseAnim, buttonPressScale) }] }}>
                  <TouchableOpacity
                    style={styles.activateButton}
                    onPress={handleToggleCameraActivation}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#132472', '#426BC2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activateButtonGradient}
                    >
                      <Video size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.activateButtonText}>
                        {t('interpreter.activateCamera', 'Activar Cámara')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}

            {/* Trazado esquelético de puntos MediaPipe */}
            <SkeletonOverlay
              landmarks={liveLandmarks}
              mirrored={videoSource === 'phone' && facingMode === 'front'}
              active={isCameraActive && isFocused}
            />
          </View>
        </View>

        {/* ── CAJA DE TRADUCCIÓN (HORIZONTAL EN DISPOSITIVOS GRANDES / SIN SOMBRA Y BORDE 0.5PX EN TELÉFONO) ── */}
        <View style={[styles.translationCard, isLargeScreen && styles.translationCardLarge]}>
          {/* Cabecera superior de la caja */}
          <View style={styles.translationCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.translationHeaderStatus}>
                {aiServerStatus === 'connecting'
                  ? t('interpreter.connectingServer', 'Conectando con Servidor IA...')
                  : isAnalyzing 
                    ? t('interpreter.detectingSigns', 'Detectando señas...') 
                    : t('interpreter.readyToTranslate', 'Listo para traducir')}
              </Text>
              {/* Badge selector rápido de bocina activa */}
              <TouchableOpacity 
                onPress={() => handleSelectAudioOutput(audioOutput === 'phone' ? 'glasses' : 'phone')}
                style={styles.audioIndicatorBadge}
                activeOpacity={0.7}
                accessibilityLabel={t('interpreter.toggleAudio', 'Cambiar salida de audio')}
              >
                {audioOutput === 'glasses' ? (
                  <Glasses size={12} color="#426BC2" />
                ) : (
                  <Volume2 size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                )}
                <Text style={styles.audioIndicatorBadgeText}>
                  {audioOutput === 'glasses' ? 'CokieLens' : 'Celular'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {displayedText ? (
                <TouchableOpacity 
                  onPress={() => forceSpeak(displayedText)} 
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={t('interpreter.speakAgain', 'Reproducir voz')}
                >
                  <Volume2 size={16} color={isDark ? '#38BDF8' : '#0284C7'} />
                </TouchableOpacity>
              ) : null}

              {displayedText ? (
                <TouchableOpacity 
                  onPress={() => WebSocketService.clearSentence()}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={t('interpreter.clearText', 'Limpiar')}
                >
                  <RotateCcw size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Separador fino */}
          <View style={styles.cardDivider} />

          {/* Cuerpo principal: Oración formulada */}
          <View style={[styles.translationCardBody, isLargeScreen && styles.translationCardBodyLarge]}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            >
              <Text 
                style={[styles.translationMainSentence, isLargeScreen && styles.translationMainSentenceLarge]} 
                numberOfLines={isLargeScreen ? 6 : 3}
              >
                {displayedText ? `“${displayedText}”` : t('interpreter.waitingGestures', '“Esperando señas o movimientos...”')}
              </Text>
            </ScrollView>

            {/* Fila de estado con slots de íconos */}
            <View style={styles.translationStatusRow}>
              {isAnalyzing ? (
                <>
                  {/* ────────────────────────────────────────────────────────── */}
                  {/* SLOT DE ÍCONO: INTERPRETANDO / ANALIZANDO (Reemplazable)   */}
                  {/* ────────────────────────────────────────────────────────── */}
                  <View style={styles.statusIconSlot}>
                    <Activity size={16} color="#426BC2" />
                  </View>
                  <Text style={styles.translationStatusLabel}>
                    {t('interpreter.detectingSigns', 'Detectando señas...')}
                  </Text>
                </>
              ) : (
                <>
                  {/* ────────────────────────────────────────────────────────── */}
                  {/* SLOT DE ÍCONO: TRADUCCIÓN COMPLETADA / LISTO (Reemplazable)*/}
                  {/* ────────────────────────────────────────────────────────── */}
                  <View style={styles.statusIconSlot}>
                    <CheckCircle2 size={16} color="#10B981" />
                  </View>
                  <Text style={[styles.translationStatusLabel, { color: '#10B981' }]}>
                    {t('interpreter.readyToTranslate', 'Listo para traducir')}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* ── ZONA INTERACTIVA INFERIOR: REVELAR / OCULTAR TAB BAR EN MÓVILES AL TOCAR ── */}
      {!isLargeScreen && (
        <TouchableOpacity 
          style={styles.bottomNavTrigger}
          onPress={() => setIsTabBarHidden(!isTabBarHidden)}
          activeOpacity={0.6}
          accessibilityLabel={isTabBarHidden ? t('interpreter.showTabs', 'Mostrar menú') : t('interpreter.hideTabs', 'Ocultar menú')}
        >
          {isTabBarHidden ? (
            <ChevronUp size={20} color={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'} strokeWidth={2.5} />
          ) : (
            <ChevronDown size={20} color={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      )}

      {/* ── MODAL FULLSCREEN DE AJUSTES (DISEÑO MOCKUP 2: COKIELENS) ── */}
      <Modal
        visible={isConfigModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsConfigModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.fullscreenModalContainer}>
            {/* Header CokieLens con Status Dot y botón Cerrar */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalBrandTitle}>CokieLens</Text>
                <View 
                  style={[
                    styles.modalStatusDot, 
                    { backgroundColor: glassesConnected ? '#10B981' : '#EF4444' }
                  ]} 
                />
              </View>

              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setIsConfigModalVisible(false)}
                activeOpacity={0.7}
              >
                <X size={22} color={isDark ? '#F1F5F9' : '#0F172A'} />
              </TouchableOpacity>
            </View>

            {/* Fila de Cards: Lentes a la izquierda + Barra de sonido estilo iPhone a la derecha */}
            <View style={styles.topCardsRow}>
              {/* Card de los Lentes (Izquierda) */}
              <View style={styles.glassesCard}>
                <Image 
                  source={require('../../assets/glasses.png')} 
                  style={styles.glassesImage} 
                  resizeMode="contain" 
                />
              </View>

              {/* Barra de Sonido vertical estilo iPhone (Derecha) */}
              <View 
                style={styles.soundCapsule}
                onLayout={(e) => {
                  soundCapsuleHeightRef.current = e.nativeEvent.layout.height;
                }}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={handleIPhoneSliderTouch}
                onResponderMove={handleIPhoneSliderTouch}
              >
                {/* Relleno de volumen desde abajo con gradiente azul */}
                <View style={[styles.soundFillBar, { height: `${audioVolume}%` }]}>
                  <LinearGradient
                    colors={['#426BC2', '#132472']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Porcentaje numérico dentro de la barra azul si hay volumen suficiente */}
                  {audioVolume >= 12 && (
                    <Text style={styles.soundPercentageTextInside}>{audioVolume}%</Text>
                  )}
                </View>

                {/* Ícono de altavoz en la parte superior del slider */}
                <View style={styles.soundIconContainer} pointerEvents="none">
                  {audioVolume === 0 ? (
                    <VolumeX size={22} color={isDark ? '#94A3B8' : '#64748B'} />
                  ) : (
                    <Volume2 size={22} color="#FFFFFF" />
                  )}
                </View>

                {/* Porcentaje en la parte inferior si el volumen es muy bajo */}
                {audioVolume < 12 && (
                  <View style={styles.soundPercentageContainerBelow} pointerEvents="none">
                    <Text style={styles.soundPercentageTextBelow}>{audioVolume}%</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Selector de bocina: Celular vs Lentes */}
            <View style={styles.audioOutputSection}>
              <Text style={styles.sectionLabelText}>
                {t('interpreter.audioOutputTarget', 'Salida de audio de voz')}
              </Text>
              <View style={styles.audioOutputSegmentContainer}>
                <TouchableOpacity 
                  style={[
                    styles.audioOutputPill, 
                    audioOutput === 'phone' && styles.audioOutputPillActive
                  ]}
                  onPress={() => handleSelectAudioOutput('phone')}
                  activeOpacity={0.8}
                >
                  <Smartphone size={16} color={audioOutput === 'phone' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')} style={{ marginRight: 6 }} />
                  <Text 
                    style={[
                      styles.audioOutputPillText, 
                      audioOutput === 'phone' && styles.audioOutputPillTextActive
                    ]}
                  >
                    {t('interpreter.outputDevice', 'Bocina Celular')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.audioOutputPill, 
                    audioOutput === 'glasses' && styles.audioOutputPillActive
                  ]}
                  onPress={() => handleSelectAudioOutput('glasses')}
                  activeOpacity={0.8}
                >
                  <Glasses size={16} color={audioOutput === 'glasses' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')} style={{ marginRight: 6 }} />
                  <Text 
                    style={[
                      styles.audioOutputPillText, 
                      audioOutput === 'glasses' && styles.audioOutputPillTextActive
                    ]}
                  >
                    {t('interpreter.outputGlasses', 'Bocina CokieLens')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Texto instructivo */}
            <Text style={styles.modalInstructionText}>
              {t('interpreter.configGlassesInstruction', 'Ingresa la dirección IP de tu ESP32-CAM o elige una opción rápida')}
            </Text>

            {/* Selector rápido tipo pastilla (Wi-Fi de lentes / mDNS Local) */}
            <View style={styles.quickIpSegmentContainer}>
              <TouchableOpacity 
                style={[
                  styles.quickIpPill, 
                  ipInput === '192.168.4.1' && styles.quickIpPillActive
                ]}
                onPress={() => setIpInput('192.168.4.1')}
                activeOpacity={0.8}
              >
                <Text 
                  style={[
                    styles.quickIpPillText, 
                    ipInput === '192.168.4.1' && styles.quickIpPillTextActive
                  ]}
                >
                  {t('interpreter.wifiGlasses', 'Wi-Fi de lentes')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.quickIpPill, 
                  ipInput === 'cokielens.local' && styles.quickIpPillActive
                ]}
                onPress={() => setIpInput('cokielens.local')}
                activeOpacity={0.8}
              >
                <Text 
                  style={[
                    styles.quickIpPillText, 
                    ipInput === 'cokielens.local' && styles.quickIpPillTextActive
                  ]}
                >
                  {t('interpreter.mdnsLocal', 'mDNS Local')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input de IP con estilo redondeado exacto */}
            <View style={styles.ipInputContainer}>
              <TextInput
                style={styles.ipInputField}
                value={ipInput}
                onChangeText={setIpInput}
                placeholder="192.168.4.1"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Resultado de prueba de conexión si existe */}
            {testResult && (
              <View 
                style={[
                  styles.testResultBadge, 
                  testResult.success ? styles.testSuccess : styles.testFail
                ]}
              >
                {testResult.success ? (
                  <Check size={16} color="#10B981" />
                ) : (
                  <AlertCircle size={16} color="#EF4444" />
                )}
                <Text style={styles.testResultBadgeText}>{testResult.message}</Text>
              </View>
            )}

            {/* Footer de Acciones: Probar Conexión (ghost) y Guardar (gradiente azul) */}
            <View style={styles.modalFooterActions}>
              <TouchableOpacity 
                style={styles.testGhostButton}
                onPress={handleTestConnection}
                disabled={isTestingConnection}
                activeOpacity={0.7}
              >
                {isTestingConnection ? (
                  <ActivityIndicator size="small" color="#426BC2" />
                ) : (
                  <Text style={styles.testGhostButtonText}>
                    {t('interpreter.testConnectionBtn', 'Probar conexión')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.saveGradientButtonContainer}
                onPress={handleSaveIp}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#132472', '#426BC2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveGradientButton}
                >
                  <Text style={styles.saveGradientButtonText}>
                    {t('common.save', 'Guardar')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── ESTILOS ADAPTADOS (PALETA IA TRAINING + LAYOUT RESPONSIVO HORIZONTAL) ───────
const createStyles = (Colors, isDark, insets, isLargeScreen) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#141414' : '#F8FAFC',
    paddingTop: Math.max(insets.top, 16),
  },

  // Barra Superior
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  languagePillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#262626' : '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: '#8B8B90',
  },
  languagePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#F1F5F9' : '#0F172A',
  },
  segmentedCapsule: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#262626' : '#E2E8F0',
    borderRadius: 24,
    padding: 3,
    width: 190,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentPillActive: {
    backgroundColor: isDark ? '#FFFFFF' : '#0F172A',
  },
  segmentPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#64748B',
  },
  segmentPillTextActive: {
    color: isDark ? '#000000' : '#FFFFFF',
    fontWeight: '700',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#262626' : '#E2E8F0',
    borderWidth: 0.5,
    borderColor: '#8B8B90',
  },

  // Contenedor Principal (Vertical en Móvil, Horizontal en PC/Tablets)
  mainLayout: {
    flex: 1,
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  mainLayoutLarge: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    paddingBottom: Math.max(insets.bottom, 16),
  },

  // Marco de Cámara
  cameraWrapper: {
    flex: 1,
    paddingBottom: 12,
  },
  cameraWrapperLarge: {
    flex: 1.35,
    paddingBottom: 0,
    minHeight: 460,
  },
  cameraFrame: {
    flex: 1,
    backgroundColor: isDark ? '#262626' : '#E2E8F0',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0.5,
    borderColor: '#8B8B90',
  },

  // Controles dentro de la cámara activa
  floatingFlipCircle: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  floatingPauseCircle: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },

  // Estado Inactivo de Cámara
  cameraInactiveContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  inactiveIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  },
  inactiveTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#F1F5F9' : '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  inactiveSubtitle: {
    fontSize: 13,
    color: isDark ? '#94A3B8' : '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    maxWidth: 280,
  },
  activateButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#132472',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  activateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Contenedor Live Lentes
  glassesLiveContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassesWaitingBox: {
    alignItems: 'center',
    padding: 24,
  },
  glassesWaitingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },

  // Caja de Traducción (Sin sombra en móvil, borde 0.5px gris #8B8B90, horizontal en PC)
  translationCard: {
    backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: '#8B8B90',
    overflow: 'hidden',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    marginBottom: 6,
  },
  translationCardLarge: {
    flex: 1,
    marginBottom: 0,
    justifyContent: 'space-between',
    minHeight: 460,
  },
  translationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  audioIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  },
  audioIndicatorBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#64748B',
  },
  cardDivider: {
    height: 0.5,
    backgroundColor: '#8B8B90',
  },
  translationCardBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  translationCardBodyLarge: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  translationMainSentence: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#FFFFFF' : '#0F172A',
    marginBottom: 14,
    lineHeight: 28,
  },
  translationMainSentenceLarge: {
    fontSize: 26,
    lineHeight: 36,
  },
  translationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  statusIconSlot: {
    marginRight: 8,
  },
  translationStatusLabel: {
    fontSize: 12,
    color: isDark ? '#94A3B8' : '#64748B',
    fontWeight: '500',
  },

  // Trigger interactivo inferior para revelar TabBar en móvil
  bottomNavTrigger: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingBottom: Math.max(insets.bottom, 6),
  },

  // ── MODAL FULLSCREEN DE AJUSTES (COKIELENS - MOCKUP 2) ───────────────────
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: isDark ? '#141414' : '#F8FAFC',
    paddingTop: Math.max(insets.top, 20),
    paddingHorizontal: 22,
    paddingBottom: Math.max(insets.bottom, 24),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalBrandTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: isDark ? '#FFFFFF' : '#0F172A',
    marginRight: 10,
    letterSpacing: -0.5,
  },
  modalStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#262626' : '#E2E8F0',
  },

  // Fila superior de cards
  topCardsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
    height: 220,
  },
  glassesCard: {
    flex: 1,
    backgroundColor: isDark ? '#262626' : '#E2E8F0',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#8B8B90',
  },
  glassesImage: {
    width: '90%',
    height: '80%',
  },

  // Barra de sonido estilo iPhone
  soundCapsule: {
    width: 72,
    height: '100%',
    backgroundColor: isDark ? '#262626' : '#E2E8F0',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    borderWidth: 0.5,
    borderColor: '#8B8B90',
  },
  soundFillBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundIconContainer: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  soundPercentageTextInside: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 8,
  },
  soundPercentageContainerBelow: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  soundPercentageTextBelow: {
    color: isDark ? '#94A3B8' : '#64748B',
    fontWeight: 'bold',
    fontSize: 12,
  },
  audioOutputSection: {
    marginTop: 18,
    marginBottom: 16,
  },
  sectionLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#CBD5E1' : '#475569',
    marginBottom: 8,
  },
  audioOutputSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#262626' : '#E2E8F0',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: '#8B8B90',
    padding: 3,
    gap: 4,
  },
  audioOutputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 20,
  },
  audioOutputPillActive: {
    backgroundColor: '#426BC2',
  },
  audioOutputPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#64748B',
  },
  audioOutputPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Texto instructivo
  modalInstructionText: {
    fontSize: 14,
    color: isDark ? '#A0A0A5' : '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },

  // Segmentador rápido de IP
  quickIpSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#262626' : '#E2E8F0',
    borderRadius: 28,
    borderWidth: 0.5,
    borderColor: '#8B8B90',
    padding: 3,
    marginBottom: 16,
  },
  quickIpPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIpPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  quickIpPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: isDark ? '#A0A0A5' : '#64748B',
  },
  quickIpPillTextActive: {
    color: '#000000',
    fontWeight: '700',
  },

  // Input IP
  ipInputContainer: {
    marginBottom: 20,
  },
  ipInputField: {
    height: 52,
    backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF',
    borderRadius: 26,
    borderWidth: 0.5,
    borderColor: '#8B8B90',
    paddingHorizontal: 20,
    fontSize: 15,
    color: isDark ? '#FFFFFF' : '#0F172A',
  },

  // Badge de resultado
  testResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 18,
  },
  testSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  testFail: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  testResultBadgeText: {
    fontSize: 12,
    marginLeft: 8,
    color: isDark ? '#F1F5F9' : '#0F172A',
    flex: 1,
  },

  // Footer Actions
  modalFooterActions: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  testGhostButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  testGhostButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#F1F5F9' : '#0F172A',
  },
  saveGradientButtonContainer: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveGradientButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveGradientButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
