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
  useWindowDimensions,
  Animated,
  Easing,
  ScrollView
} from 'react-native';
import { useRouter, Stack, useIsFocused, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  Moon
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import WebSocketService from '../services/WebSocketService';
import { useTabBar } from '../context/TabBarContext';
import SkeletonOverlay from '../components/SkeletonOverlay';

export default function InterpreterScreenWeb() {
  const pathname = usePathname();
  const screenFocused = useIsFocused();
  const isFocused = screenFocused && (pathname === '/interpreter' || pathname.startsWith('/interpreter'));
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors: Colors, theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { isTabBarHidden, setIsTabBarHidden, registerModal, unregisterModal } = useTabBar();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLargeScreen = width >= 768;
  const styles = useMemo(() => createStyles(Colors, isDark, insets, isLargeScreen), [Colors, isDark, insets, isLargeScreen]);

  const [hasPermission, setHasPermission] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facing, setFacing] = useState('user'); // 'user' | 'environment'
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Estados de IA y traducción
  const [aiServerStatus, setAiServerStatus] = useState('connecting');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentSentence, setCurrentSentence] = useState('');
  const [lastTranslation, setLastTranslation] = useState('');
  const [liveLandmarks, setLiveLandmarks] = useState(null);

  // Selectores de fuente de video y salida de audio
  const [videoSource, setVideoSource] = useState('webcam'); // 'webcam' | 'glasses'
  const [audioOutput, setAudioOutput] = useState('browser'); // 'browser' | 'glasses'
  const [esp32Ip, setEsp32Ip] = useState('192.168.4.1');
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [ipInput, setIpInput] = useState('192.168.4.1');
  const [glassesConnected, setGlassesConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [glassesFrameUri, setGlassesFrameUri] = useState(null);
  const [audioVolume, setAudioVolume] = useState(80); // 0 a 100%

  const videoRef = useRef(null);
  const glassesBlobUrlRef = useRef(null);
  const canvasRef = useRef(null);
  const isCapturingRef = useRef(false);
  const lastSpokenRef = useRef('');
  const audioOutputRef = useRef(audioOutput);
  const esp32IpRef = useRef(esp32Ip);
  const audioVolumeRef = useRef(audioVolume);
  const soundCapsuleHeightRef = useRef(220);
  const analyzingTimeoutRef = useRef(null);

  // Animaciones para botón de activación
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonPressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isConfigModalVisible) {
      registerModal();
      return () => unregisterModal();
    }
  }, [isConfigModalVisible, registerModal, unregisterModal]);

  useEffect(() => {
    audioOutputRef.current = audioOutput;
  }, [audioOutput]);
  useEffect(() => {
    esp32IpRef.current = esp32Ip;
  }, [esp32Ip]);
  useEffect(() => {
    audioVolumeRef.current = audioVolume;
  }, [audioVolume]);

  // Al entrar al intérprete, ocultar la barra de navegación en móviles
  useEffect(() => {
    if (isFocused && !isLargeScreen) {
      setIsTabBarHidden(true);
      return () => {
        setIsTabBarHidden(false);
      };
    }
  }, [isFocused, isLargeScreen, setIsTabBarHidden]);

  // Animación continua del botón de activación
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

  // Cambiar idioma (Sistema de traducción i18n)
  const toggleLanguage = () => {
    const current = i18n?.language || 'es';
    const nextLang = current.startsWith('es') ? 'en' : 'es';
    i18n.changeLanguage(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', nextLang);
    }
  };

  // Cargar configuración de localStorage en Web
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedIp = localStorage.getItem('cokielens_ip');
        if (savedIp) {
          setEsp32Ip(savedIp);
          setIpInput(savedIp);
        }
        const savedAudio = localStorage.getItem('cokielens_audio_output');
        if (savedAudio) setAudioOutput(savedAudio);
        const savedSource = localStorage.getItem('cokielens_video_source');
        if (savedSource) setVideoSource(savedSource);
        const savedVol = localStorage.getItem('cokielens_volume');
        if (savedVol) {
          const parsed = Number(savedVol);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
            setAudioVolume(parsed);
            audioVolumeRef.current = parsed;
          }
        }
      } catch (e) {}
    }
  }, []);

  // Suscripción al estado de conexión de la IA
  useEffect(() => {
    if (!isFocused) return;
    const updateStatus = (status) => setAiServerStatus(status);
    WebSocketService.addStatusListener(updateStatus);
    return () => WebSocketService.removeStatusListener(updateStatus);
  }, [isFocused]);

  // WebSocket y oraciones formuladas
  useEffect(() => {
    if (!isFocused) return;

    const serverUrl = process.env.EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL || 'https://cokie-college.onrender.com';
    WebSocketService.connect(serverUrl);

    const handleSentenceEvent = (eventType, data) => {
      if (eventType === 'update') {
        setIsAnalyzing(true);
        if (data?.sentence) setCurrentSentence(data.sentence);
        if (analyzingTimeoutRef.current) clearTimeout(analyzingTimeoutRef.current);
        analyzingTimeoutRef.current = setTimeout(() => setIsAnalyzing(false), 3200);
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

    const handleTranslation = (text, rawData) => {
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
      analyzingTimeoutRef.current = setTimeout(() => setIsAnalyzing(false), 2800);
    };

    const handleLandmarks = (landmarksData) => {
      setLiveLandmarks(landmarksData);
      if (landmarksData?.detected) {
        setIsAnalyzing(true);
        if (analyzingTimeoutRef.current) clearTimeout(analyzingTimeoutRef.current);
        analyzingTimeoutRef.current = setTimeout(() => setIsAnalyzing(false), 2500);
      }
    };

    WebSocketService.addSentenceListener(handleSentenceEvent);
    WebSocketService.addListener(handleTranslation);
    WebSocketService.addLandmarksListener(handleLandmarks);

    return () => {
      WebSocketService.removeSentenceListener(handleSentenceEvent);
      WebSocketService.removeListener(handleTranslation);
      WebSocketService.removeLandmarksListener(handleLandmarks);
      WebSocketService.disconnect();
      if (analyzingTimeoutRef.current) clearTimeout(analyzingTimeoutRef.current);
    };
  }, [isFocused, t, i18n]);

  const speakSentence = (textToSpeak) => {
    if (!textToSpeak || lastSpokenRef.current === textToSpeak) return;
    lastSpokenRef.current = textToSpeak;

    if (audioOutputRef.current === 'browser' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = i18n?.language === 'en' ? 'en-US' : 'es-MX';
        utterance.volume = audioVolumeRef.current / 100;
        window.speechSynthesis.speak(utterance);
      } catch (err) {}
    } else if (audioOutputRef.current === 'glasses') {
      try {
        const clean = esp32IpRef.current.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
        fetch(`http://${clean}/play`, {
          method: 'POST',
          body: textToSpeak,
          headers: { 
            'Content-Type': 'text/plain',
            'X-Audio-Volume': String(audioVolumeRef.current)
          }
        }).catch(e => console.log('Envío a lentes:', e));
      } catch (err) {}
    }
  };

  // Inicializar o pausar Webcam
  useEffect(() => {
    let stream = null;

    if (isFocused && isCameraActive && videoSource === 'webcam') {
      const startWebcam = async () => {
        try {
          const constraints = {
            video: {
              facingMode: facing,
              width: { ideal: 640 },
              height: { ideal: 480 }
            },
            audio: false
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setHasPermission(true);
            setIsCameraReady(true);
          }
        } catch (err) {
          setHasPermission(false);
        }
      };
      startWebcam();
    } else {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraReady(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isFocused, isCameraActive, videoSource, facing]);

  // Captura periódica de fotogramas Webcam
  useEffect(() => {
    let intervalId;
    if (isFocused && isCameraActive && videoSource === 'webcam' && isCameraReady) {
      if (!canvasRef.current && typeof document !== 'undefined') {
        canvasRef.current = document.createElement('canvas');
      }

      intervalId = setInterval(() => {
        if (!videoRef.current || isCapturingRef.current) return;
        const video = videoRef.current;
        if (video.readyState < 2) return;

        isCapturingRef.current = true;
        try {
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          const commaIdx = dataUrl.indexOf(',');
          const base64 = commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl;
          if (base64) {
            WebSocketService.sendFrame(base64);
          }
        } catch (e) {
        } finally {
          isCapturingRef.current = false;
        }
      }, 120);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isFocused, isCameraActive, videoSource, isCameraReady]);

  // Captura periódica de fotogramas Lentes (ESP32)
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
          const response = await fetch(captureUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
            consecutiveErrors = 0;
            setGlassesConnected(true);
            const blob = await response.blob();
            if (glassesBlobUrlRef.current) URL.revokeObjectURL(glassesBlobUrlRef.current);
            const objectUrl = URL.createObjectURL(blob);
            glassesBlobUrlRef.current = objectUrl;
            setGlassesFrameUri(objectUrl);

            const base64Data = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });

            if (typeof base64Data === 'string') {
              const commaIdx = base64Data.indexOf(',');
              const rawBase64 = commaIdx !== -1 ? base64Data.substring(commaIdx + 1) : base64Data;
              if (rawBase64) WebSocketService.sendFrame(rawBase64);
            }
          } else {
            consecutiveErrors++;
            if (consecutiveErrors >= 3) setGlassesConnected(false);
          }
        } catch (err) {
          consecutiveErrors++;
          if (consecutiveErrors >= 3) setGlassesConnected(false);
        } finally {
          isCapturingRef.current = false;
        }
      }, 120);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (glassesBlobUrlRef.current) URL.revokeObjectURL(glassesBlobUrlRef.current);
    };
  }, [isFocused, isCameraActive, videoSource, esp32Ip]);

  const toggleCameraFacing = () => {
    setFacing(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleToggleCameraActivation = () => {
    Animated.sequence([
      Animated.timing(buttonPressScale, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.spring(buttonPressScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
    ]).start();
    setIsCameraActive(prev => !prev);
  };

  const handleSaveIp = () => {
    let clean = ipInput.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    if (!clean) clean = '192.168.4.1';
    setEsp32Ip(clean);
    setIpInput(clean);
    if (typeof window !== 'undefined') localStorage.setItem('cokielens_ip', clean);
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
      const res = await fetch(`http://${clean}/status`, { signal: controller.signal });
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
      setTestResult({ success: false, message: t('interpreter.connectionFailedCheckWifi', 'No se pudo conectar. Verifica que estés en el Wi-Fi de los lentes o que la IP sea correcta.') });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const updateVolume = (newVol) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
    setAudioVolume(clamped);
    audioVolumeRef.current = clamped;
    if (typeof window !== 'undefined') localStorage.setItem('cokielens_volume', String(clamped));
  };

  const handleIPhoneSliderTouch = (evt) => {
    const locationY = evt.nativeEvent.locationY;
    const totalHeight = soundCapsuleHeightRef.current || 220;
    const fillRatio = Math.max(0, Math.min(1, (totalHeight - locationY) / totalHeight));
    updateVolume(fillRatio * 100);
  };

  const displayedText = currentSentence || lastTranslation || '';
  const currentLangCode = (i18n?.language || 'es').startsWith('es') ? 'ES' : 'EN';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── BARRA SUPERIOR: [ IDIOMA / TRADUCIR ] | [ WEBCAM / LENTES ] | [ MODO OSCURO / CLARO ] [ AJUSTES ] ── */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.languagePillButton}
          onPress={toggleLanguage}
          activeOpacity={0.7}
          accessibilityLabel={t('interpreter.switchLanguage', 'Cambiar idioma')}
        >
          <Languages size={17} color={isDark ? '#F1F5F9' : '#0F172A'} style={{ marginRight: 5 }} />
          <Text style={styles.languagePillText}>{currentLangCode}</Text>
        </TouchableOpacity>

        <View style={styles.segmentedCapsule}>
          <TouchableOpacity 
            style={[styles.segmentPill, videoSource === 'webcam' && styles.segmentPillActive]}
            onPress={() => setVideoSource('webcam')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentPillText, videoSource === 'webcam' && styles.segmentPillTextActive]}>
              {t('interpreter.sourceWebcamTab', 'Webcam')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.segmentPill, videoSource === 'glasses' && styles.segmentPillActive]}
            onPress={() => setVideoSource('glasses')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentPillText, videoSource === 'glasses' && styles.segmentPillTextActive]}>
              {t('interpreter.sourceGlassesTab', 'Lentes')}
            </Text>
          </TouchableOpacity>
        </View>

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
        <View style={[styles.cameraWrapper, isLargeScreen && styles.cameraWrapperLarge]}>
          <View style={styles.cameraFrame}>
            {isCameraActive ? (
              videoSource === 'webcam' ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: facing === 'user' ? 'scaleX(-1)' : 'none'
                    }}
                  />
                  {/* UN SOLO CÍRCULO PARA INVERTIR CÁMARA */}
                  <TouchableOpacity 
                    onPress={toggleCameraFacing} 
                    style={styles.floatingFlipCircle}
                    activeOpacity={0.7}
                  >
                    <SwitchCamera color="#FFFFFF" size={20} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setIsCameraActive(false)} 
                    style={styles.floatingPauseCircle}
                    activeOpacity={0.7}
                  >
                    <VideoOff color="#FFFFFF" size={17} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.glassesLiveContainer}>
                  {glassesFrameUri ? (
                    <Image source={{ uri: glassesFrameUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
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
              <View style={styles.cameraInactiveContainer}>
                <View style={styles.inactiveIconCircle}>
                  <Video size={40} color={isDark ? '#426BC2' : '#132472'} />
                </View>
                <Text style={styles.inactiveTitle}>
                  {videoSource === 'webcam' 
                    ? t('interpreter.deviceCamera', 'Cámara de Dispositivo') 
                    : t('interpreter.sourceGlasses', 'Lentes CokieLens')}
                </Text>
                <Text style={styles.inactiveSubtitle}>
                  {videoSource === 'webcam' 
                    ? t('interpreter.activateCameraDesc', 'Activa la cámara para comenzar la interpretación de señas en tiempo real')
                    : t('interpreter.readySyncGlasses', { ip: esp32Ip, defaultValue: `Listo para sincronizar con ESP32-CAM en ${esp32Ip}` })}
                </Text>

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

            <SkeletonOverlay
              landmarks={liveLandmarks}
              mirrored={videoSource === 'webcam' && facing === 'user'}
              active={isCameraActive && isFocused}
            />
          </View>
        </View>

        {/* ── CAJA DE TRADUCCIÓN (HORIZONTAL EN DISPOSITIVOS GRANDES / SIN SOMBRA Y BORDE 0.5PX EN TELÉFONOS) ── */}
        <View style={[styles.translationCard, isLargeScreen && styles.translationCardLarge]}>
          <View style={styles.translationCardHeader}>
            <Text style={styles.translationHeaderStatus}>
              {isAnalyzing 
                ? t('interpreter.detectingSigns', 'Detectando señas...') 
                : t('interpreter.readyToTranslate', 'Listo para traducir')}
            </Text>
            {displayedText ? (
              <TouchableOpacity onPress={() => WebSocketService.clearSentence()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <RotateCcw size={14} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.cardDivider} />

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

            <View style={styles.translationStatusRow}>
              {isAnalyzing ? (
                <>
                  <View style={styles.statusIconSlot}>
                    <Activity size={16} color="#426BC2" />
                  </View>
                  <Text style={styles.translationStatusLabel}>
                    {t('interpreter.detectingSigns', 'Detectando señas...')}
                  </Text>
                </>
              ) : (
                <>
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

      {/* ── TRIGGER INFERIOR PARA REVELAR TABBAR EN MÓVIL ── */}
      {!isLargeScreen && (
        <TouchableOpacity 
          style={styles.bottomNavTrigger}
          onPress={() => setIsTabBarHidden(!isTabBarHidden)}
          activeOpacity={0.6}
        >
          <View style={styles.bottomNavIndicatorBar} />
        </TouchableOpacity>
      )}

      {/* ── MODAL FULLSCREEN DE AJUSTES (COKIELENS - MOCKUP 2) ── */}
      <Modal
        visible={isConfigModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsConfigModalVisible(false)}
      >
        <View style={styles.fullscreenModalContainer}>
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

          <View style={styles.topCardsRow}>
            <View style={styles.glassesCard}>
              <Image 
                source={require('../../assets/glasses.png')} 
                style={styles.glassesImage} 
                resizeMode="contain" 
              />
            </View>

            {/* Slider de sonido vertical estilo iPhone */}
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
              <View style={[styles.soundFillBar, { height: `${audioVolume}%` }]}>
                <LinearGradient
                  colors={['#426BC2', '#132472']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                {audioVolume >= 12 && (
                  <Text style={styles.soundPercentageTextInside}>{audioVolume}%</Text>
                )}
              </View>

              <View style={styles.soundIconContainer} pointerEvents="none">
                {audioVolume === 0 ? (
                  <VolumeX size={22} color={isDark ? '#94A3B8' : '#64748B'} />
                ) : (
                  <Volume2 size={22} color="#FFFFFF" />
                )}
              </View>

              {audioVolume < 12 && (
                <View style={styles.soundPercentageContainerBelow} pointerEvents="none">
                  <Text style={styles.soundPercentageTextBelow}>{audioVolume}%</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.modalInstructionText}>
            {t('interpreter.configGlassesInstruction', 'Ingresa la dirección IP de tu ESP32-CAM o elige una opción rápida')}
          </Text>

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
    maxWidth: isLargeScreen ? 1120 : '100%',
    width: '100%',
    alignSelf: 'center',
  },
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
    paddingVertical: 12,
  },
  translationHeaderStatus: {
    fontSize: 13,
    fontWeight: '500',
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
    paddingVertical: 8,
    paddingBottom: Math.max(insets.bottom, 10),
  },
  bottomNavIndicatorBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
  },

  // Modal Fullscreen CokieLens
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: isDark ? '#141414' : '#F8FAFC',
    paddingTop: Math.max(insets.top, 20),
    paddingHorizontal: 22,
    paddingBottom: Math.max(insets.bottom, 24),
    maxWidth: isLargeScreen ? 560 : '100%',
    width: '100%',
    alignSelf: 'center',
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
  modalInstructionText: {
    fontSize: 14,
    color: isDark ? '#A0A0A5' : '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
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
