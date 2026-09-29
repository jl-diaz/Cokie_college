import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Volume2, Copy, Check, Sparkles, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react-native';
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

  const displayText = currentTranslation || 'Hola, ¿Cómo estas hoy?';

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
    <View
      style={[
        styles.cardContainer,
        translationState === 'updated' && styles.cardContainerHighlighted,
      ]}
    >
      {/* Cabecera: "Listo para traducir" */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
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
                <ChevronDown size={16} color={Colors.textSecondary} />
              ) : (
                <ChevronUp size={16} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Línea divisoria sutil como en el boceto */}
      <View style={styles.divider} />

      {/* Texto Principal Traducido: "Hola, ¿Cómo estas hoy?" */}
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
            <Volume2 size={18} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCopy}
            activeOpacity={0.7}
            accessibilityLabel="Copiar traducción"
          >
            {copied ? (
              <Check size={18} color={Colors.success} />
            ) : (
              <Copy size={18} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Pie de tarjeta con indicador de estado (Detectando señas... o ✓ Traducción actualizada) */}
      <View style={styles.footerRow}>
        {translationState === 'updated' ? (
          <View style={styles.statusIndicatorRow}>
            <View style={styles.checkCircle}>
              <Check size={12} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={styles.statusUpdatedText}>Traducción actualizada</Text>
          </View>
        ) : translationState === 'detecting' ? (
          <View style={styles.statusIndicatorRow}>
            <AudioWaveform color={Colors.primary} isAnimating={true} size={15} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#12151C', // Fondo oscuro del boceto
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'web' ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  cardContainerHighlighted: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    shadowColor: Colors.success,
    shadowOpacity: 0.2,
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
    gap: 6,
  },
  headerStatusText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E95A5', // Color grisáceo del boceto
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusUpdatedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    letterSpacing: -0.1,
  },
  statusDetectingText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
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
