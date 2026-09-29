import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Colors from '../constants/colors';

export default function AudioWaveform({ color = Colors.primary, isAnimating = true, size = 18 }) {
  const anim1 = useRef(new Animated.Value(0.3)).current;
  const anim2 = useRef(new Animated.Value(0.7)).current;
  const anim3 = useRef(new Animated.Value(0.4)).current;
  const anim4 = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!isAnimating) return;

    const createPulse = (anim, duration, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1.0,
            duration: duration,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.25,
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const p1 = createPulse(anim1, 450, 0);
    const p2 = createPulse(anim2, 380, 100);
    const p3 = createPulse(anim3, 520, 200);
    const p4 = createPulse(anim4, 400, 150);

    p1.start();
    p2.start();
    p3.start();
    p4.start();

    return () => {
      p1.stop();
      p2.stop();
      p3.stop();
      p4.stop();
    };
  }, [isAnimating, anim1, anim2, anim3, anim4]);

  const barStyle = (anim) => ({
    width: Math.max(2.5, size * 0.14),
    height: size,
    borderRadius: size * 0.08,
    backgroundColor: color,
    marginHorizontal: 1.5,
    transform: [{ scaleY: isAnimating ? anim : 0.3 }],
  });

  return (
    <View style={[styles.container, { height: size }]}>
      <Animated.View style={barStyle(anim1)} />
      <Animated.View style={barStyle(anim2)} />
      <Animated.View style={barStyle(anim3)} />
      <Animated.View style={barStyle(anim4)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
