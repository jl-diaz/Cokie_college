import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, Delete, Trash2, Volume2 } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useInterpreter } from '../context/InterpreterContext';

export default function FingerspellingBar({ currentDetectedLetter, isActive = true }) {
  const { speakText } = useInterpreter();
  const [composedMessage, setComposedMessage] = useState('');
  const lastAddedTimeRef = useRef(0);
  const lastLetterRef = useRef('');

  // Auto-acumular letras de forma inteligente evitando saturación
  useEffect(() => {
    if (!currentDetectedLetter || !isActive) return;

    const clean = currentDetectedLetter.replace(/^sign\./, '').toUpperCase();
    if (clean.length === 1 && ((clean >= 'A' && clean <= 'Z') || (clean >= '0' && clean <= '9'))) {
      const now = Date.now();
      // Si es una letra diferente o pasaron más de 1200ms manteniendo la misma letra
      if (clean !== lastLetterRef.current || now - lastAddedTimeRef.current > 1200) {
        lastLetterRef.current = clean;
        lastAddedTimeRef.current = now;
        setComposedMessage((prev) => prev + clean);
      }
    }
  }, [currentDetectedLetter, isActive]);

  const handleManualAdd = () => {
    if (!currentDetectedLetter) return;
    const clean = currentDetectedLetter.replace(/^sign\./, '').toUpperCase();
    if (clean.length === 1) {
      setComposedMessage((prev) => prev + clean);
      lastAddedTimeRef.current = Date.now();
      lastLetterRef.current = clean;
    }
  };

  const handleAddSpace = () => {
    setComposedMessage((prev) => (prev ? prev + ' ' : ''));
    lastLetterRef.current = ' ';
  };

  const handleDeleteLetter = () => {
    setComposedMessage((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    setComposedMessage('');
    lastLetterRef.current = '';
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
      {/* ── FILA SUPERIOR: BADGE DE SEÑA DETECTADA Y TEXTO ACUMULADO ── */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.detectedCard}
          onPress={handleManualAdd}
          activeOpacity={0.8}
          accessibilityLabel="Añadir letra detectada"
        >
          <Text style={styles.detectedLabel}>SEÑA ACTIVA</Text>
          <Text style={styles.detectedLetter}>{displayLetter}</Text>
          <Text style={styles.tapHint}>Toca para añadir</Text>
        </TouchableOpacity>

        {/* Mensaje Deletreado / Acumulado */}
        <View style={styles.messageBox}>
          <View style={styles.messageHeader}>
            <Text style={styles.messageLabel}>Mensaje Deletreado</Text>
            {composedMessage.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleSpeakComposed}
                style={styles.speakMiniBtn}
                activeOpacity={0.7}
              >
                <Volume2 size={13} color="#93C5FD" />
                <Text style={styles.speakMiniText}>Escuchar</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.composedText} numberOfLines={2}>
            {composedMessage ? (
              <React.Fragment>
                {composedMessage} <Text style={styles.cursor}>|</Text>
              </React.Fragment>
            ) : (
              <Text style={styles.placeholderText}>
                Forma letras A-Z con tu mano para deletrear...
              </Text>
            )}
          </Text>
        </View>
      </View>

      {/* ── BOTONES DE ACCIÓN (Paleta Dark Navy Cokie College) ── */}
      <View style={styles.actionsRow}>
        {/* + Espacio */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnSpace]}
          onPress={handleAddSpace}
          activeOpacity={0.8}
        >
          <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.btnText}>Espacio</Text>
        </TouchableOpacity>

        {/* ⌫ Borrar Letra */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnDelete]}
          onPress={handleDeleteLetter}
          activeOpacity={0.8}
        >
          <Delete size={14} color="#CBD5E1" strokeWidth={2.2} />
          <Text style={[styles.btnText, { color: '#E2E8F0' }]}>Borrar</Text>
        </TouchableOpacity>

        {/* Limpiar Todo */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnClear]}
          onPress={handleClearAll}
          activeOpacity={0.8}
        >
          <Trash2 size={14} color="#F87171" strokeWidth={2.2} />
          <Text style={[styles.btnText, { color: '#F87171' }]}>Limpiar</Text>
        </TouchableOpacity>
      </View>
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
  topRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detectedCard: {
    width: 104,
    backgroundColor: '#0B1956',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  detectedLabel: {
    color: '#93C5FD',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
    textAlign: 'center',
  },
  detectedLetter: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  tapHint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
  messageBox: {
    flex: 1,
    backgroundColor: '#070C18',
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
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  speakMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  speakMiniText: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '700',
  },
  composedText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cursor: {
    color: '#3B82F6',
    fontWeight: '800',
  },
  placeholderText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
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
    backgroundColor: '#2563EB',
  },
  btnDelete: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  btnClear: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
