import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Componente base de Skeleton Screen con animación pulsante fluida.
 */
export const Skeleton = ({ width = '100%', height = 20, borderRadius = 8, style }) => {
  const { theme, Colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const skeletonColor = theme === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: skeletonColor,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Esqueleto para tarjetas de horarios, clases o pedidos.
 */
export const SkeletonCard = ({ style }) => {
  const { Colors } = useTheme();
  return (
    <View style={[styles.cardContainer, { backgroundColor: Colors.card }, style]}>
      <View style={styles.cardHeader}>
        <Skeleton width="60%" height={22} borderRadius={6} />
        <Skeleton width={50} height={20} borderRadius={10} />
      </View>
      <Skeleton width="85%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
      <Skeleton width="40%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
      <View style={styles.cardFooter}>
        <Skeleton width="100%" height={38} borderRadius={8} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
};

/**
 * Esqueleto para listas de alumnos o registros de asistencia.
 */
export const SkeletonList = ({ count = 6, style }) => {
  const { Colors } = useTheme();
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.listItem,
            { backgroundColor: Colors.card, borderBottomColor: Colors.gray[100] || '#f1f5f9' },
          ]}
        >
          <Skeleton width={42} height={42} borderRadius={21} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Skeleton width="70%" height={16} borderRadius={4} />
            <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
          <Skeleton width={68} height={28} borderRadius={14} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooter: {
    marginTop: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
});

export default Skeleton;
