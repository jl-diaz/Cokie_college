import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Volume2, Copy, Check, Sparkles, Trash2 } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useInterpreter } from '../context/InterpreterContext';

export default function SL2TContinuousCard({ isVisible = true }) {
  const { currentTranslation, translationHistory, speakText, clearTranslationHistory } = useInterpreter();
  const [copied, setCopied] = useState(false);

  if (!isVisible) return null;

  // Construir transcripción continua acumulada como en SL2T de Google (Imagen 1)
  const fullText = translationHistory.map((item) => item.text).reverse().join(' ');

  const handleCopy = () => {
    if (!fullText) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeakAll = () => {
    if (fullText) {
      speakText(fullText);
    }
  };

  const handleClear = () => {
    if (clearTranslationHistory) {
      clearTranslationHistory();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Sparkles size={14} color={Colors.primary} />
          <Text style={styles.title}>Transcripción Continua (Google SL2T)</Text>
        </View>

        <View style={styles.actions}>
          {fullText ? (
            <TouchableOpacity
              onPress={handleClear}
              style={[styles.actionBtn, styles.deleteBtn]}
              activeOpacity={0.7}
              accessibilityLabel="Borrar transcripción"
            >
              <Trash2 size={14} color="#F87171" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={handleSpeakAll}
            style={styles.actionBtn}
            activeOpacity={0.7}
            accessibilityLabel="Leer en voz alta"
          >
            <Volume2 size={15} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCopy}
            style={styles.actionBtn}
            activeOpacity={0.7}
            accessibilityLabel="Copiar texto"
          >
            {copied ? <Check size={15} color={Colors.success} /> : <Copy size={15} color="#94A3B8" />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <Text style={styles.transcriptionText}>
          {fullText ? (
            <React.Fragment>
              {fullText} <Text style={styles.liveCursor}>|</Text>
            </React.Fragment>
          ) : (
            <Text style={styles.placeholderText}>
              Las señas continuas se irán transcribiendo fluidamente aquí como en Google SL2T...
            </Text>
          )}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0D1527',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.18)',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E2E8F0',
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  scrollArea: {
    maxHeight: 120,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 22,
    fontWeight: '500',
  },
  liveCursor: {
    color: Colors.primary,
    fontWeight: '700',
  },
  placeholderText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
});
