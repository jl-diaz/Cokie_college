import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Line, Circle, G } from 'react-native-svg';

// Conexiones de los 21 puntos de la mano en MediaPipe
export const HAND_CONNECTIONS = [
  // Pulgar
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Índice
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Medio
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Anular
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Meñique
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Nudillos de la palma
  [5, 9], [9, 13], [13, 17]
];

// Conexiones de articulaciones superiores del cuerpo (Pose)
export const POSE_CONNECTIONS = [
  // Hombro a Hombro
  [11, 12],
  // Brazo izquierdo: Hombro -> Codo -> Muñeca
  [11, 13], [13, 15],
  // Brazo derecho: Hombro -> Codo -> Muñeca
  [12, 14], [14, 16],
  // Torso / Tronco
  [11, 23], [12, 24], [23, 24]
];

const POSE_KEYPOINTS = [11, 12, 13, 14, 15, 16, 23, 24];

/**
 * Componente de trazado de esqueleto y puntos en tiempo real (60 FPS)
 * Compatible con Web, APK Android, Expo y streaming de CokieLens.
 */
export default function SkeletonOverlay({
  landmarks = null,
  mirrored = false,
  customWidth = null,
  customHeight = null,
  active = true
}) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const fadeTimeoutRef = useRef(null);
  const [displayLandmarks, setDisplayLandmarks] = useState(null);

  const effectiveWidth = customWidth || layout.width;
  const effectiveHeight = customHeight || layout.height;

  useEffect(() => {
    if (!active) {
      setDisplayLandmarks(null);
      return;
    }

    if (landmarks && (landmarks.hands?.length > 0 || landmarks.pose?.length > 0)) {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      setDisplayLandmarks(landmarks);

      // Desvanecer suavemente si no se reciben nuevos fotogramas en 350ms
      fadeTimeoutRef.current = setTimeout(() => {
        setDisplayLandmarks(null);
      }, 350);
    }

    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [landmarks, active]);

  if (!active || !effectiveWidth || !effectiveHeight) {
    return (
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width !== layout.width || height !== layout.height) {
            setLayout({ width, height });
          }
        }}
      />
    );
  }

  // Función para proyectar coordenadas normalizadas [0, 1] al tamaño del contenedor
  const toScreen = (pt) => {
    if (!pt) return { x: 0, y: 0 };
    const rawX = typeof pt.x === 'number' ? pt.x : 0;
    const rawY = typeof pt.y === 'number' ? pt.y : 0;
    const x = mirrored ? (1.0 - rawX) * effectiveWidth : rawX * effectiveWidth;
    const y = rawY * effectiveHeight;
    return { x, y };
  };

  const hands = displayLandmarks?.hands || [];
  const pose = displayLandmarks?.pose || [];

  return (
    <View
      pointerEvents="none"
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== layout.width || height !== layout.height) {
          setLayout({ width, height });
        }
      }}
    >
      <Svg
        width={effectiveWidth}
        height={effectiveHeight}
        style={StyleSheet.absoluteFillObject}
      >
        {/* ── 1. ESQUELETO DEL CUERPO (POSE / BRAZOS Y HOMBROS) ── */}
        {pose.length > 16 && (
          <G id="pose-layer">
            {/* Líneas de conexión del cuerpo (Verde Neón) */}
            {POSE_CONNECTIONS.map(([idx1, idx2], i) => {
              const p1 = pose[idx1];
              const p2 = pose[idx2];
              if (!p1 || !p2) return null;
              // Omitir si los puntos están fuera de encuadre o en 0
              if (p1.x <= 0 && p1.y <= 0) return null;
              if (p2.x <= 0 && p2.y <= 0) return null;

              const c1 = toScreen(p1);
              const c2 = toScreen(p2);

              return (
                <Line
                  key={`pose-line-${i}`}
                  x1={c1.x}
                  y1={c1.y}
                  x2={c2.x}
                  y2={c2.y}
                  stroke="#00FF66"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  opacity={0.85}
                />
              );
            })}

            {/* Puntos de articulación del cuerpo (Rojo Brillante) */}
            {POSE_KEYPOINTS.map((idx) => {
              const p = pose[idx];
              if (!p || (p.x <= 0 && p.y <= 0)) return null;
              const c = toScreen(p);
              return (
                <Circle
                  key={`pose-pt-${idx}`}
                  cx={c.x}
                  cy={c.y}
                  r="5"
                  fill="#FF0033"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              );
            })}
          </G>
        )}

        {/* ── 2. ESQUELETO DE LAS MANOS (21 PUNTOS POR MANO) ── */}
        {hands.map((hand, handIndex) => {
          if (!hand || hand.length < 21) return null;

          return (
            <G key={`hand-${handIndex}`}>
              {/* Conexiones de los dedos y palma (Verde Neón) */}
              {HAND_CONNECTIONS.map(([idx1, idx2], connIdx) => {
                const p1 = hand[idx1];
                const p2 = hand[idx2];
                if (!p1 || !p2) return null;

                const c1 = toScreen(p1);
                const c2 = toScreen(p2);

                return (
                  <Line
                    key={`hconn-${handIndex}-${connIdx}`}
                    x1={c1.x}
                    y1={c1.y}
                    x2={c2.x}
                    y2={c2.y}
                    stroke="#00FF44"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    opacity={0.95}
                  />
                );
              })}

              {/* Los 21 Puntos de la mano (Rojo Vivo) */}
              {hand.map((pt, ptIdx) => {
                if (!pt) return null;
                const c = toScreen(pt);
                const isFingertip = [4, 8, 12, 16, 20].includes(ptIdx);
                const isWrist = ptIdx === 0;

                return (
                  <Circle
                    key={`hpt-${handIndex}-${ptIdx}`}
                    cx={c.x}
                    cy={c.y}
                    r={isFingertip ? 5.5 : isWrist ? 6 : 4}
                    fill={isFingertip ? "#FF2222" : "#FF0033"}
                    stroke={isFingertip ? "#FFFF00" : "#FFFFFF"}
                    strokeWidth={isFingertip ? 1.5 : 1}
                  />
                );
              })}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
  }
});
