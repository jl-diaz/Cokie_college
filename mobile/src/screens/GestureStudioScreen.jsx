import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  SafeAreaView
} from 'react-native';
import { Stack, useRouter, useIsFocused, usePathname } from 'expo-router';
import {
  Sparkles,
  Plus,
  Trash2,
  Video,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Glasses,
  Smartphone,
  Layers,
  Activity,
  Award,
  ChevronRight,
  BookOpen,
  Search,
  X,
  Settings,
  SwitchCamera,
  Wifi,
  Check,
  AlertCircle,
  Camera,
  Server,
  Globe,
  Laptop,
  RefreshCw
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import WebSocketService from '../services/WebSocketService';
import { useTabBar } from '../context/TabBarContext';
import {
  getAiServerUrl,
  setAiServerUrl,
  DEFAULT_AI_SERVER_URL,
  testAiServerConnection,
  subscribeAiServerUrl,
  resetAiServerUrl
} from '../services/aiServerConfig';

const { width } = Dimensions.get('window');
const TARGET_MOVEMENT_FRAMES = 15;

export default function GestureStudioScreen() {
  const pathname = usePathname();
  const screenFocused = useIsFocused();
  const isFocused = screenFocused && pathname.includes('gesture');
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const inactiveColor = isDark ? '#64748B' : '#94A3B8';
  const { registerModal, unregisterModal } = useTabBar();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [activeTab, setActiveTab] = useState('dialect'); // 'dialect' | 'recorder' | 'training'
  const [gestures, setGestures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal para nuevo gesto
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newGestureName, setNewGestureName] = useState('');
  const [newGestureNameEn, setNewGestureNameEn] = useState('');
  const [newGestureType, setNewGestureType] = useState('movement'); // 'movement' | 'static'
  const [newGestureDesc, setNewGestureDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Grabador en vivo
  const [selectedGestureId, setSelectedGestureId] = useState(null);
  const [recorderSource, setRecorderSource] = useState('phone'); // 'phone' | 'glasses'
  const [esp32Ip, setEsp32Ip] = useState('cokielens.local');
  const [recordingState, setRecordingState] = useState('idle'); // 'idle' | 'countdown' | 'recording' | 'saving'
  const [countdown, setCountdown] = useState(3);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordedFramesCount, setRecordedFramesCount] = useState(0);
  const [liveFrameUri, setLiveFrameUri] = useState(null);
  const recordedFramesRef = useRef([]);
  const isFetchingFrameRef = useRef(false);
  const recordingStateRef = useRef(recordingState);
  const recordingTimeoutRef = useRef(null);

  // Cámara de teléfono nativa y permisos
  const [permission, requestPermission] = useCameraPermissions();
  const [facingMode, setFacingMode] = useState('front');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [pictureSize, setPictureSize] = useState('640x480');
  const cameraRef = useRef(null);

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
                const area = parseInt(parts[0], 10) * parseInt(parts[1], 10);
                return area >= 70000 && area <= 350000;
              }
              return false;
            }) || sizes[sizes.length - 1];
          }
          if (chosen) setPictureSize(chosen);
        }
      }
    } catch (e) {
      console.warn('[Camera GestureStudio] Error configurando pictureSize:', e);
    }
  };

  // Búsqueda y filtrado de dialecto escolar
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'alphabet' | 'numbers' | 'school'
  const [recorderCategory, setRecorderCategory] = useState('all'); // 'all' | 'alphabet' | 'numbers' | 'school'
  const [modelStatus, setModelStatus] = useState(null);
  const [rollingBack, setRollingBack] = useState(false);

  // Modal de configuración y prueba de IP de lentes CokieLens
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);

  // Modal de configuración de Servidor de IA (Local vs Nube)
  const [isAiConfigModalVisible, setIsAiConfigModalVisible] = useState(false);
  const [serverUrl, setServerUrlState] = useState(DEFAULT_AI_SERVER_URL);
  const [serverInput, setServerInput] = useState(DEFAULT_AI_SERVER_URL);
  const [isTestingAiServer, setIsTestingAiServer] = useState(false);
  const [aiServerTestResult, setAiServerTestResult] = useState(null);
  const [aiHealthOnline, setAiHealthOnline] = useState(null);
  const [serverLatency, setServerLatency] = useState(null);

  // Referencias para cámara Web (HTML5 Video & Canvas)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isNewModalOpen || isConfigModalVisible || isAiConfigModalVisible) {
      registerModal();
      return () => unregisterModal();
    }
  }, [isNewModalOpen, isConfigModalVisible, isAiConfigModalVisible, registerModal, unregisterModal]);

  const [ipInput, setIpInput] = useState('cokielens.local');
  const [glassesConnected, setGlassesConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Consola de entrenamiento
  const [trainingStatus, setTrainingStatus] = useState('idle'); // 'idle' | 'training' | 'completed' | 'failed'
  const [trainingProgress, setTrainingProgress] = useState({ epoch: 0, total_epochs: 40, accuracy: 0, loss: 0, percent: 0 });
  const [trainingResult, setTrainingResult] = useState(null);

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  useEffect(() => {
    loadSavedSettings();

    let isMounted = true;
    getAiServerUrl().then((initialUrl) => {
      if (isMounted) {
        setServerUrlState(initialUrl);
        setServerInput(initialUrl);
        fetchGestures(initialUrl);
        fetchModelStatus(initialUrl);
        checkServerHealth(initialUrl);
        WebSocketService.connect(initialUrl);
      }
    });

    const unsub = subscribeAiServerUrl((newUrl) => {
      if (isMounted) {
        setServerUrlState(newUrl);
        setServerInput(newUrl);
        fetchGestures(newUrl);
        fetchModelStatus(newUrl);
        checkServerHealth(newUrl);
      }
    });

    const handleTrainingEvents = (event, data) => {
      if (event === 'started') {
        setTrainingStatus('training');
        setTrainingProgress({ epoch: 0, total_epochs: 40, accuracy: 0, loss: 0, percent: 0 });
      } else if (event === 'progress') {
        setTrainingStatus('training');
        setTrainingProgress(data);
      } else if (event === 'completed') {
        setTrainingStatus('completed');
        setTrainingResult(data);
        fetchGestures();
        fetchModelStatus();
      } else if (event === 'failed') {
        setTrainingStatus('failed');
        setTrainingResult(data);
      }
    };

    WebSocketService.addTrainingListener(handleTrainingEvents);

    return () => {
      isMounted = false;
      unsub();
      WebSocketService.removeTrainingListener(handleTrainingEvents);
    };
  }, []);

  const checkServerHealth = async (targetUrl) => {
    const url = targetUrl || serverUrl;
    try {
      const res = await testAiServerConnection(url);
      setAiHealthOnline(res.ok);
      if (res.ok) setServerLatency(res.latency);
    } catch (e) {
      setAiHealthOnline(false);
    }
  };

  const loadSavedSettings = async () => {
    try {
      const savedIp = await AsyncStorage.getItem('cokielens_ip');
      if (savedIp) {
        setEsp32Ip(savedIp);
        setIpInput(savedIp);
      }
      const savedSource = await AsyncStorage.getItem('cokielens_studio_source');
      if (savedSource) {
        setRecorderSource(savedSource);
      }
    } catch (e) {}
  };

  const fetchGestures = async (overrideUrl) => {
    const activeUrl = overrideUrl || serverUrl;
    setLoading(true);
    try {
      const res = await fetch(`${activeUrl}/api/gestures`);
      if (res.ok) {
        const data = await res.json();
        setGestures(data);
        // Inyectar dinámicamente cada gesto en el motor de traducción i18n
        data.forEach(g => {
          if (g.id) {
            const esName = g.name_es || g.name;
            const enName = g.name_en || g.name_es || g.name;
            i18n.addResource('es', 'signs', g.id, esName);
            i18n.addResource('en', 'signs', g.id, enName);
          }
        });
        if (data.length > 0 && !selectedGestureId) {
          setSelectedGestureId(data[0].id);
        }
      }
    } catch (err) {
      console.warn('Error cargando gestos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModelStatus = async (overrideUrl) => {
    const activeUrl = overrideUrl || serverUrl;
    try {
      const res = await fetch(`${activeUrl}/api/gestures/model-status`);
      if (res.ok) {
        const data = await res.json();
        setModelStatus(data);
      }
    } catch (e) {}
  };

  const handleRollback = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('gestureStudio.rollbackConfirmDesc', '¿Deseas restaurar la versión anterior del modelo neuronal en memoria?'))) {
        await executeRollback();
      }
    } else {
      Alert.alert(
        t('gestureStudio.rollbackConfirmTitle', 'Restaurar Versión Anterior'),
        t('gestureStudio.rollbackConfirmDesc', '¿Deseas restaurar la versión anterior del modelo neuronal en memoria?'),
        [
          { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
          { text: t('gestureStudio.rollbackAction', 'Restaurar'), style: 'destructive', onPress: () => executeRollback() }
        ]
      );
    }
  };

  const executeRollback = async () => {
    setRollingBack(true);
    try {
      const res = await fetch(`${serverUrl}/api/gestures/rollback`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        Alert.alert(t('common.success', 'Éxito'), json.message || 'Modelo restaurado correctamente.');
        await fetchModelStatus();
        await fetchGestures();
      } else {
        Alert.alert(t('common.error', 'Error'), json.error || 'No se pudo restaurar el modelo.');
      }
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), 'Error de conexión con el servidor.');
    } finally {
      setRollingBack(false);
    }
  };

  const handleCreateGesture = async () => {
    if (!newGestureName.trim()) {
      Alert.alert(t('common.error', 'Error'), t('gestureStudio.enterGestureNamePrompt', 'Por favor ingresa un nombre para el gesto.'));
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${serverUrl}/api/gestures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGestureName.trim(),
          name_en: newGestureNameEn.trim(),
          type: newGestureType,
          description: newGestureDesc.trim(),
        })
      });
      if (res.ok) {
        setIsNewModalOpen(false);
        setNewGestureName('');
        setNewGestureNameEn('');
        setNewGestureDesc('');
        fetchGestures();
      }
    } catch (e) {
      Alert.alert(t('common.error', 'Error'), t('gestureStudio.registerGestureError', 'Error al registrar el gesto.'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGesture = async (id, name) => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('gestureStudio.deleteGestureConfirm', { name, defaultValue: `¿Estás seguro de eliminar el gesto "${name}" y todas sus muestras grabadas?` }))) {
        await executeDelete(id);
      }
    } else {
      Alert.alert(
        t('gestureStudio.deleteGestureTitle', 'Eliminar Gesto'),
        t('gestureStudio.deleteGestureConfirm', { name, defaultValue: `¿Estás seguro de eliminar "${name}" y sus grabaciones?` }),
        [
          { text: t('gestureStudio.cancelBtn', 'Cancelar'), style: 'cancel' },
          { text: t('gestureStudio.deleteBtn', 'Eliminar'), style: 'destructive', onPress: () => executeDelete(id) }
        ]
      );
    }
  };

  const executeDelete = async (id) => {
    try {
      await fetch(`${serverUrl}/api/gestures/${id}`, { method: 'DELETE' });
      fetchGestures();
      if (selectedGestureId === id) {
        setSelectedGestureId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  function toggleCameraType() {
    setFacingMode(current => (current === 'front' ? 'back' : 'front'));
  }

  // ── GESTIÓN DE IP DE LENTES COKIELENS ──
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
      const clean = ipInput.replace('http://', '').replace('/', '').trim();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`http://${clean}/status`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        setTestResult({ success: true, message: t('gestureStudio.connectedToDevice', { device: json.device || 'CokieLens', heap: json.free_heap || 'OK', defaultValue: `Conectado a ${json.device || 'CokieLens'} (Heap: ${json.free_heap || 'OK'})` }) });
        setGlassesConnected(true);
      } else {
        setTestResult({ success: false, message: t('gestureStudio.invalidDeviceResponse', 'Respuesta inválida del dispositivo') });
      }
    } catch (e) {
      setTestResult({ success: false, message: t('gestureStudio.connectionFailedCheckWifi', 'No se pudo conectar. Verifica que esté en la misma red Wi-Fi.') });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // ── GESTIÓN DE SERVIDOR IA (LOCAL VS NUBE) ──
  const handleTestAiServer = async () => {
    setIsTestingAiServer(true);
    setAiServerTestResult(null);
    try {
      const res = await testAiServerConnection(serverInput);
      setAiServerTestResult(res);
      if (res.ok) {
        setAiHealthOnline(true);
        setServerLatency(res.latency);
      } else {
        setAiHealthOnline(false);
      }
    } catch (e) {
      setAiServerTestResult({ ok: false, error: e.message || 'Error desconocido' });
      setAiHealthOnline(false);
    } finally {
      setIsTestingAiServer(false);
    }
  };

  const handleSaveAiServer = async () => {
    const saved = await setAiServerUrl(serverInput);
    setServerUrlState(saved);
    setIsAiConfigModalVisible(false);
    setAiServerTestResult(null);
    await fetchGestures(saved);
    await fetchModelStatus(saved);
    await checkServerHealth(saved);
    Alert.alert(t('common.success', 'Éxito'), `Servidor de IA configurado en: ${saved}`);
  };

  const handleResetAiServer = async () => {
    const def = await resetAiServerUrl();
    setServerUrlState(def);
    setServerInput(def);
    setAiServerTestResult(null);
    await fetchGestures(def);
    await fetchModelStatus(def);
    await checkServerHealth(def);
  };

  // ── INICIALIZACIÓN DE WEBCAM EN PLATAFORMA WEB ──
  useEffect(() => {
    let stream = null;
    if (Platform.OS === 'web' && isFocused && activeTab === 'recorder' && recorderSource === 'phone') {
      const startWebcam = async () => {
        try {
          const constraints = {
            video: {
              facingMode: facingMode === 'front' ? 'user' : 'environment',
              width: { ideal: 640 },
              height: { ideal: 480 }
            },
            audio: false
          };
          if (navigator?.mediaDevices?.getUserMedia) {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
              setIsCameraReady(true);
            }
          }
        } catch (err) {
          console.warn('[Webcam GestureStudio] Error:', err);
        }
      };
      startWebcam();
    } else if (Platform.OS === 'web') {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraReady(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isFocused, activeTab, recorderSource, facingMode]);

  // ── FUNCIÓN UNIVERSAL PARA EXTRAER UN FOTOGRAMA BASE64 (WEB, NATIVE, COKIELENS) ──
  const getFrameBase64 = async () => {
    if (recorderSource === 'glasses') {
      if (!liveFrameUri) return null;
      const comma = liveFrameUri.indexOf(',');
      return comma >= 0 ? liveFrameUri.substring(comma + 1) : liveFrameUri;
    }

    if (Platform.OS === 'web') {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return null;
      if (!canvasRef.current && typeof document !== 'undefined') {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const w = 480;
      const h = Math.round(((video.videoHeight || 480) / (video.videoWidth || 640)) * w) || 360;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (facingMode === 'front') {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(video, 0, 0, w, h);
      }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.45);
      const comma = dataUrl.indexOf(',');
      return comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
    }

    // Native CameraView (Expo / APK)
    if (!cameraRef.current) return null;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.18,
        shutterSound: false,
        exif: false,
      });
      return photo?.base64 || null;
    } catch (e) {
      if (!e?.message?.includes('unmounted')) {
        console.warn('[Camera GestureStudio] Warning capturando frame:', e?.message || e);
      }
      return null;
    }
  };

  // ── CAPTURA FOTOGRÁFICA PARA SEÑAS ESTÁTICAS ─────────────────────────────
  const handleCaptureStaticPhoto = async () => {
    if (!selectedGestureId) {
      Alert.alert(
        t('gestureStudio.selectionRequiredTitle', 'Selección requerida'),
        t('gestureStudio.selectionRequiredDesc', 'Selecciona un gesto primero en la barra superior.')
      );
      return;
    }

    if (Platform.OS !== 'web' && recorderSource === 'phone' && !permission?.granted) {
      const res = await requestPermission();
      if (!res?.granted) return;
    }

    setRecordingState('saving');

    try {
      const imageBase64 = await getFrameBase64();
      if (!imageBase64) {
        Alert.alert(
          t('gestureStudio.captureErrorTitle', 'Error'),
          t('gestureStudio.captureErrorDesc', 'No se pudo capturar la foto de la cámara. Verifica que la cámara esté activa.')
        );
        setRecordingState('idle');
        return;
      }

      // Enviar directamente el fotograma al endpoint de guardado en el servidor con metadatos
      const saveRes = await fetch(`${serverUrl}/api/gestures/record-sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gesture_id: selectedGestureId,
          frames: [imageBase64],
          platform: Platform.OS,
          facing: facingMode,
          source: recorderSource,
        })
      });

      const resJson = await saveRes.json().catch(() => ({}));

      if (saveRes.ok) {
        await fetchGestures();
        Alert.alert(
          t('gestureStudio.photoSavedTitle', '¡Foto Guardada!'),
          `Muestra registrada correctamente para "${selectedGesture?.name_es || selectedGesture?.name}". Total: ${resJson.sample_count || 1} muestras.`
        );
      } else {
        Alert.alert(
          t('gestureStudio.captureErrorTitle', 'Error al Guardar'),
          resJson.detail || resJson.error || t('gestureStudio.saveSampleErrorDesc', 'No se pudo guardar la muestra en el servidor.')
        );
      }
    } catch (err) {
      console.warn('Error capturando foto:', err);
      Alert.alert(
        t('gestureStudio.captureErrorTitle', 'Error de Conexión'),
        `No se pudo comunicar con el servidor en ${serverUrl}. Revisa la configuración del servidor de IA.`
      );
    } finally {
      setRecordingState('idle');
    }
  };

  // ── BUCLE DE CAPTURA RÁPIDA EN MEMORIA DURANTE GRABACIÓN DE MOVIMIENTO ──
  useEffect(() => {
    let isRunning = true;

    if (activeTab === 'recorder' && recordingState === 'recording') {
      const captureLoop = async () => {
        while (isRunning && recordingStateRef.current === 'recording') {
          if (isFetchingFrameRef.current) {
            await new Promise(r => setTimeout(r, 25));
            continue;
          }

          if (recordedFramesRef.current.length >= TARGET_MOVEMENT_FRAMES) {
            break;
          }

          isFetchingFrameRef.current = true;
          try {
            const b64 = await getFrameBase64();
            if (b64 && isRunning && recordingStateRef.current === 'recording') {
              recordedFramesRef.current.push(b64);
              const count = recordedFramesRef.current.length;
              setRecordedFramesCount(count);
              setRecordingProgress(
                Math.min(100, Math.round((count / TARGET_MOVEMENT_FRAMES) * 100))
              );
            }
          } catch (e) {
            // Ignorar
          } finally {
            isFetchingFrameRef.current = false;
          }

          if (recordedFramesRef.current.length >= TARGET_MOVEMENT_FRAMES) {
            break;
          }

          // Intervalo entre fotogramas (~8-10 FPS)
          await new Promise(r => setTimeout(r, Platform.OS === 'web' ? 100 : 110));
        }

        if (isRunning && recordingStateRef.current === 'recording') {
          if (recordingTimeoutRef.current) {
            clearTimeout(recordingTimeoutRef.current);
            recordingTimeoutRef.current = null;
          }
          await saveRecordedSequence();
        }
      };

      captureLoop();
    }

    return () => {
      isRunning = false;
    };
  }, [activeTab, recordingState, recorderSource]);

  // ── PREVISUALIZACIÓN DESDE LENTES (ESP32-CAM) ─────────────────────────────
  useEffect(() => {
    let intervalId;
    if (activeTab === 'recorder' && recorderSource === 'glasses') {
      const cleanIp = esp32Ip.replace('http://', '').replace('/', '');
      const captureUrl = `http://${cleanIp}/capture`;

      intervalId = setInterval(async () => {
        if (isFetchingFrameRef.current) return;
        isFetchingFrameRef.current = true;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const res = await fetch(captureUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            setGlassesConnected(true);
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              setLiveFrameUri(reader.result);
            };
            reader.readAsDataURL(blob);
          } else {
            setGlassesConnected(false);
          }
        } catch (e) {
          setGlassesConnected(false);
        } finally {
          isFetchingFrameRef.current = false;
        }
      }, 120);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab, recorderSource, esp32Ip]);

  // ── INICIAR GRABACIÓN GUIADA CON CUENTA REGRESIVA (MOVIMIENTO) ────────────────
  const startGuidedRecording = async () => {
    if (!selectedGestureId) {
      Alert.alert(
        t('gestureStudio.selectionRequiredTitle', 'Selección requerida'),
        t('gestureStudio.selectionRequiredDesc', 'Selecciona un gesto primero en la barra superior.')
      );
      return;
    }

    if (recorderSource === 'phone' && Platform.OS !== 'web' && !permission?.granted) {
      const res = await requestPermission();
      if (!res?.granted) return;
    }

    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    setRecordingState('countdown');
    setCountdown(3);
    recordedFramesRef.current = [];
    setRecordedFramesCount(0);
    setRecordingProgress(0);

    let currentCount = 3;
    const countTimer = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdown(currentCount);
      } else {
        clearInterval(countTimer);
        // ¡Empezar a grabar!
        setRecordingState('recording');

        // Watchdog de seguridad adaptativo (9.5s para capturar 15 cuadros holgadamente)
        recordingTimeoutRef.current = setTimeout(async () => {
          if (recordingStateRef.current === 'recording') {
            await saveRecordedSequence();
          }
        }, 9500);
      }
    }, 1000);
  };

  const saveRecordedSequence = async () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    if (recordingStateRef.current === 'saving' || recordingStateRef.current === 'idle') return;
    setRecordingState('saving');
    try {
      const frames = [...recordedFramesRef.current];
      if (frames.length < 3) {
        Alert.alert(
          t('gestureStudio.insufficientSamplesTitle', 'Muestras insuficientes'),
          'No se detectaron suficientes movimientos de manos en la cámara (mínimo 3 cuadros). Asegúrate de colocarte frente a la cámara mostrando torso y manos con buena luz e intenta nuevamente.'
        );
        setRecordingState('idle');
        return;
      }

      // Enviar lote de fotogramas al endpoint con metadatos de plataforma
      const res = await fetch(`${serverUrl}/api/gestures/record-sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gesture_id: selectedGestureId,
          frames: frames,
          platform: Platform.OS,
          facing: facingMode,
          source: recorderSource,
        })
      });

      const resJson = await res.json().catch(() => ({}));

      if (res.ok) {
        await fetchGestures();
        Alert.alert(
          t('gestureStudio.sampleSavedTitle', '¡Muestra Guardada!'),
          `Se registraron ${resJson.frames_recorded || frames.length} fotogramas de movimiento para "${selectedGesture?.name_es || selectedGesture?.name}". Total: ${resJson.sample_count || 1} muestras.`
        );
      } else {
        Alert.alert(
          t('gestureStudio.captureErrorTitle', 'Error'),
          resJson.detail || resJson.error || t('gestureStudio.saveSampleErrorDesc', 'Error al guardar la muestra en el servidor.')
        );
      }
    } catch (e) {
      Alert.alert(
        t('gestureStudio.captureErrorTitle', 'Error de Conexión'),
        `Error comunicando con el servidor en ${serverUrl}. Revisa la configuración del servidor de IA.`
      );
    } finally {
      setRecordingState('idle');
      recordedFramesRef.current = [];
      setRecordedFramesCount(0);
      setRecordingProgress(0);
    }
  };

  const handleStartTraining = async () => {
    setTrainingStatus('training');
    setTrainingProgress({ epoch: 0, total_epochs: 40, accuracy: 0, loss: 0, percent: 0 });
    setTrainingResult(null);

    try {
      const res = await fetch(`${serverUrl}/api/gestures/train`, { method: 'POST' });
      if (!res.ok) {
        setTrainingStatus('failed');
      }
    } catch (e) {
      setTrainingStatus('failed');
    }
  };

  const selectedGesture = gestures.find(g => g.id === selectedGestureId);
  const eligibleGestures = gestures.filter(g => (g.sample_count || 0) >= 2);

  // Filtrado reactivo para búsqueda y categoría en dialecto escolar
  const filteredGestures = gestures.filter(item => {
    if (categoryFilter !== 'all') {
      const cat = item.category || 'school';
      if (cat !== categoryFilter) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchName = (item.name && item.name.toLowerCase().includes(q)) || false;
    const matchNameEs = (item.name_es && item.name_es.toLowerCase().includes(q)) || false;
    const matchNameEn = (item.name_en && item.name_en.toLowerCase().includes(q)) || false;
    const matchDesc = (item.description && item.description.toLowerCase().includes(q)) || false;
    const matchType = (item.type && item.type.toLowerCase().includes(q)) || false;
    return matchName || matchNameEs || matchNameEn || matchDesc || matchType;
  });

  const recorderGestures = gestures.filter(g => {
    if (recorderCategory === 'all') return true;
    const cat = g.category || 'school';
    return cat === recorderCategory;
  });

  return (
    <View style={styles.container}>
      {/* ── BARRA SUPERIOR: ESTADO Y SELECCIÓN DE SERVIDOR IA ── */}
      <View style={styles.serverStatusTopBar}>
        <TouchableOpacity
          style={styles.serverStatusPill}
          onPress={() => {
            setServerInput(serverUrl);
            setAiServerTestResult(null);
            setIsAiConfigModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Server size={14} color={serverUrl.includes('localhost') || serverUrl.includes('192.168') || serverUrl.includes('127.0.0.1') ? '#38BDF8' : '#818CF8'} />
          <Text style={styles.serverStatusPillText} numberOfLines={1}>
            {serverUrl.includes('localhost') || serverUrl.includes('192.168') || serverUrl.includes('127.0.0.1')
              ? 'Local: ' + serverUrl.replace(/^https?:\/\//, '')
              : 'Nube: Render'}
          </Text>
          <View
            style={[
              styles.serverStatusDot,
              { backgroundColor: aiHealthOnline === true ? '#10B981' : (aiHealthOnline === false ? '#EF4444' : '#F59E0B') }
            ]}
          />
          {serverLatency != null && aiHealthOnline && (
            <Text style={styles.serverLatencyText}>{serverLatency}ms</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.refreshServerBtn}
          onPress={() => {
            fetchGestures();
            fetchModelStatus();
            checkServerHealth();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <RefreshCw size={13} color={isDark ? '#94A3B8' : '#64748B'} />
        </TouchableOpacity>
      </View>

      {/* ── BARRA DE PESTAÑAS ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'dialect' && styles.tabItemActive]}
          onPress={() => setActiveTab('dialect')}
        >
          <Text style={[styles.tabText, activeTab === 'dialect' && styles.tabTextActive]}>
            {t('gestureStudio.tabDialect', 'Dialecto Escolar')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'recorder' && styles.tabItemActive]}
          onPress={() => setActiveTab('recorder')}
        >
          <Text style={[styles.tabText, activeTab === 'recorder' && styles.tabTextActive]}>
            {t('gestureStudio.tabRecorder', 'Grabador en Vivo')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'training' && styles.tabItemActive]}
          onPress={() => setActiveTab('training')}
        >
          <Text style={[styles.tabText, activeTab === 'training' && styles.tabTextActive]}>
            {t('gestureStudio.tabTraining', 'Entrenamiento IA')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── PESTAÑA 1: CATÁLOGO DE DIALECTO ── */}
      {activeTab === 'dialect' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.topStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumOther}>{gestures.length}</Text>
              <Text style={styles.statLabel}>{t('gestureStudio.gesturesInDialect', 'Gestos en dialecto')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumOther}>
                {gestures.reduce((acc, curr) => acc + (curr.sample_count || 0), 0)}
              </Text>
              <Text style={styles.statLabel}>{t('gestureStudio.recordedSamples', 'Muestras grabadas')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumAi}>
                {eligibleGestures.length}
              </Text>
              <Text style={styles.statLabel}>{t('gestureStudio.readyForAi', 'Listos para IA')}</Text>
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('gestureStudio.gesturesAndMovements', 'Señas y movimientos corporales')}</Text>
            <TouchableOpacity 
              style={styles.newGestureBtnWrapper}
              onPress={() => setIsNewModalOpen(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#132472', '#426BC2']}
                locations={[0.23, 0.69]}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={styles.newGestureBtn}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Barra de Búsqueda */}
          <View style={styles.searchBarContainer}>
            <Search size={18} color={theme === 'dark' ? '#64748B' : '#94A3B8'} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchBarInput}
              placeholder={t('gestureStudio.searchPlaceholder', 'Buscar seña...')}
              placeholderTextColor={theme === 'dark' ? '#64748B' : '#94A3B8'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <X size={18} color={theme === 'dark' ? '#64748B' : '#94A3B8'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtros de Categoría */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChipsScroll} contentContainerStyle={{ paddingBottom: 12 }}>
            <TouchableOpacity
              style={[styles.categoryChip, categoryFilter === 'all' && styles.categoryChipActive]}
              onPress={() => setCategoryFilter('all')}
            >
              <Text style={[styles.categoryChipText, categoryFilter === 'all' && styles.categoryChipTextActive]}>
                {t('gestureStudio.catAll', 'Todos')} ({gestures.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.categoryChip, categoryFilter === 'alphabet' && styles.categoryChipActive]}
              onPress={() => setCategoryFilter('alphabet')}
            >
              <Text style={[styles.categoryChipText, categoryFilter === 'alphabet' && styles.categoryChipTextActive]}>
                {t('gestureStudio.catAlphabet', 'Abecedario A-Z')} ({gestures.filter(g => g.category === 'alphabet').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.categoryChip, categoryFilter === 'numbers' && styles.categoryChipActive]}
              onPress={() => setCategoryFilter('numbers')}
            >
              <Text style={[styles.categoryChipText, categoryFilter === 'numbers' && styles.categoryChipTextActive]}>
                {t('gestureStudio.catNumbers', 'Números 0-10')} ({gestures.filter(g => g.category === 'numbers').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.categoryChip, categoryFilter === 'school' && styles.categoryChipActive]}
              onPress={() => setCategoryFilter('school')}
            >
              <Text style={[styles.categoryChipText, categoryFilter === 'school' && styles.categoryChipTextActive]}>
                {t('gestureStudio.catSchool', 'Señas Escolares')} ({gestures.filter(g => g.category === 'school' || !g.category).length})
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {loading ? (
            <ActivityIndicator size="large" color="#426BC2" style={{ marginTop: 40 }} />
          ) : filteredGestures.length === 0 ? (
            <View style={styles.emptySearchContainer}>
              <Search size={32} color="#64748B" style={{ marginBottom: 8 }} />
              <Text style={styles.emptySearchText}>
                {searchQuery ? `No se encontraron señas para "${searchQuery}"` : t('gestureStudio.noGesturesFound', 'No se encontraron gestos.')}
              </Text>
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <Text style={styles.clearSearchBtnText}>{t('gestureStudio.clearSearch', 'Limpiar búsqueda')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            filteredGestures.map((item) => (
              <View key={item.id} style={styles.gestureCard}>
                <View style={styles.gestureHeader}>
                  <View style={styles.titleInfo}>
                    <Text style={styles.gestureCardTitle}>
                      Seña: {item.name_es || item.name}
                    </Text>
                    {item.name_en ? (
                      <Text style={styles.gestureCardSubtitleEn}>
                        EN: {item.name_en}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.tagsRow}>
                  <View style={[styles.badge, item.type === 'movement' ? styles.badgeMovement : styles.badgeStatic]}>
                    <Text style={[styles.badgeText, item.type === 'movement' ? styles.badgeMovementText : styles.badgeStaticText]}>
                      {item.type === 'movement' ? t('gestureStudio.dynamicMovementMode', 'Modo movimiento dinámico') : t('gestureStudio.staticGestureMode', 'Seña estática')}
                    </Text>
                  </View>
                  <View style={styles.sampleBadge}>
                    <Text style={styles.sampleBadgeText}>
                      {item.sample_count || 0} {t('gestureStudio.samples', 'muestras')}
                    </Text>
                  </View>
                </View>

                {item.description ? (
                  <Text style={styles.gestureDesc}>{item.description}</Text>
                ) : null}

                <View style={styles.cardDivider} />

                <View style={styles.gestureCardFooter}>
                  {/* Botón eliminar colocado abajo a la izquierda con separación preventiva */}
                  <TouchableOpacity
                    onPress={() => handleDeleteGesture(item.id, item.name_es || item.name)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>

                  {/* Botón Grabar / Foto con borde gradiente y slot para icono */}
                  <TouchableOpacity
                    style={styles.recordActionBtnWrapper}
                    onPress={() => {
                      setSelectedGestureId(item.id);
                      setActiveTab('recorder');
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#426BC2', '#132472']}
                      locations={[0.23, 0.69]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.gradientBorderBtn}
                    >
                      <View style={styles.gradientBorderBtnInner}>
                        {item.type === 'static' ? (
                          <>
                            <Camera size={14} color={theme === 'dark' ? '#F1F5F9' : '#0F172A'} style={styles.recordBtnIcon} />
                            <Text style={styles.recordBtnText}>
                              Foto
                            </Text>
                          </>
                        ) : (
                          <>
                            <Video size={14} color={theme === 'dark' ? '#F1F5F9' : '#0F172A'} style={styles.recordBtnIcon} />
                            <Text style={styles.recordBtnText}>
                              Grabar
                            </Text>
                          </>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── PESTAÑA 2: GRABADOR GUIADO EN VIVO ── */}
      {activeTab === 'recorder' && (
        <View style={styles.recorderContainer}>
          {/* Barra de Selección de Entrada de Video (Teléfono o Lentes) */}
          <View style={styles.recorderSourceBar}>
            <View style={styles.sourceSegmentedControl}>
              <TouchableOpacity
                style={[styles.sourceSegmentBtn, recorderSource === 'phone' && styles.sourceSegmentBtnActive]}
                onPress={async () => {
                  setRecorderSource('phone');
                  await AsyncStorage.setItem('cokielens_studio_source', 'phone');
                  if (!permission?.granted) {
                    await requestPermission();
                  }
                }}
              >
                <Smartphone size={15} color={recorderSource === 'phone' ? '#FFF' : (isDark ? '#94A3B8' : '#1E293B')} />
                <Text style={[styles.sourceSegmentTxt, recorderSource === 'phone' && styles.sourceSegmentTxtActive]}>
                  {t('interpreter.sourcePhoneTab', 'Teléfono')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sourceSegmentBtn, recorderSource === 'glasses' && styles.sourceSegmentBtnActive]}
                onPress={async () => {
                  setRecorderSource('glasses');
                  await AsyncStorage.setItem('cokielens_studio_source', 'glasses');
                }}
              >
                <Glasses size={15} color={recorderSource === 'glasses' ? '#FFF' : (isDark ? '#94A3B8' : '#1E293B')} />
                <Text style={[styles.sourceSegmentTxt, recorderSource === 'glasses' && styles.sourceSegmentTxtActive]}>
                  {t('interpreter.sourceGlassesTab', 'Lentes')}
                </Text>
              </TouchableOpacity>
            </View>

            {recorderSource === 'glasses' && (
              <TouchableOpacity
                style={styles.glassesSettingsBtn}
                onPress={() => setIsConfigModalVisible(true)}
              >
                <Settings size={16} color="#FFF" />
                <View style={[styles.statusMiniDot, { backgroundColor: glassesConnected ? '#10b981' : '#ef4444' }]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Barra de selección de gesto a grabar */}
          <View style={styles.gestureSelectorBar}>
            <View style={styles.recorderCatBar}>
              <Text style={styles.selectorLabel}>{t('gestureStudio.recordingFor', 'Grabando para:')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recorderCatPillsRow}
                style={{ flexGrow: 0 }}
              >
                <TouchableOpacity
                  style={[styles.recorderCatPill, recorderCategory === 'all' && styles.recorderCatPillActive]}
                  onPress={() => setRecorderCategory('all')}
                >
                  <Text style={[styles.recorderCatPillText, recorderCategory === 'all' && styles.recorderCatPillTextActive]}>
                    {t('gestureStudio.catAll', 'Todos')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.recorderCatPill, recorderCategory === 'alphabet' && styles.recorderCatPillActive]}
                  onPress={() => setRecorderCategory('alphabet')}
                >
                  <Text style={[styles.recorderCatPillText, recorderCategory === 'alphabet' && styles.recorderCatPillTextActive]}>
                    {t('gestureStudio.catAlphabet', 'Abecedario')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.recorderCatPill, recorderCategory === 'numbers' && styles.recorderCatPillActive]}
                  onPress={() => setRecorderCategory('numbers')}
                >
                  <Text style={[styles.recorderCatPillText, recorderCategory === 'numbers' && styles.recorderCatPillTextActive]}>
                    {t('gestureStudio.catNumbers', 'Números')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.recorderCatPill, recorderCategory === 'school' && styles.recorderCatPillActive]}
                  onPress={() => setRecorderCategory('school')}
                >
                  <Text style={[styles.recorderCatPillText, recorderCategory === 'school' && styles.recorderCatPillTextActive]}>
                    {t('gestureStudio.catSchool', 'Escolares')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              {recorderGestures.map((g) => {
                const isItemStatic = g.type === 'static';
                const isSelected = selectedGestureId === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      styles.selectorPill,
                      isSelected && (isItemStatic ? styles.selectorPillActiveStatic : styles.selectorPillActive)
                    ]}
                    onPress={() => setSelectedGestureId(g.id)}
                  >
                    {isItemStatic ? (
                      <Camera size={13} color={isSelected ? '#FFF' : (isDark ? '#94A3B8' : '#1E293B')} style={{ marginRight: 5 }} />
                    ) : (
                      <Video size={13} color={isSelected ? '#FFF' : (isDark ? '#94A3B8' : '#1E293B')} style={{ marginRight: 5 }} />
                    )}
                    <Text style={[
                      styles.selectorPillText,
                      isSelected && styles.selectorPillTextActive
                    ]}>
                      {g.name_es || g.name} ({g.sample_count || 0})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Banner indicador del modo (Estática vs Dinámica) */}
          {selectedGesture && (
            <View style={styles.gestureModeBanner}>
              {selectedGesture.type === 'static' ? (
                <>
                  <Camera size={14} color={isDark ? '#94A3B8' : '#1E293B'} />
                  <Text style={styles.gestureModeTextStatic}>
                    {t('gestureStudio.staticGestureMode', 'Seña Estática')}: {selectedGesture.name_es || selectedGesture.name}
                  </Text>
                </>
              ) : (
                <>
                  <Video size={14} color={isDark ? '#94A3B8' : '#1E293B'} />
                  <Text style={styles.gestureModeTextMovement}>
                    {t('gestureStudio.dynamicMovementMode', 'Modo movimiento dinámico')}: {selectedGesture.name_es || selectedGesture.name}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Visor de video en vivo (Teléfono o Lentes) */}
          <View style={styles.videoPreviewBox}>
            {recorderSource === 'phone' ? (
              (!permission?.granted && Platform.OS !== 'web') ? (
                <View style={styles.noSignalBox}>
                  <Smartphone size={40} color="#64748b" style={{ marginBottom: 12 }} />
                  <Text style={styles.noSignalText}>{t('gestureStudio.cameraPermissionRequired', 'Se requiere acceso a la cámara del teléfono para capturar señas.')}</Text>
                  <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={styles.permissionBtnText}>{t('gestureStudio.grantPermissionBtn', 'Conceder Permiso')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                isFocused ? (
                  Platform.OS === 'web' ? (
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
                          transform: facingMode === 'front' ? 'scaleX(-1)' : 'none'
                        }}
                      />
                      <TouchableOpacity onPress={toggleCameraType} style={styles.floatingRotateButton}>
                        <SwitchCamera color="#fff" size={22} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <CameraView
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill}
                        facing={facingMode}
                        onCameraReady={handleCameraReady}
                        pictureSize={pictureSize}
                        animateShutter={false}
                      />
                      <TouchableOpacity onPress={toggleCameraType} style={styles.floatingRotateButton}>
                        <SwitchCamera color="#fff" size={22} />
                      </TouchableOpacity>
                    </>
                  )
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
                )
              )
            ) : (
              liveFrameUri ? (
                <Image source={{ uri: liveFrameUri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
              ) : (
                <View style={styles.noSignalBox}>
                  <Glasses size={40} color="#64748b" style={{ marginBottom: 12 }} />
                  <Text style={styles.noSignalText}>{t('gestureStudio.connectingGlassesStream', { ip: esp32Ip, defaultValue: `Conectando con cámara de los lentes en ${esp32Ip}...` })}</Text>
                  <TouchableOpacity 
                    style={styles.retrySettingsBtn}
                    onPress={() => setIsConfigModalVisible(true)}
                  >
                    <Settings size={14} color="#38bdf8" style={{ marginRight: 6 }} />
                    <Text style={styles.retrySettingsBtnText}>{t('gestureStudio.configureIpBtn', 'Configurar IP')}</Text>
                  </TouchableOpacity>
                </View>
              )
            )}

            {/* Banner flotante de instrucción en la cámara */}
            {selectedGesture?.type === 'static' && recordingState === 'idle' && (
              <View style={styles.staticModeBanner}>
                <Camera size={14} color="#10b981" style={{ marginRight: 6 }} />
                <Text style={styles.staticModeBannerText}>
                  {t('gestureStudio.staticInstructions', 'Mantén la seña fija frente a la cámara y presiona "Tomar Foto"')}
                </Text>
              </View>
            )}

            {/* Overlay de Cuenta Regresiva (Solo para Movimiento) */}
            {recordingState === 'countdown' && (
              <View style={styles.countdownOverlay}>
                <Text style={styles.countdownNumber}>{countdown}</Text>
                <Text style={styles.countdownPrompt}>{t('gestureStudio.prepareMovement', '¡Prepárate para realizar el movimiento!')}</Text>
              </View>
            )}

            {/* Overlay de Grabación Activa (Solo para Movimiento) */}
            {recordingState === 'recording' && (
              <View style={styles.recordingOverlay}>
                <View style={styles.recordingHeader}>
                  <View style={styles.redRecordingDot} />
                  <Text style={styles.recordingTitle}>{t('gestureStudio.recordingMovementFrames', { count: TARGET_MOVEMENT_FRAMES, defaultValue: `GRABANDO MOVIMIENTO (${TARGET_MOVEMENT_FRAMES} CUADROS)` })}</Text>
                </View>
                <Text style={styles.recordingSubtitle}>{t('gestureStudio.makeMovementNow', '¡Haz el movimiento con brazos y manos ahora!')}</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${recordingProgress}%` }]} />
                </View>
                <Text style={styles.progressCounter}>{t('gestureStudio.framesCount', { count: recordedFramesCount, target: TARGET_MOVEMENT_FRAMES, defaultValue: `${recordedFramesCount} / ${TARGET_MOVEMENT_FRAMES} fotogramas` })}</Text>
              </View>
            )}

            {/* Overlay de Procesamiento / Guardado */}
            {recordingState === 'saving' && (
              <View style={styles.countdownOverlay}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={styles.countdownPrompt}>
                  {selectedGesture?.type === 'static' ? t('gestureStudio.processingPhoto', 'Procesando mano y guardando foto...') : t('gestureStudio.processingSample', 'Procesando y guardando muestra...')}
                </Text>
              </View>
            )}
          </View>

          {/* Controles inferiores del grabador */}
          <View style={styles.recorderControls}>
            {selectedGesture?.type === 'static' ? (
              <TouchableOpacity
                style={[
                  styles.gradientActionBtnWrapper,
                  recordingState !== 'idle' && styles.recordActionButtonDisabled
                ]}
                onPress={handleCaptureStaticPhoto}
                disabled={recordingState !== 'idle'}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#132472', '#426BC2']}
                  start={{ x: 0.23, y: 0 }}
                  end={{ x: 0.69, y: 1 }}
                  style={styles.gradientActionBtn}
                >
                  <Camera size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.recordButtonText}>
                    {recordingState === 'saving' ? t('gestureStudio.processingPhotoBtn', 'Procesando Foto...') : t('gestureStudio.takingPhoto', 'Tomar Foto de la Seña')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.gradientActionBtnWrapper,
                  recordingState !== 'idle' && styles.recordActionButtonDisabled
                ]}
                onPress={startGuidedRecording}
                disabled={recordingState !== 'idle'}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#132472', '#426BC2']}
                  start={{ x: 0.23, y: 0 }}
                  end={{ x: 0.69, y: 1 }}
                  style={styles.gradientActionBtn}
                >
                  <View style={styles.recordInnerCircle} />
                  <Text style={styles.recordButtonText}>
                    {recordingState === 'idle' ? t('gestureStudio.startRecordingMovement', { count: TARGET_MOVEMENT_FRAMES, defaultValue: `Iniciar Grabación (${TARGET_MOVEMENT_FRAMES} cuadros)` }) : t('gestureStudio.recording', 'Grabando...')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <Text style={styles.recorderHint}>
              {selectedGesture?.type === 'static'
                ? t('gestureStudio.staticHint', 'Coloca tu mano fija frente a la cámara mostrando la seña y presiona Tomar Foto.')
                : recorderSource === 'phone'
                  ? t('gestureStudio.phoneMovementHint', 'Colócate frente a la cámara del teléfono mostrando torso, brazos y manos.')
                  : t('gestureStudio.glassesMovementHint', 'Colócate frente a la cámara de los lentes mostrando torso, brazos y manos.')}
            </Text>
          </View>
        </View>
      )}

      {/* ── PESTAÑA 3: CONSOLA DE ENTRENAMIENTO IA ── */}
      {activeTab === 'training' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.trainingHeroCard}>
            <Sparkles size={36} color="#38bdf8" style={{ marginBottom: 10 }} />
            <Text style={styles.trainingHeroTitle}>{t('gestureStudio.trainingOneClick', 'Entrenamiento en 1 Clic')}</Text>
            <Text style={styles.trainingHeroDesc}>
              {t('gestureStudio.trainingDesc', 'Entrena la red neuronal profunda con todas las señas y movimientos grabados. La IA aprende los vectores espacio-temporales y se recarga en caliente sin reiniciar.')}
            </Text>

            <TouchableOpacity
              style={[
                styles.startTrainBtn,
                (eligibleGestures.length < 2 || trainingStatus === 'training') && styles.startTrainBtnDisabled
              ]}
              onPress={handleStartTraining}
              disabled={eligibleGestures.length < 2 || trainingStatus === 'training'}
            >
              {trainingStatus === 'training' ? (
                <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
              ) : (
                <Play size={18} color="#FFF" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.startTrainBtnText}>
                {trainingStatus === 'training' ? t('gestureStudio.trainingNeuralNetwork', 'Entrenando Red Neuronal...') : t('gestureStudio.startTrainingBtn', 'Iniciar Entrenamiento')}
              </Text>
            </TouchableOpacity>

            {eligibleGestures.length < 2 && (
              <View style={styles.warningNotice}>
                <AlertTriangle size={16} color="#f59e0b" style={{ marginRight: 6 }} />
                <Text style={styles.warningNoticeText}>
                  {t('gestureStudio.needMinGestures', 'Se necesitan al menos 2 gestos con 2 o más muestras grabadas para poder entrenar.')}
                </Text>
              </View>
            )}
          </View>

          {/* Tarjeta de Estado del Modelo Activo y Rollback */}
          <View style={styles.modelStatusCard}>
            <View style={styles.modelStatusHeader}>
              <Layers size={18} color="#38bdf8" style={{ marginRight: 8 }} />
              <Text style={styles.modelStatusTitle}>
                {t('gestureStudio.activeModelStatus', 'Modelo Neuronal en Memoria')}
              </Text>
            </View>
            <Text style={styles.modelStatusDesc}>
              {modelStatus?.num_classes ? `${modelStatus.num_classes} clases activas.` : 'Cargando estado del modelo...'}
              {modelStatus?.last_trained ? ` Última actualización: ${modelStatus.last_trained}` : ''}
            </Text>

            {modelStatus?.has_rollback_backup ? (
              <TouchableOpacity
                style={[styles.rollbackBtn, rollingBack && styles.startTrainBtnDisabled]}
                onPress={handleRollback}
                disabled={rollingBack}
              >
                {rollingBack ? (
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />
                ) : (
                  <RotateCcw size={15} color="#FFF" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.rollbackBtnText}>
                  {rollingBack ? 'Restaurando...' : t('gestureStudio.rollbackBtn', 'Restaurar Versión Anterior (Rollback)')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Consola de Progreso de Épocas */}
          {trainingStatus === 'training' && (
            <View style={styles.progressCard}>
              <View style={styles.progressCardHeader}>
                <Text style={styles.progressCardTitle}>{t('gestureStudio.trainingProgressTitle', 'Progreso de Entrenamiento')}</Text>
                <Text style={styles.progressCardPercent}>{trainingProgress.percent}%</Text>
              </View>

              <View style={styles.progressBarBgLarge}>
                <View style={[styles.progressBarFill, { width: `${trainingProgress.percent}%` }]} />
              </View>

              <View style={styles.trainingMetricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t('gestureStudio.epoch', 'Época')}</Text>
                  <Text style={styles.metricVal}>{trainingProgress.epoch} / {trainingProgress.total_epochs}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t('gestureStudio.loss', 'Pérdida (Loss)')}</Text>
                  <Text style={styles.metricVal}>{trainingProgress.loss}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{t('gestureStudio.accuracy', 'Precisión (Accuracy)')}</Text>
                  <Text style={[styles.metricVal, { color: '#10b981' }]}>{trainingProgress.accuracy}%</Text>
                </View>
              </View>
            </View>
          )}

          {/* Resultado de Entrenamiento */}
          {trainingStatus === 'completed' && trainingResult && (
            <View style={styles.successCard}>
              <CheckCircle size={32} color="#10b981" style={{ marginBottom: 8 }} />
              <Text style={styles.successTitle}>{t('gestureStudio.successfulTraining', '¡Entrenamiento Finalizado!')}</Text>
              
              {trainingResult.quality_gate_passed ? (
                <View style={styles.qualityGateBadgeSuccess}>
                  <CheckCircle size={15} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={styles.qualityGateTextSuccess}>
                    {t('gestureStudio.qgPassed', 'Quality Gate: Superado (Test Acc >= 70%)')}
                  </Text>
                </View>
              ) : (
                <View style={styles.qualityGateBadgeWarn}>
                  <AlertTriangle size={15} color="#f59e0b" style={{ marginRight: 6 }} />
                  <Text style={styles.qualityGateTextWarn}>
                    {t('gestureStudio.qgRejected', 'Quality Gate: No superado (< 70%). Se conservó el modelo previo.')}
                  </Text>
                </View>
              )}

              <Text style={styles.successDesc}>
                {trainingResult.message || t('gestureStudio.trainingSuccessDesc', { accuracy: trainingResult.accuracy, samples: trainingResult.total_samples, defaultValue: `Precisión final: ${trainingResult.accuracy}% con ${trainingResult.total_samples} muestras.` })}
              </Text>

              {trainingResult.train_accuracy != null && trainingResult.test_accuracy != null && (
                <View style={styles.accuracyComparisonRow}>
                  <Text style={styles.accCompareLabel}>Train Acc: <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>{trainingResult.train_accuracy}%</Text></Text>
                  <Text style={styles.accCompareLabel}>Test Acc: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{trainingResult.test_accuracy}%</Text></Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.testInterpreterBtn}
                onPress={() => router.push('/interpreter')}
              >
                <Text style={styles.testInterpreterBtnText}>{t('gestureStudio.testInInterpreter', 'Probar en el Intérprete')}</Text>
                <ChevronRight size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── MODAL: NUEVO GESTO A COKIELENS (VISTA SÓLIDA A PANTALLA COMPLETA) ── */}
      <Modal
        visible={isNewModalOpen}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setIsNewModalOpen(false)}
      >
        <SafeAreaView style={styles.fullScreenNewGestureView}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.fullScreenNewGestureScroll}
            >
              <Text style={styles.newGestureMainTitle}>
                {t('gestureStudio.manageDialect', 'Agregar gesto a CokieLens')}
              </Text>
              <Text style={styles.newGestureMainSubtitle}>
                {t('gestureStudio.manageDialectDesc', 'Crea una nueva expresión que la IA aprenderá a reconocer y pronunciar.')}
              </Text>

              <Text style={styles.newGestureFieldLabel}>
                {t('gestureStudio.modalNewNameEsLabel', 'Nombre en español')}
              </Text>
              <TextInput
                style={styles.newGestureInput}
                value={newGestureName}
                onChangeText={setNewGestureName}
                placeholder={t('gestureStudio.nameEsPlaceholder', 'Ej: Puerta, Permiso para ir al baño')}
                placeholderTextColor={inactiveColor}
              />

              <Text style={styles.newGestureFieldLabel}>
                {t('gestureStudio.nameEnLabel', 'Nombre en inglés')}
              </Text>
              <TextInput
                style={styles.newGestureInput}
                value={newGestureNameEn}
                onChangeText={setNewGestureNameEn}
                placeholder={t('gestureStudio.nameEnPlaceholder', 'Ej: Door, Excuse me to go to bathroom')}
                placeholderTextColor={inactiveColor}
              />

              <Text style={styles.newGestureFieldLabel}>
                {t('gestureStudio.expressionType', 'Tipo de expresión')}
              </Text>
              <View style={styles.newGestureTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.newGestureTypeOption,
                    newGestureType === 'movement' && styles.newGestureTypeOptionActive,
                  ]}
                  onPress={() => setNewGestureType('movement')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.newGestureTypeOptionText,
                      newGestureType === 'movement' && styles.newGestureTypeOptionTextActive,
                    ]}
                  >
                    {t('gestureStudio.dynamicMovement', 'Movimiento Dinámico')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.newGestureTypeOption,
                    newGestureType === 'static' && styles.newGestureTypeOptionActive,
                  ]}
                  onPress={() => setNewGestureType('static')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.newGestureTypeOptionText,
                      newGestureType === 'static' && styles.newGestureTypeOptionTextActive,
                    ]}
                  >
                    {t('gestureStudio.staticGesture', 'Seña estática')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.newGestureFieldLabel}>
                {t('gestureStudio.instructionsOptional', 'Instrucciones de Movimiento (opcional)')}
              </Text>
              <TextInput
                style={[styles.newGestureInput, styles.newGestureTextArea]}
                value={newGestureDesc}
                onChangeText={setNewGestureDesc}
                placeholder={t('gestureStudio.instructionsPlaceholder', 'Ej: Mano derecha en letra B sacudiéndose a la altura del pecho')}
                placeholderTextColor={inactiveColor}
                multiline
                textAlignVertical="top"
              />

              <View style={styles.newGestureActionButtonsRow}>
                <TouchableOpacity
                  style={styles.newGestureCancelNoBgBtn}
                  onPress={() => setIsNewModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.newGestureCancelNoBgBtnText}>{t('common.cancel', 'Cancelar')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCreateGesture}
                  disabled={creating}
                  activeOpacity={0.85}
                  style={styles.newGestureSubmitGradientWrapper}
                >
                  <LinearGradient
                    colors={['#132472', '#426BC2']}
                    start={{ x: 0.23, y: 0 }}
                    end={{ x: 0.69, y: 1 }}
                    style={styles.newGestureSubmitGradient}
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.newGestureSubmitGradientText}>
                        {t('gestureStudio.registerGesture', 'Añadir gesto')}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL: CONFIGURACIÓN DE IP DE LENTES COKIELENS ── */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isConfigModalVisible}
        onRequestClose={() => setIsConfigModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleBadge}>
                  <Glasses size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitle}>{t('gestureStudio.configGlassesModalTitle', 'Configurar CokieLens')}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsConfigModalVisible(false)}>
                  <X size={20} color={Colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                {t('gestureStudio.configGlassesModalDesc', 'Ingresa la dirección IP asignada a los lentes inteligentes en tu red Wi-Fi local para vincular la cámara.')}
              </Text>

              <Text style={styles.fieldLabel}>{t('gestureStudio.ipOrHostname', 'Dirección IP / Hostname')}</Text>
              <View style={styles.ipInputContainer}>
                <Wifi size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="192.168.1.50 o cokielens.local"
                  placeholderTextColor="#64748b"
                  value={ipInput}
                  onChangeText={setIpInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Resultado de prueba de conexión */}
              {testResult && (
                <View style={[styles.testResultBox, { backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                  {testResult.success ? (
                    <Check size={16} color="#10b981" style={{ marginRight: 6 }} />
                  ) : (
                    <AlertCircle size={16} color="#ef4444" style={{ marginRight: 6 }} />
                  )}
                  <Text style={[styles.testResultText, { color: testResult.success ? '#10b981' : '#ef4444' }]}>
                    {testResult.message}
                  </Text>
                </View>
              )}

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity 
                  style={styles.testBtn} 
                  onPress={handleTestConnection}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? (
                    <ActivityIndicator size="small" color="#38bdf8" />
                  ) : (
                    <Text style={styles.testBtnText}>{t('gestureStudio.testConnectionBtn', 'Probar Conexión')}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveIp}>
                  <Text style={styles.saveBtnText}>{t('gestureStudio.saveIpBtn', 'Guardar IP')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: CONFIGURACIÓN DE SERVIDOR IA (LOCAL VS NUBE) ── */}
      <Modal
        visible={isAiConfigModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAiConfigModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.configModalContent}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Server size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitle}>Servidor de IA Cokie</Text>
                </View>
                <TouchableOpacity onPress={() => setIsAiConfigModalVisible(false)} style={styles.modalCloseBtn}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDesc}>
                Elige si conectarte al servidor en la nube (Render) o a tu computadora local vía Wi-Fi para entrenar y registrar muestras instantáneamente.
              </Text>

              {/* Botones de preajuste rápido */}
              <Text style={styles.fieldLabel}>Preajustes rápidos:</Text>
              <View style={styles.serverPresetsRow}>
                <TouchableOpacity
                  style={[
                    styles.presetPill,
                    serverInput.includes('onrender.com') && styles.presetPillActive
                  ]}
                  onPress={() => setServerInput('https://cokie-college.onrender.com')}
                >
                  <Globe size={13} color={serverInput.includes('onrender.com') ? '#FFF' : '#94A3B8'} style={{ marginRight: 4 }} />
                  <Text style={[styles.presetPillText, serverInput.includes('onrender.com') && styles.presetPillTextActive]}>
                    ☁️ Render (Nube)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetPill,
                    serverInput.includes('localhost') && styles.presetPillActive
                  ]}
                  onPress={() => setServerInput('http://localhost:8000')}
                >
                  <Laptop size={13} color={serverInput.includes('localhost') ? '#FFF' : '#94A3B8'} style={{ marginRight: 4 }} />
                  <Text style={[styles.presetPillText, serverInput.includes('localhost') && styles.presetPillTextActive]}>
                    💻 Localhost (Web)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetPill,
                    serverInput.includes('192.168') && styles.presetPillActive
                  ]}
                  onPress={() => setServerInput('http://192.168.1.15:8000')}
                >
                  <Wifi size={13} color={serverInput.includes('192.168') ? '#FFF' : '#94A3B8'} style={{ marginRight: 4 }} />
                  <Text style={[styles.presetPillText, serverInput.includes('192.168') && styles.presetPillTextActive]}>
                    📱 Red Wi-Fi (Móvil)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>URL del Servidor IA:</Text>
              <View style={styles.ipInputContainer}>
                <Server size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="http://192.168.1.X:8000 o https://..."
                  placeholderTextColor="#64748b"
                  value={serverInput}
                  onChangeText={setServerInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Resultado de prueba de conexión */}
              {aiServerTestResult && (
                <View
                  style={[
                    styles.testResultBox,
                    {
                      backgroundColor: aiServerTestResult.ok
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)'
                    }
                  ]}
                >
                  {aiServerTestResult.ok ? (
                    <Check size={16} color="#10b981" style={{ marginRight: 6 }} />
                  ) : (
                    <AlertCircle size={16} color="#ef4444" style={{ marginRight: 6 }} />
                  )}
                  <Text
                    style={[
                      styles.testResultText,
                      { color: aiServerTestResult.ok ? '#10b981' : '#ef4444' }
                    ]}
                  >
                    {aiServerTestResult.ok
                      ? `¡Conectado exitosamente! Latencia: ${aiServerTestResult.latency}ms. Clases activas: ${aiServerTestResult.data?.trained_classes?.length || 0}.`
                      : aiServerTestResult.error || 'No se pudo conectar con el servidor.'}
                  </Text>
                </View>
              )}

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.testBtn}
                  onPress={handleTestAiServer}
                  disabled={isTestingAiServer}
                >
                  {isTestingAiServer ? (
                    <ActivityIndicator size="small" color="#38bdf8" />
                  ) : (
                    <Text style={styles.testBtnText}>Probar Servidor</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAiServer}>
                  <Text style={styles.saveBtnText}>Guardar Servidor</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (Colors, theme) => {
  const isDark = theme === 'dark';
  const titleColor = isDark ? '#F1F5F9' : '#0F172A';
  const secondaryColor = isDark ? '#94A3B8' : '#475569';
  const inactiveColor = isDark ? '#64748B' : '#94A3B8';
  const cardBgColor = isDark ? '#262626' : '#FFFFFF';
  const cardBorderColor = isDark ? '#383838' : '#E2E8F0';
  const screenBgColor = isDark ? '#141414' : '#F8FAFC';
  const inputBgColor = isDark ? '#262626' : '#FFFFFF';
  const inputBorderColor = isDark ? '#383838' : '#E2E8F0';
  const dividerColor = isDark ? '#383838' : '#E2E8F0';
  const activeMenuLineColor = isDark ? (Colors.primary || '#426BC2') : '#0B1956';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: screenBgColor },
    serverStatusTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#E2E8F0',
    },
    serverStatusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
      maxWidth: '85%',
    },
    serverStatusPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#F1F5F9' : '#0F172A',
      marginHorizontal: 6,
    },
    serverStatusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginRight: 4,
    },
    serverLatencyText: {
      fontSize: 10,
      color: isDark ? '#94A3B8' : '#64748B',
      fontWeight: '500',
    },
    refreshServerBtn: {
      padding: 6,
      borderRadius: 12,
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    serverPresetsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    presetPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    presetPillActive: {
      backgroundColor: '#426BC2',
      borderColor: '#38BDF8',
    },
    presetPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#475569',
    },
    presetPillTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#141414' : '#FFFFFF',
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#1E293B' : '#E2E8F0',
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabItemActive: {
      borderBottomColor: activeMenuLineColor,
      borderBottomWidth: 3,
    },
    tabText: {
      color: inactiveColor,
      fontSize: 13,
      fontWeight: '600',
    },
    tabTextActive: {
      color: activeMenuLineColor,
      fontWeight: '700',
    },
    content: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 120 },

    topStatsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    statBox: {
      flex: 1,
      backgroundColor: cardBgColor,
      padding: 16,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 0.8,
      borderColor: cardBorderColor,
    },
    statNumOther: {
      fontSize: 26,
      fontWeight: 'bold',
      color: '#F7D8FF',
      marginBottom: 4,
    },
    statNumAi: {
      fontSize: 26,
      fontWeight: 'bold',
      color: '#426BC2',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 11,
      color: secondaryColor,
      textAlign: 'center',
      fontWeight: '500',
    },

    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      color: titleColor,
    },
    newGestureBtnWrapper: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(147, 197, 253, 0.4)',
      overflow: 'hidden',
      shadowColor: '#426BC2',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 4,
    },
    newGestureBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    newGestureBtnText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 12,
    },

    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: inputBgColor,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      marginBottom: 14,
      borderWidth: 0.8,
      borderColor: inputBorderColor,
    },
    searchBarInput: {
      flex: 1,
      fontSize: 14,
      color: titleColor,
    },

    categoryChipsScroll: {
      flexGrow: 0,
      marginBottom: 12,
    },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: cardBgColor,
      marginRight: 8,
      borderWidth: 0.8,
      borderColor: inputBorderColor,
    },
    categoryChipActive: {
      backgroundColor: isDark ? '#333333' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#484848' : '#CBD5E1',
    },
    categoryChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: secondaryColor,
    },
    categoryChipTextActive: {
      color: titleColor,
      fontWeight: 'bold',
    },

    emptySearchContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptySearchText: {
      fontSize: 14,
      color: inactiveColor,
      textAlign: 'center',
      marginBottom: 12,
    },
    clearSearchBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(6, 182, 212, 0.12)',
    },
    clearSearchBtnText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#0284C7',
    },

    gestureCard: {
      backgroundColor: cardBgColor,
      borderRadius: 14,
      padding: 16,
      marginBottom: 14,
      borderWidth: 0.8,
      borderColor: cardBorderColor,
    },
    gestureHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    titleInfo: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    gestureCardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: titleColor,
    },
    gestureCardSubtitleEn: {
      fontSize: 13,
      color: secondaryColor,
      marginTop: 2,
      fontWeight: '500',
    },
    deleteBtn: {
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 3.5,
      borderRadius: 6,
    },
    badgeMovement: {
      backgroundColor: isDark ? 'rgba(66, 107, 194, 0.18)' : 'rgba(66, 107, 194, 0.12)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(66, 107, 194, 0.4)' : 'rgba(66, 107, 194, 0.3)',
    },
    badgeMovementText: {
      color: isDark ? '#89B2F8' : '#2550AD',
      fontWeight: '600',
      fontSize: 11,
    },
    badgeStatic: {
      backgroundColor: isDark ? 'rgba(247, 216, 255, 0.14)' : 'rgba(147, 51, 234, 0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(247, 216, 255, 0.3)' : 'rgba(147, 51, 234, 0.25)',
    },
    badgeStaticText: {
      color: isDark ? '#F7D8FF' : '#7E22CE',
      fontWeight: '600',
      fontSize: 11,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    sampleBadge: {
      borderWidth: 1,
      borderColor: isDark ? '#484848' : '#CBD5E1',
      backgroundColor: 'transparent',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    sampleBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: titleColor,
    },
    gestureDesc: {
      fontSize: 13,
      color: secondaryColor,
      lineHeight: 18,
      marginTop: 4,
    },
    cardDivider: {
      height: 1,
      backgroundColor: dividerColor,
      marginTop: 12,
      marginBottom: 12,
    },
    gestureCardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
    },
    recordActionBtnWrapper: {
      borderRadius: 22,
      overflow: 'hidden',
    },
    gradientBorderBtn: {
      padding: 1.5,
      borderRadius: 22,
    },
    gradientBorderBtnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardBgColor,
      paddingVertical: 7,
      paddingHorizontal: 16,
      borderRadius: 20.5,
    },
    recordBtnIcon: {
      marginRight: 6,
    },
    recordBtnText: {
      color: titleColor,
      fontSize: 13,
      fontWeight: '600',
    },
    cardActionBtnText: {
      fontSize: 12,
      fontWeight: 'bold',
    },

    // Grabador
    recorderContainer: { flex: 1 },
    gestureSelectorBar: {
      padding: 12,
      backgroundColor: cardBgColor,
      borderBottomWidth: 1,
      borderBottomColor: dividerColor,
    },
    selectorLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: secondaryColor,
      marginBottom: 6,
    },
    selectorPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: isDark ? '#272B33' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#3B4252' : '#CBD5E1',
      marginRight: 8,
    },
    selectorPillActive: {
      backgroundColor: '#426BC2',
      borderColor: '#426BC2',
    },
    selectorPillActiveStatic: {
      backgroundColor: '#426BC2',
      borderColor: '#426BC2',
    },
    selectorPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: secondaryColor,
    },
    selectorPillTextActive: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    gestureModeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: isDark ? '#141820' : '#F1F5F9',
      borderBottomWidth: 1,
      borderBottomColor: dividerColor,
    },
    gestureModeTextStatic: {
      fontSize: 12,
      fontWeight: '700',
      color: titleColor,
      marginLeft: 6,
    },
    gestureModeTextMovement: {
      fontSize: 12,
      fontWeight: '700',
      color: titleColor,
      marginLeft: 6,
    },
    videoPreviewBox: {
      flex: 1,
      backgroundColor: '#020617',
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    noSignalBox: {
      alignItems: 'center',
      padding: 20,
    },
    noSignalText: {
      color: inactiveColor,
      fontSize: 13,
      marginTop: 10,
      textAlign: 'center',
    },
    countdownOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 30,
    },
    countdownNumber: {
      fontSize: 80,
      fontWeight: 'bold',
      color: '#06B6D4',
    },
    countdownPrompt: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFF',
      marginTop: 10,
    },
    recordingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      zIndex: 30,
    },
    recordingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    redRecordingDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#EF4444',
      marginRight: 8,
    },
    recordingTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#EF4444',
      letterSpacing: 1,
    },
    recordingSubtitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFF',
      textAlign: 'center',
      marginBottom: 20,
    },
    progressBarBg: {
      width: '100%',
      height: 10,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 5,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBarBgLarge: {
      width: '100%',
      height: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 7,
      overflow: 'hidden',
      marginBottom: 16,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#06B6D4',
    },
    progressCounter: {
      fontSize: 12,
      color: secondaryColor,
    },
    recorderControls: {
      padding: 20,
      backgroundColor: cardBgColor,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: dividerColor,
    },
    gradientActionBtnWrapper: {
      borderRadius: 24,
      overflow: 'hidden',
      marginBottom: 10,
      shadowColor: '#426BC2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    gradientActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 24,
    },
    recordActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#426BC2',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 24,
      marginBottom: 10,
    },
    photoActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#426BC2',
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 24,
      marginBottom: 10,
    },
    staticModeBanner: {
      position: 'absolute',
      top: 14,
      left: 14,
      right: 68,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.4)',
      zIndex: 20,
    },
    staticModeBannerText: {
      color: '#34D399',
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    recordActionButtonDisabled: {
      opacity: 0.5,
    },
    recordInnerCircle: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#EF4444',
      marginRight: 10,
    },
    recordButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 15,
    },
    recorderHint: {
      fontSize: 12,
      color: secondaryColor,
      textAlign: 'center',
    },

    // Entrenamiento
    trainingHeroCard: {
      backgroundColor: cardBgColor,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 0.8,
      borderColor: cardBorderColor,
    },
    trainingHeroTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: titleColor,
      marginBottom: 8,
    },
    trainingHeroDesc: {
      fontSize: 13,
      color: secondaryColor,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    startTrainBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0284C7',
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 14,
      shadowColor: '#0284C7',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    startTrainBtnDisabled: {
      backgroundColor: '#64748B',
    },
    startTrainBtnText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 15,
    },
    warningNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      padding: 10,
      borderRadius: 10,
      marginTop: 16,
    },
    warningNoticeText: {
      fontSize: 12,
      color: '#F59E0B',
      flex: 1,
    },

    progressCard: {
      backgroundColor: cardBgColor,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#06B6D4',
    },
    progressCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    progressCardTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: titleColor,
    },
    progressCardPercent: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#06B6D4',
    },
    trainingMetricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    metricItem: {
      alignItems: 'center',
    },
    metricLabel: {
      fontSize: 11,
      color: secondaryColor,
      marginBottom: 2,
    },
    metricVal: {
      fontSize: 14,
      fontWeight: 'bold',
      color: titleColor,
    },

    successCard: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#10B981',
    },
    successTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#10B981',
      marginBottom: 6,
    },
    successDesc: {
      fontSize: 13,
      color: secondaryColor,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 16,
    },
    testInterpreterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#10B981',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
    },
    testInterpreterBtnText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 13,
      marginRight: 6,
    },

    // Selector de categoría en el grabador
    recorderCatBar: {
      marginBottom: 10,
    },
    recorderCatPillsRow: {
      flexDirection: 'row',
      gap: 6,
      paddingVertical: 2,
    },
    recorderCatPill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: isDark ? '#272B33' : '#F1F5F9',
    },
    recorderCatPillActive: {
      backgroundColor: '#426BC2',
    },
    recorderCatPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: secondaryColor,
    },
    recorderCatPillTextActive: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },

    // Tarjeta de Estado del Modelo y Rollback
    modelStatusCard: {
      backgroundColor: cardBgColor,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 0.8,
      borderColor: cardBorderColor,
    },
    modelStatusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    modelStatusTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: titleColor,
    },
    modelStatusDesc: {
      fontSize: 12,
      color: secondaryColor,
      lineHeight: 17,
      marginBottom: 10,
    },
    rollbackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: '#EF4444',
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    rollbackBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: 'bold',
    },

    qualityGateBadgeSuccess: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      marginBottom: 8,
    },
    qualityGateTextSuccess: {
      color: '#10B981',
      fontSize: 12,
      fontWeight: 'bold',
    },
    qualityGateBadgeWarn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      marginBottom: 8,
    },
    qualityGateTextWarn: {
      color: '#F59E0B',
      fontSize: 12,
      fontWeight: 'bold',
    },
    accuracyComparisonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      backgroundColor: isDark ? '#141820' : '#F1F5F9',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginBottom: 12,
      width: '100%',
    },
    accCompareLabel: {
      fontSize: 13,
      color: titleColor,
    },

    // Modal Pantalla Completa Sólida (Agregar Gesto a CokieLens)
    fullScreenNewGestureView: {
      flex: 1,
      backgroundColor: screenBgColor,
    },
    fullScreenNewGestureScroll: {
      paddingHorizontal: 24,
      paddingVertical: 28,
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    newGestureMainTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: titleColor,
      marginBottom: 6,
    },
    newGestureMainSubtitle: {
      fontSize: 13,
      color: secondaryColor,
      lineHeight: 19,
      marginBottom: 26,
    },
    newGestureFieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: titleColor,
      marginBottom: 8,
    },
    newGestureInput: {
      backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF',
      borderWidth: 0.5,
      borderColor: isDark ? '#8B8B90' : '#CBD5E1',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: titleColor,
      marginBottom: 20,
    },
    newGestureTextArea: {
      height: 120,
      paddingTop: 12,
    },
    newGestureTypeRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 22,
    },
    newGestureTypeOption: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 0.5,
      borderColor: isDark ? '#8B8B90' : '#CBD5E1',
      backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF',
    },
    newGestureTypeOptionActive: {
      backgroundColor: '#426BC2',
      borderColor: '#426BC2',
      borderWidth: 0.5,
    },
    newGestureTypeOptionText: {
      fontSize: 13,
      color: secondaryColor,
      fontWeight: '500',
    },
    newGestureTypeOptionTextActive: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    newGestureActionButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 16,
      marginTop: 10,
      marginBottom: 40,
    },
    newGestureCancelNoBgBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: 'transparent',
    },
    newGestureCancelNoBgBtnText: {
      color: titleColor,
      fontWeight: '600',
      fontSize: 14,
    },
    newGestureSubmitGradientWrapper: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    newGestureSubmitGradient: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    newGestureSubmitGradientText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
    },

    // Modal CokieLens IP
    modalOverlay: {
      flex: 1,
      ...(Platform.OS === 'web' ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 } : {}),
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: cardBgColor,
      borderRadius: 16,
      padding: 22,
      borderWidth: 0.8,
      borderColor: cardBorderColor,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: titleColor,
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: 12,
      color: secondaryColor,
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: titleColor,
      marginBottom: 6,
    },
    textInput: {
      borderWidth: 1,
      borderColor: inputBorderColor,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: titleColor,
      backgroundColor: isDark ? '#0F1117' : '#F8FAFC',
      marginBottom: 12,
      fontSize: 15,
    },
    typeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    typeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: inputBorderColor,
    },
    typeOptionActive: {
      borderColor: '#06B6D4',
      backgroundColor: 'rgba(6, 182, 212, 0.12)',
    },
    typeOptionText: {
      fontSize: 11,
      color: secondaryColor,
      marginLeft: 4,
    },
    typeOptionTextActive: {
      color: '#06B6D4',
      fontWeight: 'bold',
    },
    modalButtonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 8,
    },
    cancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    cancelBtnText: {
      color: secondaryColor,
      fontWeight: '600',
    },
    confirmBtn: {
      backgroundColor: '#0284C7',
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 10,
    },
    confirmBtnText: {
      color: '#FFF',
      fontWeight: 'bold',
    },

    // Selector de Fuente en Grabador
    recorderSourceBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: isDark ? '#0F1117' : '#F8FAFC',
      borderBottomWidth: 1,
      borderBottomColor: dividerColor,
    },
    sourceSegmentedControl: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1E222A' : '#E2E8F0',
      borderRadius: 10,
      padding: 3,
      gap: 4,
    },
    sourceSegmentBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    sourceSegmentBtnActive: {
      backgroundColor: '#426BC2',
    },
    sourceSegmentTxt: {
      fontSize: 12,
      fontWeight: '600',
      color: secondaryColor,
      marginLeft: 6,
    },
    sourceSegmentTxtActive: {
      color: '#FFF',
      fontWeight: 'bold',
    },
    glassesSettingsBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? '#272B33' : '#426BC2',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    statusMiniDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: '#FFF',
    },
    floatingRotateButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 25,
    },
    permissionBtn: {
      marginTop: 14,
      backgroundColor: '#0284C7',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
    },
    permissionBtnText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 13,
    },
    retrySettingsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: 'rgba(6, 182, 212, 0.15)',
    },
    retrySettingsBtnText: {
      color: '#06B6D4',
      fontWeight: 'bold',
      fontSize: 12,
    },

    // Modal de Lentes CokieLens
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    modalTitleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ipInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#0F1117' : '#F8FAFC',
      borderWidth: 1,
      borderColor: inputBorderColor,
      borderRadius: 10,
      paddingHorizontal: 12,
      marginBottom: 14,
    },
    modalTextInput: {
      flex: 1,
      paddingVertical: 10,
      color: titleColor,
      fontSize: 15,
    },
    testResultBox: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      marginBottom: 14,
    },
    testResultText: {
      fontSize: 12,
      fontWeight: '500',
      flex: 1,
    },
    modalButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 6,
    },
    testBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: 'rgba(6, 182, 212, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    testBtnText: {
      color: '#0284C7',
      fontWeight: '600',
      fontSize: 13,
    },
    saveBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: '#0284C7',
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveBtnText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 13,
    },
  });
};
