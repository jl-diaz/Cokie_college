import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldAlert, ShieldCheck, Award, AlertTriangle, Sparkles, CheckCircle2, AlertOctagon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

/**
 * Traffic Light (Semáforo) Component - Premium Design:
 * - Azul: >= 6 positive codes AND <= 1 leve code AND <= 2 unjustified absences.
 * - Verde: Default standing
 * - Amarillo: >= 1 grave code OR >= 6 leve codes
 * - Rojo: >= 1 muy grave code OR >= 2 grave codes OR >= 12 leve codes (6 leves = 1 grave)
 */
export default function TrafficLightCard({ conductRecords = [], attendanceRecords = [] }) {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();

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
      bgGrad: theme === 'dark' ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
      borderColor: 'rgba(59, 130, 246, 0.35)',
      glowColor: '#3B82F6',
      badgeBg: '#DBEAFE',
      badgeText: '#1E40AF',
      title: t('semaforo.azulTitle', 'Sobresaliente'),
      subtitle: t('semaforo.azulDesc', 'Conducta ejemplar acumulada. ¡Excelente trabajo!'),
      icon: Award,
    },
    verde: {
      color: '#10B981',
      bgGrad: theme === 'dark' ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
      borderColor: 'rgba(16, 185, 129, 0.35)',
      glowColor: '#10B981',
      badgeBg: '#D1FAE5',
      badgeText: '#065F46',
      title: t('semaforo.verdeTitle', 'Normal'),
      subtitle: t('semaforo.verdeDesc', 'Estado conductual adecuado dentro de la norma.'),
      icon: ShieldCheck,
    },
    amarillo: {
      color: '#F59E0B',
      bgGrad: theme === 'dark' ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
      borderColor: 'rgba(245, 158, 11, 0.35)',
      glowColor: '#F59E0B',
      badgeBg: '#FEF3C7',
      badgeText: '#92400E',
      title: t('semaforo.amarilloTitle', 'Precaución'),
      subtitle: t('semaforo.amarilloDesc', 'Atención requerida por faltas acumuladas.'),
      icon: AlertTriangle,
    },
    rojo: {
      color: '#EF4444',
      bgGrad: theme === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
      borderColor: 'rgba(239, 68, 68, 0.35)',
      glowColor: '#EF4444',
      badgeBg: '#FEE2E2',
      badgeText: '#991B1B',
      title: t('semaforo.rojoTitle', 'Alerta Crítica'),
      subtitle: t('semaforo.rojoDesc', 'Se ha superado el umbral reglamentario de faltas.'),
      icon: ShieldAlert,
    },
  };

  const activeConfig = config[statusKey];
  const IconComponent = activeConfig.icon;

  const bulbs = [
    { key: 'azul', label: 'Azul', color: '#3B82F6' },
    { key: 'verde', label: 'Verde', color: '#10B981' },
    { key: 'amarillo', label: 'Amarillo', color: '#F59E0B' },
    { key: 'rojo', label: 'Rojo', color: '#EF4444' },
  ];

  return (
    <View 
      style={[
        styles.cardContainer, 
        { 
          backgroundColor: theme === 'dark' ? Colors.card : activeConfig.bgGrad, 
          borderColor: activeConfig.borderColor 
        }
      ]}
    >
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrapper}>
          <View style={[styles.iconAvatar, { backgroundColor: activeConfig.color + '20' }]}>
            <IconComponent size={22} color={activeConfig.color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.cardHeaderTitle, { color: theme === 'dark' ? '#FFF' : Colors.text.primary }]}>
              {t('semaforo.cardTitle', 'Semáforo Disciplinario')}
            </Text>
            <Text style={[styles.cardHeaderSubtitle, { color: Colors.text.secondary }]} numberOfLines={1}>
              {activeConfig.subtitle}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: activeConfig.badgeBg }]}>
          <Text style={[styles.statusBadgeText, { color: activeConfig.badgeText }]}>
            {activeConfig.title}
          </Text>
        </View>
      </View>

      {/* Traffic Light Housing Bar */}
      <View style={[styles.trafficLightHousing, { backgroundColor: theme === 'dark' ? '#18181B' : '#0B1956' }]}>
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
                      shadowColor: isActive ? b.color : 'transparent',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: isActive ? 0.9 : 0,
                      shadowRadius: isActive ? 10 : 0,
                      elevation: isActive ? 8 : 0,
                      transform: [{ scale: isActive ? 1.25 : 1 }],
                      borderWidth: isActive ? 2.5 : 0,
                      borderColor: '#FFFFFF',
                    }
                  ]}
                />
                <Text 
                  style={[
                    styles.bulbLabel, 
                    { 
                      color: isActive ? b.color : 'rgba(255,255,255,0.4)',
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

      {/* Stat Chips Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statChip, { backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF' }]}>
          <Sparkles size={12} color="#3B82F6" style={{ marginRight: 4 }} />
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{countPositivo}</Text>
          <Text style={[styles.statLabel, { color: Colors.text.secondary }]}>{t('semaforo.positives', 'Positivos')}</Text>
        </View>

        <View style={[styles.statChip, { backgroundColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB' }]}>
          <AlertTriangle size={12} color="#F59E0B" style={{ marginRight: 4 }} />
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{countLeve}</Text>
          <Text style={[styles.statLabel, { color: Colors.text.secondary }]}>{t('semaforo.leves', 'Leves')}</Text>
        </View>

        <View style={[styles.statChip, { backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }]}>
          <AlertOctagon size={12} color="#EF4444" style={{ marginRight: 4 }} />
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{countGrave}</Text>
          <Text style={[styles.statLabel, { color: Colors.text.secondary }]}>{t('semaforo.graves', 'Graves')}</Text>
        </View>

        <View style={[styles.statChip, { backgroundColor: theme === 'dark' ? 'rgba(142, 68, 173, 0.1)' : '#F3E8FF' }]}>
          <ShieldAlert size={12} color="#8E44AD" style={{ marginRight: 4 }} />
          <Text style={[styles.statValue, { color: '#8E44AD' }]}>{countMuyGrave}</Text>
          <Text style={[styles.statLabel, { color: Colors.text.secondary }]}>{t('semaforo.muyGraves', 'M. Graves')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardHeaderSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trafficLightHousing: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
    width: 22,
    height: 22,
    borderRadius: 11,
    marginBottom: 4,
  },
  bulbLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    marginRight: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
