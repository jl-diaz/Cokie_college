import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import Svg, { Circle, Line, G, Rect } from 'react-native-svg';
import Colors from '../constants/colors';

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

// Conexiones de brazos y hombros (Pose)
const POSE_CONNECTIONS = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
];

export default function SkeletonOverlay({
  width = 360,
  height = 480,
  landmarksData = null,
  isActive = true,
  mode = 'full', // 'full' | 'hands' | 'pose'
}) {
  if (!isActive) return null;

  // Si no hay datos directos, generar puntos de muestra sutiles si hay detección activa
  const hands = useMemo(() => {
    if (landmarksData?.hands && landmarksData.hands.length > 0) {
      return landmarksData.hands;
    }
    return [];
  }, [landmarksData]);

  const hasHands = hands.length > 0;
  const motionEnergy = landmarksData?.motion_energy || 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill}>
        {/* ── 1. DIBUJAR ESQUELETO DE MANOS (21 Puntos + Líneas Naranjas como en las imágenes 2 y 3) ── */}
        {(mode === 'full' || mode === 'hands') &&
          hands.map((handPoints, handIdx) => {
            if (!handPoints || handPoints.length < 21) return null;

            // Escalar puntos normalizados (0.0 a 1.0) al ancho y alto del contenedor
            const scaled = handPoints.map((pt) => ({
              x: pt.x * width,
              y: pt.y * height,
            }));

            // Calcular caja delimitadora
            const xs = scaled.map((p) => p.x);
            const ys = scaled.map((p) => p.y);
            const minX = Math.min(...xs) - 14;
            const maxX = Math.max(...xs) + 14;
            const minY = Math.min(...ys) - 14;
            const maxY = Math.max(...ys) + 14;

            return (
              <G key={`hand-${handIdx}`}>
                {/* Caja delimitadora sutil */}
                <Rect
                  x={minX}
                  y={minY}
                  width={maxX - minX}
                  height={maxY - minY}
                  fill="rgba(56, 189, 248, 0.04)"
                  stroke="rgba(56, 189, 248, 0.35)"
                  strokeWidth="1.2"
                  strokeDasharray="4, 4"
                  rx="8"
                />

                {/* Líneas conectores en naranja brillante (como en las imágenes de referencia del usuario) */}
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
                      stroke="#F97316" // Naranja idéntico al boceto
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Puntos circulares azules con centro blanco (como en las imágenes 2 y 3) */}
                {scaled.map((pt, ptIdx) => {
                  const isFingertip = [4, 8, 12, 16, 20].includes(ptIdx);
                  const isWrist = ptIdx === 0;

                  return (
                    <G key={`point-${handIdx}-${ptIdx}`}>
                      {/* Aro exterior azul / cian */}
                      <Circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isFingertip ? 5.5 : isWrist ? 6 : 4.5}
                        fill="#2563EB" // Azul vibrante
                        stroke="#60A5FA"
                        strokeWidth="1.5"
                      />
                      {/* Núcleo blanco de alta precisión */}
                      <Circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isFingertip ? 2.5 : 2}
                        fill="#FFFFFF"
                      />
                    </G>
                  );
                })}
              </G>
            );
          })}

        {/* ── 2. DIBUJAR PUNTOS DE POSE Y ROSTRO SI ESTÁN DISPONIBLES ── */}
        {(mode === 'full' || mode === 'pose') && landmarksData?.pose && (
          <G>
            {landmarksData.pose.map((pt, idx) => (
              <Circle
                key={`pose-${idx}`}
                cx={pt.x * width}
                cy={pt.y * height}
                r={4}
                fill="#10B981"
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            ))}
          </G>
        )}
      </Svg>

      {/* ── HUD SUPERIOR DEL ESQUELETO ── */}
      <View style={styles.hudBadge}>
        <View
          style={[
            styles.hudDot,
            { backgroundColor: hasHands ? Colors.success : '#F59E0B' },
          ]}
        />
        <Text style={styles.hudText}>
          {hasHands
            ? `${hands.length} MANO${hands.length > 1 ? 'S' : ''} RASTREADA${hands.length > 1 ? 'S' : ''} (21 PUNTOS)`
            : 'ESPERANDO MANOS PARA RASTREO...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hudBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hudDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hudText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
