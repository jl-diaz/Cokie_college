import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';

/**
 * [BETA/WIP] InterpreterScreen V2 usando react-native-vision-camera
 * Esta pantalla sirve como base para migrar el intérprete a una ejecución 100% nativa sin WebView.
 * 
 * NOTA IMPORTANTE:
 * Para usar MediaPipe Holistic aquí (o TFLite), necesitas usar una librería de JSI como `react-native-fast-tflite`
 * o crear un módulo C++ nativo para el frame processor.
 * 
 * Actualmente no interfiere con InterpreterScreen.native.jsx, que sigue usando WebView.
 */
export default function InterpreterScreenV2() {
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice('front');

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Frame Processor (Se ejecuta a 60 FPS en el hilo UI)
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    // Aquí es donde procesas el frame.
    // Ejemplo de pseudocódigo con tflite:
    // const results = model.run(frame);
    // const gestures = runFingerpose(results);
    
    // NOTA: Para devolver datos a React JS desde un worklet:
    // const runOnJS = Worklets.createRunOnJS((data) => setLandmarks(data));
    // runOnJS(results);
    
  }, []);

  if (!hasPermission) return <View style={styles.container}><Text>No Camera Permission</Text></View>;
  if (device == null) return <View style={styles.container}><Text>No Camera Device</Text></View>;

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat="yuv" // Recomendado para Machine Learning
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>Interpreter V2 (Vision Camera)</Text>
        <Text style={styles.subtitle}>Frame Processor Activo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    borderRadius: 15,
  },
  title: { color: '#10b981', fontSize: 18, fontWeight: 'bold' },
  subtitle: { color: 'white', marginTop: 5 }
});
