import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { DARK_PRIMARY_PRESETS } from '../constants/themePresets';

const lightColors = {
  primary: '#0B1956',
  primaryLight: '#426bc2',
  primaryDark: '#0a1540',
  headerC: '#0B1956',
  background: '#F5F7FA',
  card: '#FFFFFF',
  tabBtnTextColor: "#FFFFFF",
  text: {
    primary: '#0B1956',
    secondary: '#4A5568',
    muted: '#8a8da0',
    inverse: '#FFFFFF',
    headerTxtC: '#FFFFFF',
  },
  status: {
    present: '#4CAF50',
    absent: '#e74c3c',
    pending: '#f39c12',
    approved: '#2ecc71',
    rejected: '#e74c3c',
  },
  conduct: {
    positive: '#2ecc71',
    leve: '#f39c12',
    grave: '#e74c3c',
    muyGrave: '#8E44AD',
  },
  gray: {
    50: '#F7F7F7',
    100: '#F5F7FA',
    200: '#EDF2F7',
    300: '#E2E8F0',
    400: '#CBD5E0',
    500: '#A0AEC0',
    600: '#718096',
    700: '#4A5568',
    800: '#2D3748',
    900: '#1A202C',
  },
};

const defaultDarkColors = {
  primary: '#1c3cc9',
  primaryLight: '#4159c4',
  primaryDark: '#0a2cc7',
  headerC: '#1E1E1E',
  background: '#121212',
  card: '#1E1E1E',
  tabBtnTextColor: "#FFFFFF",
  text: {
    primary: '#F8F9FA',
    secondary: '#CBD5E0',
    muted: '#8a8da0',
    inverse: '#121212',
    headerTxtC: '#1c3cc9',
  },
  status: {
    present: '#4CAF50',
    absent: '#e74c3c',
    pending: '#f39c12',
    approved: '#2ecc71',
    rejected: '#e74c3c',
  },
  conduct: {
    positive: '#2ecc71',
    leve: '#f39c12',
    grave: '#e74c3c',
    muyGrave: '#8E44AD',
  },
  gray: {
    50: '#1a1a1a',
    100: '#2a2a2a',
    200: '#3a3a3a',
    300: '#4a4a4a',
    400: '#5a5a5a',
    500: '#A0AEC0',
    600: '#718096',
    700: '#4A5568',
    800: '#2D3748',
    900: '#1A202C',
  },
};

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [darkPrimaryPresetId, setDarkPrimaryPresetId] = useState('default');
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);

  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          setTheme(savedTheme);
        } else {
          const systemTheme = Appearance.getColorScheme();
          setTheme(systemTheme || 'light');
        }

        const savedPresetId = await AsyncStorage.getItem('dark_primary_preset');
        if (savedPresetId) {
          setDarkPrimaryPresetId(savedPresetId);
        }
      } catch (error) {
        console.error('Failed to load theme settings:', error);
      }
    };
    loadThemeSettings();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const changeTheme = async (newTheme) => {
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const setDarkPrimaryPreset = async (presetId) => {
    setDarkPrimaryPresetId(presetId);
    try {
      await AsyncStorage.setItem('dark_primary_preset', presetId);
    } catch (error) {
      console.error('Failed to save dark primary preset:', error);
    }
  };

  const openColorModal = () => setIsColorModalOpen(true);
  const closeColorModal = () => setIsColorModalOpen(false);

  const activeDarkPreset = useMemo(() => {
    return DARK_PRIMARY_PRESETS.find(p => p.id === darkPrimaryPresetId) || DARK_PRIMARY_PRESETS[0];
  }, [darkPrimaryPresetId]);

  const currentDarkColors = useMemo(() => {
    return {
      ...defaultDarkColors,
      primary: activeDarkPreset.primary,
      primaryLight: activeDarkPreset.primaryLight,
      primaryDark: activeDarkPreset.primaryDark,
      text: {
        ...defaultDarkColors.text,
        headerTxtC: activeDarkPreset.headerTxtC,
      },
    };
  }, [activeDarkPreset]);

  const colors = theme === 'dark' ? currentDarkColors : lightColors;

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      changeTheme,
      colors,
      darkPrimaryPresetId,
      setDarkPrimaryPreset,
      isColorModalOpen,
      openColorModal,
      closeColorModal,
      darkPresets: DARK_PRIMARY_PRESETS,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export const useThemeStyles = (stylesFactory) => {
  const { colors } = useTheme();
  return useMemo(() => stylesFactory(colors), [colors, stylesFactory]);
};
