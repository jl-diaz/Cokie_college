import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch, 
  Modal, 
  TextInput, 
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Fingerprint, 
  ScanFace, 
  ShieldCheck, 
  Lock, 
  LogOut, 
  Globe, 
  CreditCard, 
  Eye, 
  EyeOff, 
  Check, 
  X 
} from 'lucide-react-native';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';
import { 
  checkBiometricsAvailability, 
  isBiometricsConfigured, 
  authenticateBiometrics, 
  saveBiometricCredentials, 
  clearBiometricCredentials 
} from '../src/utils/biometrics';
import { hapticSuccess, hapticError, hapticLight, hapticSelection } from '../src/utils/haptics';
import { supabase } from '../src/utils/supabase';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const { colors: Colors, theme } = useTheme();
  const { showAlert, showConfirm } = useAlert();
  const styles = useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  // Estados de biometría
  const [biometricsInfo, setBiometricsInfo] = useState({
    available: false,
    hasHardware: false,
    enrolled: false,
    biometryType: null,
    biometryLabel: 'Biometría',
  });
  const [isBiometricsActive, setIsBiometricsActive] = useState(false);
  const [loadingBioCheck, setLoadingBioCheck] = useState(true);

  // Estados del modal de confirmación con contraseña para habilitar
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Cargar estado inicial de biometría
  useEffect(() => {
    let isMounted = true;
    const fetchBiometricsStatus = async () => {
      try {
        const info = await checkBiometricsAvailability();
        const configured = await isBiometricsConfigured();
        if (isMounted) {
          setBiometricsInfo(info);
          setIsBiometricsActive(configured);
        }
      } catch (err) {
        console.warn('[Profile] Error loading biometrics:', err);
      } finally {
        if (isMounted) setLoadingBioCheck(false);
      }
    };

    fetchBiometricsStatus();
    return () => { isMounted = false; };
  }, []);

  const handleToggleBiometrics = async (nextValue) => {
    hapticSelection();

    // Caso 1: Desactivar biometría
    if (!nextValue) {
      showConfirm({
        title: t('biometrics.confirmIdentityToDisable', 'Desactivar acceso biométrico'),
        message: t('biometrics.disabledAlert', 'El inicio de sesión biométrico ha sido desactivado.'),
        confirmText: t('dashboard.confirm', 'Desactivar'),
        cancelText: t('dashboard.cancel', 'Cancelar'),
        type: 'warning',
        onConfirm: async () => {
          await clearBiometricCredentials();
          setIsBiometricsActive(false);
          hapticSuccess();
        }
      });
      return;
    }

    // Caso 2: Activar biometría
    if (!biometricsInfo.available) {
      hapticError();
      showAlert({
        type: 'warning',
        title: t('biometrics.title', 'Autenticación Biométrica'),
        message: biometricsInfo.hasHardware && !biometricsInfo.enrolled
          ? t('login.biometricsNotEnrolled', 'No tienes huella o Face ID configurado en tu teléfono.')
          : t('biometrics.deviceNotSupported', 'No disponible en este dispositivo')
      });
      return;
    }

    // Abrir modal de confirmación de contraseña para almacenar de manera segura
    setPasswordInput('');
    setPasswordError('');
    setPasswordModalVisible(true);
  };

  const handleConfirmEnableBiometrics = async () => {
    if (!passwordInput.trim()) {
      setPasswordError(t('login.fieldsRequired', 'Por favor completa todos los campos'));
      return;
    }

    setPasswordError('');
    setVerifyingPassword(true);
    try {
      // 1. Validar la contraseña contra Supabase
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email,
        password: passwordInput,
      });

      if (signInError) {
        hapticError();
        setPasswordError(t('biometrics.invalidPassword', 'La contraseña ingresada no es válida.'));
        setVerifyingPassword(false);
        return;
      }

      // 2. Comprobar identidad biométrica en el dispositivo
      const authResult = await authenticateBiometrics({
        promptMessage: t('biometrics.confirmIdentityToEnable', 'Confirma tu identidad biométrica'),
        cancelLabel: t('biometrics.cancel', 'Cancelar'),
        fallbackLabel: t('biometrics.fallback', 'Usar contraseña'),
      });

      if (!authResult.success) {
        hapticError();
        setPasswordError(t('biometrics.authFailed', 'No se pudo verificar la biometría.'));
        setVerifyingPassword(false);
        return;
      }

      // 3. Guardar credenciales cifradas en Keychain/Keystore
      const saved = await saveBiometricCredentials({
        identifier: profile?.institutional_code || user?.email,
        password: passwordInput,
        displayName: profile?.full_name || user?.email,
      });

      if (saved) {
        hapticSuccess();
        setIsBiometricsActive(true);
        setPasswordModalVisible(false);
        showAlert({
          type: 'success',
          title: t('biometrics.title', 'Autenticación Biométrica'),
          message: t('biometrics.enabledAlert', { type: biometricsInfo.biometryLabel || 'Biometría' }),
        });
      } else {
        setPasswordError(t('biometrics.authFailed', 'Error al guardar credenciales en el llavero.'));
      }
    } catch (err) {
      console.error('[Profile] Error enabling biometrics:', err);
      setPasswordError(err?.message || 'Error inesperado');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const toggleLanguage = async () => {
    hapticSelection();
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    await i18n.changeLanguage(newLang);
    try {
      await AsyncStorage.setItem('language', newLang);
    } catch (e) {
      console.error('Error saving language:', e);
    }
  };

  const handleLogout = async () => {
    hapticLight();
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const BiometryIcon = useMemo(() => {
    if (biometricsInfo.biometryType === 'FACIAL_RECOGNITION') return ScanFace;
    if (biometricsInfo.biometryType === 'FINGERPRINT') return Fingerprint;
    return ShieldCheck;
  }, [biometricsInfo.biometryType]);

  return (
    <View style={styles.container}>
      <PageHeader 
        title={t('titles.profile', 'Mi Perfil')}
        subtitle={t('titles.profileSubtitle', 'Información personal y cuenta')}
      />

      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado del Perfil */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0) || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || t('dashboard.student', 'Usuario')}</Text>
          <Text style={styles.email}>{profile?.email || user?.email || ''}</Text>
          
          <View style={styles.badgesRow}>
            {profile?.role && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {t('roles.' + profile.role, profile.role.replace('_', ' ')).toUpperCase()}
                </Text>
              </View>
            )}

            {profile?.institutional_code && (
              <View style={styles.codeBadge}>
                <CreditCard size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.codeText}>{profile.institutional_code}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sección: Seguridad y Desbloqueo Biométrico */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>
            {t('biometrics.settingsTitle', 'Seguridad y Acceso Biométrico')}
          </Text>
          <Text style={styles.sectionHeaderSub}>
            {t('biometrics.settingsSubtitle', 'Usa Face ID o tu huella digital para desbloquear la app al instante')}
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingIconWrapper}>
              <BiometryIcon size={24} color={Colors.primary} />
            </View>
            <View style={styles.settingTextContent}>
              <Text style={styles.settingTitle}>
                {t('biometrics.toggleLabel', { type: biometricsInfo.biometryLabel || 'Biometría' })}
              </Text>
              <Text style={styles.settingSubtitle}>
                {!biometricsInfo.available 
                  ? t('biometrics.deviceNotSupported', 'No disponible en este dispositivo')
                  : isBiometricsActive 
                    ? t('biometrics.toggleActiveDesc', 'Habilitado en este dispositivo') 
                    : t('biometrics.toggleInactiveDesc', 'Toca para activar inicio seguro y rápido')}
              </Text>
            </View>
            {loadingBioCheck ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Switch
                value={isBiometricsActive}
                onValueChange={handleToggleBiometrics}
                disabled={!biometricsInfo.available}
                trackColor={{ false: Colors.gray[300] || '#D1D5DB', true: Colors.primary }}
                thumbColor={isBiometricsActive ? '#FFFFFF' : '#F3F4F6'}
              />
            )}
          </View>

          <View style={styles.securityNote}>
            <Lock size={14} color={Colors.text.muted} style={{ marginRight: 6 }} />
            <Text style={styles.securityNoteText}>
              {t('biometrics.keychainNotice', 'Tus credenciales están resguardadas en el enclave seguro (Keychain/Keystore) de tu dispositivo.')}
            </Text>
          </View>
        </View>

        {/* Sección: Preferencias del Sistema */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>Preferencias del Sistema</Text>

          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={toggleLanguage}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconWrapper}>
              <Globe size={22} color={Colors.primary} />
            </View>
            <View style={styles.settingTextContent}>
              <Text style={styles.settingTitle}>Idioma de la Aplicación</Text>
              <Text style={styles.settingSubtitle}>
                {i18n.language === 'en' ? 'Inglés (English)' : 'Español'}
              </Text>
            </View>
            <View style={styles.langPill}>
              <Text style={styles.langPillText}>
                {i18n.language?.toUpperCase() || 'ES'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Menú de Acciones / Cierre de Sesión */}
        <View style={styles.menu}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <LogOut size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>{t('menu.logout', 'Cerrar Sesión')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de confirmación de contraseña para activar Biometría */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <BiometryIcon size={32} color={Colors.primary} />
            </View>

            <Text style={styles.modalTitle}>
              {t('biometrics.modalPasswordTitle', 'Confirma tu contraseña')}
            </Text>
            <Text style={styles.modalSubtitle}>
              {t('biometrics.modalPasswordSubtitle', 'Para activar el desbloqueo rápido de forma segura, ingresa tu contraseña institucional actual:')}
            </Text>

            {passwordError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{passwordError}</Text>
              </View>
            ) : null}

            <View style={styles.modalInputWrapper}>
              <TextInput
                style={styles.modalInput}
                placeholder={t('biometrics.modalPasswordPlaceholder', 'Tu contraseña institucional')}
                placeholderTextColor={theme === 'dark' ? '#666' : '#94A3B8'}
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.eyeBtn}
                onPress={() => setShowPassword(p => !p)}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff size={18} color={Colors.text.muted} />
                ) : (
                  <Eye size={18} color={Colors.text.muted} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPasswordModalVisible(false)}
                disabled={verifyingPassword}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>
                  {t('biometrics.modalPasswordCancel', 'Cancelar')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, verifyingPassword && { opacity: 0.7 }]}
                onPress={handleConfirmEnableBiometrics}
                disabled={verifyingPassword}
                activeOpacity={0.8}
              >
                {verifyingPassword ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>
                    {t('biometrics.modalPasswordConfirm', 'Confirmar y Activar')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 95,
  },
  profileHeader: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 38,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  roleBadge: {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.15)' : '#DBEAFE',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.secondary,
  },
  // Section Cards
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#E2E8F0',
    shadowColor: theme === 'dark' ? '#000' : '#0B1956',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 16,
    lineHeight: 17,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingTextContent: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#E2E8F0',
  },
  securityNoteText: {
    fontSize: 11,
    color: Colors.text.muted,
    flex: 1,
    lineHeight: 15,
  },
  langPill: {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  menu: {
    marginTop: 28,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Password Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  modalErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    marginBottom: 14,
  },
  modalErrorText: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '600',
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: Colors.gray[200] || '#E2E8F0',
    borderRadius: 14,
    backgroundColor: theme === 'dark' ? Colors.background : '#F8FAFC',
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 8,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.secondary,
  },
  modalConfirmBtn: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
