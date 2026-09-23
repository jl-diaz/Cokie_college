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
  KeyboardAvoidingView
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
  Camera
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import WebSocketService from '../services/WebSocketService';

const { width } = Dimensions.get('window');
const TARGET_MOVEMENT_FRAMES = 15;

export default function GestureStudioScreen() {
  const pathname = usePathname();
  const screenFocused = useIsFocused();
  const isFocused = screenFocused && pathname.includes('gesture');
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
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
  const [liveFrameUri, setLiveFrameUri] = useState(null);
  const recordedFramesRef = useRef([]);
  const isFetchingFrameRef = useRef(false);
  const recordingStateRef = useRef(recordingState);

  // Cámara de teléfono nativa y permisos
  const [permission, requestPermission] = useCameraPermissions();
  const [facingMode, setFacingMode] = useState('front');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef(null);

  // Búsqueda y filtrado de dialecto escolar
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de configuración y prueba de IP de lentes
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [ipInput, setIpInput] = useState('cokielens.local');
  const [glassesConnected, setGlassesConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Consola de entrenamiento
  const [trainingStatus, setTrainingStatus] = useState('idle'); // 'idle' | 'training' | 'completed' | 'failed'
  const [trainingProgress, setTrainingProgress] = useState({ epoch: 0, total_epochs: 40, accuracy: 0, loss: 0, percent: 0 });
  const [trainingResult, setTrainingResult] = useState(null);

  const serverUrl = process.env.EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL || 'https://cokie-college.onrender.com';

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  useEffect(() => {
    loadSavedSettings();
    fetchGestures();

    // Conectar WebSocket para recibir eventos de entrenamiento
    WebSocketService.connect(serverUrl);
    
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
      } else if (event === 'failed') {
        setTrainingStatus('failed');
        setTrainingResult(data);
      }
    };

    WebSocketService.addTrainingListener(handleTrainingEvents);

    return () => {
      WebSocketService.removeTrainingListener(handleTrainingEvents);
    };
  }, []);

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

  const fetchGestures = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/gestures`);
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
      const timeoutId = setTimeout(() => controller.abort(), 2000);

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

  // ── CAPTURA FOTOGRÁFICA PARA SEÑAS ESTÁTICAS ─────────────────────────────
  const handleCaptureStaticPhoto = async () => {
    if (!selectedGestureId) {
      Alert.alert(
        t('gestureStudio.selectionRequiredTitle', 'Selección requerida'),
        t('gestureStudio.selectionRequiredDesc', 'Selecciona un gesto primero en la barra superior.')
      );
      return;
    }

    if (recorderSource === 'phone' && !permission?.granted) {
      const res = await requestPermission();
      if (!res?.granted) return;
    }

    if (recorderSource === 'phone' && !cameraRef.current) {
      Alert.alert(
        t('gestureStudio.cameraNotReadyTitle', 'Cámara no lista'),
        t('gestureStudio.cameraNotReadyDesc', 'La cámara aún se está inicializando. Intenta en un momento.')
      );
      return;
    }

    setRecordingState('saving');

    try {
      let imageBase64 = null;

      if (recorderSource === 'phone') {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.25,
          skipProcessing: true,
          shutterSound: true,
          exif: false,
          pictureSize: '640x480',
        });
        imageBase64 = photo?.base64;
      } else {
        if (!liveFrameUri) {
          Alert.alert(
            t('gestureStudio.noSignalTitle', 'Sin señal'),
            t('gestureStudio.noSignalDesc', 'No se ha recibido señal de video de los lentes CokieLens.')
          );
          setRecordingState('idle');
          return;
        }
        imageBase64 = liveFrameUri;
      }

      if (!imageBase64) {
        Alert.alert(
          t('gestureStudio.captureErrorTitle', 'Error'),
          t('gestureStudio.captureErrorDesc', 'No se pudo capturar la foto.')
        );
        setRecordingState('idle');
        return;
      }

      // Enviar al extractor para validar presencia de manos
      const extractRes = await fetch(`${serverUrl}/api/gestures/extract-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageBase64 })
      });

      if (!extractRes.ok) {
        Alert.alert(
          t('gestureStudio.serverErrorTitle', 'Error de servidor'),
          t('gestureStudio.serverProcessErrorDesc', 'No se pudo procesar la foto con el servidor.')
        );
        setRecordingState('idle');
        return;
      }

      const data = await extractRes.json();
      const hasHand = data.detected && data.vector && data.vector.some(v => v !== 0);

      if (!hasHand) {
        Alert.alert(
          t('gestureStudio.handNotDetectedTitle', 'Mano no detectada'),
          t('gestureStudio.handNotDetectedDesc', 'No se detectaron manos visibles en la foto. Coloca tu mano fija frente a la cámara mostrando la seña con buena luz e inténtalo de nuevo.')
        );
        setRecordingState('idle');
        return;
      }

      // Guardar muestra para la seña estática (secuencia replicada a 30 fotogramas)
      const staticSequence = Array.from({ length: 30 }, () => data.vector);
      const saveRes = await fetch(`${serverUrl}/api/gestures/record-sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gesture_id: selectedGestureId,
          sequence: staticSequence
        })
      });

      if (saveRes.ok) {
        await fetchGestures();
        Alert.alert(
          t('gestureStudio.photoSavedTitle', '¡Foto Guardada!'),
          t('gestureStudio.photoSavedDesc', 'Muestra guardada correctamente.')
        );
      } else {
        Alert.alert(
          t('gestureStudio.captureErrorTitle', 'Error'),
          t('gestureStudio.saveSampleErrorDesc', 'No se pudo guardar la muestra en el servidor.')
        );
      }
    } catch (err) {
      console.warn('Error capturando foto:', err);
      Alert.alert(
        t('gestureStudio.captureErrorTitle', 'Error'),
        t('gestureStudio.connectionErrorDesc', 'Hubo un fallo de conexión al procesar la foto.')
      );
    } finally {
      setRecordingState('idle');
    }
  };

  // ── BUCLE 1: CAPTURA DESDE CÁMARA DEL TELÉFONO DURANTE GRABACIÓN DE MOVIMIENTO ──
  useEffect(() => {
    let isRunning = true;

    if (activeTab === 'recorder' && recorderSource === 'phone' && recordingState === 'recording') {
      const capturePhoneLoop = async () => {
        while (isRunning && recordingStateRef.current === 'recording') {
          if (!cameraRef.current || isFetchingFrameRef.current) {
            await new Promise(r => setTimeout(r, 40));
            continue;
          }

          if (recordedFramesRef.current.length >= TARGET_MOVEMENT_FRAMES) {
            break;
          }

          isFetchingFrameRef.current = true;
          try {
            const photo = await cameraRef.current.takePictureAsync({
              base64: true,
              quality: 0.10,
              skipProcessing: true,
              shutterSound: false,
              exif: false,
              pictureSize: '352x288',
            });

            if (photo?.base64 && isRunning && recordingStateRef.current === 'recording') {
              const extractRes = await fetch(`${serverUrl}/api/gestures/extract-frame`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_base64: photo.base64 })
              });

              if (extractRes.ok) {
                const data = await extractRes.json();
                if (data.detected && data.vector && data.vector.some(v => v !== 0)) {
                  recordedFramesRef.current.push(data.vector);
                  setRecordingProgress(Math.min(100, Math.round((recordedFramesRef.current.length / TARGET_MOVEMENT_FRAMES) * 100)));
                  if (recordedFramesRef.current.length >= TARGET_MOVEMENT_FRAMES) {
                    break;
                  }
                }
              }
            }
          } catch (e) {
            // Ignorar errores transitorios de fotograma
          } finally {
            isFetchingFrameRef.current = false;
          }

          await new Promise(r => setTimeout(r, 20));
        }

        if (isRunning && recordingStateRef.current === 'recording') {
          await saveRecordedSequence();
        }
      };

      capturePhoneLoop();
    }

    return () => {
      isRunning = false;
    };
  }, [activeTab, recorderSource, recordingState]);

  // ── BUCLE 2: PREVISUALIZACIÓN Y CAPTURA DESDE LENTES (ESP32-CAM) ─────────────
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
            reader.onloadend = async () => {
              const base64Uri = reader.result;
              setLiveFrameUri(base64Uri);

              // Si estamos en grabación activa, extraer puntos y acumular cuadro
              if (recordingStateRef.current === 'recording' && base64Uri) {
                try {
                  const extractRes = await fetch(`${serverUrl}/api/gestures/extract-frame`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_base64: base64Uri })
                  });
                  if (extractRes.ok) {
                    const data = await extractRes.json();
                    if (data.detected && data.vector && data.vector.some(v => v !== 0)) {
                      recordedFramesRef.current.push(data.vector);
                      setRecordingProgress(Math.min(100, Math.round((recordedFramesRef.current.length / TARGET_MOVEMENT_FRAMES) * 100)));
                      if (recordedFramesRef.current.length >= TARGET_MOVEMENT_FRAMES) {
                        await saveRecordedSequence();
                      }
                    }
                  }
                } catch (e) {}
              }
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
      }, 110);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab, recorderSource, esp32Ip]);

  // ── INICIAR GRABACIÓN GUIADA CON CUENTA REGRESIVA (MOVIMIENTO) ────────────────
  const startGuidedRecording = () => {
    if (!selectedGestureId) {
      Alert.alert(
        t('gestureStudio.selectionRequiredTitle', 'Selección requerida'),
        t('gestureStudio.selectionRequiredDesc', 'Selecciona un gesto primero en la barra superior.')
      );
      return;
    }

    if (recorderSource === 'phone' && !permission?.granted) {
      requestPermission();
      return;
    }

    setRecordingState('countdown');
    setCountdown(3);
    recordedFramesRef.current = [];
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

        // Temporizador de seguridad de 14s (suficiente para capturar los fotogramas en móvil)
        setTimeout(async () => {
          if (recordingStateRef.current === 'recording') {
            await saveRecordedSequence();
          }
        }, 14000);
      }
    }, 1000);
  };

  const saveRecordedSequence = async () => {
    if (recordingStateRef.current === 'saving' || recordingStateRef.current === 'idle') return;
    setRecordingState('saving');
    try {
      const frames = recordedFramesRef.current;
      if (frames.length < 4) {
        Alert.alert(
          t('gestureStudio.insufficientSamplesTitle', 'Muestras insuficientes'),
          t('gestureStudio.insufficientSamplesDesc', 'No se detectaron suficientes movimientos de manos en la cámara (mínimo 4 cuadros). Asegúrate de colocarte frente a la cámara mostrando torso y manos con buena luz.')
        );
        setRecordingState('idle');
        return;
      }

      const res = await fetch(`${serverUrl}/api/gestures/record-sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gesture_id: selectedGestureId,
          sequence: frames
        })
      });

      if (res.ok) {
        await fetchGestures();
        Alert.alert(
          t('gestureStudio.sampleSavedTitle', '¡Muestra Guardada!'),
          `Se registraron ${frames.length} fotogramas de movimiento para "${selectedGesture?.name_es || selectedGesture?.name}".`
        );
      } else {
        Alert.alert(
          t('gestureStudio.captureErrorTitle', 'Error'),
          t('gestureStudio.saveSampleErrorDesc', 'Error al guardar la muestra en el servidor.')
        );
      }
    } catch (e) {
      Alert.alert(
        t('gestureStudio.captureErrorTitle', 'Error'),
        t('gestureStudio.connectionErrorDesc', 'Error de conexión con el servidor.')
      );
    } finally {
      setRecordingState('idle');
      recordedFramesRef.current = [];
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

  // Filtrado reactivo para búsqueda en dialecto escolar
  const filteredGestures = gestures.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchName = (item.name && item.name.toLowerCase().includes(q)) || false;
    const matchNameEs = (item.name_es && item.name_es.toLowerCase().includes(q)) || false;
    const matchNameEn = (item.name_en && item.name_en.toLowerCase().includes(q)) || false;
    const matchDesc = (item.description && item.description.toLowerCase().includes(q)) || false;
    const matchType = (item.type && item.type.toLowerCase().includes(q)) || false;
    return matchName || matchNameEs || matchNameEn || matchDesc || matchType;
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '' }} />

      {/* ── BARRA DE PESTAÑAS ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'dialect' && styles.tabItemActive]}
          onPress={() => setActiveTab('dialect')}
        >
          <BookOpen size={16} color={activeTab === 'dialect' ? '#38bdf8' : Colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'dialect' && styles.tabTextActive]}>
            {t('gestureStudio.tabDialect', 'Dialecto Escolar')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'recorder' && styles.tabItemActive]}
          onPress={() => setActiveTab('recorder')}
        >
          <Video size={16} color={activeTab === 'recorder' ? '#38bdf8' : Colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'recorder' && styles.tabTextActive]}>
            {t('gestureStudio.tabRecorder', 'Grabador en Vivo')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'training' && styles.tabItemActive]}
          onPress={() => setActiveTab('training')}
        >
          <Sparkles size={16} color={activeTab === 'training' ? '#38bdf8' : Colors.text.secondary} />
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
              <Text style={styles.statNum}>{gestures.length}</Text>
              <Text style={styles.statLabel}>{t('gestureStudio.gesturesInDialect', 'Gestos en Dialecto')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {gestures.reduce((acc, curr) => acc + (curr.sample_count || 0), 0)}
              </Text>
              <Text style={styles.statLabel}>{t('gestureStudio.recordedSamples', 'Muestras Grabadas')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: eligibleGestures.length >= 2 ? '#10b981' : '#f59e0b' }]}>
                {eligibleGestures.length}
              </Text>
              <Text style={styles.statLabel}>{t('gestureStudio.readyForAi', 'Listos para IA')}</Text>
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('gestureStudio.gesturesAndMovements', 'Señas y Movimientos Corporales')}</Text>
            <TouchableOpacity 
              style={styles.newGestureBtn}
              onPress={() => setIsNewModalOpen(true)}
            >
              <Plus size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.newGestureBtnText}>{t('gestureStudio.newGestureBtn', 'Nuevo Gesto')}</Text>
            </TouchableOpacity>
          </View>

          {/* Barra de Búsqueda */}
          <View style={styles.searchBarContainer}>
            <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchBarInput}
              placeholder={t('gestureStudio.searchPlaceholder', 'Buscar seña por nombre...')}
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
          ) : filteredGestures.length === 0 ? (
            <View style={styles.emptySearchContainer}>
              <Search size={32} color="#64748b" style={{ marginBottom: 8 }} />
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
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gestureCardTitle}>
                      {item.name_es || item.name}
                      {item.name_en ? (
                        <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: 'normal' }}>
                          {' '}({item.name_en})
                        </Text>
                      ) : null}
                    </Text>
                    <View style={styles.tagsRow}>
                      <View style={[styles.badge, item.type === 'movement' ? styles.badgeMovement : styles.badgeStatic]}>
                        <Text style={styles.badgeText}>
                          {item.type === 'movement' ? t('gestureStudio.dynamicMovementMode', 'Movimiento Dinámico') : t('gestureStudio.staticGestureMode', 'Seña Estática')}
                        </Text>
                      </View>
                      <View style={styles.sampleBadge}>
                        <Text style={styles.sampleBadgeText}>
                          {item.sample_count || 0} {t('gestureStudio.samples', 'muestras')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteGesture(item.id, item.name_es || item.name)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {item.description ? (
                  <Text style={styles.gestureDesc}>{item.description}</Text>
                ) : null}

                <View style={styles.gestureCardFooter}>
                  <TouchableOpacity
                    style={[
                      styles.cardActionBtn,
                      item.type === 'static' && { backgroundColor: 'rgba(16, 185, 129, 0.12)' }
                    ]}
                    onPress={() => {
                      setSelectedGestureId(item.id);
                      setActiveTab('recorder');
                    }}
                  >
                    {item.type === 'static' ? (
                      <Camera size={14} color="#10b981" style={{ marginRight: 6 }} />
                    ) : (
                      <Video size={14} color="#38bdf8" style={{ marginRight: 6 }} />
                    )}
                    <Text style={[
                      styles.cardActionBtnText,
                      item.type === 'static' && { color: '#059669' }
                    ]}>
                      {item.type === 'static' ? t('gestureStudio.capturePhotoAction', 'Capturar Foto') : t('gestureStudio.recordMovementAction', 'Grabar Movimiento')}
                    </Text>
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
                <Smartphone size={15} color={recorderSource === 'phone' ? '#FFF' : Colors.text.secondary} />
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
                <Glasses size={15} color={recorderSource === 'glasses' ? '#FFF' : Colors.text.secondary} />
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
            <Text style={styles.selectorLabel}>{t('gestureStudio.recordingFor', 'Grabando para:')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              {gestures.map((g) => {
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
                      <Camera size={13} color={isSelected ? '#FFF' : '#10b981'} style={{ marginRight: 5 }} />
                    ) : (
                      <Video size={13} color={isSelected ? '#FFF' : '#38bdf8'} style={{ marginRight: 5 }} />
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
                  <Camera size={14} color="#10b981" />
                  <Text style={styles.gestureModeTextStatic}>
                    {t('gestureStudio.staticGestureMode', 'Seña Estática (Modo Foto)')} — {selectedGesture.name_es || selectedGesture.name}
                  </Text>
                </>
              ) : (
                <>
                  <Video size={14} color="#38bdf8" />
                  <Text style={styles.gestureModeTextMovement}>
                    {t('gestureStudio.dynamicMovementMode', 'Movimiento Dinámico (Modo Grabación)')} — {selectedGesture.name_es || selectedGesture.name}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Visor de video en vivo (Teléfono o Lentes) */}
          <View style={styles.videoPreviewBox}>
            {recorderSource === 'phone' ? (
              !permission?.granted ? (
                <View style={styles.noSignalBox}>
                  <Smartphone size={40} color="#64748b" style={{ marginBottom: 12 }} />
                  <Text style={styles.noSignalText}>{t('gestureStudio.cameraPermissionRequired', 'Se requiere acceso a la cámara del teléfono para capturar señas.')}</Text>
                  <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={styles.permissionBtnText}>{t('gestureStudio.grantPermissionBtn', 'Conceder Permiso')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                isFocused ? (
                  <>
                    <CameraView
                      ref={cameraRef}
                      style={StyleSheet.absoluteFill}
                      facing={facingMode}
                      onCameraReady={() => setIsCameraReady(true)}
                      animateShutter={false}
                    />
                    <TouchableOpacity onPress={toggleCameraType} style={styles.floatingRotateButton}>
                      <SwitchCamera color="#fff" size={22} />
                    </TouchableOpacity>
                  </>
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
                <Text style={styles.progressCounter}>{t('gestureStudio.framesCount', { count: recordedFramesRef.current.length, target: TARGET_MOVEMENT_FRAMES, defaultValue: `${recordedFramesRef.current.length} / ${TARGET_MOVEMENT_FRAMES} fotogramas` })}</Text>
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
                  styles.photoActionButton,
                  recordingState !== 'idle' && styles.recordActionButtonDisabled
                ]}
                onPress={handleCaptureStaticPhoto}
                disabled={recordingState !== 'idle'}
              >
                <Camera size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.recordButtonText}>
                  {recordingState === 'saving' ? t('gestureStudio.processingPhotoBtn', 'Procesando Foto...') : t('gestureStudio.takingPhoto', 'Tomar Foto de la Seña')}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.recordActionButton,
                  recordingState !== 'idle' && styles.recordActionButtonDisabled
                ]}
                onPress={startGuidedRecording}
                disabled={recordingState !== 'idle'}
              >
                <View style={styles.recordInnerCircle} />
                <Text style={styles.recordButtonText}>
                  {recordingState === 'idle' ? t('gestureStudio.startRecordingMovement', { count: TARGET_MOVEMENT_FRAMES, defaultValue: `Iniciar Grabación (${TARGET_MOVEMENT_FRAMES} cuadros)` }) : t('gestureStudio.recording', 'Grabando...')}
                </Text>
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

          {/* Resultado de Entrenamiento Exitoso */}
          {trainingStatus === 'completed' && trainingResult && (
            <View style={styles.successCard}>
              <CheckCircle size={32} color="#10b981" style={{ marginBottom: 8 }} />
              <Text style={styles.successTitle}>{t('gestureStudio.successfulTraining', '¡Entrenamiento Exitoso!')}</Text>
              <Text style={styles.successDesc}>
                {t('gestureStudio.trainingSuccessDesc', { accuracy: trainingResult.accuracy, samples: trainingResult.total_samples, defaultValue: `La red neuronal alcanzó una precisión del ${trainingResult.accuracy}% con ${trainingResult.total_samples} muestras. El modelo ya fue recargado en memoria y está listo para interpretar.` })}
              </Text>

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

      {/* ── MODAL: NUEVO GESTO ── */}
      <Modal
        visible={isNewModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNewModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                <Text style={styles.modalTitle}>{t('gestureStudio.manageDialect', 'Agregar Gesto al Dialecto')}</Text>
                <Text style={styles.modalSubtitle}>
                  {t('gestureStudio.manageDialectDesc', 'Crea una nueva expresión que la IA aprenderá a reconocer y pronunciar.')}
                </Text>

                <Text style={styles.fieldLabel}>{t('gestureStudio.modalNewNameEsLabel', 'Nombre en Español *')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={newGestureName}
                  onChangeText={setNewGestureName}
                  placeholder={t('gestureStudio.nameEsPlaceholder', 'Ej: Puerta, Permiso para ir al baño')}
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.fieldLabel}>{t('gestureStudio.nameEnLabel', 'Nombre en Inglés (Traducción TTS / Subtítulos)')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={newGestureNameEn}
                  onChangeText={setNewGestureNameEn}
                  placeholder={t('gestureStudio.nameEnPlaceholder', 'Ej: Door, Excuse me to go to bathroom')}
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.fieldLabel}>{t('gestureStudio.expressionType', 'Tipo de Expresión')}</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[styles.typeOption, newGestureType === 'movement' && styles.typeOptionActive]}
                    onPress={() => setNewGestureType('movement')}
                  >
                    <Activity size={16} color={newGestureType === 'movement' ? '#38bdf8' : Colors.text.secondary} />
                    <Text style={[styles.typeOptionText, newGestureType === 'movement' && styles.typeOptionTextActive]}>
                      {t('gestureStudio.dynamicMovement', 'Movimiento Dinámico')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.typeOption, newGestureType === 'static' && styles.typeOptionActive]}
                    onPress={() => setNewGestureType('static')}
                  >
                    <Award size={16} color={newGestureType === 'static' ? '#38bdf8' : Colors.text.secondary} />
                    <Text style={[styles.typeOptionText, newGestureType === 'static' && styles.typeOptionTextActive]}>
                      {t('gestureStudio.staticGesture', 'Seña Estática')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>{t('gestureStudio.instructionsOptional', 'Instrucciones de Movimiento (Opcional)')}</Text>
                <TextInput
                  style={[styles.textInput, { height: 60 }]}
                  value={newGestureDesc}
                  onChangeText={setNewGestureDesc}
                  placeholder={t('gestureStudio.instructionsPlaceholder', 'Ej: Mano derecha en letra B sacudiéndose a la altura del pecho')}
                  placeholderTextColor="#94a3b8"
                  multiline
                />

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setIsNewModalOpen(false)}
                  >
                    <Text style={styles.cancelBtnText}>{t('common.cancel', 'Cancelar')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleCreateGesture}
                    disabled={creating}
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.confirmBtnText}>{t('gestureStudio.registerGesture', 'Registrar Gesto')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme === 'dark' ? '#0f172a' : '#0B1956',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#38bdf8',
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#38bdf8',
  },
  content: { flex: 1 },
  scrollContent: { padding: 16 },

  topStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme === 'dark' ? '#1e293b' : '#f8fafc',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
  },
  statNum: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  newGestureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newGestureBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  gestureCard: {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
  },
  gestureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  gestureCardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeMovement: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  badgeStatic: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38bdf8',
  },
  sampleBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sampleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  gestureDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  deleteBtn: {
    padding: 6,
  },
  gestureCardFooter: {
    borderTopWidth: 1,
    borderTopColor: theme === 'dark' ? '#334155' : '#f1f5f9',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 8,
  },
  cardActionBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0284c7',
  },

  // Grabador
  recorderContainer: { flex: 1 },
  gestureSelectorBar: {
    padding: 12,
    backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  selectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
    marginRight: 8,
  },
  selectorPillActive: {
    backgroundColor: '#3b82f6',
  },
  selectorPillActiveStatic: {
    backgroundColor: '#059669',
  },
  selectorPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  selectorPillTextActive: {
    color: '#FFF',
  },
  gestureModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme === 'dark' ? '#0b1329' : '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
  },
  gestureModeTextStatic: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
    marginLeft: 6,
  },
  gestureModeTextMovement: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
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
    color: '#64748b',
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
    color: '#38bdf8',
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
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
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
    backgroundColor: '#38bdf8',
  },
  progressCounter: {
    fontSize: 12,
    color: '#94a3b8',
  },
  recorderControls: {
    padding: 20,
    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
  },
  recordActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 10,
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
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
    color: '#34d399',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  recordActionButtonDisabled: {
    backgroundColor: '#64748b',
  },
  recordInnerCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF',
    marginRight: 10,
  },
  recordButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  recorderHint: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  // Entrenamiento
  trainingHeroCard: {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
  },
  trainingHeroTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  trainingHeroDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  startTrainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startTrainBtnDisabled: {
    backgroundColor: '#64748b',
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
    color: '#f59e0b',
    flex: 1,
  },

  progressCard: {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38bdf8',
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
    color: Colors.text.primary,
  },
  progressCardPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#38bdf8',
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
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },

  successCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 6,
  },
  successDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  testInterpreterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
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
    maxWidth: 400,
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    borderRadius: 20,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text.primary,
    backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc',
    marginBottom: 12,
    fontSize: 16,
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
    borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
  },
  typeOptionActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  typeOptionText: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginLeft: 4,
  },
  typeOptionTextActive: {
    color: '#38bdf8',
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
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },

  // Búsqueda en Dialecto
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? '#1e293b' : '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
  },
  searchBarInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  emptySearchContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySearchText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  clearSearchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  clearSearchBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0284c7',
  },

  // Selector de Fuente en Grabador
  recorderSourceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme === 'dark' ? '#0b1329' : '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
  },
  sourceSegmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
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
    backgroundColor: '#3b82f6',
  },
  sourceSegmentTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
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
    backgroundColor: theme === 'dark' ? '#1e293b' : '#0284c7',
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
    backgroundColor: '#3b82f6',
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
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  retrySettingsBtnText: {
    color: '#38bdf8',
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
    backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc',
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  modalTextInput: {
    flex: 1,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 16,
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
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testBtnText: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 13,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
