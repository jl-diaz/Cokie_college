import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import Colors from '../constants/colors';

export default function SmartGlassesGraphic({ width = 280, height = 140, isOnline = true }) {
  const aspectRatio = 280 / 140;
  const computedHeight = height || width / aspectRatio;

  return (
    <View style={[styles.container, { width, height: computedHeight }]}>
      <Svg width={width} height={computedHeight} viewBox="0 0 280 140" fill="none">
        <Defs>
          {/* Degradado del marco elegante de los lentes */}
          <LinearGradient id="frameGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#2D3342" />
            <Stop offset="40%" stopColor="#171A21" />
            <Stop offset="100%" stopColor="#0B0D12" />
          </LinearGradient>

          {/* Degradado de las micas polarizadas */}
          <LinearGradient id="lensGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#1E232F" />
            <Stop offset="45%" stopColor="#0F1218" />
            <Stop offset="100%" stopColor="#07090C" />
          </LinearGradient>

          {/* Reflejo de luz en los lentes */}
          <LinearGradient id="glareGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
            <Stop offset="50%" stopColor="rgba(255, 255, 255, 0.05)" />
            <Stop offset="100%" stopColor="rgba(255, 255, 255, 0.0)" />
          </LinearGradient>

          {/* Sombra suave inferior */}
          <LinearGradient id="shadowGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="rgba(0, 0, 0, 0.5)" />
            <Stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </LinearGradient>
        </Defs>

        {/* Patillas laterales extendidas (visión frontal perspectiva) */}
        {/* Patilla izquierda */}
        <Path
          d="M32 46 C24 38, 48 24, 76 34 C64 42, 50 48, 32 46 Z"
          fill="#1C212B"
          opacity="0.9"
        />
        {/* Patilla derecha */}
        <Path
          d="M248 46 C256 38, 232 24, 204 34 C216 42, 230 48, 248 46 Z"
          fill="#1C212B"
          opacity="0.9"
        />

        {/* Marco Principal (Wayfarer Frame) */}
        <Path
          d="M26 44 
             C28 38, 44 32, 70 32
             C104 32, 126 36, 134 46
             C137 50, 143 50, 146 46
             C154 36, 176 32, 210 32
             C236 32, 252 38, 254 44
             C256 49, 252 66, 242 94
             C234 116, 214 122, 184 120
             C156 118, 148 98, 144 86
             C142 80, 138 80, 136 86
             C132 98, 124 118, 96 120
             C66 122, 46 116, 38 94
             C28 66, 24 49, 26 44 Z"
          fill="url(#frameGrad)"
          stroke="#3B4455"
          strokeWidth="1.5"
        />

        {/* Lente Izquierdo (Mica polarizada) */}
        <Path
          d="M40 48
             C56 44, 98 44, 124 50
             C128 51, 130 56, 128 64
             C124 84, 118 108, 95 110
             C72 112, 54 104, 48 88
             C42 72, 37 54, 40 48 Z"
          fill="url(#lensGrad)"
          stroke="#11151C"
          strokeWidth="1.8"
        />

        {/* Reflejo / Glare Lente Izquierdo */}
        <Path
          d="M44 52
             C58 48, 86 48, 110 52
             C98 70, 78 88, 52 82
             C46 72, 43 58, 44 52 Z"
          fill="url(#glareGrad)"
        />

        {/* Lente Derecho (Mica polarizada) */}
        <Path
          d="M240 48
             C224 44, 182 44, 156 50
             C152 51, 150 56, 152 64
             C156 84, 162 108, 185 110
             C208 112, 226 104, 232 88
             C238 72, 243 54, 240 48 Z"
          fill="url(#lensGrad)"
          stroke="#11151C"
          strokeWidth="1.8"
        />

        {/* Reflejo / Glare Lente Derecho */}
        <Path
          d="M236 52
             C222 48, 194 48, 170 52
             C182 70, 202 88, 228 82
             C234 72, 237 58, 236 52 Z"
          fill="url(#glareGrad)"
        />

        {/* Remaches de metal plateado en las esquinas superiores */}
        <Circle cx="35" cy="45" r="2.2" fill="#E2E8F0" />
        <Circle cx="245" cy="45" r="2.2" fill="#E2E8F0" />

        {/* Mini lente de cámara OV2640 en el puente / esquina izquierda */}
        <Circle cx="134" cy="54" r="3.2" fill="#030712" stroke="#475569" strokeWidth="1" />
        <Circle cx="134" cy="54" r="1.5" fill="#38BDF8" opacity="0.8" />

        {/* Micrófono / Sensor pinhole derecho */}
        <Circle cx="146" cy="54" r="1.5" fill="#030712" />

        {/* LED Inteligente de Estado en la patilla derecha */}
        <Circle
          cx="248"
          cy="42"
          r="2.5"
          fill={isOnline ? Colors.success : '#64748B'}
        />
        {isOnline && (
          <Circle
            cx="248"
            cy="42"
            r="4.5"
            stroke={Colors.success}
            strokeWidth="0.8"
            opacity="0.6"
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
