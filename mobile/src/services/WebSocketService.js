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

    // Si ya hay una conexión previa, limpiarla para evitar listeners duplicados
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'], // Priorizar websocket
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
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

    // Texto de traducción (llega inmediatamente)
    this.socket.on('translation_result', (data) => {
      if (data && data.text) {
        console.log('Traducción recibida:', data.text);
        this.lastSpokenText = data.text;
        this.lastSpokenTime = Date.now();
        if (this.listeners && this.listeners.length > 0) {
          this.listeners.forEach(cb => cb(data.text));
        }
      }
    });

    // Audio de traducción (llega después del texto, evento separado)
    this.socket.on('translation_audio', async (data) => {
      if (data && data.audioBase64) {
        const now = Date.now();
        
        // Evitar repetir el mismo audio en menos de 2.5 segundos
        if (data.text === this._lastAudioText && (now - this._lastAudioTime) < 2500) {
          return;
        }
        
        // No interrumpir si ya está hablando un audio
        if (this.isPlaying) {
          return;
        }

        try {
          this.isPlaying = true;
          this._lastAudioText = data.text;
          this._lastAudioTime = now;
          
          // Forzar audio por altavoz principal saltando el modo silencio en iOS
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
    });
  }

  addListener(callback) {
    if (!this.listeners) this.listeners = [];
    this.listeners.push(callback);
  }

  removeListener(callback) {
    if (this.listeners) {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    }
  }

  sendFrame(base64Image) {
    if (this.socket && (this.socket.connected || this.isConnected)) {
      this.socket.emit('process_frame', base64Image);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners = [];
    this.isConnected = false;
    this.isPlaying = false;
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
    this._lastAudioText = '';
    this._lastAudioTime = 0;
  }
}

export default new WebSocketService();
