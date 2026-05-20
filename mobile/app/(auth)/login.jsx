import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import Svg, { Path } from 'react-native-svg';

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
      <StatusBar barStyle="light-content" backgroundColor="#0B1956" />
      
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
            fill="#F5F7FA"
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
                placeholderTextColor="#A0AEC0"
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
                placeholderTextColor="#A0AEC0"
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
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
    backgroundColor: '#F5F7FA',
  },
  heroContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  heroBackground: {
    flex: 1,
    backgroundColor: '#0B1956',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 0,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroTitleAccent: {
    color: '#ffffffff',
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: '#0B1956',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0B1956',
    textAlign: 'center',
  },
  subWelcomeText: {
    fontSize: 13,
    color: '#718096',
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
    color: '#4A5568',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    fontSize: 15,
    color: '#0B1956',
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
    backgroundColor: '#0B1956',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1956',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
