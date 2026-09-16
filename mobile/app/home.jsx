import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

export default function HomeScreen() {
  const { profile } = useAuth();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Hogar</Text>
      <Text style={styles.subtitle}>Dashboard - {profile?.role}</Text>
      <Text style={styles.placeholder}>Contenido de resumen futuro...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A1450',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 18,
    color: '#FFF',
    marginTop: 8,
  },
  placeholder: {
    fontSize: 16,
    color: '#A0AEC0',
    marginTop: 20,
  }
});
