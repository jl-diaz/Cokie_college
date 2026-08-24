import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useRouter, Stack } from 'expo-router';
import { Mic, MicOff, SwitchCamera, Volume2, Sparkles } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import * as fp from 'fingerpose';
import { allGestures } from '../services/GestureDictionary';

const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js" crossorigin="anonymous"></script>
  <style>
    body { margin: 0; background: #0B1956; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; }
    video, canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
    /* We make video visible, and canvas will just draw landmarks on top. */
    video { opacity: 1; z-index: 1; transform: scaleX(-1); }
    canvas { z-index: 2; pointer-events: none; }
  </style>
</head>
<body>
  <video id="video" autoplay playsinline muted></video>
  <canvas id="canvas"></canvas>
  <script>
    let facingMode = 'user';
    let isActive = true;
    
    // FASE 3: TFJS LSTM Model
    let tfModel = null;
    let sequenceBuffer = [];
    
    async function loadModel() {
       try {
          tfModel = await tf.loadLayersModel('https://cokie-college.vercel.app/models/model.json'); // Reemplazar con URL real
       } catch(e) { console.log('No LSTM model found, using raw landmarks'); }
    }
    loadModel();

    const videoElement = document.getElementById('video');
    const canvasElement = document.getElementById('canvas');
    const canvasCtx = canvasElement.getContext('2d');
    
    const holistic = new Holistic({locateFile: (file) => {
      return \`https://cdn.jsdelivr.net/npm/@mediapipe/holistic/\${file}\`;
    }});
    
    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: true,
      refineFaceLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    holistic.onResults((results) => {
      if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
      }
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      
      if (facingMode === 'user') {
        videoElement.style.transform = 'scaleX(-1)';
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
      } else {
        videoElement.style.transform = 'none';
      }
      
      if (isActive) {
          drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
          drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2});
          drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {color: '#CC0000', lineWidth: 5});
          drawLandmarks(canvasCtx, results.leftHandLandmarks, {color: '#00FF00', lineWidth: 2});
          drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {color: '#00CC00', lineWidth: 5});
          drawLandmarks(canvasCtx, results.rightHandLandmarks, {color: '#FF0000', lineWidth: 2});
      }
      canvasCtx.restore();
      
      if (isActive && window.ReactNativeWebView) {
         // LSTM Feature Extraction in WebView (Web Engine)
         let pose = new Array(33*4).fill(0);
         let lh = new Array(21*3).fill(0);
         let rh = new Array(21*3).fill(0);
         
         if (results.poseLandmarks) pose = results.poseLandmarks.map(lm => [lm.x, lm.y, lm.z, lm.visibility]).flat();
         if (results.leftHandLandmarks) lh = results.leftHandLandmarks.map(lm => [lm.x, lm.y, lm.z]).flat();
         if (results.rightHandLandmarks) rh = results.rightHandLandmarks.map(lm => [lm.x, lm.y, lm.z]).flat();
         
         const features = [...pose, ...lh, ...rh];
         sequenceBuffer.push(features);
         if (sequenceBuffer.length > 30) sequenceBuffer.shift();

         let detectedKeyByLSTM = null;
         if (tfModel && sequenceBuffer.length === 30) {
             const inputTensor = tf.tensor([sequenceBuffer]);
             const prediction = tfModel.predict(inputTensor);
             // detectedKeyByLSTM = mapping logic...
         }

         // Send back to React Native Bridge
         const data = {};
         if (results.rightHandLandmarks) data.rightHand = results.rightHandLandmarks.map(lm => [lm.x, lm.y, lm.z]);
         if (results.leftHandLandmarks) data.leftHand = results.leftHandLandmarks.map(lm => [lm.x, lm.y, lm.z]);
         
         if (data.rightHand || data.leftHand || detectedKeyByLSTM) {
             window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'landmarks', 
                ...data, 
                lstmKey: detectedKeyByLSTM 
             }));
         }
      }
    });
    
    let camera = null;
    
    function startCamera() {
       if (camera) camera.stop();
       camera = new Camera(videoElement, {
          onFrame: async () => {
             if (videoElement.videoWidth > 0) {
                 await holistic.send({image: videoElement});
             }
          },
          width: 640,
          height: 480,
          facingMode: facingMode
       });
       camera.start();
    }
    
    startCamera();
    
    window.addEventListener('message', (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'toggle_camera') {
                facingMode = facingMode === 'user' ? 'environment' : 'user';
                startCamera();
            } else if (msg.type === 'set_active') {
                isActive = msg.isActive;
            }
        } catch(e) {}
    });
  </script>
</body>
</html>
`;

export default function InterpreterScreenNative() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [hasPermission, setHasPermission] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [lastTranslation, setLastTranslation] = useState('');
  const [subtitleHistory, setSubtitleHistory] = useState([]);
  
  const webViewRef = useRef(null);
  const gestureEstimator = useRef(new fp.GestureEstimator(allGestures));
  
  // Variables FASE 3 Estabilización
  const recentPredictions = useRef([]);
  const lastSpoken = useRef('');
  const noDetectionCount = useRef(0);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn("No se pudo configurar el audio:", e);
      }
    })();
  }, []);

  const handleTranslation = (key) => {
    const translatedText = t(`signs.${key.replace('sign.', '')}`, { defaultValue: key });
    
    setLastTranslation(translatedText);
    setSubtitleHistory(prev => [translatedText, ...prev.slice(0, 4)]);
    
    try {
      const currentLang = i18n.language || 'es';
      const langCode = currentLang.startsWith('en') ? 'en-US' : 'es-MX';
      
      Speech.speak(translatedText, {
        language: langCode,
        pitch: 1.0,
        rate: 1.0,
      });
    } catch (err) {
      console.warn('Error en Speech nativo:', err);
    }
  };

  const onMessage = (event) => {
    if (!isActive) return;
    
    try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'landmarks') {
            let detectedKey = data.lstmKey || null; // Priorizamos LSTM del WebView si existe
            let highestConfidence = 0;
            
            // Fallback a Fingerpose si LSTM no predijo
            const evaluateGestures = (landmarks) => {
                const estimated = gestureEstimator.current.estimate(landmarks, 7.0);
                if (estimated.gestures.length > 0) {
                   let best = estimated.gestures.sort((a,b) => b.confidence - a.confidence)[0];
                   
                   // Desempate 4 vs B
                   if (best.name === 'sign.4' || best.name === 'sign.b') {
                      const dist = Math.sqrt(Math.pow(landmarks[8][0] - landmarks[20][0], 2) + Math.pow(landmarks[8][1] - landmarks[20][1], 2));
                      best.name = dist > 0.085 ? 'sign.4' : 'sign.b';
                   }
                   
                   // Desempate U vs V / 2
                   if (best.name === 'sign.v' || best.name === 'sign.2' || best.name === 'sign.u') {
                      const dist = Math.sqrt(Math.pow(landmarks[8][0] - landmarks[12][0], 2) + Math.pow(landmarks[8][1] - landmarks[12][1], 2));
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
            
            if (!detectedKey && data.rightHand) evaluateGestures(data.rightHand);
            if (!detectedKey && data.leftHand) evaluateGestures(data.leftHand);
            
            if (!detectedKey) {
               noDetectionCount.current += 1;
               if (noDetectionCount.current > 15) {
                   recentPredictions.current = [];
                   lastSpoken.current = '';
                   noDetectionCount.current = 0;
               }
            } else {
               noDetectionCount.current = 0;
               recentPredictions.current.push(detectedKey);
               if (recentPredictions.current.length > 6) {
                   recentPredictions.current.shift();
               }
               
               if (recentPredictions.current.length === 6 && recentPredictions.current.every(val => val === detectedKey)) {
                   if (detectedKey !== lastSpoken.current) {
                       lastSpoken.current = detectedKey;
                       handleTranslation(detectedKey);
                   }
                   recentPredictions.current = [detectedKey, detectedKey, detectedKey];
               }
            }
        }
    } catch (e) {
        // Ignorar JSON malformado
    }
  };

  function toggleCameraType() {
    if (webViewRef.current) {
       webViewRef.current.postMessage(JSON.stringify({ type: 'toggle_camera' }));
    }
  }
  
  function toggleActive() {
    const newState = !isActive;
    setIsActive(newState);
    if (webViewRef.current) {
       webViewRef.current.postMessage(JSON.stringify({ type: 'set_active', isActive: newState }));
    }
  }

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }
  
  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.text}>{t('interpreter.noPermission', 'No hay permisos de cámara')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '' }} />

      <View style={styles.cameraContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: HTML_CONTENT, baseUrl: 'https://app.cokiehall.lat' }}
          originWhitelist={['*']}
          style={StyleSheet.absoluteFill}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          mediaCapturePermissionGrantType="grant"
          onMessage={onMessage}
          bounces={false}
          scrollEnabled={false}
        />
        
        {/* Botón flotante para girar cámara */}
        <TouchableOpacity onPress={toggleCameraType} style={styles.floatingRotateButton}>
          <SwitchCamera color="#fff" size={26} />
        </TouchableOpacity>
        
        {/* Instrucciones superiores */}
        <View style={styles.instructionBadge}>
          <Sparkles color="#F6BE2F" size={16} style={{ marginRight: 6 }} />
          <Text style={styles.instructionText}>
            {t('interpreter.instructions', 'Modo Exposición: Coloca las manos y rostro frente a la cámara')}
          </Text>
        </View>

        {/* Subtítulos gigantes para salón de clases */}
        <View style={styles.subtitleOverlay}>
          <View style={styles.subtitleHeader}>
            <Volume2 color="#10b981" size={20} />
            <Text style={styles.subtitleHeaderTitle}>TRADUCCIÓN EN TIEMPO REAL LOCAL IA (BETA)</Text>
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

          {/* Historial reciente */}
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
          onPress={toggleActive}
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
