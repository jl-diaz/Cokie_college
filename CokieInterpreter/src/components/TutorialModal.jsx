import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Sparkles,
  Camera,
  Glasses,
  Volume2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Target,
  Sliders,
  Layers,
} from 'lucide-react-native';
import Colors from '../constants/colors';

const TUTORIAL_STEPS = [
  {
    title: '¡Bienvenido a CokieInterpreter! 🤟',
    subtitle: 'Intérprete Inteligente de Lenguaje de Señas',
    description:
      'Una aplicación creada para traducir tus señas y movimientos a voz y texto en tiempo real, conectando a personas sordas, mudas y oyentes al instante.',
    icon: Sparkles,
    badge: 'ACCESIBILIDAD TOTAL',
    accentColor: Colors.primary,
  },
  {
    title: 'Trazado de Puntos en Tiempo Real 🦴',
    subtitle: 'Comprobación visual de captura',
    description:
      'Verás puntos azules y líneas naranjas conectando tus dedos, manos, brazos y gestos faciales. Esto te confirma al 100% que la IA está reconociendo la geometría de tus señas.',
    icon: Target,
    badge: '21 PUNTOS POR MANO',
    accentColor: '#F97316',
  },
  {
    title: 'Encuadre y Posición Óptima 🎯',
    subtitle: 'Para evitar errores y falsos positivos',
    description:
      'Mantén tus manos a la altura del pecho o barbilla con buena iluminación. CokieInterpreter incluye filtros inteligentes para evitar que movimientos accidentales disparen palabras.',
    icon: Camera,
    badge: 'CAPTURA PRECISA',
    accentColor: Colors.success,
  },
  {
    title: 'Lentes CokieLens y Conexión Wi-Fi 👓',
    subtitle: 'Streaming local + Internet para la IA',
    description:
      'Para que la app consulte la IA en la nube y reciba el video de los lentes simultáneamente, conecta los lentes a la Zona Wi-Fi de tu celular o a tu router (cokielens.local). La red 192.168.4.1 es solo para la configuración inicial.',
    icon: Glasses,
    badge: 'CONECTIVIDAD DUAL',
    accentColor: '#D8B4FE',
  },
  {
    title: 'Voz Instantánea y Dos Vías 🔊',
    subtitle: 'Comunicación fluida y accesible',
    description:
      'Al terminar un gesto, la app lo dirá en voz alta en tu teléfono o en el auricular de los lentes. También tienes una barra de respuesta rápida para responder con texto o frases.',
    icon: Volume2,
    badge: 'CONVERSACIÓN COMPLETA',
    accentColor: Colors.primary,
  },
];

export default function TutorialModal({ visible, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
      setCurrentStep(0);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    onClose();
    setCurrentStep(0);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Cabecera con botón de saltar */}
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: `${step.accentColor}20` }]}>
              <Text style={[styles.badgeText, { color: step.accentColor }]}>{step.badge}</Text>
            </View>

            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>Saltar</Text>
            </TouchableOpacity>
          </View>

          {/* Contenido Visual e Ilustrativo */}
          <View style={styles.contentBody}>
            <View style={[styles.iconHalo, { borderColor: `${step.accentColor}40` }]}>
              <View style={[styles.iconCircle, { backgroundColor: `${step.accentColor}25` }]}>
                <StepIcon size={40} color={step.accentColor} />
              </View>
            </View>

            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>

          {/* Indicador de Pasos (Dots) */}
          <View style={styles.dotsRow}>
            {TUTORIAL_STEPS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === currentStep && [styles.dotActive, { backgroundColor: step.accentColor }],
                ]}
              />
            ))}
          </View>

          {/* Botones de Navegación */}
          <View style={styles.footerButtonsRow}>
            {currentStep > 0 ? (
              <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
                <ChevronLeft size={18} color="#94A3B8" />
                <Text style={styles.backButtonText}>Atrás</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: step.accentColor }]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextButtonText}>
                {isLast ? '¡Comenzar a Usar!' : 'Siguiente'}
              </Text>
              {!isLast && <ChevronRight size={18} color="#0B0F17" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#11151F',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  skipBtn: {
    padding: 6,
  },
  skipBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  contentBody: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 22,
  },
  iconHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 21,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 22,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dotActive: {
    width: 22,
    borderRadius: 4,
  },
  footerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  backButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 22,
    gap: 6,
  },
  nextButtonText: {
    color: '#0B0F17',
    fontSize: 14,
    fontWeight: '800',
  },
});
