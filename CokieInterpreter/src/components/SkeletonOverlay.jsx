import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';

// Conexiones de los 21 puntos clave de la mano de MediaPipe
const HAND_CONNECTIONS = [
  // Palma y base
  [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
  // Pulgar
  [1, 2], [2, 3], [3, 4],
  // Índice
  [5, 6], [6, 7], [7, 8],
  // Medio
  [9, 10], [10, 11], [11, 12],
  // Anular
  [13, 14], [14, 15], [15, 16],
  // Meñique
  [17, 18], [18, 19], [19, 20],
];

// Conexiones de torso y brazos de Pose (MediaPipe Holistic / Pose)
const POSE_CONNECTIONS_INDICES = [
  [11, 12], // Hombro izq a hombro der
  [11, 13], // Hombro izq a codo izq
  [13, 15], // Codo izq a muñeca izq
  [12, 14], // Hombro der a codo der
  [14, 16], // Codo der a muñeca der
  [11, 23], // Hombro izq a torso/cadera izq
  [12, 24], // Hombro der a torso/cadera der
  [23, 24], // Conexión de cadera
];

const POSE_KEYPOINTS = [11, 12, 13, 14, 15, 16, 23, 24]; // Hombros, codos, muñecas y torso

// Color clásico original MediaPipe (idéntico a la captura de referencia del usuario)
const COLOR_CONNECTOR = '#00FF00'; // Verde neón puro vibrante
const COLOR_LANDMARK = '#FF0000';  // Puntos circulares rojos puros sólidos
const LINE_WIDTH = '3.2';

export default function SkeletonOverlay({
  width = 360,
  height = 440,
  landmarksData = null,
  isActive = true,
  mode = 'full', // 'full' | 'hands' | 'pose'
  facing = 'front',
  videoSource = 'webcam',
}) {
  if (!isActive) return null;

  // En la cámara frontal del teléfono, la vista previa se muestra en espejo horizontal.
  // Invertimos la coordenada X para alinearla al 100% con la mano del usuario.
  const isMirrored = videoSource === 'webcam' && facing === 'front';

  const hands = useMemo(() => {
    if (landmarksData && landmarksData.hands && landmarksData.hands.length > 0) {
      return landmarksData.hands;
    }
    return [];
  }, [landmarksData]);

  const pose = useMemo(() => {
    if (landmarksData && landmarksData.pose && landmarksData.pose.length > 0) {
      return landmarksData.pose;
    }
    return [];
  }, [landmarksData]);

  const getX = (val) => (isMirrored ? (1.0 - val) : val) * width;
  const getY = (val) => val * height;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill}>
        {/* ── 1. ESQUELETO DE POSE / BRAZOS, HOMBROS Y TORSO (Líneas verdes + Puntos rojos) ── */}
        {(mode === 'full' || mode === 'pose') && pose.length >= 17 && (
          <G key="pose-skeleton">
            {/* Conexiones de hombros, brazos y torso */}
            {POSE_CONNECTIONS_INDICES.map(([p1Idx, p2Idx], lineIdx) => {
              const p1 = pose[p1Idx];
              const p2 = pose[p2Idx];
              if (!p1 || !p2) return null;
              return (
                <Line
                  key={`pose-line-${lineIdx}`}
                  x1={getX(p1.x)}
                  y1={getY(p1.y)}
                  x2={getX(p2.x)}
                  y2={getY(p2.y)}
                  stroke={COLOR_CONNECTOR}
                  strokeWidth={LINE_WIDTH}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Puntos de articulaciones corporales (Rojo puro sólido) */}
            {POSE_KEYPOINTS.map((idx) => {
              const pt = pose[idx];
              if (!pt) return null;
              return (
                <Circle
                  key={`pose-pt-${idx}`}
                  cx={getX(pt.x)}
                  cy={getY(pt.y)}
                  r={5.5}
                  fill={COLOR_LANDMARK}
                />
              );
            })}
          </G>
        )}

        {/* ── 2. ESQUELETO DE MANOS (21 PUNTOS POR MANO: Líneas verdes + Puntos rojos) ── */}
        {(mode === 'full' || mode === 'hands') &&
          hands.map((handPoints, handIdx) => {
            if (!handPoints || handPoints.length < 21) return null;

            // Escalar puntos normalizados con corrección de espejo
            const scaled = handPoints.map((pt) => ({
              x: getX(pt.x),
              y: getY(pt.y),
            }));

            // Si hay pose disponible, conectar la muñeca de la mano (punto 0) con el codo correspondiente
            let forearmLine = null;
            if (pose && pose.length >= 17 && scaled[0]) {
              // Buscar el codo o muñeca de pose más cercano
              const wristHand = scaled[0];
              const leftElbow = pose[13] ? { x: getX(pose[13].x), y: getY(pose[13].y) } : null;
              const rightElbow = pose[14] ? { x: getX(pose[14].x), y: getY(pose[14].y) } : null;

              let closestElbow = null;
              if (leftElbow && rightElbow) {
                const distLeft = Math.hypot(wristHand.x - leftElbow.x, wristHand.y - leftElbow.y);
                const distRight = Math.hypot(wristHand.x - rightElbow.x, wristHand.y - rightElbow.y);
                closestElbow = distLeft < distRight ? leftElbow : rightElbow;
              } else {
                closestElbow = leftElbow || rightElbow;
              }

              if (closestElbow) {
                forearmLine = (
                  <Line
                    key={`forearm-${handIdx}`}
                    x1={wristHand.x}
                    y1={wristHand.y}
                    x2={closestElbow.x}
                    y2={closestElbow.y}
                    stroke={COLOR_CONNECTOR}
                    strokeWidth={LINE_WIDTH}
                    strokeLinecap="round"
                  />
                );
              }
            }

            return (
              <G key={`hand-${handIdx}`}>
                {/* Línea del antebrazo conectando mano y codo */}
                {forearmLine}

                {/* Líneas conectoras de los 21 puntos en verde neón */}
                {HAND_CONNECTIONS.map(([startIdx, endIdx], lineIdx) => {
                  const p1 = scaled[startIdx];
                  const p2 = scaled[endIdx];
                  if (!p1 || !p2) return null;
                  return (
                    <Line
                      key={`line-${handIdx}-${lineIdx}`}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={COLOR_CONNECTOR}
                      strokeWidth={LINE_WIDTH}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Puntos de articulaciones de la mano en rojo puro sólido (exacto a la imagen anterior) */}
                {scaled.map((pt, ptIdx) => {
                  const isFingertip = [4, 8, 12, 16, 20].includes(ptIdx);
                  const isWrist = ptIdx === 0;

                  return (
                    <Circle
                      key={`point-${handIdx}-${ptIdx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={isWrist ? 6 : isFingertip ? 5 : 4.5}
                      fill={COLOR_LANDMARK}
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
