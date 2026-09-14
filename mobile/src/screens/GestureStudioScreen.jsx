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
  Image
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
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
  BookOpen
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PageHeader from '../components/PageHeader';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import WebSocketService from '../services/WebSocketService';

const { width } = Dimensions.get('window');

export default function GestureStudioScreen() {
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
  const [recorderSource, setRecorderSource] = useState('glasses'); // 'glasses' | 'phone'
  const [esp32Ip, setEsp32Ip] = useState('cokielens.local');
  const [recordingState, setRecordingState] = useState('idle'); // 'idle' | 'countdown' | 'recording' | 'saving'
  const [countdown, setCountdown] = useState(3);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [liveFrameUri, setLiveFrameUri] = useState(null);
  const recordedFramesRef = useRef([]);
  const isFetchingFrameRef = useRef(false);

  // Consola de entrenamiento
  const [trainingStatus, setTrainingStatus] = useState('idle'); // 'idle' | 'training' | 'completed' | 'failed'
  const [trainingProgress, setTrainingProgress] = useState({ epoch: 0, total_epochs: 40, accuracy: 0, loss: 0, percent: 0 });
  const [trainingResult, setTrainingResult] = useState(null);

  const serverUrl = process.env.EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL || 'https://cokie-college.onrender.com';

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
      if (savedIp) setEsp32Ip(savedIp);
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
      alert('Por favor ingresa un nombre para el gesto.');
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
      alert('Error al registrar el gesto.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGesture = async (id, name) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Estás seguro de eliminar el gesto "${name}" y todas sus muestras grabadas?`)) {
        await executeDelete(id);
      }
    } else {
      Alert.alert(
        'Eliminar Gesto',
        `¿Estás seguro de eliminar "${name}" y sus grabaciones?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => executeDelete(id) }
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

  // ── BUCLE DE PREVISUALIZACIÓN DE FOTOGRAMAS EN GRABADOR ───────────────────────
  useEffect(() => {
    let intervalId;
    if (activeTab === 'recorder') {
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
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Uri = reader.result;
              setLiveFrameUri(base64Uri);

              // Si estamos en medio de la grabación activa, extraer puntos y acumular cuadro
              if (recordingState === 'recording' && base64Uri) {
                try {
                  const extractRes = await fetch(`${serverUrl}/api/gestures/extract-frame`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_base64: base64Uri })
                  });
                  if (extractRes.ok) {
                    const data = await extractRes.json();
                    if (data.vector && data.vector.length > 0) {
                      recordedFramesRef.current.push(data.vector);
                      setRecordingProgress(Math.min(100, Math.round((recordedFramesRef.current.length / 30) * 100)));
                    }
                  }
                } catch (e) {}
              }
            };
            reader.readAsDataURL(blob);
          }
        } catch (e) {
        } finally {
          isFetchingFrameRef.current = false;
        }
      }, 100);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab, esp32Ip, recordingState]);

  // ── INICIAR GRABACIÓN GUIADA CON CUENTA REGRESIVA ─────────────────────────────
  const startGuidedRecording = () => {
    if (!selectedGestureId) {
      alert('Selecciona un gesto primero.');
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
        // ¡Empezar a grabar los 30 cuadros!
        setRecordingState('recording');

        // Monitorear finalización al llegar a 30 cuadros o 3.5 segundos timeout
        const startTime = Date.now();
        const checkTimer = setInterval(async () => {
          const count = recordedFramesRef.current.length;
          const elapsed = Date.now() - startTime;

          if (count >= 30 || elapsed > 3500) {
            clearInterval(checkTimer);
            await saveRecordedSequence();
          }
        }, 100);
      }
    }, 1000);
  };

  const saveRecordedSequence = async () => {
    setRecordingState('saving');
    try {
      const frames = recordedFramesRef.current;
      if (frames.length < 10) {
        alert('No se detectaron suficientes movimientos de manos en la cámara. Intenta con mejor iluminación.');
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
        fetchGestures();
        alert('¡Muestra de 30 fotogramas guardada con éxito!');
      } else {
        alert('Error al guardar la muestra en el servidor.');
      }
    } catch (e) {
      alert('Error de conexión con el servidor.');
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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '' }} />
      <PageHeader title="Estudio de Gestos e IA" />

      {/* ── BARRA DE PESTAÑAS ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'dialect' && styles.tabItemActive]}
          onPress={() => setActiveTab('dialect')}
        >
          <BookOpen size={16} color={activeTab === 'dialect' ? '#38bdf8' : Colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'dialect' && styles.tabTextActive]}>
            Dialecto Escolar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'recorder' && styles.tabItemActive]}
          onPress={() => setActiveTab('recorder')}
        >
          <Video size={16} color={activeTab === 'recorder' ? '#38bdf8' : Colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'recorder' && styles.tabTextActive]}>
            Grabador en Vivo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'training' && styles.tabItemActive]}
          onPress={() => setActiveTab('training')}
        >
          <Sparkles size={16} color={activeTab === 'training' ? '#38bdf8' : Colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'training' && styles.tabTextActive]}>
            Entrenamiento IA
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── PESTAÑA 1: CATÁLOGO DE DIALECTO ── */}
      {activeTab === 'dialect' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.topStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{gestures.length}</Text>
              <Text style={styles.statLabel}>Gestos en Dialecto</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {gestures.reduce((acc, curr) => acc + (curr.sample_count || 0), 0)}
              </Text>
              <Text style={styles.statLabel}>Muestras Grabadas</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: eligibleGestures.length >= 2 ? '#10b981' : '#f59e0b' }]}>
                {eligibleGestures.length}
              </Text>
              <Text style={styles.statLabel}>Listos para IA</Text>
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Señas y Movimientos Corporales</Text>
            <TouchableOpacity 
              style={styles.newGestureBtn}
              onPress={() => setIsNewModalOpen(true)}
            >
              <Plus size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.newGestureBtnText}>Nuevo Gesto</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
          ) : (
            gestures.map((item) => (
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
                          {item.type === 'movement' ? 'Movimiento Dinámico' : 'Seña Estática'}
                        </Text>
                      </View>
                      <View style={styles.sampleBadge}>
                        <Text style={styles.sampleBadgeText}>
                          {item.sample_count || 0} muestras
                        </Text>
                      </View>
                    </View>
                  </View>

                  {!item.is_default && (
                    <TouchableOpacity
                      onPress={() => handleDeleteGesture(item.id, item.name)}
                      style={styles.deleteBtn}
                    >
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                {item.description ? (
                  <Text style={styles.gestureDesc}>{item.description}</Text>
                ) : null}

                <View style={styles.gestureCardFooter}>
                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => {
                      setSelectedGestureId(item.id);
                      setActiveTab('recorder');
                    }}
                  >
                    <Video size={14} color="#38bdf8" style={{ marginRight: 6 }} />
                    <Text style={styles.cardActionBtnText}>Grabar Muestras</Text>
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
          {/* Barra de selección de gesto a grabar */}
          <View style={styles.gestureSelectorBar}>
            <Text style={styles.selectorLabel}>Grabando para:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              {gestures.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.selectorPill,
                    selectedGestureId === g.id && styles.selectorPillActive
                  ]}
                  onPress={() => setSelectedGestureId(g.id)}
                >
                  <Text style={[
                    styles.selectorPillText,
                    selectedGestureId === g.id && styles.selectorPillTextActive
                  ]}>
                    {g.name} ({g.sample_count || 0})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Visor de video en vivo */}
          <View style={styles.videoPreviewBox}>
            {liveFrameUri ? (
              <Image source={{ uri: liveFrameUri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            ) : (
              <View style={styles.noSignalBox}>
                <Glasses size={36} color="#64748b" />
                <Text style={styles.noSignalText}>Conectando con cámara de los lentes en {esp32Ip}...</Text>
              </View>
            )}

            {/* Overlay de Cuenta Regresiva */}
            {recordingState === 'countdown' && (
              <View style={styles.countdownOverlay}>
                <Text style={styles.countdownNumber}>{countdown}</Text>
                <Text style={styles.countdownPrompt}>¡Prepárate para realizar el movimiento!</Text>
              </View>
            )}

            {/* Overlay de Grabación Activa */}
            {recordingState === 'recording' && (
              <View style={styles.recordingOverlay}>
                <View style={styles.recordingHeader}>
                  <View style={styles.redRecordingDot} />
                  <Text style={styles.recordingTitle}>GRABANDO MOVIMIENTO (30 CUADROS)</Text>
                </View>
                <Text style={styles.recordingSubtitle}>¡Haz el movimiento con brazos y manos ahora!</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${recordingProgress}%` }]} />
                </View>
                <Text style={styles.progressCounter}>{recordedFramesRef.current.length} / 30 fotogramas</Text>
              </View>
            )}

            {recordingState === 'saving' && (
              <View style={styles.countdownOverlay}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={styles.countdownPrompt}>Procesando y guardando muestra...</Text>
              </View>
            )}
          </View>

          {/* Controles inferiores del grabador */}
          <View style={styles.recorderControls}>
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
                {recordingState === 'idle' ? 'Iniciar Grabación (30 cuadros)' : 'Grabando...'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.recorderHint}>
              Colócate frente a la cámara de los lentes mostrando torso, brazos y manos.
            </Text>
          </View>
        </View>
      )}

      {/* ── PESTAÑA 3: CONSOLA DE ENTRENAMIENTO IA ── */}
      {activeTab === 'training' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.trainingHeroCard}>
            <Sparkles size={36} color="#38bdf8" style={{ marginBottom: 10 }} />
            <Text style={styles.trainingHeroTitle}>Entrenamiento en 1 Clic</Text>
            <Text style={styles.trainingHeroDesc}>
              Entrena la red neuronal profunda con todas las señas y movimientos grabados.
              La IA aprende los vectores espacio-temporales y se recarga en caliente sin reiniciar.
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
                {trainingStatus === 'training' ? 'Entrenando Red Neuronal...' : 'Iniciar Entrenamiento'}
              </Text>
            </TouchableOpacity>

            {eligibleGestures.length < 2 && (
              <View style={styles.warningNotice}>
                <AlertTriangle size={16} color="#f59e0b" style={{ marginRight: 6 }} />
                <Text style={styles.warningNoticeText}>
                  Se necesitan al menos 2 gestos con 2 o más muestras grabadas para poder entrenar.
                </Text>
              </View>
            )}
          </View>

          {/* Consola de Progreso de Épocas */}
          {trainingStatus === 'training' && (
            <View style={styles.progressCard}>
              <View style={styles.progressCardHeader}>
                <Text style={styles.progressCardTitle}>Progreso de Entrenamiento</Text>
                <Text style={styles.progressCardPercent}>{trainingProgress.percent}%</Text>
              </View>

              <View style={styles.progressBarBgLarge}>
                <View style={[styles.progressBarFill, { width: `${trainingProgress.percent}%` }]} />
              </View>

              <View style={styles.trainingMetricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Época</Text>
                  <Text style={styles.metricVal}>{trainingProgress.epoch} / {trainingProgress.total_epochs}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Pérdida (Loss)</Text>
                  <Text style={styles.metricVal}>{trainingProgress.loss}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Precisión (Accuracy)</Text>
                  <Text style={[styles.metricVal, { color: '#10b981' }]}>{trainingProgress.accuracy}%</Text>
                </View>
              </View>
            </View>
          )}

          {/* Resultado de Entrenamiento Exitoso */}
          {trainingStatus === 'completed' && trainingResult && (
            <View style={styles.successCard}>
              <CheckCircle size={32} color="#10b981" style={{ marginBottom: 8 }} />
              <Text style={styles.successTitle}>¡Entrenamiento Exitoso!</Text>
              <Text style={styles.successDesc}>
                La red neuronal alcanzó una precisión del {trainingResult.accuracy}% con {trainingResult.total_samples} muestras.
                El modelo ya fue recargado en memoria y está listo para interpretar.
              </Text>

              <TouchableOpacity
                style={styles.testInterpreterBtn}
                onPress={() => router.push('/interpreter')}
              >
                <Text style={styles.testInterpreterBtnText}>Probar en el Intérprete</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Agregar Gesto al Dialecto</Text>
            <Text style={styles.modalSubtitle}>
              Crea una nueva expresión que la IA aprenderá a reconocer y pronunciar.
            </Text>

            <Text style={styles.fieldLabel}>Nombre en Español *</Text>
            <TextInput
              style={styles.textInput}
              value={newGestureName}
              onChangeText={setNewGestureName}
              placeholder="Ej: Puerta, Permiso para ir al baño"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Nombre en Inglés (Traducción TTS / Subtítulos)</Text>
            <TextInput
              style={styles.textInput}
              value={newGestureNameEn}
              onChangeText={setNewGestureNameEn}
              placeholder="Ej: Door, Excuse me to go to bathroom"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Tipo de Expresión</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeOption, newGestureType === 'movement' && styles.typeOptionActive]}
                onPress={() => setNewGestureType('movement')}
              >
                <Activity size={16} color={newGestureType === 'movement' ? '#38bdf8' : Colors.text.secondary} />
                <Text style={[styles.typeOptionText, newGestureType === 'movement' && styles.typeOptionTextActive]}>
                  Movimiento Dinámico
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeOption, newGestureType === 'static' && styles.typeOptionActive]}
                onPress={() => setNewGestureType('static')}
              >
                <Award size={16} color={newGestureType === 'static' ? '#38bdf8' : Colors.text.secondary} />
                <Text style={[styles.typeOptionText, newGestureType === 'static' && styles.typeOptionTextActive]}>
                  Seña Estática
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Instrucciones de Movimiento (Opcional)</Text>
            <TextInput
              style={[styles.textInput, { height: 60 }]}
              value={newGestureDesc}
              onChangeText={setNewGestureDesc}
              placeholder="Ej: Mano derecha en letra B sacudiéndose a la altura del pecho"
              placeholderTextColor="#94a3b8"
              multiline
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsNewModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleCreateGesture}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Registrar Gesto</Text>
                )}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
    marginRight: 8,
  },
  selectorPillActive: {
    backgroundColor: '#3b82f6',
  },
  selectorPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  selectorPillTextActive: {
    color: '#FFF',
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
    fontSize: 14,
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
});
