import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Animated, 
  Dimensions, 
  Platform, 
  Modal, 
  Pressable 
} from 'react-native';
import { Palette, Check, Moon, Sun, X, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useTabBar } from '../context/TabBarContext';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function DarkColorModal() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { registerModal, unregisterModal } = useTabBar?.() || {};
  const { 
    isColorModalOpen, 
    closeColorModal, 
    darkPrimaryPresetId, 
    setDarkPrimaryPreset, 
    darkPresets,
    colors,
    theme,
    changeTheme
  } = useTheme();

  const [showModal, setShowModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Registrar con TabBar para ocultarlo mientras el modal esté abierto
  useEffect(() => {
    if (isColorModalOpen && registerModal) {
      registerModal();
      return () => {
        unregisterModal?.();
      };
    }
  }, [isColorModalOpen, registerModal, unregisterModal]);

  // Animaciones de apertura y cierre suaves
  useEffect(() => {
    if (isColorModalOpen) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [isColorModalOpen]);

  if (!showModal) return null;

  const isDark = theme === 'dark';

  const handleSelectPreset = (presetId) => {
    setDarkPrimaryPreset(presetId);
  };

  const handleApply = () => {
    closeColorModal();
  };

  return (
    <Modal
      transparent
      visible={showModal}
      onRequestClose={closeColorModal}
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlayContainer}>
        {/* Fondo oscuro atenuado con tap exterior para cerrar */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable 
            style={StyleSheet.absoluteFillObject} 
            onPress={closeColorModal} 
            accessibilityLabel="Cerrar modal" 
          />
        </Animated.View>

        {/* Panel Bottom Sheet animado */}
        <Animated.View 
          style={[
            styles.panel, 
            { 
              transform: [{ translateY: slideAnim }], 
              backgroundColor: isDark ? '#18181B' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              paddingBottom: Math.max(insets.bottom, 16),
            }
          ]}
        >
          {/* Barra de arrastre superior */}
          <View style={styles.dragHandleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' }]} />
          </View>

          {/* Header con icono y botón de cierre */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11, 25, 86, 0.08)' }]}>
                <Palette size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#0B1956' }]}>
                  {t('theme.colorModalTitle', 'Personalizar Tema y Color')}
                </Text>
                <Text style={[styles.headerSubtitle, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                  {t('theme.colorModalSubtitle', 'Ajusta la apariencia visual a tu preferencia')}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={closeColorModal} 
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}
              activeOpacity={0.7}
            >
              <X size={18} color={isDark ? '#E5E7EB' : '#475569'} />
            </TouchableOpacity>
          </View>

          {/* Selector Rápido de Modo Claro / Modo Oscuro */}
          <View style={[styles.themeSegmentContainer, { backgroundColor: isDark ? '#27272A' : '#F1F5F9' }]}>
            <TouchableOpacity
              style={[
                styles.themeSegmentBtn,
                !isDark && styles.themeSegmentBtnActiveLight,
              ]}
              onPress={() => changeTheme('light')}
              activeOpacity={0.8}
            >
              <Sun size={16} color={!isDark ? '#0B1956' : '#9CA3AF'} style={{ marginRight: 6 }} />
              <Text style={[styles.themeSegmentText, { color: !isDark ? '#0B1956' : '#9CA3AF', fontWeight: !isDark ? '700' : '500' }]}>
                {t('theme.lightMode', 'Modo Claro')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeSegmentBtn,
                isDark && [styles.themeSegmentBtnActiveDark, { backgroundColor: colors.primary }],
              ]}
              onPress={() => changeTheme('dark')}
              activeOpacity={0.8}
            >
              <Moon size={16} color={isDark ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
              <Text style={[styles.themeSegmentText, { color: isDark ? '#FFFFFF' : '#64748B', fontWeight: isDark ? '700' : '500' }]}>
                {t('theme.darkMode', 'Modo Oscuro')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Título de sección de acentos */}
          <View style={styles.sectionHeader}>
            <Sparkles size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: isDark ? '#F3F4F6' : '#1E293B' }]}>
              {t('theme.accentColorTitle', 'Color de Acento Principal')}
            </Text>
          </View>

          {/* Lista de Presets Bento */}
          <ScrollView 
            style={styles.presetList} 
            contentContainerStyle={styles.presetListContent}
            showsVerticalScrollIndicator={false}
          >
            {darkPresets.map((preset) => {
              const isSelected = darkPrimaryPresetId === preset.id;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetCard,
                    { 
                      backgroundColor: isDark 
                        ? (isSelected ? 'rgba(255, 255, 255, 0.07)' : '#27272A') 
                        : (isSelected ? 'rgba(11, 25, 86, 0.04)' : '#F8FAFC'),
                      borderColor: isSelected ? preset.primary : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                    }
                  ]}
                  onPress={() => handleSelectPreset(preset.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.presetInfo}>
                    {/* Círculo Principal Vibrante */}
                    <View style={[styles.colorPreview, { backgroundColor: preset.primary }]}>
                      <View style={[styles.innerGlow, { backgroundColor: preset.primaryLight }]} />
                    </View>

                    {/* Muestras secundarias */}
                    <View style={styles.colorPaletteSwatches}>
                      <View style={[styles.swatch, { backgroundColor: preset.primaryLight }]} />
                      <View style={[styles.swatch, { backgroundColor: preset.primaryDark }]} />
                    </View>

                    {/* Nombre del Preset */}
                    <Text 
                      style={[
                        styles.presetName, 
                        { 
                          color: isDark ? '#FFFFFF' : '#0F172A',
                          fontWeight: isSelected ? '700' : '600'
                        }
                      ]}
                      numberOfLines={1}
                    >
                      {t('theme.presets.' + preset.id, preset.name)}
                    </Text>
                  </View>

                  {/* Badge de selección activo */}
                  {isSelected ? (
                    <View style={[styles.selectedBadge, { backgroundColor: preset.primary }]}>
                      <Check size={14} color="#FFF" strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={[styles.unselectedRadio, { borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Botón de acción Guardar */}
          <TouchableOpacity 
            style={[styles.doneBtn, { backgroundColor: colors.primary }]} 
            onPress={handleApply}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>
              {t('common.applyAndSave', 'Aplicar y Guardar')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 99999,
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      maxHeight: '100dvh',
    }),
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  panel: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 560 : '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 16,
  },
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  themeSegmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  themeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  themeSegmentBtnActiveLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  themeSegmentBtnActiveDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  themeSegmentText: {
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  presetList: {
    maxHeight: Math.min(SCREEN_HEIGHT * 0.42, 320),
  },
  presetListContent: {
    paddingBottom: 8,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  presetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  innerGlow: {
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.6,
  },
  colorPaletteSwatches: {
    flexDirection: 'row',
    marginRight: 12,
    gap: 4,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  presetName: {
    fontSize: 14,
    flex: 1,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  unselectedRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  doneBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
