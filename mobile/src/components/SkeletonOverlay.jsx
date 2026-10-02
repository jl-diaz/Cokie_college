import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Line, Circle, Polyline, G } from 'react-native-svg';

// ── CONEXIONES DE LAS MANOS (21 PUNTOS POR MANO) ───────────────────────────
export const FINGER_CHAINS = [
  [0, 1, 2, 3, 4],       // Pulgar
  [0, 5, 6, 7, 8],       // Índice
  [9, 10, 11, 12],      // Medio
  [13, 14, 15, 16],     // Anular
  [17, 18, 19, 20],     // Meñique
];

export const PALM_CONNECTIONS = [
  [0, 9],
  [0, 13],
  [0, 17],
  [5, 9],
  [9, 13],
  [13, 17],
];

export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

export const FINGERTIPS = [4, 8, 12, 16, 20];

// ── CONEXIONES SUPERIORES DEL CUERPO (POSE / TORSO Y BRAZOS) ───────────────
export const POSE_CONNECTIONS = [
  [11, 12],             // Hombro a Hombro
  [11, 13], [13, 15],   // Brazo derecho: Hombro -> Codo -> Muñeca
  [12, 14], [14, 16],   // Brazo izquierdo: Hombro -> Codo -> Muñeca
  [11, 23], [12, 24],   // Torso lateral: Hombros a Caderas
  [23, 24],             // Cadera a Cadera
];

export const POSE_KEYPOINTS = [11, 12, 13, 14, 15, 16, 23, 24];

// ── CONTORNOS FACIALES ESTÉTICOS (MEDIAPIPE FACE MESH) ─────────────────────
export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109, 10
];

export const LEFT_EYEBROW = [70, 63, 105, 66, 107];
export const RIGHT_EYEBROW = [336, 296, 334, 293, 300];

export const LEFT_EYE = [33, 160, 158, 133, 153, 144, 33];
export const RIGHT_EYE = [362, 385, 387, 263, 373, 380, 362];

export const NOSE_BRIDGE = [168, 6, 197, 195, 5, 4, 1, 2];
export const NOSE_BOTTOM = [98, 97, 2, 326, 327];

export const LIPS_OUTER = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61
];

export const LIPS_INNER = [
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78
];

// Puntos clave del rostro para dibujar nodos estéticos cyan
const MAIN_FACE_DOT_INDICES = [
  // Cejas
  70, 63, 105, 66, 107, 336, 296, 334, 293, 300,
  // Ojos
  33, 133, 158, 153, 362, 263, 387, 373,
  // Nariz
  168, 6, 1, 4, 98, 327,
  // Labios
  61, 0, 291, 17, 13, 14,
  // Mandíbula y barbilla
  152, 172, 397, 10, 234, 454
];

/**
 * Componente de trazado de esqueleto y puntos en tiempo real (60 FPS)
 * Estética idéntica a Google MediaPipe Holistic:
 * - Rostro: Contornos y nodos en Cyan Eléctrico (#38BDF8)
 * - Mano Derecha: Dorado / Amarillo Cálido (#FACC15)
 * - Mano Izquierda: Magenta / Rosa Neón (#F472B6)
 * - Cuerpo/Torso: Líneas minimalistas blancas translúcidas y nodos cyan
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

    const hasHands = landmarks?.hands?.length > 0 || landmarks?.left_hand || landmarks?.right_hand || landmarks?.leftHandLandmarks || landmarks?.rightHandLandmarks;
    const hasPose = landmarks?.pose?.length > 0 || landmarks?.poseLandmarks?.length > 0;
    const hasFace = landmarks?.face?.length > 0 || landmarks?.faceLandmarks?.length > 0;

    if (landmarks && (hasHands || hasPose || hasFace)) {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      setDisplayLandmarks(landmarks);

      // Desvanecer suavemente si no se reciben nuevos fotogramas en 500ms
      fadeTimeoutRef.current = setTimeout(() => {
        setDisplayLandmarks(null);
      }, 500);
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

  // Función para proyectar coordenadas normalizadas [0, 1] al tamaño de pantalla
  const toScreen = (pt) => {
    if (!pt) return { x: 0, y: 0 };
    const rawX = typeof pt.x === 'number' ? pt.x : 0;
    const rawY = typeof pt.y === 'number' ? pt.y : 0;
    const x = mirrored ? (1.0 - rawX) * effectiveWidth : rawX * effectiveWidth;
    const y = rawY * effectiveHeight;
    return { x, y };
  };

  const toPolylineString = (indices, pointsArray) => {
    return indices
      .map(idx => {
        const pt = pointsArray[idx];
        if (!pt) return null;
        if (pt.x <= 0 && pt.y <= 0) return null;
        const c = toScreen(pt);
        return `${c.x.toFixed(1)},${c.y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  };

  // Normalizar datos de puntos
  const face = displayLandmarks?.face || displayLandmarks?.faceLandmarks || displayLandmarks?.face_landmarks || [];
  const pose = displayLandmarks?.pose || displayLandmarks?.poseLandmarks || displayLandmarks?.pose_landmarks || [];

  // Clasificar manos en derecha e izquierda para aplicar color diferenciado (Oro vs Magenta)
  let rightHand = displayLandmarks?.right_hand || displayLandmarks?.rightHandLandmarks || null;
  let leftHand = displayLandmarks?.left_hand || displayLandmarks?.leftHandLandmarks || null;

  if (!rightHand && !leftHand && displayLandmarks?.hands?.length > 0) {
    const rawHands = displayLandmarks.hands;
    if (rawHands.length === 1) {
      const wristX = rawHands[0][0]?.x ?? 0.5;
      if (mirrored ? wristX > 0.5 : wristX < 0.5) {
        rightHand = rawHands[0];
      } else {
        leftHand = rawHands[0];
      }
    } else if (rawHands.length >= 2) {
      const h0Wrist = rawHands[0][0]?.x ?? 0;
      const h1Wrist = rawHands[1][0]?.x ?? 1;
      if (h0Wrist < h1Wrist) {
        rightHand = mirrored ? rawHands[1] : rawHands[0];
        leftHand = mirrored ? rawHands[0] : rawHands[1];
      } else {
        rightHand = mirrored ? rawHands[0] : rawHands[1];
        leftHand = mirrored ? rawHands[1] : rawHands[0];
      }
    }
  }

  // Renderizador de mano con paleta de color específica
  const renderHand = (hand, colorConfig, keyPrefix) => {
    if (!hand || hand.length < 21) return null;

    const { lineStroke, jointFill, jointStroke, tipStroke, tipFill } = colorConfig;

    return (
      <G id={keyPrefix} key={keyPrefix}>
        {/* Dedos continuos con Polyline para máxima fluidez y líneas limpias */}
        {FINGER_CHAINS.map((chain, cIdx) => {
          const pts = toPolylineString(chain, hand);
          if (!pts) return null;
          return (
            <Polyline
              key={`${keyPrefix}-chain-${cIdx}`}
              points={pts}
              fill="none"
              stroke={lineStroke}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.92}
            />
          );
        })}

        {/* Conexiones de la base de la palma */}
        {PALM_CONNECTIONS.map(([idx1, idx2], pIdx) => {
          const p1 = hand[idx1];
          const p2 = hand[idx2];
          if (!p1 || !p2) return null;
          const c1 = toScreen(p1);
          const c2 = toScreen(p2);
          return (
            <Line
              key={`${keyPrefix}-palm-${pIdx}`}
              x1={c1.x}
              y1={c1.y}
              x2={c2.x}
              y2={c2.y}
              stroke={lineStroke}
              strokeWidth="2.0"
              strokeLinecap="round"
              opacity={0.88}
            />
          );
        })}

        {/* Nodos de articulaciones de los dedos y muñeca */}
        {hand.map((pt, idx) => {
          if (!pt || (pt.x <= 0 && pt.y <= 0)) return null;
          const c = toScreen(pt);
          const isTip = FINGERTIPS.includes(idx);
          const isWrist = idx === 0;

          if (isTip) {
            return (
              <Circle
                key={`${keyPrefix}-pt-${idx}`}
                cx={c.x}
                cy={c.y}
                r={3.8}
                fill={tipFill}
                stroke={tipStroke}
                strokeWidth={1.8}
              />
            );
          }

          return (
            <Circle
              key={`${keyPrefix}-pt-${idx}`}
              cx={c.x}
              cy={c.y}
              r={isWrist ? 4.2 : 2.8}
              fill={jointFill}
              stroke={jointStroke}
              strokeWidth={1.2}
            />
          );
        })}
      </G>
    );
  };

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
        {/* ── 1. ESQUELETO DEL CUERPO (POSE / TORSO Y BRAZOS) ── */}
        {pose.length > 16 && (
          <G id="pose-layer">
            {/* Líneas translúcidas blancas minimalistas */}
            {POSE_CONNECTIONS.map(([idx1, idx2], i) => {
              const p1 = pose[idx1];
              const p2 = pose[idx2];
              if (!p1 || !p2) return null;
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
                  stroke="rgba(255, 255, 255, 0.78)"
                  strokeWidth="2.0"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Puntos de articulación del torso y brazos con brillo cyan */}
            {POSE_KEYPOINTS.map((idx) => {
              const p = pose[idx];
              if (!p || (p.x <= 0 && p.y <= 0)) return null;
              const c = toScreen(p);
              return (
                <Circle
                  key={`pose-pt-${idx}`}
                  cx={c.x}
                  cy={c.y}
                  r="3.8"
                  fill="#FFFFFF"
                  stroke="#38BDF8"
                  strokeWidth="1.8"
                />
              );
            })}
          </G>
        )}

        {/* ── 2. MALLA Y CONTORNOS DEL ROSTRO (CYAN ELÉCTRICO) ── */}
        {face.length >= 30 && (
          <G id="face-layer">
            {/* Contorno Oval de la cara / barbilla */}
            <Polyline
              points={toPolylineString(FACE_OVAL, face)}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.82}
            />

            {/* Cejas izquierda y derecha */}
            <Polyline
              points={toPolylineString(LEFT_EYEBROW, face)}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity={0.85}
            />
            <Polyline
              points={toPolylineString(RIGHT_EYEBROW, face)}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity={0.85}
            />

            {/* Ojos izquierdo y derecho */}
            <Polyline
              points={toPolylineString(LEFT_EYE, face)}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity={0.85}
            />
            <Polyline
              points={toPolylineString(RIGHT_EYE, face)}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity={0.85}
            />

            {/* Puente y base de la nariz */}
            <Polyline
              points={toPolylineString(NOSE_BRIDGE, face)}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity={0.8}
            />
            <Polyline
              points={toPolylineString(NOSE_BOTTOM, face)}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity={0.8}
            />

            {/* Labios externos e internos */}
            <Polyline
              points={toPolylineString(LIPS_OUTER, face)}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity={0.88}
            />
            <Polyline
              points={toPolylineString(LIPS_INNER, face)}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity={0.8}
            />

            {/* Nodos cyan en los puntos de facciones principales */}
            {MAIN_FACE_DOT_INDICES.map((idx) => {
              const pt = face[idx];
              if (!pt || (pt.x <= 0 && pt.y <= 0)) return null;
              const c = toScreen(pt);
              return (
                <Circle
                  key={`face-dot-${idx}`}
                  cx={c.x}
                  cy={c.y}
                  r="2.0"
                  fill="#BAE6FD"
                  stroke="#0284C7"
                  strokeWidth="0.8"
                />
              );
            })}
          </G>
        )}

        {/* ── 3. MANO DERECHA (DORADO / AMARILLO CÁLIDO) ── */}
        {renderHand(
          rightHand,
          {
            lineStroke: '#FACC15',
            jointFill: '#FEF08A',
            jointStroke: '#CA8A04',
            tipFill: '#FFFFFF',
            tipStroke: '#EAB308',
          },
          'right-hand'
        )}

        {/* ── 4. MANO IZQUIERDA (MAGENTA / ROSA NEÓN) ── */}
        {renderHand(
          leftHand,
          {
            lineStroke: '#F472B6',
            jointFill: '#FBCFE8',
            jointStroke: '#DB2777',
            tipFill: '#FFFFFF',
            tipStroke: '#EC4899',
          },
          'left-hand'
        )}
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
