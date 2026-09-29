import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import {
  X,
  Volume2,
  Volume1,
  VolumeX,
  Wifi,
  Check,
  AlertCircle,
  Smartphone,
  Glasses,
  Plus,
  Minus,
  Radio,
  Info,
} from 'lucide-react-native';
import Colors from '../constants/colors';
import SmartGlassesGraphic from './SmartGlassesGraphic';
import Esp32Service from '../services/Esp32Service';
import { useInterpreter } from '../context/InterpreterContext';

export default function CokieLensModal({ visible, onClose }) {
  const {
    esp32Ip,
    setEsp32Ip,
    audioVolume,
    setAudioVolume,
    audioOutput,
    setAudioOutput,
    glassesConnected,
    setGlassesConnected,
    speakText,
  } = useInterpreter();

  const [inputIp, setInputIp] = useState(esp32Ip);
  const [activeTab, setActiveTab] = useState('wifi'); // 'wifi' | 'mdns'
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    setInputIp(esp32Ip);
    if (esp32Ip === '192.168.4.1') {
      setActiveTab('wifi');
    } else if (esp32Ip.includes('.local')) {
      setActiveTab('mdns');
    }
  }, [esp32Ip, visible]);

  const handleSelectPreset = (type) => {
    setActiveTab(type);
    if (type === 'wifi') {
      setInputIp('192.168.4.1');
    } else {
      setInputIp('cokielens.local');
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await Esp32Service.testConnection(inputIp);
      setTestResult(result);
      if (result.success) {
        setGlassesConnected(true);
        setEsp32Ip(inputIp);
      } else {
        setGlassesConnected(false);
      }
    } catch (e) {
      setTestResult({ success: false, message: 'Error al contactar los lentes.' });
      setGlassesConnected(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setEsp32Ip(inputIp);
    onClose();
  };

  const adjustVolume = (delta) => {
    const next = Math.max(0, Math.min(100, audioVolume + delta));
    setAudioVolume(next);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          {/* Header con "CokieLens •" (punto verde de estado) como en el boceto 3 */}
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.modalTitle}>CokieLens</Text>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: glassesConnected ? Colors.success : '#10B981' },
                ]}
              />
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Tarjeta Visual: Lentes + Barra de Volumen Vertical (Pixel-perfect al boceto 3) */}
            <View style={styles.visualCardContainer}>
              {/* Contenedor de la ilustración de los lentes */}
              <View style={styles.glassesGraphicWrapper}>
                <SmartGlassesGraphic width={220} height={110} isOnline={glassesConnected} />
              </View>

              {/* Barra de Volumen Vertical como en el boceto 3 */}
              <View style={styles.verticalVolumeBarWrapper}>
                <View style={styles.verticalVolumeTrack}>
                  {/* Ícono de bocina arriba de la barra o en la barra */}
                  <Volume2 size={16} color="#FFFFFF" style={styles.speakerIcon} />
                  {/* Relleno lavanda / rosa pastel según el volumen */}
                  <View
                    style={[
                      styles.verticalVolumeFill,
                      { height: `${Math.max(15, audioVolume)}%` },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Texto de instrucción como en el boceto 3 */}
            <Text style={styles.instructionText}>
              Ingresa la dirección IP de tu ESP32-CAM o elige una opción rápida
            </Text>

            {/* Botones de Opción Rápida Segmentados: [ Wi-Fi de lentes | mDNS Local ] */}
            <View style={styles.presetToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.presetToggleButton,
                  activeTab === 'mdns' && styles.presetToggleButtonActive,
                ]}
                onPress={() => handleSelectPreset('mdns')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.presetToggleText,
                    activeTab === 'mdns' && styles.presetToggleTextActive,
                  ]}
                >
                  mDNS / Red Wi-Fi
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetToggleButton,
                  activeTab === 'wifi' && styles.presetToggleButtonActive,
                ]}
                onPress={() => handleSelectPreset('wifi')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.presetToggleText,
                    activeTab === 'wifi' && styles.presetToggleTextActive,
                  ]}
                >
                  Portal AP (192.168.4.1)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nota de Arquitectura de Red */}
            <View style={styles.networkNoteBox}>
              <View style={styles.networkNoteHeader}>
                <Info size={13} color={activeTab === 'mdns' ? '#3B82F6' : '#F59E0B'} />
                <Text style={[styles.networkNoteBadge, { color: activeTab === 'mdns' ? '#60A5FA' : '#F59E0B' }]}>
                  {activeTab === 'mdns' ? 'MODO RECOMENDADO' : 'MODO CONFIGURACIÓN'}
                </Text>
              </View>
              <Text style={styles.networkNoteText}>
                {activeTab === 'mdns'
                  ? 'Conecta los lentes a la Zona Wi-Fi de tu celular o a tu router para que tu app tenga Internet para la IA y video de los lentes simultáneamente.'
                  : 'La red "CokieLens-Setup" (192.168.4.1) no tiene internet. Úsala para configurar el Wi-Fi de los lentes o con servidor IA local.'}
              </Text>
            </View>

            {/* Campo de Entrada de IP estilizado como en el boceto 3 */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.ipInput}
                value={inputIp}
                onChangeText={(val) => {
                  setInputIp(val);
                  setTestResult(null);
                }}
                placeholder="192.168.4.1 o cokielens.local"
                placeholderTextColor="#64748B"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={styles.testButton}
                onPress={handleTestConnection}
                disabled={testing}
                activeOpacity={0.8}
              >
                {testing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.testButtonText}>Probar</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Feedback de conexión */}
            {testResult && (
              <View
                style={[
                  styles.resultBanner,
                  testResult.success ? styles.resultSuccess : styles.resultError,
                ]}
              >
                {testResult.success ? (
                  <Check size={16} color={Colors.success} />
                ) : (
                  <AlertCircle size={16} color={Colors.danger} />
                )}
                <Text
                  style={[
                    styles.resultText,
                    { color: testResult.success ? Colors.success : Colors.danger },
                  ]}
                >
                  {testResult.message}
                </Text>
              </View>
            )}

            {/* Tarjeta de Volumen de Audífono como en el boceto 3 */}
            <View style={styles.volumeCard}>
              <View style={styles.volumeCardHeader}>
                <Volume2 size={18} color="#D8B4FE" />
                <Text style={styles.volumeCardTitle}>Volumen de audífono</Text>
                <Text style={styles.volumePercentText}>{audioVolume}%</Text>
              </View>

              {/* Botones de ajuste +/- y barra horizontal interactiva */}
              <View style={styles.volumeControlRow}>
                <TouchableOpacity
                  style={styles.stepButton}
                  onPress={() => adjustVolume(-10)}
                  activeOpacity={0.7}
                >
                  <Minus size={16} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Barra de progreso de volumen con tinte lavanda */}
                <View style={styles.horizontalTrack}>
                  <View
                    style={[
                      styles.horizontalFill,
                      { width: `${audioVolume}%` },
                    ]}
                  />
                </View>

                <TouchableOpacity
                  style={styles.stepButton}
                  onPress={() => adjustVolume(10)}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Selector de destino de Audio */}
              <View style={styles.audioRoutingRow}>
                <Text style={styles.routingLabel}>Salida de voz:</Text>
                <View style={styles.routingOptions}>
                  <TouchableOpacity
                    style={[
                      styles.routingChip,
                      audioOutput === 'device' && styles.routingChipActive,
                    ]}
                    onPress={() => setAudioOutput('device')}
                    activeOpacity={0.8}
                  >
                    <Smartphone size={13} color={audioOutput === 'device' ? '#000' : '#FFF'} />
                    <Text
                      style={[
                        styles.routingChipText,
                        audioOutput === 'device' && styles.routingChipTextActive,
                      ]}
                    >
                      Dispositivo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.routingChip,
                      audioOutput === 'glasses' && styles.routingChipActive,
                    ]}
                    onPress={() => setAudioOutput('glasses')}
                    activeOpacity={0.8}
                  >
                    <Glasses size={13} color={audioOutput === 'glasses' ? '#000' : '#FFF'} />
                    <Text
                      style={[
                        styles.routingChipText,
                        audioOutput === 'glasses' && styles.routingChipTextActive,
                      ]}
                    >
                      Lentes
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Botón Guardar / Conectar */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveButtonText}>Guardar Configuración</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: '#11141A', // Fondo oscuro del boceto 3
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#10B981', // Verde brillante del boceto
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  visualCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171B24',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    marginBottom: 16,
  },
  glassesGraphicWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalVolumeBarWrapper: {
    width: 48,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalVolumeTrack: {
    width: 36,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#262C3A',
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  speakerIcon: {
    position: 'absolute',
    top: 14,
    zIndex: 2,
    opacity: 0.8,
  },
  verticalVolumeFill: {
    width: '100%',
    backgroundColor: '#F3D8FF', // Color lavanda suave idéntico al boceto 3
    borderRadius: 8,
  },
  instructionText: {
    fontSize: 13,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  presetToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#262C3A',
    borderRadius: 24,
    padding: 3,
    marginBottom: 14,
  },
  presetToggleButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetToggleButtonActive: {
    backgroundColor: '#FFFFFF', // Blanco activo como en el boceto 3
  },
  presetToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  presetToggleTextActive: {
    color: '#0B0F17',
    fontWeight: '700',
  },
  networkNoteBox: {
    backgroundColor: '#0E172E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  networkNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  networkNoteBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  networkNoteText: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  ipInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#1E2432',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  testButton: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  resultSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resultText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
  volumeCard: {
    backgroundColor: '#171B24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 16,
  },
  volumeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  volumeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  volumePercentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D8B4FE',
  },
  volumeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#262C3A',
    overflow: 'hidden',
  },
  horizontalFill: {
    height: '100%',
    backgroundColor: '#D8B4FE',
    borderRadius: 4,
  },
  audioRoutingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  routingLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  routingOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  routingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  routingChipActive: {
    backgroundColor: '#FFFFFF',
  },
  routingChipText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  routingChipTextActive: {
    color: '#0B0F17',
    fontWeight: '700',
  },
  saveButton: {
    height: 46,
    backgroundColor: Colors.primary,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#0B0F17',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
