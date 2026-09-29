import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Plus, X, Check, Volume2, Sparkles } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useInterpreter } from '../context/InterpreterContext';

export default function FingerspellingBar({ currentDetectedLetter, isActive = true }) {
  const { speakText } = useInterpreter();
  const [composedMessage, setComposedMessage] = useState('');

  // Cuando se detecta una nueva letra de forma estable
  useEffect(() => {
    if (!currentDetectedLetter || !isActive) return;

    // Si es una sola letra (A-Z) o número (0-9)
    const clean = currentDetectedLetter.replace(/^sign\./, '').toUpperCase();
    if (clean.length === 1 && (clean >= 'A' && clean <= 'Z' || clean >= '0' && clean <= '9')) {
      setComposedMessage((prev) => {
        // Evitar repetir la misma letra si se mantiene quieta por segundos
        if (prev.endsWith(clean)) return prev;
        return prev + clean;
      });
    }
  }, [currentDetectedLetter, isActive]);

  const handleAddSpace = () => {
    setComposedMessage((prev) => (prev ? prev + ' ' : ''));
  };

  const handleDeleteLetter = () => {
    setComposedMessage((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    setComposedMessage('');
  };

  const handleSpeakComposed = () => {
    if (composedMessage.trim()) {
      speakText(composedMessage.trim());
    }
  };

  if (!isActive) return null;

  const displayLetter = currentDetectedLetter
    ? currentDetectedLetter.replace(/^sign\./, '').toUpperCase()
    : '—';

  return (
    <View style={styles.container}>
      {/* ── FILA SUPERIOR: BADGE DE SEÑA DETECTADA (Imágenes 2 y 3) ── */}
      <View style={styles.topRow}>
        <View style={styles.detectedCard}>
          <Text style={styles.detectedLabel}>¡Seña Detectada!</Text>
          <Text style={styles.detectedLetter}>{displayLetter}</Text>
        </View>

        {/* Mensaje Deletreado / Acumulado */}
        <View style={styles.messageBox}>
          <View style={styles.messageHeader}>
            <Text style={styles.messageLabel}>Tu Mensaje Deletreado:</Text>
            {composedMessage.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleSpeakComposed}
                style={styles.speakMiniBtn}
                activeOpacity={0.7}
              >
                <Volume2 size={14} color={Colors.primary} />
                <Text style={styles.speakMiniText}>Leer</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.composedText} numberOfLines={2}>
            {composedMessage || 'Haz señas con tus manos (A-Z)...'}
          </Text>
        </View>
      </View>

      {/* ── BOTONES DE ACCIÓN (Exactos a las Imágenes 2 y 3) ── */}
      <View style={styles.actionsRow}>
        {/* Botón Azul: + Agregar Espacio */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnSpace]}
          onPress={handleAddSpace}
          activeOpacity={0.8}
        >
          <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.btnText}>Agregar Espacio</Text>
        </TouchableOpacity>

        {/* Botón Rojo: ✕ Borrar Letra */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnDelete]}
          onPress={handleDeleteLetter}
          activeOpacity={0.8}
        >
          <X size={15} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.btnText}>Borrar Letra</Text>
        </TouchableOpacity>

        {/* Botón Verde: ✓ Limpiar Todo */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnClear]}
          onPress={handleClearAll}
          activeOpacity={0.8}
        >
          <Check size={15} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.btnText}>Limpiar Todo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#131722',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detectedCard: {
    width: 110,
    backgroundColor: '#EF4444', // Fondo rojo coral como en las imágenes 2 y 3
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  detectedLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
    textAlign: 'center',
  },
  detectedLetter: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  messageBox: {
    flex: 1,
    backgroundColor: '#1A2130',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 10,
    justifyContent: 'center',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageLabel: {
    color: '#10B981', // Verde suave
    fontSize: 11,
    fontWeight: '700',
  },
  speakMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  speakMiniText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  composedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 5,
  },
  btnSpace: {
    backgroundColor: '#2563EB', // Azul
  },
  btnDelete: {
    backgroundColor: '#EF4444', // Rojo
  },
  btnClear: {
    backgroundColor: '#10B981', // Verde
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
