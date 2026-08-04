import io from 'socket.io-client';
import { Audio } from 'expo-av';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isPlaying = false;
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
  }

  // Se llamará con process.env.EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL
  connect(url) {
    if (!url) {
      console.warn('Falta la URL del servidor de lenguaje de señas en el archivo .env');
      return;
    }

    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 30000, // 30s para esperar cold-start de Render
    });

    this.socket.on('connect', () => {
      console.log('Conectado al servidor de Intérprete');
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Desconectado del servidor:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Error de conexión con intérprete:', err.message);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconectado al intérprete después de ${attemptNumber} intentos`);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Intento de reconexión #${attemptNumber}...`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('No se pudo reconectar al servidor de intérprete después de todos los intentos');
    });

    this.socket.on('translation_result', async (data) => {
      if (data && data.text) {
        const now = Date.now();
        
        // Evitar repetir el mismo texto en menos de 3 segundos
        if (data.text === this.lastSpokenText && (now - this.lastSpokenTime) < 3000) {
          return;
        }
        
        // No interrumpir si ya está hablando un audio
        if (this.isPlaying) {
          return;
        }
        
        console.log('Traducción recibida:', data.text);
        this.lastSpokenText = data.text;
        this.lastSpokenTime = now;
        
        // Si el backend nos mandó el audio (mp3 en base64)
        if (data.audioBase64) {
          try {
            this.isPlaying = true;
            
            // Forzar audio por altavoz principal saltando el modo silencio
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              playThroughEarpieceAndroid: false,
            });
            
            const soundUri = `data:audio/mp3;base64,${data.audioBase64}`;
            const { sound } = await Audio.Sound.createAsync(
              { uri: soundUri },
              { shouldPlay: true }
            );
            
            // Liberar cuando termine
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.didJustFinish) {
                this.isPlaying = false;
                sound.unloadAsync();
              }
            });
          } catch (e) {
            console.error("Error reproduciendo audio del backend:", e);
            this.isPlaying = false;
          }
        }
      }
    });
  }

  sendFrame(base64Image) {
    if (this.socket && this.isConnected) {
      this.socket.emit('process_frame', base64Image);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export default new WebSocketService();
