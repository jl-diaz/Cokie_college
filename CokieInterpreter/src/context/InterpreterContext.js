import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebSocketService from '../services/WebSocketService';
import SpeechService from '../services/SpeechService';
import Esp32Service from '../services/Esp32Service';

const InterpreterContext = createContext(null);

export function InterpreterProvider({ children }) {
  // Configuración y Hardware
  const [videoSource, setVideoSource] = useState('webcam'); // 'webcam' | 'glasses'
  const [audioOutput, setAudioOutput] = useState('device'); // 'device' | 'glasses'
  const [audioVolume, setAudioVolumeState] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [esp32Ip, setEsp32Ip] = useState('192.168.4.1');
  const [glassesConnected, setGlassesConnected] = useState(false);
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [isTutorialVisible, setIsTutorialVisible] = useState(false);

  // Estados de IA y Traducción
  const [aiServerStatus, setAiServerStatus] = useState('connecting');
  const [currentTranslation, setCurrentTranslation] = useState('');
  const [translationState, setTranslationState] = useState('ready'); // 'ready' | 'detecting' | 'updated'
  const [translationHistory, setTranslationHistory] = useState([
    { id: 'init-1', text: 'Hola, ¿Cómo estás hoy?', timestamp: 'Hace un momento' },
  ]);

  // Modos de interpretación
  // 'sentence': Modo Frases Completas (Bocetos 1 y 2)
  // 'fingerspelling': Modo Deletreo y Alfabeto (Imágenes 2 y 3)
  // 'sl2t': Modo Transcripción Continua Multilingüe (Google SL2T de Imagen 1)
  const [activeInterpretationMode, setActiveInterpretationMode] = useState('sentence');

  // Estados de Esqueleto y Trazado de Puntos
  const [isSkeletonEnabled, setIsSkeletonEnabled] = useState(true);
  const [skeletonMode, setSkeletonMode] = useState('full'); // 'full' | 'hands' | 'pose'
  const [landmarksData, setLandmarksData] = useState(null);

  const lastSpokenRef = useRef('');
  const stateResetTimerRef = useRef(null);

  // Cargar configuraciones persistidas y verificar primer uso (Tutorial)
  useEffect(() => {
    Esp32Service.loadSettings().then((settings) => {
      if (settings.ip) setEsp32Ip(settings.ip);
      if (settings.volume !== undefined) {
        setAudioVolumeState(settings.volume);
        SpeechService.setVolume(settings.volume);
      }
      if (settings.audioOutput) setAudioOutput(settings.audioOutput);
    });

    // Comprobar si el usuario ya vio el tutorial
    (async () => {
      try {
        let seen = null;
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          seen = localStorage.getItem('cokie_tutorial_seen');
        } else {
          seen = await AsyncStorage.getItem('cokie_tutorial_seen');
        }
        if (!seen) {
          setIsTutorialVisible(true);
        }
      } catch (e) {
        setIsTutorialVisible(true);
      }
    })();
  }, []);

  const closeTutorial = useCallback(async () => {
    setIsTutorialVisible(false);
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('cokie_tutorial_seen', 'true');
      } else {
        await AsyncStorage.setItem('cokie_tutorial_seen', 'true');
      }
    } catch (e) {}
  }, []);

  // Sincronizar volumen con SpeechService
  const setAudioVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    setAudioVolumeState(clamped);
    SpeechService.setVolume(clamped);
    Esp32Service.saveSettings({ volume: clamped });
  }, []);

  // Alternar mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      SpeechService.setMuted(next);
      return next;
    });
  }, []);

  // Actualizar IP de los lentes
  const updateEsp32Ip = useCallback(async (newIp) => {
    const clean = Esp32Service.cleanIp(newIp);
    setEsp32Ip(clean);
    await Esp32Service.saveSettings({ ip: clean });
  }, []);

  // Actualizar salida de audio
  const updateAudioOutput = useCallback(async (output) => {
    setAudioOutput(output);
    await Esp32Service.saveSettings({ audioOutput: output });
  }, []);

  // Pronunciar texto directamente
  const speakText = useCallback((text) => {
    if (!text) return;
    SpeechService.speak(text, {
      audioOutput,
      esp32Ip,
      volume: audioVolume,
    });
  }, [audioOutput, esp32Ip, audioVolume]);

  // Manejador central de traducción recibida (desde Socket.IO o simulación)
  const handleIncomingTranslation = useCallback((text, rawData) => {
    if (!text) return;

    let cleanText = text;
    if (typeof cleanText === 'string') {
      cleanText = cleanText.trim();
      if (cleanText.startsWith('sign.')) {
        cleanText = cleanText.replace('sign.', '').replace(/_/g, ' ');
        cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
      }
    }

    setCurrentTranslation(cleanText);
    setTranslationState('updated');

    // Agregar a historial
    setTranslationHistory((prev) => {
      if (prev.length > 0 && prev[0].text.toLowerCase() === cleanText.toLowerCase()) {
        return prev;
      }
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      return [{ id: `${Date.now()}-${Math.random()}`, text: cleanText, timestamp: timeStr }, ...prev].slice(0, 30);
    });

    // Pronunciar si no se acaba de pronunciar exactamente lo mismo
    if (lastSpokenRef.current !== cleanText) {
      lastSpokenRef.current = cleanText;
      speakText(cleanText);
    }

    if (stateResetTimerRef.current) clearTimeout(stateResetTimerRef.current);
    stateResetTimerRef.current = setTimeout(() => {
      setTranslationState('ready');
    }, 3200);
  }, [speakText]);

  // Suscribirse a WebSocketService (traducciones, estatus y landmarks)
  useEffect(() => {
    const unsubStatus = WebSocketService.addStatusListener((status) => {
      setAiServerStatus(status);
    });

    const unsubTranslation = WebSocketService.addListener((text, rawData) => {
      handleIncomingTranslation(text, rawData);
    });

    const unsubLandmarks = WebSocketService.addLandmarksListener((landmarks) => {
      setLandmarksData(landmarks);
      if (landmarks?.detected) {
        setTranslationState((prev) => (prev === 'updated' ? 'updated' : 'detecting'));
      }
    });

    WebSocketService.connect();

    return () => {
      unsubStatus();
      unsubTranslation();
      unsubLandmarks();
      if (stateResetTimerRef.current) clearTimeout(stateResetTimerRef.current);
    };
  }, [handleIncomingTranslation]);

  const setDetectingMotion = useCallback((isDetecting) => {
    if (isDetecting && translationState !== 'updated') {
      setTranslationState('detecting');
    } else if (!isDetecting && translationState === 'detecting') {
      setTranslationState('ready');
    }
  }, [translationState]);

  // Simular un gesto (para botón demo / onboarding / testing)
  const simulateGesture = useCallback((sampleText) => {
    setTranslationState('detecting');
    // Generar landmarks sintéticos para visualizar los 21 puntos durante el demo
    setLandmarksData({
      detected: true,
      hands: [
        // 21 puntos normalizados representando una mano saludando
        [
          { x: 0.5, y: 0.75 },   // 0: Muñeca
          { x: 0.42, y: 0.68 },  // 1: Base pulgar
          { x: 0.36, y: 0.60 },  // 2: Nudillo pulgar
          { x: 0.33, y: 0.54 },  // 3: Articulación pulgar
          { x: 0.30, y: 0.48 },  // 4: Punta pulgar
          { x: 0.44, y: 0.52 },  // 5: Nudillo índice
          { x: 0.42, y: 0.42 },  // 6: Articulación 1 índice
          { x: 0.41, y: 0.34 },  // 7: Articulación 2 índice
          { x: 0.40, y: 0.26 },  // 8: Punta índice
          { x: 0.50, y: 0.50 },  // 9: Nudillo medio
          { x: 0.50, y: 0.39 },  // 10: Articulación 1 medio
          { x: 0.50, y: 0.30 },  // 11: Articulación 2 medio
          { x: 0.50, y: 0.22 },  // 12: Punta medio
          { x: 0.56, y: 0.52 },  // 13: Nudillo anular
          { x: 0.57, y: 0.42 },  // 14: Articulación 1 anular
          { x: 0.58, y: 0.34 },  // 15: Articulación 2 anular
          { x: 0.59, y: 0.27 },  // 16: Punta anular
          { x: 0.62, y: 0.56 },  // 17: Nudillo meñique
          { x: 0.65, y: 0.47 },  // 18: Articulación 1 meñique
          { x: 0.67, y: 0.40 },  // 19: Articulación 2 meñique
          { x: 0.68, y: 0.33 },  // 20: Punta meñique
        ],
      ],
      motion_energy: 0.15,
      is_static: false,
    });

    setTimeout(() => {
      handleIncomingTranslation(sampleText || 'Hola, ¿Cómo estas hoy?');
    }, 700);
  }, [handleIncomingTranslation]);

  const clearTranslation = useCallback(() => {
    setCurrentTranslation('');
    lastSpokenRef.current = '';
    setTranslationState('ready');
  }, []);

  return (
    <InterpreterContext.Provider
      value={{
        videoSource,
        setVideoSource,
        audioOutput,
        setAudioOutput: updateAudioOutput,
        audioVolume,
        setAudioVolume,
        isMuted,
        toggleMute,
        esp32Ip,
        setEsp32Ip: updateEsp32Ip,
        glassesConnected,
        setGlassesConnected,
        isConfigModalVisible,
        setIsConfigModalVisible,
        isTutorialVisible,
        setIsTutorialVisible,
        closeTutorial,
        aiServerStatus,
        currentTranslation,
        translationState,
        setDetectingMotion,
        translationHistory,
        activeInterpretationMode,
        setActiveInterpretationMode,
        isSkeletonEnabled,
        setIsSkeletonEnabled,
        skeletonMode,
        setSkeletonMode,
        landmarksData,
        speakText,
        simulateGesture,
        clearTranslation,
      }}
    >
      {children}
    </InterpreterContext.Provider>
  );
}

export function useInterpreter() {
  const context = useContext(InterpreterContext);
  if (!context) {
    throw new Error('useInterpreter debe utilizarse dentro de un InterpreterProvider');
  }
  return context;
}

export default InterpreterContext;
