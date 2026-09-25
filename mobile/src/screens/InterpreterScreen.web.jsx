import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ActivityIndicator,
  useWindowDimensions 
} from 'react-native';
import { useRouter, Stack, useIsFocused, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Mic, 
  MicOff, 
  SwitchCamera, 
  Volume2, 
  Volume1,
  VolumeX,
  Plus,
  Minus,
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
import { useTabBar } from '../context/TabBarContext';

export default function InterpreterScreenWeb() {
  const pathname = usePathname();
  const screenFocused = useIsFocused();
  const isFocused = screenFocused && (pathname === '/interpreter' || pathname.startsWith('/interpreter'));
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const { registerModal, unregisterModal } = useTabBar();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktopOrTablet = width >= 768;
  // En móvil web, se eleva para quedar por encima de la TabBar flotante inferior
  const subtitleBottomOffset = isDesktopOrTablet 
    ? 24 
    : (Math.max(insets.bottom, 16) + 12 + 56 + 12);
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [hasPermission, setHasPermission] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [facing, setFacing] = useState('front');
  const [lastTranslation, setLastTranslation] = useState('');
  const [subtitleHistory, setSubtitleHistory] = useState([]);

  // Selectores de fuente de video y salida de audio
  const [videoSource, setVideoSource] = useState('webcam'); // 'webcam' | 'glasses'
  const [audioOutput, setAudioOutput] = useState('browser'); // 'browser' | 'glasses'
  const [esp32Ip, setEsp32Ip] = useState('192.168.4.1');
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);

  useEffect(() => {
    if (isConfigModalVisible) {
      registerModal();
      return () => unregisterModal();
    }
  }, [isConfigModalVisible, registerModal, unregisterModal]);
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
  const trackWidthRef = useRef(200);

  useEffect(() => {
    audioOutputRef.current = audioOutput;
  }, [audioOutput]);

  useEffect(() => {
    esp32IpRef.current = esp32Ip;
  }, [esp32Ip]);

  useEffect(() => {
    audioVolumeRef.current = audioVolume;
  }, [audioVolume]);

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
      const savedVol = localStorage.getItem('cokielens_volume');
      if (savedVol) {
        const parsed = Number(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          setAudioVolume(parsed);
          audioVolumeRef.current = parsed;
        }
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
    if (!isFocused && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused) return;

    const serverUrl = process.env.EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL || 'https://cokie-college.onrender.com';
    WebSocketService.connect(serverUrl);

    // ── GESTIÓN DE TRADUCCIÓN Y SALIDA DE AUDIO ──
    const handleTranslation = (text, rawData) => {
      let translatedText = text;
      // Priorizar traducción bilingüe si el servidor envía metadata
      if (rawData && typeof rawData === 'object') {
        if (i18n.language === 'en' && rawData.name_en) {
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
          // Limpiar formato técnico si es un gesto nuevo (ej: 'sign.puerta' -> 'Puerta')
          const raw = translatedText.replace('sign.', '').replace(/_/g, ' ');
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
            const utterance = new SpeechSynthesisUtterance(translatedText);
            const targetLang = i18n.language === 'en' ? 'en-US' : 'es-MX';
            utterance.lang = targetLang;
            const voices = window.speechSynthesis.getVoices();
            const matchingVoice = voices.find(v => v.lang.startsWith(i18n.language === 'en' ? 'en' : 'es'));
            if (matchingVoice) utterance.voice = matchingVoice;
            utterance.rate = 1.0;
            utterance.volume = audioVolumeRef.current / 100;
            window.speechSynthesis.speak(utterance);
            window.speechSynthesis.resume();
          } catch (e) {
            console.warn('Error en Web Speech:', e);
          }
        }
      } 
      // 2. SALIDA DE AUDIO: Lentes CokieLens (ESP32)
      else if (audioOutputRef.current === 'glasses') {
        try {
          const clean = esp32IpRef.current.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
          fetch(`http://${clean}/play`, {
            method: 'POST',
            body: translatedText,
            headers: { 
              'Content-Type': 'text/plain',
              'X-Audio-Volume': String(audioVolumeRef.current)
            }
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
  }, [isFocused, t, i18n.language]);

  // ── GESTIÓN DE WEBCAM DEL NAVEGADOR ──
  useEffect(() => {
    let currentStream = null;

    if (isFocused && isActive && videoSource === 'webcam') {
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
  }, [isFocused, isActive, facing, videoSource]);

  // ── BUCLE 1: CAPTURA DESDE WEBCAM A TRAVÉS DE CANVAS ──
  useEffect(() => {
    let intervalId;

    if (isFocused && hasPermission && isActive && videoSource === 'webcam') {
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
  }, [isFocused, hasPermission, isActive, videoSource]);

  // ── BUCLE 2: CAPTURA FLUIDA DESDE LENTES COKIELENS (ESP32-CAM) EN WEB ──
  useEffect(() => {
    let intervalId;
    let consecutiveErrors = 0;

    if (isFocused && isActive && videoSource === 'glasses') {
      const cleanIp = esp32Ip.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim() || '192.168.4.1';
      const captureUrl = `http://${cleanIp}/capture`;

      intervalId = setInterval(async () => {
        if (isCapturingRef.current) return;
        isCapturingRef.current = true;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1400);

          const res = await fetch(captureUrl, { 
            signal: controller.signal,
            cache: 'no-store' 
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            consecutiveErrors = 0;
            setGlassesConnected(true);
            const blob = await res.blob();

            // Actualizar vista previa en vivo liberando URL anterior
            if (glassesBlobUrlRef.current) {
              URL.revokeObjectURL(glassesBlobUrlRef.current);
            }
            const blobUrl = URL.createObjectURL(blob);
            glassesBlobUrlRef.current = blobUrl;
            setGlassesFrameUri(blobUrl);

            // Conversión atómica garantizada a base64
            const base64Data = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });

            if (typeof base64Data === 'string' && base64Data.length > 50) {
              const rawBase64 = base64Data.split(',')[1];
              if (rawBase64) {
                WebSocketService.sendFrame(rawBase64);
              }
            }
          } else {
            consecutiveErrors++;
            if (consecutiveErrors >= 3) {
              setGlassesConnected(false);
            }
          }
        } catch (e) {
          consecutiveErrors++;
          if (consecutiveErrors >= 3) {
            setGlassesConnected(false);
            // Fallback automático si cokielens.local falla en la red local
            if (cleanIp === 'cokielens.local') {
              console.log('[CokieLens Web] Fallback automático a 192.168.4.1');
              setEsp32Ip('192.168.4.1');
              setIpInput('192.168.4.1');
              if (typeof window !== 'undefined') {
                localStorage.setItem('cokielens_ip', '192.168.4.1');
              }
              consecutiveErrors = 0;
            }
          }
        } finally {
          isCapturingRef.current = false;
        }
      }, 180);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (glassesBlobUrlRef.current) {
        URL.revokeObjectURL(glassesBlobUrlRef.current);
        glassesBlobUrlRef.current = null;
      }
    };
  }, [isFocused, isActive, videoSource, esp32Ip]);

  function toggleCameraType() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  const handleSaveIp = () => {
    let clean = ipInput.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    if (!clean) clean = '192.168.4.1';
    setEsp32Ip(clean);
    setIpInput(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cokielens_ip', clean);
    }
    setIsConfigModalVisible(false);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);

    // Advertencia amigable si la página web corre bajo HTTPS
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    if (isHttps) {
      setIsTestingConnection(false);
      setTestResult({ 
        success: false, 
        message: 'Aviso Navegador HTTPS: Los navegadores restringen peticiones fetch hacia IPs locales no cifradas (192.168.4.1). Abre la app vía HTTP (http://localhost:8081) o usa la app Android/iOS para conectarte a los lentes.' 
      });
      return;
    }

    try {
      let clean = ipInput.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
      if (!clean) clean = '192.168.4.1';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      let res;
      try {
        res = await fetch(`http://${clean}/status`, { signal: controller.signal });
      } catch (err) {
        if (clean === 'cokielens.local') {
          clean = '192.168.4.1';
          const retryController = new AbortController();
          const retryTimeout = setTimeout(() => retryController.abort(), 3500);
          res = await fetch(`http://${clean}/status`, { signal: retryController.signal });
          clearTimeout(retryTimeout);
          setIpInput(clean);
          setEsp32Ip(clean);
          if (typeof window !== 'undefined') {
            localStorage.setItem('cokielens_ip', clean);
          }
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

  const updateVolume = (newVol) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
    setAudioVolume(clamped);
    audioVolumeRef.current = clamped;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cokielens_volume', String(clamped));
    }
    const clean = esp32IpRef.current.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    if (clean) {
      fetch(`http://${clean}/volume?level=${clamped}`, { method: 'POST' }).catch(() => {});
    }
  };

  const handleSliderTouch = (evt) => {
    const locationX = evt.nativeEvent.locationX;
    const width = trackWidthRef.current || 200;
    const ratio = Math.max(0, Math.min(1, locationX / width));
    updateVolume(ratio * 100);
  };

  const handleTestAudio = () => {
    const testText = t('interpreter.testAudioPhrase', { 
      volume: audioVolume, 
      defaultValue: `Prueba de audio CokieLens al ${audioVolume} por ciento` 
    });

    if (audioOutput === 'browser') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(testText);
          utterance.lang = i18n.language === 'en' ? 'en-US' : 'es-MX';
          utterance.volume = audioVolume / 100;
          window.speechSynthesis.speak(utterance);
          window.speechSynthesis.resume();
        } catch (e) {
          console.warn('Error en Web Speech:', e);
        }
      }
    } else {
      try {
        const clean = esp32IpRef.current.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
        fetch(`http://${clean}/play`, {
          method: 'POST',
          body: testText,
          headers: { 
            'Content-Type': 'text/plain',
            'X-Audio-Volume': String(audioVolume)
          }
        }).catch(e => console.log('Envío a lentes:', e));
      } catch (err) {
        console.warn('Error enviando audio a los lentes:', err);
      }
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
              {t('interpreter.sourceWebcamTab', 'Webcam')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.segmentBtn, videoSource === 'glasses' && styles.segmentBtnActive]}
            onPress={() => { unlockWebAudio(); selectVideoSource('glasses'); }}
          >
            <Glasses size={16} color={videoSource === 'glasses' ? '#FFF' : Colors.text.secondary} />
            <Text style={[styles.segmentTxt, videoSource === 'glasses' && styles.segmentTxtActive]}>
              {t('interpreter.sourceGlassesTab', 'Lentes')}
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
              {t('interpreter.audioSpeakerTab', 'Altavoz')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.segmentBtn, audioOutput === 'glasses' && styles.segmentBtnActive]}
            onPress={() => { unlockWebAudio(); selectAudioOutput('glasses'); }}
          >
            <Headphones size={15} color={audioOutput === 'glasses' ? '#FFF' : Colors.text.secondary} />
            <Text style={[styles.segmentTxt, audioOutput === 'glasses' && styles.segmentTxtActive]}>
              {t('interpreter.audioGlassesTab', 'Lentes')}
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
            {glassesFrameUri ? (
              <img 
                src={glassesFrameUri}
                alt="CokieLens Feed"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <View style={styles.glassesPlaceholder}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={styles.glassesPlaceholderText}>
                  {t('interpreter.connectingGlasses', { ip: esp32Ip, defaultValue: `Conectando con Lentes CokieLens en ${esp32Ip}...` })}
                </Text>
              </View>
            )}

            <View style={styles.glassesBadge}>
              <Glasses size={16} color="#38bdf8" style={{ marginRight: 6 }} />
              <Text style={styles.glassesBadgeText}>
                {glassesConnected ? 'Lentes CokieLens en Vivo' : 'Buscando Lentes...'}
              </Text>
              <View style={[styles.miniDot, { backgroundColor: glassesConnected ? '#10b981' : '#ef4444' }]} />
            </View>
          </div>
        )}

        {/* Subtítulos gigantes (elevado por encima de la TabBar) */}
        <View style={[styles.subtitleOverlay, { bottom: subtitleBottomOffset }]}>
          <View style={styles.subtitleHeader}>
            <Volume2 color="#10b981" size={18} />
            <Text style={styles.subtitleHeaderTitle}>{t('interpreter.realTimeTranslationTitle', 'TRADUCCIÓN EN TIEMPO REAL')}</Text>
          </View>

          {lastTranslation ? (
            <Text style={styles.subtitleMainText}>
              "{lastTranslation}"
            </Text>
          ) : (
            <Text style={styles.subtitlePlaceholder}>
              {t('interpreter.waitingGestures', 'Esperando señas o movimientos...')}
            </Text>
          )}

          {subtitleHistory.length > 1 && (
            <View style={styles.historyContainer}>
              <Text style={styles.historyText} numberOfLines={1}>
                {t('interpreter.previousSubtitles', { history: subtitleHistory.slice(1).join(' • '), defaultValue: `Anterior: ${subtitleHistory.slice(1).join(' • ')}` })}
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
              <Text style={styles.modalTitle}>{t('interpreter.configGlassesTitle', 'Configurar Lentes CokieLens')}</Text>
            </View>

            {typeof window !== 'undefined' && window.location.protocol === 'https:' && (
              <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#ef4444', borderRadius: 8, padding: 8, marginBottom: 12 }}>
                <Text style={{ color: '#f87171', fontSize: 11, lineHeight: 15 }}>
                  ⚠️ Navegador en HTTPS: Los navegadores restringen llamadas hacia IPs locales HTTP (192.168.4.1). Para conectar tus lentes en web, abre la app vía HTTP (http://localhost:8081) o usa la app Android/iOS.
                </Text>
              </View>
            )}

            <Text style={styles.modalHelp}>
              {t('interpreter.configGlassesInstruction', 'Ingresa la dirección IP de tu ESP32-CAM o elige una opción rápida:')}
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
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <Text style={{ fontSize: 11, color: '#FFF', fontWeight: 'bold' }}>192.168.4.1</Text>
                <Text style={{ fontSize: 9, color: '#94a3b8' }}>{t('interpreter.wifiApLabel', 'Wi-Fi de Lentes (AP)')}</Text>
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
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <Text style={{ fontSize: 11, color: '#FFF', fontWeight: 'bold' }}>cokielens.local</Text>
                <Text style={{ fontSize: 9, color: '#94a3b8' }}>{t('interpreter.mdnsLocalLabel', 'mDNS Local')}</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={ipInput}
              onChangeText={setIpInput}
              placeholder="Ej: 192.168.4.1 o 192.168.1.50"
              placeholderTextColor="#94a3b8"
            />

            {testResult && (
              <View style={[styles.testBadge, testResult.success ? styles.testSuccess : styles.testFail]}>
                {testResult.success ? <Check size={16} color="#10b981" /> : <AlertCircle size={16} color="#ef4444" />}
                <Text style={styles.testBadgeText}>{testResult.message}</Text>
              </View>
            )}

            {/* Control de Volumen (Voz / Audífono de Lentes) */}
            <View style={styles.volumeCard}>
              <View style={styles.volumeHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {audioVolume === 0 ? (
                    <VolumeX size={16} color="#ef4444" />
                  ) : (
                    <Volume1 size={16} color="#38bdf8" />
                  )}
                  <Text style={styles.volumeTitle}>{t('interpreter.volumeLabel', 'Volumen de Audífono / Voz')}</Text>
                </View>
                <View style={styles.volumeBadge}>
                  <Text style={styles.volumeBadgeText}>{audioVolume}%</Text>
                </View>
              </View>

              {/* Slider interactivo */}
              <View style={styles.sliderRow}>
                <TouchableOpacity 
                  style={styles.stepBtn}
                  onPress={() => updateVolume(audioVolume - 10)}
                  activeOpacity={0.7}
                >
                  <Minus size={14} color="#FFF" />
                </TouchableOpacity>

                <View 
                  style={[styles.trackContainer, { cursor: 'pointer' }]}
                  onLayout={(e) => {
                    trackWidthRef.current = e.nativeEvent.layout.width;
                  }}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={handleSliderTouch}
                  onResponderMove={handleSliderTouch}
                >
                  <View style={styles.trackBackground} />
                  <View style={[styles.trackFill, { width: `${audioVolume}%` }]} />
                  <View style={[styles.thumb, { left: `${Math.max(0, Math.min(94, audioVolume - 4))}%` }]} />
                </View>

                <TouchableOpacity 
                  style={styles.stepBtn}
                  onPress={() => updateVolume(audioVolume + 10)}
                  activeOpacity={0.7}
                >
                  <Plus size={14} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Presets de Volumen */}
              <View style={styles.presetRow}>
                {[0, 25, 50, 75, 100].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.presetBtn, audioVolume === val && styles.presetBtnActive]}
                    onPress={() => updateVolume(val)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetText, audioVolume === val && styles.presetTextActive]}>
                      {val === 0 ? 'Mute' : `${val}%`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Botón Probar Sonido */}
              <TouchableOpacity 
                style={styles.testAudioBtn}
                onPress={handleTestAudio}
                activeOpacity={0.8}
              >
                <Volume2 size={15} color="#38bdf8" style={{ marginRight: 6 }} />
                <Text style={styles.testAudioBtnText}>{t('interpreter.testAudioBtn', 'Probar Sonido')}</Text>
              </TouchableOpacity>
            </View>

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
                    <Text style={styles.testBtnText}>{t('interpreter.testConnectionBtn', 'Probar Conexión')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveIp}>
                <Text style={styles.saveBtnText}>{t('common.save', 'Guardar')}</Text>
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
  glassesPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
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
    bottom: 96,
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
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
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
    fontSize: 16,
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
    cursor: 'pointer',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  // Controles de volumen
  volumeCard: {
    backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.65)' : 'rgba(241, 245, 249, 0.8)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  },
  volumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  volumeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
  },
  volumeBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  volumeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme === 'dark' ? '#334155' : '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  trackContainer: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
  },
  trackBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme === 'dark' ? '#334155' : '#e2e8f0',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38bdf8',
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0284c7',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 12,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  presetBtnActive: {
    backgroundColor: '#38bdf8',
  },
  presetText: {
    fontSize: 11,
    color: theme === 'dark' ? '#94a3b8' : '#64748b',
    fontWeight: '600',
  },
  presetTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  testAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    cursor: 'pointer',
  },
  testAudioBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
});
