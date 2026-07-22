import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';

export default function PageHeader({ title, subtitle, showBack = false, onBackPress, extraContent }) {
  const { colors, theme } = useTheme();
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.header, { backgroundColor: theme === 'dark' ? colors.card : colors.primary }]}>
      {showBack && (
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <ArrowLeft color={theme === 'dark' ? colors.text.headerTxtC : '#FFF'} size={24} />
        </TouchableOpacity>
      )}
      <Text style={[styles.headerTitle, { color: theme === 'dark' ? colors.primary : '#FFF' }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.headerSubtitle, { color: theme === 'dark' ? colors.text.secondary : 'rgba(255,255,255,0.85)' }]}>
          {subtitle}
        </Text>
      )}
      {extraContent}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 24,
    paddingBottom: 36,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 10,
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
});
