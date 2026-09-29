import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import Colors from '../constants/colors';

export default function DetectionOverlay({ isDetecting = false, source = 'webcam' }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let pulseLoop = null;
    let scanLoop = null;

    if (isDetecting) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      scanLoop.start();
    } else {
      pulseAnim.setValue(1);
      scanLineAnim.setValue(0);
    }

    return () => {
      if (pulseLoop) pulseLoop.stop();
      if (scanLoop) scanLoop.stop();
    };
  }, [isDetecting, pulseAnim, scanLineAnim]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Retícula de Enfoque AI en el centro */}
      <View style={styles.reticleContainer}>
        <Animated.View
          style={[
            styles.reticleBox,
            isDetecting && styles.reticleBoxActive,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {/* 4 esquinas del viewfinder */}
          <View style={[styles.corner, styles.cornerTL, isDetecting && styles.cornerActive]} />
          <View style={[styles.corner, styles.cornerTR, isDetecting && styles.cornerActive]} />
          <View style={[styles.corner, styles.cornerBL, isDetecting && styles.cornerActive]} />
          <View style={[styles.corner, styles.cornerBR, isDetecting && styles.cornerActive]} />

          {/* Línea de escaneo láser cuando detecta movimiento */}
          {isDetecting && (
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, 100],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reticleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    width: 200,
    height: 220,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBoxActive: {
    // Sutil iluminación
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  cornerActive: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowRadius: 6,
    shadowOpacity: 0.8,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomRightRadius: 6,
  },
  scanLine: {
    width: '90%',
    height: 2,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowRadius: 8,
    shadowOpacity: 1,
    borderRadius: 1,
  },
});
