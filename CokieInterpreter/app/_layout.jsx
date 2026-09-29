import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InterpreterProvider } from '../src/context/InterpreterContext';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = '#0B0F17';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflowX = 'hidden';
      document.documentElement.style.backgroundColor = '#0B0F17';

      // Añadir estilo global para scrollbars oscuros y fuentes limpias
      const styleId = 'cokie-interpreter-global-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          * {
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: #0B0F17;
          }
          ::-webkit-scrollbar-thumb {
            background: #262E3E;
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #3B82F6;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <InterpreterProvider>
        <StatusBar style="light" backgroundColor="#0B0F17" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0B0F17' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </InterpreterProvider>
    </SafeAreaProvider>
  );
}
