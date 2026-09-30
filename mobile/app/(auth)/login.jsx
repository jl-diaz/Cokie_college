import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  ScrollView, 
  Platform, 
  ActivityIndicator, 
  Dimensions, 
  StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Globe, Fingerprint, ScanFace, Check, KeyRound } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import {
  checkBiometricsAvailability,
  authenticateBiometrics,
  getBiometricCredentials,
  saveBiometricCredentials,
  clearBiometricCredentials,
} from '../../src/utils/biometrics';
import { hapticSuccess, hapticError, hapticLight, hapticSelection } from '../../src/utils/haptics';

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
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricsState, setBiometricsState] = useState({
    available: false,
    hasHardware: false,
    enrolled: false,
    biometryType: null,
    biometryLabel: 'Biometría',
  });
  const [savedCredentials, setSavedCredentials] = useState(null);
  const [enableBiometricsCheckbox, setEnableBiometricsCheckbox] = useState(true);

  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  React.useEffect(() => {
    if (!authLoading && user) {
      router.replace('/home');
    }
  }, [user, authLoading]);

  // Chequeo de disponibilidad de biometría y carga de credenciales guardadas
  useEffect(() => {
    let isMounted = true;
    async function loadBiometrics() {
      const bioInfo = await checkBiometricsAvailability();
      if (!isMounted) return;
      setBiometricsState(bioInfo);
      if (bioInfo.available) {
        const creds = await getBiometricCredentials();
        if (isMounted && creds) {
          setSavedCredentials(creds);
          setEmail(creds.identifier);
        }
      }
    }
    loadBiometrics();
    return () => { isMounted = false; };
  }, []);

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    await i18n.changeLanguage(newLang);
    try {
      await AsyncStorage.setItem('language', newLang);
    } catch (e) {
      console.error('Error saving language:', e);
    }
  };

  const handleBiometricLogin = async () => {
    if (!savedCredentials) return;
    setError('');
    setBiometricLoading(true);
    try {
      hapticLight();
      const result = await authenticateBiometrics({
        promptMessage: t('biometrics.promptMessage', 'Verifica tu identidad para acceder a Cokie College'),
        cancelLabel: t('biometrics.cancel', 'Cancelar'),
        fallbackLabel: '',
        disableDeviceFallback: true,
      });

      if (result.success) {
        hapticSuccess();
        setLoading(true);
        await login(savedCredentials.identifier, savedCredentials.password);
        router.replace('/home');
      } else if (result.error && !String(result.error).toLowerCase().includes('cancel')) {
        hapticError();
        if (result.error === 'lockout') {
          setError(t('biometrics.lockoutError', 'Demasiados intentos fallidos. Desbloquea tu dispositivo para continuar.'));
        } else if (result.error === 'missing_usage_description' || result.error === 'not_available') {
          setError(t('biometrics.permissionDenied', 'Face ID no tiene permiso o no está configurado en los Ajustes del dispositivo.'));
        } else {
          setError(t('login.biometricsFailed', 'No se pudo completar la autenticación biométrica.'));
        }
      }
    } catch (err) {
      console.error('[Login] Biometric auth error:', err);
      hapticError();
      setError(t('login.invalidCredentials', 'Credenciales inválidas o error de conexión'));
    } finally {
      setBiometricLoading(false);
      setLoading(false);
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
      const authData = await login(email, password);
      hapticSuccess();

      // Guardar credenciales de forma segura si la biometría está disponible y el checkbox está activo
      if (biometricsState.available && enableBiometricsCheckbox) {
        await saveBiometricCredentials({
          identifier: email.trim(),
          password,
          displayName: authData?.user?.user_metadata?.full_name || email.trim(),
        });
      }

      router.replace('/home');
    } catch (err) {
      hapticError();
      setError(t('login.invalidCredentials', 'Credenciales inválidas o error de conexión'));
    } finally {
      setLoading(false);
    }
  };

  const handleClearBiometrics = async () => {
    hapticLight();
    await clearBiometricCredentials();
    setSavedCredentials(null);
    setEmail('');
    setPassword('');
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

              {/* Botón de Acceso Biométrico Rápido si ya hay credenciales guardadas (Solo en móvil nativo) */}
              {Platform.OS !== 'web' && savedCredentials && biometricsState.available && (
                <View style={styles.quickBioContainer}>
                  <View style={styles.quickBioHeader}>
                    <View style={styles.quickBioIconCircle}>
                      {biometricsState.biometryType === 'FACIAL_RECOGNITION' ? (
                        <ScanFace size={30} color={colors.primary} />
                      ) : (
                        <Fingerprint size={30} color={colors.primary} />
                      )}
                    </View>
                    <View style={styles.quickBioMeta}>
                      <Text style={styles.quickBioName} numberOfLines={1}>
                        {savedCredentials.displayName || savedCredentials.identifier}
                      </Text>
                      <Text style={styles.quickBioSub}>
                        {t('login.biometricPrompt', 'Inicia sesión con tu huella o Face ID')}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.bioQuickBtn, (loading || biometricLoading) && styles.buttonDisabled]} 
                    onPress={handleBiometricLogin}
                    disabled={loading || biometricLoading}
                    activeOpacity={0.85}
                  >
                    {biometricLoading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <View style={styles.bioQuickBtnContent}>
                        {biometricsState.biometryType === 'FACIAL_RECOGNITION' ? (
                          <ScanFace size={20} color="#FFF" style={{ marginRight: 8 }} />
                        ) : (
                          <Fingerprint size={20} color="#FFF" style={{ marginRight: 8 }} />
                        )}
                        <Text style={styles.bioQuickBtnText}>
                          {t('login.biometricBtn', { type: biometricsState.biometryLabel || 'Biometría' })}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.switchAccountBtn}
                    onPress={handleClearBiometrics}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.switchAccountText}>
                      {t('login.biometricUseOther', 'Usar otra cuenta')}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>o ingresa manualmente</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </View>
              )}
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('login.emailLabel', 'Correo o Carnet Institucional')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('login.emailPlaceholder', 'usuario@gmail.com o DA26001')}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
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

              {/* Casilla para recordar con Face ID / Huella si aún no está configurado (Solo en móvil nativo) */}
              {Platform.OS !== 'web' && biometricsState.available && !savedCredentials && (
                <TouchableOpacity 
                  style={styles.bioRememberRow}
                  onPress={() => {
                    hapticSelection();
                    setEnableBiometricsCheckbox(prev => !prev);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkboxBox, enableBiometricsCheckbox && styles.checkboxBoxChecked]}>
                    {enableBiometricsCheckbox && <Check size={14} color="#FFF" strokeWidth={3} />}
                  </View>
                  <View style={styles.bioRememberTexts}>
                    <Text style={styles.bioRememberTitle}>
                      {t('login.biometricBtn', { type: biometricsState.biometryLabel || 'Face ID / Huella' })}
                    </Text>
                    <Text style={styles.bioRememberSubtitle}>
                      {t('biometrics.toggleInactiveDesc', 'Activar inicio seguro y rápido en este equipo')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

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
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 450,
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
    marginBottom: 24,
    marginTop: 6,
  },
  // Quick Biometric Card
  quickBioContainer: {
    backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F0F4FF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#DCE7FE',
  },
  quickBioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickBioIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#E0EAFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickBioMeta: {
    flex: 1,
  },
  quickBioName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  quickBioSub: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  bioQuickBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bioQuickBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioQuickBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  switchAccountBtn: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchAccountText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[200],
  },
  dividerText: {
    fontSize: 11,
    color: colors.text.muted,
    paddingHorizontal: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  // Checkbox row for enabling biometrics during manual login
  bioRememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.gray[300] || '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: 'transparent',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bioRememberTexts: {
    flex: 1,
  },
  bioRememberTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  bioRememberSubtitle: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 18,
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
    fontSize: 16,
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
    marginTop: 6,
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
