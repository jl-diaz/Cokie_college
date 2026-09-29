import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import {
  Camera,
  Glasses,
  SwitchCamera,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  AlertCircle,
  Wifi,
  Sparkles,
  Target,
} from 'lucide-react-native';
import Colors from '../constants/colors';
import DetectionOverlay from './DetectionOverlay';
import SkeletonOverlay from './SkeletonOverlay';
import WebSocketService from '../services/WebSocketService';
import Esp32Service from '../services/Esp32Service';
import { useInterpreter } from '../context/InterpreterContext';

export default function CameraViewportWeb({ isFullscreen, onToggleFullscreen }) {
  const {
    videoSource,
    esp32Ip,
    glassesConnected,
    setGlassesConnected,
    isMuted,
    toggleMute,
    translationState,
    setDetectingMotion,
    aiServerStatus,
    isSkeletonEnabled,
    setIsSkeletonEnabled,
    skeletonMode,
    landmarksData,
  } = useInterpreter();

  const [hasWebcamPermission, setHasWebcamPermission] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [glassesFrameUri, setGlassesFrameUri] = useState(null);
  const [glassesLoading, setGlassesLoading] = useState(false);
  const [fps, setFps] = useState(30);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const glassesPollRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFpsCalcRef = useRef(Date.now());
  const isCapturingRef = useRef(false);

  // Iniciar Webcam en el navegador
  const startWebcam = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasWebcamPermission(false);
      return;
    }

    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setHasWebcamPermission(true);
    } catch (err) {
      console.warn('[CameraViewportWeb] Error accediendo a webcam:', err);
      setHasWebcamPermission(false);
    }
  }, [facingMode]);

  // Detener Webcam
  const stopWebcam = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (videoSource === 'webcam') {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [videoSource, startWebcam, stopWebcam]);

  // Intervalo para capturar frames de webcam y enviar por WebSocket
  useEffect(() => {
    if (videoSource !== 'webcam' || !hasWebcamPermission) {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      return;
    }

    frameIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState === 4) {
        canvas.width = 360;
        canvas.height = 270;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 360, 270);

        const base64 = canvas.toDataURL('image/jpeg', 0.58);
        WebSocketService.sendFrame(base64);

        frameCountRef.current++;
        const now = Date.now();
        if (now - lastFpsCalcRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastFpsCalcRef.current = now;
        }
      }
    }, 190);

    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [videoSource, hasWebcamPermission]);

  // Polling para flujo de ESP32-CAM de Lentes
  useEffect(() => {
    if (videoSource !== 'glasses') {
      if (glassesPollRef.current) clearInterval(glassesPollRef.current);
      return;
    }

    let isSubscribed = true;
    const cleanIp = Esp32Service.cleanIp(esp32Ip);

    const fetchGlassesFrame = async () => {
      if (isCapturingRef.current) return;
      isCapturingRef.current = true;
      try {
        const url = `http://${cleanIp}/capture?t=${Date.now()}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' },
        });
        clearTimeout(timeoutId);

        if (!isSubscribed) return;
        if (res.ok) {
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          setGlassesFrameUri(objectUrl);
          setGlassesConnected(true);
          setGlassesLoading(false);

          // Convertir a base64 para el backend de IA
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result && isSubscribed) {
              WebSocketService.sendFrame(reader.result);
            }
          };
          reader.readAsDataURL(blob);
        } else {
          setGlassesConnected(false);
        }
      } catch (err) {
        if (isSubscribed) {
          setGlassesConnected(false);
        }
      } finally {
        isCapturingRef.current = false;
      }
    };

    setGlassesLoading(true);
    fetchGlassesFrame();
    glassesPollRef.current = setInterval(fetchGlassesFrame, 220);

    return () => {
      isSubscribed = false;
      if (glassesPollRef.current) clearInterval(glassesPollRef.current);
    };
  }, [videoSource, esp32Ip, setGlassesConnected]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const toggleSkeleton = () => {
    setIsSkeletonEnabled((prev) => !prev);
  };

  return (
    <View style={styles.viewportContainer}>
      {videoSource === 'webcam' ? (
        <View style={styles.feedWrapper}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              borderRadius: 24,
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {hasWebcamPermission === false && (
            <View style={styles.permissionFallback}>
              <AlertCircle size={36} color={Colors.warning} />
              <Text style={styles.fallbackTitle}>Cámara no disponible</Text>
              <Text style={styles.fallbackSubtitle}>
                Por favor autoriza el acceso a la cámara en tu navegador o selecciona "Lentes"
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={startWebcam}>
                <Text style={styles.retryButtonText}>Reintentar Permiso</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.feedWrapper}>
          {glassesFrameUri ? (
            <img
              src={glassesFrameUri}
              alt="CokieLens Stream"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 24,
              }}
            />
          ) : (
            <View style={styles.glassesPlaceholder}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.glassesConnectingText}>
                {glassesConnected
                  ? 'Recibiendo fotogramas de CokieLens...'
                  : `Buscando Lentes en ${esp32Ip}...`}
              </Text>
              <Text style={styles.glassesHelpText}>
                Verifica estar conectado al Wi-Fi de los lentes o que estén encendidos
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── TRAZADO DE PUNTOS Y ESQUELETO EN TIEMPO REAL CON CORRECCIÓN DE ESPEJO ── */}
      <SkeletonOverlay
        width={480}
        height={440}
        landmarksData={landmarksData}
        isActive={isSkeletonEnabled}
        mode={skeletonMode}
        facing={facingMode === 'user' ? 'front' : 'back'}
        videoSource={videoSource}
      />

      {/* Retícula y efectos de detección en tiempo real */}
      <DetectionOverlay
        isDetecting={translationState === 'detecting' || translationState === 'updated'}
        source={videoSource}
      />

      {/* ── Overlay HUD Superior Izquierdo: Estado de Conexión & Fuente ── */}
      <View style={styles.topBadgeRow}>
        <View style={styles.liveBadge}>
          <View
            style={[
              styles.liveDot,
              {
                backgroundColor:
                  videoSource === 'webcam'
                    ? hasWebcamPermission
                      ? Colors.success
                      : Colors.danger
                    : glassesConnected
                    ? Colors.success
                    : Colors.warning,
              },
            ]}
          />
          <Text style={styles.liveBadgeText}>
            {videoSource === 'webcam' ? 'WEBCAM EN VIVO' : 'COKIELENS'}
          </Text>
        </View>

        <View style={styles.fpsBadge}>
          <Text style={styles.fpsBadgeText}>{fps} FPS</Text>
        </View>

        {/* Botón Puntos ON/OFF */}
        <TouchableOpacity
          style={[
            styles.skeletonTogglePill,
            isSkeletonEnabled && styles.skeletonTogglePillActive,
          ]}
          onPress={toggleSkeleton}
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

      {/* ── Botones Circulares Flotantes (como se ven en los bocetos 1 y 2) ── */}
      <View style={styles.floatingActionColumn}>
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

        {onToggleFullscreen && (
          <TouchableOpacity
            style={styles.circleActionButton}
            onPress={onToggleFullscreen}
            activeOpacity={0.75}
            accessibilityLabel="Pantalla completa"
          >
            {isFullscreen ? (
              <Minimize2 size={18} color="#FFFFFF" />
            ) : (
              <Maximize2 size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        )}
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
  feedWrapper: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F1218',
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
    maxWidth: 320,
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
  glassesHelpText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 280,
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
  fpsBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  fpsBadgeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
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
