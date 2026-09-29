import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Video,
  Target,
  Layers,
  Volume2,
  MessageSquare,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Info,
  Check,
  Activity,
  Compass,
} from 'lucide-react-native';
import Colors from '../constants/colors';

const TOUR_STEPS = [
  {
    id: 'video_source',
    category: 'FUENTE DE VIDEO',
    icon: Video,
    title: 'Cámara del Dispositivo o Lentes CokieLens',
    subtitle: 'Alternancia de entrada de video',
    description:
      'Alterna con un solo toque entre la cámara integrada de tu dispositivo y el streaming inalámbrico de alta definición transmitido por los lentes inteligentes CokieLens.',
    tip: 'Si usas los lentes, conéctalos a la zona Wi-Fi de tu celular para mantener internet activo para la IA.',
    target: {
      getRect: (w, h, insets) => ({
        top: insets.top + (Platform.OS === 'web' ? 8 : 4),
        left: 14,
        width: w - 100,
        height: 46,
        borderRadius: 23,
      }),
      cardPlacement: 'bottom',
      arrowAlign: 'center',
    },
  },
  {
    id: 'mode_selector',
    category: 'MODALIDAD DE SEÑAS',
    icon: Layers,
    title: '3 Modos Adaptados a tu Comunicación',
    subtitle: 'Frases completas, deletreo o continuo',
    description:
      'Elige Frases para lenguaje natural y señas cotidianas, Deletreo A-Z para deletrear nombres propios letra por letra, o Google SL2T para transcripción continua en vivo.',
    tip: 'Puedes cambiar de modo en cualquier instante sin pausar la captura de la cámara.',
    target: {
      getRect: (w, h, insets) => ({
        top: insets.top + (Platform.OS === 'web' ? 58 : 54),
        left: 14,
        width: w - 28,
        height: 44,
        borderRadius: 20,
      }),
      cardPlacement: 'bottom',
      arrowAlign: 'center',
    },
  },
  {
    id: 'camera_viewport',
    category: 'VISIÓN ARTIFICIAL',
    icon: Target,
    title: 'Mapeo Anatómico y Esqueleto de Puntos',
    subtitle: 'Seguimiento biomecánico en tiempo real',
    description:
      'El modelo neuronal detecta las articulaciones de manos, hombros y torso. Los puntos luminosos y líneas de conexión te confirman la captura precisa de cada seña.',
    tip: 'Encuadra tus manos a la altura del pecho o barbilla con buena iluminación para máxima precisión.',
    target: {
      getRect: (w, h, insets) => ({
        top: insets.top + (Platform.OS === 'web' ? 110 : 104),
        left: 14,
        width: w - 28,
        height: Math.min(380, h * 0.44),
        borderRadius: 24,
      }),
      cardPlacement: 'bottom',
      arrowAlign: 'center',
    },
  },
  {
    id: 'translation_card',
    category: 'TRADUCCIÓN EN TIEMPO REAL',
    icon: Volume2,
    title: 'Traducción Instantánea y Síntesis de Voz',
    subtitle: 'Pronunciación automática y texto en vivo',
    description:
      'Al completar una seña, la traducción aparece en pantalla y el motor de síntesis pronuncia el mensaje por altavoz o directamente en el auricular de tus lentes CokieLens.',
    tip: 'Presiona el botón de altavoz para repetir la frase o el botón de copiar para compartir el texto.',
    target: {
      getRect: (w, h, insets) => {
        const cameraTop = insets.top + (Platform.OS === 'web' ? 110 : 104);
        const cameraHeight = Math.min(380, h * 0.44);
        return {
          top: Math.min(cameraTop + cameraHeight + 10, h - 220),
          left: 14,
          width: w - 28,
          height: 120,
          borderRadius: 20,
        };
      },
      cardPlacement: 'top',
      arrowAlign: 'center',
    },
  },
  {
    id: 'quick_talk',
    category: 'COMUNICACIÓN BIDIRECCIONAL',
    icon: MessageSquare,
    title: 'Respuestas Rápidas para Personas Oyentes',
    subtitle: 'Interacción recíproca en dos vías',
    description:
      'Las personas oyentes pueden responderte tocando respuestas prediseñadas o escribiendo texto libre para que el teléfono lo exprese en voz alta.',
    tip: 'Facilita un diálogo completo y sin barreras sin necesidad de conocer lenguaje de señas.',
    target: {
      getRect: (w, h, insets) => ({
        top: Math.max(h - 110 - insets.bottom, 480),
        left: 14,
        width: w - 28,
        height: 85,
        borderRadius: 20,
      }),
      cardPlacement: 'top',
      arrowAlign: 'center',
    },
  },
  {
    id: 'lens_settings',
    category: 'CONECTIVIDAD COKIELENS',
    icon: Settings,
    title: 'Configuración Técnica y Diagnóstico',
    subtitle: 'IP, volumen y estado del servidor IA',
    description:
      'Gestiona la vinculación IP de tus lentes inteligentes (cokielens.local), ajusta el nivel de volumen y verifica la latencia del servidor de inteligencia artificial.',
    tip: 'Puedes volver a abrir este tour guiado en cualquier momento tocando el botón (?) en la barra superior.',
    target: {
      getRect: (w, h, insets) => ({
        top: insets.top + (Platform.OS === 'web' ? 8 : 4),
        right: 14,
        width: 82,
        height: 46,
        borderRadius: 23,
      }),
      cardPlacement: 'bottom',
      arrowAlign: 'right',
    },
  },
];

export default function TutorialModal({ visible, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);

  // Animaciones nativas
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.92)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const backdropFadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const totalSteps = TOUR_STEPS.length;
  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];
  const StepIcon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  // Animación de pulso continuo en el marco del foco (Spotlight)
  useEffect(() => {
    if (!visible) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -6,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    bounce.start();

    return () => {
      pulse.stop();
      bounce.stop();
    };
  }, [visible, pulseAnim, bounceAnim]);

  // Transición suave al abrir y al cambiar de paso
  useEffect(() => {
    if (visible) {
      Animated.timing(backdropFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      // Reset y entrada de tarjeta
      cardScaleAnim.setValue(0.94);
      cardFadeAnim.setValue(0);

      Animated.parallel([
        Animated.spring(cardScaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(cardFadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: (currentStep + 1) / totalSteps,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.timing(backdropFadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [currentStep, visible]);

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleClose = () => {
    Animated.timing(cardFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      setCurrentStep(0);
    });
  };

  if (!visible) return null;

  const targetRect = step.target.getRect(width, height, insets);
  const isCardBottom = step.target.cardPlacement === 'bottom';

  // Cálculo de posición de la tarjeta según el elemento enfocado
  const cardStyle = isCardBottom
    ? {
        top: Math.min(targetRect.top + targetRect.height + 14, height - 330),
      }
    : {
        top: Math.max(insets.top + 16, 20),
      };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropFadeAnim }]}>
        {/* ── 1. MARCO SPOTLIGHT RESALTANDO LA ZONA ACTIVA DE LA APP ── */}
        <View
          style={[
            styles.spotlightFrame,
            {
              top: targetRect.top,
              left: targetRect.left !== undefined ? targetRect.left : undefined,
              right: targetRect.right !== undefined ? targetRect.right : undefined,
              width: targetRect.width,
              height: targetRect.height,
              borderRadius: targetRect.borderRadius || 18,
            },
          ]}
          pointerEvents="none"
        >
          {/* Anillo de pulso exterior animado */}
          <Animated.View
            style={[
              styles.spotlightPulseRing,
              {
                borderRadius: (targetRect.borderRadius || 18) + 4,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* Insignia indicadora de foco activo */}
          <View style={styles.spotlightBadge}>
            <View style={styles.spotlightBeaconDot} />
            <Text style={styles.spotlightBadgeText}>ZONA ACTIVA</Text>
          </View>
        </View>

        {/* ── 2. FLECHA GUÍA DINÁMICA APUNTANDO AL ELEMENTO ── */}
        <Animated.View
          style={[
            styles.pointerArrowContainer,
            isCardBottom
              ? {
                  top: targetRect.top + targetRect.height + 2,
                  left:
                    step.target.arrowAlign === 'right'
                      ? width - 60
                      : width / 2 - 12,
                  transform: [{ translateY: bounceAnim }],
                }
              : {
                  top: targetRect.top - 18,
                  left: width / 2 - 12,
                  transform: [{ translateY: bounceAnim }, { rotate: '180deg' }],
                },
          ]}
          pointerEvents="none"
        >
          <View style={styles.pointerArrowShape} />
        </Animated.View>

        {/* ── 3. TARJETA GUÍA FLOTANTE (ESTILO COKIE COLLEGE DARK NAVY) ── */}
        <Animated.View
          style={[
            styles.card,
            cardStyle,
            {
              opacity: cardFadeAnim,
              transform: [{ scale: cardScaleAnim }],
            },
          ]}
        >
          {/* Cabecera: Categoría, Contador de Paso y Botón Cerrar */}
          <View style={styles.cardHeader}>
            <View style={styles.categoryBadge}>
              <StepIcon size={12} color="#60A5FA" />
              <Text style={styles.categoryText}>{step.category}</Text>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.stepCounterBadge}>
                <Text style={styles.stepCounterText}>
                  {currentStep + 1} / {totalSteps}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Saltar tour guiado"
              >
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Cuerpo Informativo */}
          <View style={styles.cardBody}>
            <Text style={styles.titleText}>{step.title}</Text>
            <Text style={styles.subtitleText}>{step.subtitle}</Text>
            <Text style={styles.descriptionText}>{step.description}</Text>

            {/* Recuadro de Consejo Pro */}
            <View style={styles.tipBox}>
              <View style={styles.tipIconCircle}>
                <Sparkles size={11} color="#3B82F6" />
              </View>
              <Text style={styles.tipText}>{step.tip}</Text>
            </View>
          </View>

          {/* Barra de Progreso Dinámica */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>

          {/* Pie de Tarjeta: Botones Anterior / Siguiente */}
          <View style={styles.cardFooter}>
            {!isFirst ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <ChevronLeft size={16} color="#CBD5E1" />
                <Text style={styles.backButtonText}>Anterior</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>Saltar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextButtonText}>
                {isLast ? 'Comenzar a Usar' : 'Siguiente'}
              </Text>
              {isLast ? (
                <Check size={16} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.8} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 8, 18, 0.88)',
    position: 'relative',
  },
  // Marco Spotlight con borde Azul Eléctrico Cokie Navy
  spotlightFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 8,
    zIndex: 20,
  },
  spotlightPulseRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.45)',
  },
  spotlightBadge: {
    position: 'absolute',
    top: -11,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#071024',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  spotlightBeaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#60A5FA',
  },
  spotlightBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.6,
  },
  // Flecha apuntando al foco
  pointerArrowContainer: {
    position: 'absolute',
    width: 24,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  pointerArrowShape: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#3B82F6',
    transform: [{ rotate: '180deg' }],
  },
  // Tarjeta Guía Flotante - Cokie College Dark Navy
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: '#0D1527',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.28)',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 12,
    zIndex: 30,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepCounterBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    marginBottom: 14,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
    lineHeight: 23,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 19,
    marginBottom: 12,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#101B34',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.22)',
  },
  tipIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: '#BFDBFE',
    lineHeight: 16,
    fontWeight: '500',
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    gap: 4,
  },
  backButtonText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  skipButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    gap: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
