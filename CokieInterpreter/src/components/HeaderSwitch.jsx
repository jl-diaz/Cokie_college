import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Settings, Video, Glasses, Sparkles, HelpCircle, Activity } from 'lucide-react-native';
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
      {/* Fila Superior: Marca, Selector de Entrada [ Cámara | Lentes ] y Acciones */}
      <View style={styles.container}>
        {/* Brand Badge Cokie College Navy */}
        <View style={styles.brandContainer}>
          <View style={styles.brandIconCircle}>
            <Activity size={15} color="#3B82F6" />
          </View>
          <Text style={styles.brandText}>
            Cokie<Text style={styles.brandTextAccent}>Interpreter</Text>
          </Text>
        </View>

        {/* Pill Switcher [ Cámara | Lentes ] */}
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
              Cámara
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

        {/* Botones de Cabecera: Tutorial y Ajustes */}
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
            <Settings size={18} color="#E2E8F0" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Fila Inferior: Selector de Modo de Interpretación */}
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
    paddingTop: Platform.OS === 'web' ? 14 : 8,
    paddingBottom: 10,
    zIndex: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
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
    color: '#3B82F6',
    fontWeight: '600',
  },
  switcherContainer: {
    flexDirection: 'row',
    backgroundColor: '#0B1426',
    borderRadius: 30,
    padding: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  switchSegment: {
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchSegmentActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 3,
  },
  switchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  switchTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
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
    backgroundColor: '#3B82F6',
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
    backgroundColor: '#0D1527',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  modeChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#0D1527',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modeChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderColor: '#3B82F6',
  },
  modeChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: '#60A5FA',
    fontWeight: '700',
  },
});
