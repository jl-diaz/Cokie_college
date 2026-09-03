import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Check, Palette } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function DarkColorModal() {
  const { t } = useTranslation();
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

  if (!isColorModalOpen) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isColorModalOpen}
      onRequestClose={closeColorModal}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme === 'dark' ? '#1E1E1E' : '#FFFFFF' }]}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Palette size={22} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.headerTitle, { color: theme === 'dark' ? '#FFF' : '#0B1956' }]}>
                {t('theme.colorModalTitle', 'Color Primario (Modo Dark)')}
              </Text>
            </View>
            <TouchableOpacity onPress={closeColorModal} style={styles.closeBtn}>
              <X size={20} color={theme === 'dark' ? '#AAA' : '#666'} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: theme === 'dark' ? '#AAA' : '#666' }]}>
            {t('theme.colorModalSubtitle', 'Selecciona el color primario que se aplicará.')}
          </Text>

          <ScrollView style={styles.presetList} showsVerticalScrollIndicator={false}>
            {darkPresets.map((preset) => {
              const isSelected = darkPrimaryPresetId === preset.id;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetCard,
                    { 
                      backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F5F7FA',
                      borderColor: isSelected ? preset.primary : 'transparent' 
                    }
                  ]}
                  onPress={() => {
                    setDarkPrimaryPreset(preset.id);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.presetInfo}>
                    <View style={[styles.colorPreview, { backgroundColor: preset.primary }]} />
                    <View style={styles.colorPaletteSwatches}>
                      <View style={[styles.swatch, { backgroundColor: preset.primaryLight }]} />
                      <View style={[styles.swatch, { backgroundColor: preset.primaryDark }]} />
                    </View>
                    <Text style={[styles.presetName, { color: theme === 'dark' ? '#FFF' : '#333' }]}>
                      {preset.name}
                    </Text>
                  </View>

                  {isSelected && (
                    <View style={[styles.selectedBadge, { backgroundColor: preset.primary }]}>
                      <Check size={14} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity 
            style={[styles.doneBtn, { backgroundColor: colors.primary }]} 
            onPress={() => {
              if (theme !== 'dark') changeTheme('dark');
              closeColorModal();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>
              {t('dashboard.save', 'Guardar')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  presetList: {
    maxHeight: 320,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 2,
  },
  presetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorPreview: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  colorPaletteSwatches: {
    flexDirection: 'row',
    marginRight: 12,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 4,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
