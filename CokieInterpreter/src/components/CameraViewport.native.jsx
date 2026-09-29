import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  SwitchCamera,
  Volume2,
  VolumeX,
  Glasses,
  AlertCircle,
  Wifi,
  Target,
  Layers,
} from 'lucide-react-native';
import Colors from '../constants/colors';
import DetectionOverlay from './DetectionOverlay';
import SkeletonOverlay from './SkeletonOverlay';
import WebSocketService from '../services/WebSocketService';
import Esp32Service from '../services/Esp32Service';
import { useInterpreter } from '../context/InterpreterContext';

export default function CameraViewportNative({ isFullscreen, onToggleFullscreen }) {
  const { width } = useWindowDimensions();
  const {
    videoSource,
    esp32Ip,
    glassesConnected,
    setGlassesConnected,
    isMuted,
    toggleMute,
    translationState,
    isSkeletonEnabled,
    setIsSkeletonEnabled,
    skeletonMode,
    setSkeletonMode,
    landmarksData,
  } = useInterpreter();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('front');
  const [glassesFrameUri, setGlassesFrameUri] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const cameraRef = useRef(null);
  const isCapturingRef = useRef(false);
  const glassesPollRef = useRef(null);

  // Solicitar permiso de cámara
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission().catch(() => {});
    }
  }, [permission, requestPermission]);

  // Captura periódica de fotogramas en modo Teléfono/Cámara para enviar al backend de IA
  useEffect(() => {
    if (videoSource !== 'webcam' || !isCameraReady) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      if (isCapturingRef.current || !cameraRef.current || !isMounted) return;
      try {
        isCapturingRef.current = true;
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: true,
          shutterSound: false,
          skipProcessing: true,
        });

        if (photo?.base64 && isMounted) {
          WebSocketService.sendFrame(`data:image/jpeg;base64,${photo.base64}`);
        }
      } catch (e) {
        // En algunas plataformas puede fallar si la cámara está ocupada
      } finally {
        isCapturingRef.current = false;
      }
    }, 240);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [videoSource, isCameraReady]);

  // Polling y envío continuo de fotogramas de CokieLens (ESP32-CAM)
  useEffect(() => {
    if (videoSource !== 'glasses') {
      if (glassesPollRef.current) clearInterval(glassesPollRef.current);
      return;
    }

    let isMounted = true;
    const cleanIp = Esp32Service.cleanIp(esp32Ip);

    const fetchFrame = async () => {
      if (isCapturingRef.current) return;
      isCapturingRef.current = true;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1400);

        const response = await fetch(`http://${cleanIp}/capture`, {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' },
        });
        clearTimeout(timeoutId);

        if (response.ok && isMounted) {
          setGlassesConnected(true);
          const blob = await response.blob();

          // Conversión a base64 para visualizar y transmitir a la IA
          const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });

          if (typeof base64Data === 'string' && base64Data.length > 50 && isMounted) {
            setGlassesFrameUri(base64Data);
            // Enviar a inferencia de IA
            WebSocketService.sendFrame(base64Data);
          }
        } else if (isMounted) {
          setGlassesConnected(false);
        }
      } catch (err) {
        if (isMounted) setGlassesConnected(false);
      } finally {
        isCapturingRef.current = false;
      }
    };

    fetchFrame();
    glassesPollRef.current = setInterval(fetchFrame, 220);

    return () => {
      isMounted = false;
      if (glassesPollRef.current) clearInterval(glassesPollRef.current);
    };
  }, [videoSource, esp32Ip, setGlassesConnected]);

  const toggleCameraFacing = () => {
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  const toggleSkeletonMode = () => {
    setIsSkeletonEnabled((prev) => !prev);
  };

  return (
    <View style={styles.viewportContainer}>
      {videoSource === 'webcam' ? (
        permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            onCameraReady={() => setIsCameraReady(true)}
            animateShutter={false}
          />
        ) : (
          <View style={styles.permissionFallback}>
            <AlertCircle size={36} color={Colors.warning} />
            <Text style={styles.fallbackTitle}>Permiso de Cámara Requerido</Text>
            <Text style={styles.fallbackSubtitle}>
              CokieInterpreter necesita acceso a la cámara para traducir lenguaje de señas.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={requestPermission}>
              <Text style={styles.retryButtonText}>Conceder Permiso</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        /* Vista de flujo de ESP32-CAM */
        <View style={styles.glassesFeedWrapper}>
          {glassesFrameUri ? (
            <Image
              source={{ uri: glassesFrameUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.glassesPlaceholder}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.glassesConnectingText}>
                {glassesConnected
                  ? 'Recibiendo fotogramas de CokieLens...'
                  : `Buscando Lentes en ${esp32Ip}...`}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── TRAZADO DE PUNTOS Y ESQUELETO EN TIEMPO REAL (Imágenes 2 y 3) ── */}
      <SkeletonOverlay
        width={width > 480 ? 480 : width - 32}
        height={440}
        landmarksData={landmarksData}
        isActive={isSkeletonEnabled}
        mode={skeletonMode}
      />

      {/* Retícula y efectos de detección en tiempo real */}
      <DetectionOverlay
        isDetecting={translationState === 'detecting' || translationState === 'updated'}
        source={videoSource}
      />

      {/* ── Overlay HUD Superior Izquierdo ── */}
      <View style={styles.topBadgeRow}>
        <View style={styles.liveBadge}>
          <View
            style={[
              styles.liveDot,
              {
                backgroundColor:
                  videoSource === 'webcam'
                    ? permission?.granted
                      ? Colors.success
                      : Colors.danger
                    : glassesConnected
                    ? Colors.success
                    : Colors.warning,
              },
            ]}
          />
          <Text style={styles.liveBadgeText}>
            {videoSource === 'webcam' ? 'CÁMARA EN VIVO' : 'COKIELENS'}
          </Text>
        </View>

        {/* Botón Puntos ON/OFF */}
        <TouchableOpacity
          style={[
            styles.skeletonTogglePill,
            isSkeletonEnabled && styles.skeletonTogglePillActive,
          ]}
          onPress={toggleSkeletonMode}
          activeOpacity={0.8}
        >
          <Target size={12} color={isSkeletonEnabled ? '#0B0F17' : '#FFFFFF'} />
          <Text
            style={[
              styles.skeletonToggleText,
              isSkeletonEnabled && styles.skeletonToggleTextActive,
            ]}
          >
            {isSkeletonEnabled ? 'Puntos: ON' : 'Puntos: OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Botones Circulares Flotantes (como en los bocetos 1 y 2) ── */}
      <View style={styles.floatingActionColumn}>
        {/* Botón 1: Alternar Frontal / Trasera */}
        {videoSource === 'webcam' && (
          <TouchableOpacity
            style={styles.circleActionButton}
            onPress={toggleCameraFacing}
            activeOpacity={0.75}
            accessibilityLabel="Girar cámara"
          >
            <SwitchCamera size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Botón 2: Silenciar / Activar Voz */}
        <TouchableOpacity
          style={styles.circleActionButton}
          onPress={toggleMute}
          activeOpacity={0.75}
          accessibilityLabel={isMuted ? 'Activar voz' : 'Silenciar voz'}
        >
          {isMuted ? (
            <VolumeX size={18} color={Colors.danger} />
          ) : (
            <Volume2 size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewportContainer: {
    flex: 1,
    minHeight: 380,
    backgroundColor: '#161922',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  permissionFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 18, 24, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 6,
  },
  fallbackSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#0B0F17',
    fontWeight: '700',
    fontSize: 13,
  },
  glassesFeedWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F1218',
  },
  glassesPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#121620',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  glassesConnectingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
    textAlign: 'center',
  },
  topBadgeRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  skeletonTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  skeletonTogglePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  skeletonToggleText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
  },
  skeletonToggleTextActive: {
    color: '#0B0F17',
    fontWeight: '800',
  },
  floatingActionColumn: {
    position: 'absolute',
    top: 14,
    right: 14,
    gap: 10,
    zIndex: 5,
  },
  circleActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(40, 44, 52, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});
