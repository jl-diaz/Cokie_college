import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import Svg, { Path } from 'react-native-svg';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/home');
    } catch (err) {
      setError('Credenciales inválidas o error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Hero Header with Layered Waves */}
      <View style={styles.heroContainer}>
        <View style={styles.heroBackground}>
          <Text style={styles.heroTitle}>
            Cokie <Text style={styles.heroTitleAccent}>College</Text>
          </Text>
          <Text style={styles.heroSubtitle}>PLATAFORMA ESTUDIANTIL</Text>
        </View>
        <Svg
          height="140"
          width={width}
          viewBox="0 0 375 140"
          preserveAspectRatio="none"
          style={styles.heroCurve}
        >
          {/* Decorative layer 1 */}
          <Path
            d="M0,70 C90,130 285,40 375,100 L375,140 L0,140 Z"
            fill="rgba(255, 255, 255, 0.15)"
          />
          {/* Main curve layer */}
          <Path
            d="M0,90 C120,150 255,60 375,110 L375,140 L0,140 Z"
            fill={Colors.background}
          />
        </Svg>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.formContainer}>
          <View style={styles.card}>
            <Text style={styles.welcomeText}>¡Hola de nuevo!</Text>
            <Text style={styles.subWelcomeText}>Ingresa tus credenciales institucionales</Text>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="usuario@gmail.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={Colors.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={Colors.gray[400]}
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} size="small" />
              ) : (
                <Text style={styles.buttonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  heroBackground: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 0,
  },
  heroTitle: {
    color: Colors.text.inverse,
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.extraBold,
    letterSpacing: -1,
  },
  heroTitleAccent: {
    color: Colors.text.inverse,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
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
    paddingHorizontal: Spacing['2xl'],
    justifyContent: 'flex-start',
    marginTop: 0,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius['2xl'],
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
    ...Shadows.card,
  },
  welcomeText: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.extraBold,
    color: Colors.primary,
    textAlign: 'center',
  },
  subWelcomeText: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    marginTop: 6,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.gray[50],
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
    fontSize: Typography.size.md,
    color: Colors.primary,
    fontWeight: Typography.weight.medium,
  },
  errorText: {
    color: Colors.status.absent,
    backgroundColor: '#FFF5F5',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },
});

