import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
  ScrollView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Glasses,
  Video,
  Volume2,
  Sparkles,
  Wifi,
  Sliders,
  Settings,
  History,
  MessageSquare,
  HelpCircle,
  Target,
} from 'lucide-react-native';
import Colors from '../constants/colors';
import { useInterpreter } from '../context/InterpreterContext';
import HeaderSwitch from '../components/HeaderSwitch';
import CameraViewport from '../components/CameraViewport';
import TranslationCard from '../components/TranslationCard';
import FingerspellingBar from '../components/FingerspellingBar';
import SL2TContinuousCard from '../components/SL2TContinuousCard';
import QuickTalkBar from '../components/QuickTalkBar';
import HistoryDrawer from '../components/HistoryDrawer';
import CokieLensModal from '../components/CokieLensModal';
import TutorialModal from '../components/TutorialModal';

export default function InterpreterScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 860;

  const {
    isConfigModalVisible,
    setIsConfigModalVisible,
    isTutorialVisible,
    setIsTutorialVisible,
    closeTutorial,
    videoSource,
    setVideoSource,
    glassesConnected,
    aiServerStatus,
    audioVolume,
    setAudioVolume,
    activeInterpretationMode,
    setActiveInterpretationMode,
    currentTranslation,
    isSkeletonEnabled,
    setIsSkeletonEnabled,
  } = useInterpreter();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#070C18" />

      {/* ── TUTORIAL INTERACTIVO EN EL PRIMER USO ── */}
      <TutorialModal visible={isTutorialVisible} onClose={closeTutorial} />

      {/* ── MODAL DE CONFIGURACIÓN COKIELENS (Boceto 3) ── */}
      <CokieLensModal
        visible={isConfigModalVisible}
        onClose={() => setIsConfigModalVisible(false)}
      />

      {/* ── MODO ESCRITORIO / COMPUTADORA (DASHBOARD RESPONSIVO DUAL) ── */}
      {isDesktop ? (
        <View style={styles.desktopContainer}>
          {/* Header Superior para Pantallas Grandes */}
          <View style={styles.desktopHeader}>
            <View style={styles.desktopBrandCol}>
              <View style={styles.brandIconCircle}>
                <Sparkles size={16} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.desktopBrandTitle}>
                  Cokie<Text style={{ color: '#3B82F6' }}>Interpreter</Text>
                </Text>
                <Text style={styles.desktopBrandSubtitle}>
                  Intérprete Inteligente de Lenguaje de Señas
                </Text>
              </View>
            </View>

            {/* Switcher Central [ Webcam | Lentes ] */}
            <View style={styles.desktopSwitcher}>
              <TouchableOpacity
                style={[
                  styles.desktopSwitchBtn,
                  videoSource === 'webcam' && styles.desktopSwitchBtnActive,
                ]}
                onPress={() => setVideoSource('webcam')}
                activeOpacity={0.8}
              >
                <Video
                  size={15}
                  color={videoSource === 'webcam' ? '#0B0F17' : '#94A3B8'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.desktopSwitchText,
                    videoSource === 'webcam' && styles.desktopSwitchTextActive,
                  ]}
                >
                  Webcam
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.desktopSwitchBtn,
                  videoSource === 'glasses' && styles.desktopSwitchBtnActive,
                ]}
                onPress={() => setVideoSource('glasses')}
                activeOpacity={0.8}
              >
                <Glasses
                  size={15}
                  color={videoSource === 'glasses' ? '#0B0F17' : '#94A3B8'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.desktopSwitchText,
                    videoSource === 'glasses' && styles.desktopSwitchTextActive,
                  ]}
                >
                  Lentes CokieLens
                </Text>
                {glassesConnected && <View style={styles.connectedDot} />}
              </TouchableOpacity>
            </View>

            {/* Selector de Modo en Desktop */}
            <View style={styles.desktopModesToggle}>
              <TouchableOpacity
                style={[
                  styles.desktopModeChip,
                  activeInterpretationMode === 'sentence' && styles.desktopModeChipActive,
                ]}
                onPress={() => setActiveInterpretationMode('sentence')}
              >
                <Text
                  style={[
                    styles.desktopModeChipText,
                    activeInterpretationMode === 'sentence' && styles.desktopModeChipTextActive,
                  ]}
                >
                  Frases
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.desktopModeChip,
                  activeInterpretationMode === 'fingerspelling' && styles.desktopModeChipActive,
                ]}
                onPress={() => setActiveInterpretationMode('fingerspelling')}
              >
                <Text
                  style={[
                    styles.desktopModeChipText,
                    activeInterpretationMode === 'fingerspelling' && styles.desktopModeChipTextActive,
                  ]}
                >
                  Deletreo A-Z
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.desktopModeChip,
                  activeInterpretationMode === 'sl2t' && styles.desktopModeChipActive,
                ]}
                onPress={() => setActiveInterpretationMode('sl2t')}
              >
                <Text
                  style={[
                    styles.desktopModeChipText,
                    activeInterpretationMode === 'sl2t' && styles.desktopModeChipTextActive,
                  ]}
                >
                  Google SL2T
                </Text>
              </TouchableOpacity>
            </View>

            {/* Acciones del Header */}
            <View style={styles.desktopHeaderRight}>
              <View
                style={[
                  styles.aiServerPill,
                  aiServerStatus === 'connected'
                    ? styles.aiServerConnected
                    : styles.aiServerConnecting,
                ]}
              >
                <View
                  style={[
                    styles.aiDot,
                    {
                      backgroundColor:
                        aiServerStatus === 'connected' ? Colors.success : Colors.warning,
                    },
                  ]}
                />
                <Text style={styles.aiServerText}>
                  {aiServerStatus === 'connected' ? 'Motor IA Listo' : 'Conectando Servidor'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.desktopIconBtn}
                onPress={() => setIsTutorialVisible(true)}
                activeOpacity={0.7}
                accessibilityLabel="Ver tutorial"
              >
                <HelpCircle size={18} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.desktopSettingsBtn}
                onPress={() => setIsConfigModalVisible(true)}
                activeOpacity={0.7}
              >
                <Settings size={17} color="#FFFFFF" />
                <Text style={styles.desktopSettingsBtnText}>Lentes</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cuerpo Dividido en Dos Columnas: Video + Panel de Interpretación */}
          <View style={styles.desktopContentRow}>
            {/* Columna Izquierda: Video en Alta Definición con Puntos de MediaPipe */}
            <View style={styles.desktopVideoCol}>
              <CameraViewport
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              />
            </View>

            {/* Columna Derecha: Panel de Accesibilidad y Traducción */}
            <View style={styles.desktopSidebarCol}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.desktopSidebarScroll}
              >
                {/* 1. MODO FRASES (Bocetos 1 y 2) */}
                {activeInterpretationMode === 'sentence' && (
                  <TranslationCard
                    onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
                    isHistoryOpen={isHistoryOpen}
                  />
                )}

                {/* 2. MODO DELETREO / ALFABETO A-Z (Imágenes 2 y 3) */}
                {activeInterpretationMode === 'fingerspelling' && (
                  <FingerspellingBar
                    currentDetectedLetter={currentTranslation}
                    isActive={true}
                  />
                )}

                {/* 3. MODO CONTINUO GOOGLE SL2T (Imagen 1) */}
                {activeInterpretationMode === 'sl2t' && (
                  <SL2TContinuousCard isVisible={true} />
                )}

                {/* Historial Desplegable */}
                <HistoryDrawer visible={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

                {/* Comunicador Bidireccional */}
                <QuickTalkBar />
              </ScrollView>
            </View>
          </View>
        </View>
      ) : (
        /* ── MODO MÓVIL (iOS / ANDROID / TELÉFONO WEB) EXACTO A LOS BOCETOS ── */
        <View style={styles.mobileContainer}>
          {/* Header Superior [ Webcam | Lentes ] + Selector de Modo + ⚙️ + ? */}
          <HeaderSwitch
            onOpenSettings={() => setIsConfigModalVisible(true)}
            onOpenTutorial={() => setIsTutorialVisible(true)}
          />

          <ScrollView
            style={styles.mobileScroll}
            contentContainerStyle={styles.mobileScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Área de Video Principal (Webcam o Lentes con Esqueleto de Puntos) */}
            <View style={styles.mobileVideoWrapper}>
              <CameraViewport />
            </View>

            {/* 1. MODO FRASES (Bocetos 1 y 2) */}
            {activeInterpretationMode === 'sentence' && (
              <TranslationCard
                onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
                isHistoryOpen={isHistoryOpen}
              />
            )}

            {/* 2. MODO DELETREO / ALFABETO A-Z (Imágenes 2 y 3) */}
            {activeInterpretationMode === 'fingerspelling' && (
              <FingerspellingBar
                currentDetectedLetter={currentTranslation}
                isActive={true}
              />
            )}

            {/* 3. MODO CONTINUO GOOGLE SL2T (Imagen 1) */}
            {activeInterpretationMode === 'sl2t' && (
              <SL2TContinuousCard isVisible={true} />
            )}

            {/* Historial Desplegable */}
            <HistoryDrawer visible={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

            {/* Barra de Respuesta Rápida / Dos Vías */}
            <QuickTalkBar />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070C18',
  },
  mobileContainer: {
    flex: 1,
  },
  mobileScroll: {
    flex: 1,
  },
  mobileScrollContent: {
    paddingBottom: Platform.OS === 'web' ? 24 : 36,
  },
  mobileVideoWrapper: {
    height: 440,
    width: '100%',
  },
  // Estilos Desktop
  desktopContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  desktopBrandCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopBrandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  desktopBrandSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  desktopSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#0B1426',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  desktopSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  desktopSwitchBtnActive: {
    backgroundColor: '#2563EB',
  },
  desktopSwitchText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  desktopSwitchTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginLeft: 6,
  },
  desktopModesToggle: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#0B1426',
    padding: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  desktopModeChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  desktopModeChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderColor: '#3B82F6',
  },
  desktopModeChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  desktopModeChipTextActive: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  desktopHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiServerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  aiServerConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  aiServerConnecting: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  aiDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  aiServerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  desktopIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  desktopSettingsBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  desktopContentRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  desktopVideoCol: {
    flex: 1.35,
    minHeight: 520,
  },
  desktopSidebarCol: {
    flex: 1,
    minWidth: 360,
  },
  desktopSidebarScroll: {
    paddingBottom: 24,
  },
});
