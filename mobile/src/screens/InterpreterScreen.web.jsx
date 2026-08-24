import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Mic, MicOff, SwitchCamera, Volume2, Sparkles } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import * as fp from 'fingerpose';
import { allGestures } from '../services/GestureDictionary';
import * as tf from '@tensorflow/tfjs';

// Usamos importaciones condicionales para evitar errores de SSR si existieran
let Holistic, Camera, drawConnectors, drawLandmarks, FACEMESH_TESSELATION, HAND_CONNECTIONS, POSE_CONNECTIONS;
if (typeof window !== 'undefined') {
  const holisticModule = require('@mediapipe/holistic');
  const cameraModule = require('@mediapipe/camera_utils');
  const drawingModule = require('@mediapipe/drawing_utils');
  Holistic = holisticModule.Holistic;
  FACEMESH_TESSELATION = holisticModule.FACEMESH_TESSELATION;
  HAND_CONNECTIONS = holisticModule.HAND_CONNECTIONS;
  POSE_CONNECTIONS = holisticModule.POSE_CONNECTIONS;
  Camera = cameraModule.Camera;
  drawConnectors = drawingModule.drawConnectors;
  drawLandmarks = drawingModule.drawLandmarks;
}

export default function InterpreterScreenWeb() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [hasPermission, setHasPermission] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [facing, setFacing] = useState('user');
  const [lastTranslation, setLastTranslation] = useState('');
  const [subtitleHistory, setSubtitleHistory] = useState([]);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraInstanceRef = useRef(null);
  const holisticRef = useRef(null);
  
  // Variables para estabilización (Voting Window) y TFJS
  const recentPredictions = useRef([]);
  const lastSpoken = useRef('');
  const noDetectionCount = useRef(0);
  
  // FASE 3: Buffer Temporal para LSTM
  const sequenceBuffer = useRef([]);
  const tfModel = useRef(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Intentar cargar modelo dinámico al iniciar
  useEffect(() => {
    async function loadModel() {
      try {
        // Se espera que el usuario coloque el modelo en public/models/
        const model = await tf.loadLayersModel('/models/model.json');
        tfModel.current = model;
        setModelLoaded(true);
        console.log("Modelo LSTM dinámico cargado con éxito.");
      } catch (err) {
        console.warn("No se encontró el modelo LSTM dinámico en /models/model.json. Usando Fingerpose estático.");
      }
    }
    loadModel();
  }, []);

  const unlockWebAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
        const silentUtterance = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(silentUtterance);
      } catch (e) {}
    }
  };

  const speakTranslation = (translatedText) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
        const utterance = new SpeechSynthesisUtterance(translatedText);
        const currentLang = i18n.language || 'es';
        utterance.lang = currentLang.startsWith('en') ? 'en-US' : 'es-MX';
        utterance.rate = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Error en Web Speech:', e);
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Pedir permisos primero, independiente de si Holistic cargó o no
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => setHasPermission(true))
      .catch((err) => {
        console.error("Error pidiendo cámara en web:", err);
        setHasPermission(false);
      });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !Holistic || hasPermission !== true) return;

    // Inicializar estimador de gestos de Fingerpose
    const gestureEstimator = new fp.GestureEstimator(allGestures);

    // Inicializar MediaPipe Holistic
    const holistic = new Holistic({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
      }
    });

    holistic.setOptions({
      modelComplexity: 1, // 0 = rápido, 1 = preciso, 2 = muy pesado
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: true,
      refineFaceLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    holistic.onResults((results) => {
      // 1. Dibujar el esqueleto en el canvas (Feedback Visual)
      if (canvasRef.current && videoRef.current) {
        const canvasCtx = canvasRef.current.getContext('2d');
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Espejar si estamos usando cámara frontal
        if (facing === 'user') {
          canvasCtx.translate(canvasRef.current.width, 0);
          canvasCtx.scale(-1, 1);
        }

        canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        if (isActive) {
            // Dibujar Pose
            drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
            drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2});
            
            // Dibujar Manos
            drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {color: '#CC0000', lineWidth: 5});
            drawLandmarks(canvasCtx, results.leftHandLandmarks, {color: '#00FF00', lineWidth: 2});
            drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {color: '#00CC00', lineWidth: 5});
            drawLandmarks(canvasCtx, results.rightHandLandmarks, {color: '#FF0000', lineWidth: 2});
        }
        canvasCtx.restore();
      }

      // 2. Procesar Gestos solo si está activo
      if (isActive) {
        let detectedKey = null;
        let highestConfidence = 0;

        // Función auxiliar para evaluar y desempatar
        const evaluateGestures = (landmarks, estimated) => {
           if (estimated.gestures.length > 0) {
               // Tomar la predicción con mayor confianza
               let best = estimated.gestures.sort((a,b) => b.confidence - a.confidence)[0];
               
               // --- REGLAS DE DESEMPATE BIOMÉTRICO ---
               
               // 1. Desempate: 4 vs B (Separación entre Índice y Meñique)
               if (best.name === 'sign.4' || best.name === 'sign.b') {
                   // Calculamos distancia Euclidiana entre la punta del índice (8) y meñique (20)
                   const dist = Math.sqrt(Math.pow(landmarks[8].x - landmarks[20].x, 2) + Math.pow(landmarks[8].y - landmarks[20].y, 2));
                   // Si la distancia es mayor a 0.08, están separados (4). Si es menor, están pegados (B).
                   best.name = dist > 0.085 ? 'sign.4' : 'sign.b';
               }
               
               // 2. Desempate: U vs V / 2 (Separación entre Índice y Medio)
               if (best.name === 'sign.v' || best.name === 'sign.2' || best.name === 'sign.u') {
                   const dist = Math.sqrt(Math.pow(landmarks[8].x - landmarks[12].x, 2) + Math.pow(landmarks[8].y - landmarks[12].y, 2));
                   // Si la distancia es mayor a 0.045, están separados (V/2). Si no, están pegados (U).
                   // Agruparemos temporalmente V y 2 como el mismo gesto de separación, o respetamos el que traía si ya venía separado.
                   if (dist > 0.045) {
                       best.name = (best.name === 'sign.u') ? 'sign.2' : best.name;
                   } else {
                       best.name = 'sign.u';
                   }
               }

               if (best.confidence > highestConfidence) {
                   highestConfidence = best.confidence;
                   detectedKey = best.name;
               }
           }
        };

        // Analizar mano derecha
        if (results.rightHandLandmarks) {
           const landmarksArray = results.rightHandLandmarks.map(lm => [lm.x, lm.y, lm.z]);
           const estimated = gestureEstimator.estimate(landmarksArray, 7.0); // 7.0 confianza mínima
           evaluateGestures(results.rightHandLandmarks, estimated);
        }
        
        // Analizar mano izquierda
        if (results.leftHandLandmarks) {
           const landmarksArray = results.leftHandLandmarks.map(lm => [lm.x, lm.y, lm.z]);
           const estimated = gestureEstimator.estimate(landmarksArray, 7.0);
           evaluateGestures(results.leftHandLandmarks, estimated);
        }

        // ----------------------------------------------------
        // FASE 3: Lógica para Modelo Dinámico (Temporal LSTM)
        // ----------------------------------------------------
        // Extraemos características: Pose (33*4) + LH (21*3) + RH (21*3) = 258 puntos
        const extractFeatures = (res) => {
            let pose = new Array(33*4).fill(0);
            let lh = new Array(21*3).fill(0);
            let rh = new Array(21*3).fill(0);
            
            if (res.poseLandmarks) {
                pose = res.poseLandmarks.map(lm => [lm.x, lm.y, lm.z, lm.visibility]).flat();
            }
            if (res.leftHandLandmarks) {
                lh = res.leftHandLandmarks.map(lm => [lm.x, lm.y, lm.z]).flat();
            }
            if (res.rightHandLandmarks) {
                rh = res.rightHandLandmarks.map(lm => [lm.x, lm.y, lm.z]).flat();
            }
            return [...pose, ...lh, ...rh];
        };

        const features = extractFeatures(results);
        sequenceBuffer.current.push(features);
        if (sequenceBuffer.current.length > 30) {
            sequenceBuffer.current.shift();
        }

        // Si tenemos modelo cargado y suficientes frames, predicimos
        if (tfModel.current && sequenceBuffer.current.length === 30) {
            // Nota: las etiquetas deben mapearse según como se entrenó el modelo. 
            // Aquí se deja preparada la predicción.
            const inputTensor = tf.tensor([sequenceBuffer.current]); // shape [1, 30, 258]
            const prediction = tfModel.current.predict(inputTensor);
            // const predictedIndex = prediction.argMax(1).dataSync()[0];
            // detectedKey = dynamicLabels[predictedIndex]; 
        }

        // Lógica de estabilización y habla
        if (!detectedKey) {
            noDetectionCount.current += 1;
            if (noDetectionCount.current > 15) { // Si pasa mucho tiempo sin detectar, limpiar
                recentPredictions.current = [];
                lastSpoken.current = '';
                noDetectionCount.current = 0;
            }
        } else {
            noDetectionCount.current = 0;
            recentPredictions.current.push(detectedKey);
            // Mantener solo las últimas 6 predicciones
            if (recentPredictions.current.length > 6) {
                recentPredictions.current.shift();
            }

            // Si las últimas 6 son idénticas, es una predicción estable
            if (recentPredictions.current.length === 6 && recentPredictions.current.every(val => val === detectedKey)) {
                if (detectedKey !== lastSpoken.current) {
                    lastSpoken.current = detectedKey;
                    
                    // Traducir y hablar
                    const translatedText = t(`signs.${detectedKey.replace('sign.', '')}`, { defaultValue: detectedKey });
                    setLastTranslation(translatedText);
                    setSubtitleHistory(prev => [translatedText, ...prev.slice(0, 4)]);
                    speakTranslation(translatedText);
                }
                // Limpiamos un poco la cola pero dejamos algunos para fluidez
                recentPredictions.current = [detectedKey, detectedKey, detectedKey]; 
            }
        }
      }
    });

    holisticRef.current = holistic;

    return () => {
      if (holisticRef.current) {
        holisticRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (hasPermission && videoRef.current && Camera) {
      if (cameraInstanceRef.current) {
         cameraInstanceRef.current.stop();
      }
      
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (holisticRef.current && videoRef.current) {
             await holisticRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
        facingMode: facing
      });
      
      camera.start();
      cameraInstanceRef.current = camera;
    }
    
    return () => {
      if (cameraInstanceRef.current) {
        cameraInstanceRef.current.stop();
      }
    };
  }, [hasPermission, facing]);

  function toggleCameraType() {
    setFacing(current => (current === 'environment' ? 'user' : 'environment'));
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

      <View style={styles.cameraContainer}>
        {/* El video original debe estar oculto o debajo, usamos Canvas para mostrar el feed procesado */}
        <video 
          ref={videoRef}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
          autoPlay
          playsInline
          muted
        />
        
        <canvas 
          ref={canvasRef} 
          width="1280" 
          height="720"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        
        <TouchableOpacity onPress={() => { unlockWebAudio(); toggleCameraType(); }} style={styles.floatingRotateButton}>
          <SwitchCamera color="#fff" size={26} />
        </TouchableOpacity>
        
        <View style={styles.instructionBadge}>
          <Sparkles color="#F6BE2F" size={16} style={{ marginRight: 6 }} />
          <Text style={styles.instructionText}>
            {t('interpreter.instructions', 'Holistic Web V2: Coloca manos y cuerpo frente a la cámara')}
          </Text>
        </View>

        <View style={styles.subtitleOverlay}>
          <View style={styles.subtitleHeader}>
            <Volume2 color="#10b981" size={20} />
            <Text style={styles.subtitleHeaderTitle}>TRADUCCIÓN EN TIEMPO REAL (LOCAL AI) (BETA)</Text>
          </View>

          {lastTranslation ? (
            <Text style={styles.subtitleMainText}>
              "{lastTranslation}"
            </Text>
          ) : (
            <Text style={styles.subtitlePlaceholder}>
              Analizando gestos corporales...
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
            ? t('interpreter.active', 'Procesando IA localmente...') 
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
