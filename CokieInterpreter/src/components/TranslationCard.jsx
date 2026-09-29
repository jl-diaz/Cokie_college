import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { Volume2, Copy, Check, RefreshCw, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react-native';
import Colors from '../constants/colors';
import AudioWaveform from './AudioWaveform';
import { useInterpreter } from '../context/InterpreterContext';

export default function TranslationCard({ onToggleHistory, isHistoryOpen }) {
  const {
    currentTranslation,
    translationState,
    speakText,
    aiServerStatus,
    simulateGesture,
  } = useInterpreter();

  const [copied, setCopied] = useState(false);
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const displayText = currentTranslation || 'Hola, ¿Cómo estas hoy?';

  // Animación de pulso cuando cambia la traducción
  useEffect(() => {
    if (translationState === 'updated') {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.025,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(pulseScale, {
            toValue: 1.0,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [translationState, currentTranslation]);

  const handleCopy = () => {
    if (!displayText) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSpeakAgain = () => {
    speakText(displayText);
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        { transform: [{ scale: pulseScale }] },
        translationState === 'updated' && styles.cardContainerHighlighted,
      ]}
    >
      {/* Cabecera: Estado de traducción */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.statusPulseDot,
              aiServerStatus === 'connected' ? styles.dotConnected : styles.dotConnecting,
            ]}
          />
          <Text style={styles.headerStatusText}>
            {aiServerStatus === 'connecting'
              ? 'Conectando con motor de IA...'
              : translationState === 'detecting'
              ? 'Analizando señas en vivo'
              : 'Listo para traducir'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {onToggleHistory && (
            <TouchableOpacity
              onPress={onToggleHistory}
              style={styles.iconButtonSmall}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Ver historial"
            >
              {isHistoryOpen ? (
                <ChevronDown size={16} color="#94A3B8" />
              ) : (
                <ChevronUp size={16} color="#94A3B8" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Línea divisoria sutil */}
      <View style={styles.divider} />

      {/* Texto Principal Traducido */}
      <View style={styles.contentRow}>
        <Text style={styles.translatedText} numberOfLines={3} selectable>
          “{displayText}”
        </Text>

        <View style={styles.actionButtonsCol}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSpeakAgain}
            activeOpacity={0.7}
            accessibilityLabel="Repetir voz"
          >
            <Volume2 size={17} color="#3B82F6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCopy}
            activeOpacity={0.7}
            accessibilityLabel="Copiar traducción"
          >
            {copied ? (
              <Check size={17} color="#3B82F6" />
            ) : (
              <Copy size={17} color="#94A3B8" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Pie de tarjeta con indicador de estado animado */}
      <View style={styles.footerRow}>
        {translationState === 'updated' ? (
          <View style={styles.statusIndicatorRow}>
            <View style={styles.checkCircle}>
              <Check size={11} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={styles.statusUpdatedText}>Traducción actualizada</Text>
          </View>
        ) : translationState === 'detecting' ? (
          <View style={styles.statusIndicatorRow}>
            <AudioWaveform color="#3B82F6" isAnimating={true} size={15} />
            <Text style={styles.statusDetectingText}>Detectando señas...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.statusIndicatorRow}
            onPress={() => simulateGesture('Hola, ¿Cómo estas hoy?')}
            activeOpacity={0.7}
          >
            <View style={styles.readyDot} />
            <Text style={styles.statusReadyText}>Esperando gestos en cámara...</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0D1527',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.22)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'web' ? 16 : 20,
    shadowColor: '#0B1956',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  cardContainerHighlighted: {
    borderColor: 'rgba(59, 130, 246, 0.65)',
    shadowColor: '#2563EB',
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotConnected: {
    backgroundColor: '#3B82F6',
  },
  dotConnecting: {
    backgroundColor: '#F59E0B',
  },
  headerStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E9EAB',
    letterSpacing: -0.1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButtonSmall: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 46,
  },
  translatedText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  actionButtonsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 10,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusUpdatedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
    letterSpacing: -0.1,
  },
  statusDetectingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    letterSpacing: -0.1,
  },
  statusReadyText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748B',
  },
});
