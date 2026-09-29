import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Settings, Video, Glasses, Sparkles, HelpCircle, FileText, Type } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useInterpreter } from '../context/InterpreterContext';

export default function HeaderSwitch({ onOpenSettings, onOpenTutorial }) {
  const {
    videoSource,
    setVideoSource,
    glassesConnected,
    setIsConfigModalVisible,
    setIsTutorialVisible,
    activeInterpretationMode,
    setActiveInterpretationMode,
  } = useInterpreter();

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      setIsConfigModalVisible(true);
    }
  };

  const handleOpenTutorial = () => {
    if (onOpenTutorial) {
      onOpenTutorial();
    } else {
      setIsTutorialVisible(true);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* ── FILA SUPERIOR: MARCA, SELECTOR [ Webcam | Lentes ] Y BOTONES ⚙️ / ? ── */}
      <View style={styles.container}>
        {/* Brand Badge */}
        <View style={styles.brandContainer}>
          <View style={styles.brandIconCircle}>
            <Sparkles size={14} color={Colors.primary} />
          </View>
          <Text style={styles.brandText}>
            Cokie<Text style={styles.brandTextAccent}>Interpreter</Text>
          </Text>
        </View>

        {/* Pill Switcher [ Webcam | Lentes ] (tal como en el boceto) */}
        <View style={styles.switcherContainer}>
          <TouchableOpacity
            style={[
              styles.switchSegment,
              videoSource === 'webcam' && styles.switchSegmentActive,
            ]}
            onPress={() => setVideoSource('webcam')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.switchText,
                videoSource === 'webcam' && styles.switchTextActive,
              ]}
            >
              Webcam
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchSegment,
              videoSource === 'glasses' && styles.switchSegmentActive,
            ]}
            onPress={() => setVideoSource('glasses')}
            activeOpacity={0.85}
          >
            <View style={styles.segmentWithDot}>
              <Text
                style={[
                  styles.switchText,
                  videoSource === 'glasses' && styles.switchTextActive,
                ]}
              >
                Lentes
              </Text>
              {glassesConnected && <View style={styles.connectedDot} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Botones de Cabecera: Tutorial (?) y Ajustes (⚙️) */}
        <View style={styles.rightIconsRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleOpenTutorial}
            activeOpacity={0.7}
            accessibilityLabel="Ver tutorial de uso"
          >
            <HelpCircle size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleOpenSettings}
            activeOpacity={0.7}
            accessibilityLabel="Configuración de CokieLens y Servidor"
          >
            <Settings size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── FILA INFERIOR: SELECTOR DE MODO DE INTERPRETACIÓN ── */}
      <View style={styles.modesRow}>
        <TouchableOpacity
          style={[
            styles.modeChip,
            activeInterpretationMode === 'sentence' && styles.modeChipActive,
          ]}
          onPress={() => setActiveInterpretationMode('sentence')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.modeChipText,
              activeInterpretationMode === 'sentence' && styles.modeChipTextActive,
            ]}
          >
            Frases y Gestos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeChip,
            activeInterpretationMode === 'fingerspelling' && styles.modeChipActive,
          ]}
          onPress={() => setActiveInterpretationMode('fingerspelling')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.modeChipText,
              activeInterpretationMode === 'fingerspelling' && styles.modeChipTextActive,
            ]}
          >
            Deletreo A-Z
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeChip,
            activeInterpretationMode === 'sl2t' && styles.modeChipActive,
          ]}
          onPress={() => setActiveInterpretationMode('sl2t')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.modeChipText,
              activeInterpretationMode === 'sl2t' && styles.modeChipTextActive,
            ]}
          >
            Google SL2T
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: Platform.OS === 'web' ? 14 : 6,
    paddingBottom: 8,
    zIndex: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  brandTextAccent: {
    color: Colors.primary,
    fontWeight: '500',
  },
  switcherContainer: {
    flexDirection: 'row',
    backgroundColor: '#353A45',
    borderRadius: 30,
    padding: 3,
    alignItems: 'center',
  },
  switchSegment: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchSegmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  switchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  switchTextActive: {
    color: '#0B0F17',
    fontWeight: '700',
  },
  segmentWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  rightIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 2,
  },
  modeChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modeChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: Colors.primary,
  },
  modeChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
