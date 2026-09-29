import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export default function DetectionOverlay({ isDetecting = false }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let anim = null;
    if (isDetecting) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(0);
    }

    return () => {
      if (anim) anim.stop();
    };
  }, [isDetecting, pulseAnim]);

  if (!isDetecting) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Marco perimetral sutil de reconocimiento activo (estilo cámara nativa profesional) */}
      <Animated.View
        style={[
          styles.activeFrame,
          {
            opacity: pulseAnim,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  activeFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
});
