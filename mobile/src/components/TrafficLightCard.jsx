import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAnimatedNumber } from './dashboard/DashboardShared';

/**
 * Traffic Light (Semáforo) Component - Rediseñado
 * - Azul: >= 6 positive codes AND <= 1 leve code AND <= 2 unjustified absences.
 * - Verde: Default standing
 * - Amarillo: >= 1 grave code OR >= 6 leve codes
 * - Rojo: >= 1 muy grave code OR >= 2 grave codes OR >= 12 leve codes (6 leves = 1 grave)
 */
export default function TrafficLightCard({ conductRecords = [], attendanceRecords = [] }) {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const isDark = theme === 'dark';

  // Calculate counts
  let countPositivo = 0;
  let countLeve = 0;
  let countGrave = 0;
  let countMuyGrave = 0;

  conductRecords.forEach(record => {
    const category = record.conduct_codes?.category;
    if (category === 'Positivo') countPositivo++;
    else if (category === 'Leve') countLeve++;
    else if (category === 'Grave') countGrave++;
    else if (category === 'Muy Grave') countMuyGrave++;
  });

  const animPositivo = useAnimatedNumber(countPositivo, 900);
  const animLeve = useAnimatedNumber(countLeve, 900);
  const animGrave = useAnimatedNumber(countGrave, 900);
  const animMuyGrave = useAnimatedNumber(countMuyGrave, 900);

  const unjustifiedAbsences = attendanceRecords.filter(a => a.status === 'absent').length;
  const totalConductPoints = (countGrave * 6) + countLeve;

  // Determine active status
  let statusKey = 'verde';
  if (countMuyGrave >= 1 || totalConductPoints >= 12) {
    statusKey = 'rojo';
  } else if (countGrave >= 1 || countLeve >= 6 || totalConductPoints >= 6) {
    statusKey = 'amarillo';
  } else if (countPositivo >= 6 && countLeve <= 1 && unjustifiedAbsences <= 2) {
    statusKey = 'azul';
  } else {
    statusKey = 'verde';
  }

  const config = {
    azul: {
      color: '#3B82F6',
      badgeBg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
      badgeText: isDark ? '#93C5FD' : '#1E40AF',
      title: t('semaforo.azulTitle', 'Sobresaliente'),
    },
    verde: {
      color: '#10B981',
      badgeBg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
      badgeText: isDark ? '#6EE7B7' : '#065F46',
      title: t('semaforo.verdeTitle', 'Normal'),
    },
    amarillo: {
      color: '#F59E0B',
      badgeBg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
      badgeText: isDark ? '#FCD34D' : '#92400E',
      title: t('semaforo.amarilloTitle', 'Precaución'),
    },
    rojo: {
      color: '#EF4444',
      badgeBg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
      badgeText: isDark ? '#FCA5A5' : '#991B1B',
      title: t('semaforo.rojoTitle', 'Alerta Crítica'),
    },
  };

  const activeConfig = config[statusKey];

  const bulbs = [
    { key: 'azul', label: 'Azul', color: '#3B82F6' },
    { key: 'verde', label: 'Verde', color: '#10B981' },
    { key: 'amarillo', label: 'Amarillo', color: '#F59E0B' },
    { key: 'rojo', label: 'Rojo', color: '#EF4444' },
  ];

  return (
    <View style={styles.outerWrapper}>
      {/* 1. Bloque Semáforo (sin sombras) */}
      <View 
        style={[
          styles.cardContainer, 
          { 
            backgroundColor: isDark ? '#18181B' : '#FFFFFF', 
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' 
          }
        ]}
      >
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <Text style={[styles.cardHeaderTitle, { color: isDark ? '#FFF' : Colors.text.primary }]}>
            {t('semaforo.cardTitle', 'Semáforo de Conducta')}
          </Text>

          <View style={[styles.statusBadge, { backgroundColor: activeConfig.badgeBg }]}>
            <Text style={[styles.statusBadgeText, { color: activeConfig.badgeText }]}>
              {activeConfig.title}
            </Text>
          </View>
        </View>

        {/* Traffic Light Housing Bar - Negro Mate sin sombras */}
        <View style={styles.trafficLightHousing}>
          <View style={styles.bulbsRow}>
            {bulbs.map((b) => {
              const isActive = statusKey === b.key;
              return (
                <View key={b.key} style={styles.bulbItem}>
                  <View
                    style={[
                      styles.bulbCircle,
                      {
                        backgroundColor: b.color,
                        opacity: isActive ? 1 : 0.22,
                        transform: [{ scale: isActive ? 1.25 : 1 }],
                        borderWidth: 0,
                      }
                    ]}
                  />
                  <Text 
                    style={[
                      styles.bulbLabel, 
                      { 
                        color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                        fontWeight: isActive ? '800' : '500',
                      }
                    ]}
                  >
                    {b.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* 2. Grid de Cards Rectangulares de Conteo FUERA del bloque de semáforo */}
      <View style={styles.counterGrid}>
        {/* 1. Positivo - Celeste */}
        <View style={[styles.counterCard, styles.cardPositivo]}>
          <Text style={[styles.counterCategoryLabel, { color: '#0369A1' }]}>
            {t('semaforo.positives', 'Positivo')}
          </Text>
          <Text style={[styles.counterNumber, { color: '#0284C7' }]}>
            {animPositivo}
          </Text>
        </View>

        {/* 2. Leves - Blanco con borde negro */}
        <View style={[styles.counterCard, styles.cardLeves, isDark && styles.cardLevesDark]}>
          <Text style={[styles.counterCategoryLabel, { color: isDark ? '#E4E4E7' : '#18181B' }]}>
            {t('semaforo.leves', 'Leves')}
          </Text>
          <Text style={[styles.counterNumber, { color: isDark ? '#FFFFFF' : '#18181B' }]}>
            {animLeve}
          </Text>
        </View>

        {/* 3. Graves - Rosado */}
        <View style={[styles.counterCard, styles.cardGraves]}>
          <Text style={[styles.counterCategoryLabel, { color: '#9D174D' }]}>
            {t('semaforo.graves', 'Graves')}
          </Text>
          <Text style={[styles.counterNumber, { color: '#BE185D' }]}>
            {animGrave}
          </Text>
        </View>

        {/* 4. Muy Graves - Negro */}
        <View style={[styles.counterCard, styles.cardMuyGraves]}>
          <Text style={[styles.counterCategoryLabel, { color: 'rgba(255,255,255,0.75)' }]}>
            {t('semaforo.muyGraves', 'Muy Graves')}
          </Text>
          <Text style={[styles.counterNumber, { color: '#FFFFFF' }]}>
            {animMuyGrave}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    marginBottom: 20,
  },
  cardContainer: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
    flexShrink: 1,
    minWidth: 140,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Semáforo negro mate (sin sombras)
  trafficLightHousing: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bulbsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bulbItem: {
    alignItems: 'center',
  },
  bulbCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 6,
  },
  bulbLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Grid de conteo 2x2
  counterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  counterCard: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterCategoryLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  counterNumber: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  // Estilos específicos de cada card
  cardPositivo: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  cardLeves: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#18181B',
  },
  cardLevesDark: {
    backgroundColor: '#27272A',
    borderColor: '#52525B',
  },
  cardGraves: {
    backgroundColor: '#FCE7F3',
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  cardMuyGraves: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
});
