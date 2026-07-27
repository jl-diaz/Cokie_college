import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Globe } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'ios' 
    ? Math.max(insets.top + 10, 50) 
    : (StatusBar.currentHeight || insets.top || 24) + 12;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();
  const { theme, colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    await i18n.changeLanguage(newLang);
    try {
      await AsyncStorage.setItem('language', newLang);
    } catch (e) {
      console.error('Error saving language:', e);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('login.fieldsRequired', 'Por favor completa todos los campos'));
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/home');
    } catch (err) {
      setError(t('login.invalidCredentials', 'Credenciales inválidas o error de conexión'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'auto'} 
        backgroundColor={theme === 'dark' ? colors.card : '#0B1956'} 
      />
      
      {/* Hero Header with Layered Waves & Language Switcher */}
      <View style={styles.heroContainer}>
        <View style={styles.heroBackground}>
          <TouchableOpacity 
            onPress={toggleLanguage} 
            style={[styles.langSwitchBtn, { top: topPadding }]}
            activeOpacity={0.7}
          >
            <Globe size={18} color={colors.text.headerTxtC || '#FFF'} />
            <Text style={[styles.langSwitchText, { color: colors.text.headerTxtC || '#FFF' }]}>
              {i18n.language?.toUpperCase() || 'ES'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.heroTitle}>
            Cokie <Text style={styles.heroTitleAccent}>College</Text>
          </Text>
          <Text style={styles.heroSubtitle}>{t('login.heroSubtitle', 'PLATAFORMA ESTUDIANTIL')}</Text>
        </View>
        <Svg
          height="140"
          width={width}
          viewBox="0 0 375 140"
          preserveAspectRatio="none"
          style={styles.heroCurve}
        >
          <Path
            d="M0,70 C90,130 285,40 375,100 L375,140 L0,140 Z"
            fill="rgba(255, 255, 255, 0.15)"
          />
          <Path
            d="M0,90 C120,150 255,60 375,110 L375,140 L0,140 Z"
            fill={theme === 'dark' ? colors.background : '#F5F7FA'}
          />
        </Svg>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start', paddingBottom: 40 }} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.formContainer}>
            <View style={styles.card}>
              <Text style={styles.welcomeText}>{t('login.welcome', '¡Hola de nuevo!')}</Text>
              <Text style={styles.subWelcomeText}>{t('login.subWelcome', 'Ingresa tus credenciales institucionales')}</Text>
              
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('login.emailLabel', 'Correo Electrónico')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('login.emailPlaceholder', 'usuario@gmail.com')}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  keyboardType="email-address"
                  placeholderTextColor={theme === 'dark' ? '#5a5a5a' : '#A0AEC0'}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('login.passwordLabel', 'Contraseña')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                  placeholderTextColor={theme === 'dark' ? '#5a5a5a' : '#A0AEC0'}
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]} 
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={theme === 'dark' ? colors.text.primary : '#fff'} size="small" />
                ) : (
                  <Text style={styles.buttonText}>{t('login.loginBtn', 'Iniciar Sesión')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  heroBackground: {
    flex: 1,
    backgroundColor: theme === 'dark' ? colors.card : '#0B1956',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 0,
    borderBottomWidth: theme === 'dark' ? 1 : 0,
    borderBottomColor: colors.gray[200],
    position: 'relative',
  },
  langSwitchBtn: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 20,
  },
  langSwitchText: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  heroTitle: {
    color: theme === 'dark' ? colors.text.primary : '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroTitleAccent: {
    color: theme === 'dark' ? colors.primary : '#FFFFFF',
  },
  heroSubtitle: {
    color: theme === 'dark' ? colors.text.secondary : 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  heroCurve: {
    position: 'absolute',
    bottom: -1,
    left: 0,
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
    marginTop: 0,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: theme === 'dark' ? '#000' : '#0B1956',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: theme === 'dark' ? 0.25 : 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: colors.gray[200],
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: theme === 'dark' ? colors.primary : '#0B1956',
    textAlign: 'center',
  },
  subWelcomeText: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 28,
    marginTop: 6,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: theme === 'dark' ? colors.background : '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '600',
  },
  errorText: {
    color: '#E53E3E',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
