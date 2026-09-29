import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

class SpeechService {
  constructor() {
    this.isMuted = false;
    this.volume = 0.85; // 0.0 to 1.0
    this.rate = 1.0;
    this.pitch = 1.0;
    this.language = 'es-MX';
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  setVolume(volPercent) {
    this.volume = Math.max(0, Math.min(1, volPercent / 100));
  }

  stop() {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      } else {
        Speech.stop().catch(() => {});
      }
    } catch (e) {}
  }

  async speak(text, options = {}) {
    if (!text || this.isMuted) return;

    const targetOutput = options.audioOutput || 'device'; // 'device' | 'glasses'
    const esp32Ip = options.esp32Ip || '192.168.4.1';
    const volumePercent = options.volume !== undefined ? options.volume : Math.round(this.volume * 100);

    // Si la salida está configurada en los lentes, enviar al endpoint /play del ESP32
    if (targetOutput === 'glasses') {
      try {
        const cleanIp = esp32Ip.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
        fetch(`http://${cleanIp}/play`, {
          method: 'POST',
          body: text,
          headers: {
            'Content-Type': 'text/plain',
            'X-Audio-Volume': String(volumePercent),
          },
        }).catch((err) => {
          console.log('[SpeechService] Envío a lentes:', err.message);
        });
      } catch (err) {
        console.warn('[SpeechService] Error enviando a lentes:', err);
      }
      return;
    }

    // Salida en el dispositivo / navegador / audífonos
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = this.language;
          utterance.rate = this.rate;
          utterance.pitch = this.pitch;
          utterance.volume = this.volume;

          // Encontrar una voz en español si está disponible
          const voices = window.speechSynthesis.getVoices();
          const esVoice = voices.find((v) => v.lang.startsWith('es'));
          if (esVoice) utterance.voice = esVoice;

          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('[SpeechService] Error en Web Speech:', e);
        }
      }
    } else {
      try {
        await Speech.stop();
        Speech.speak(text, {
          language: this.language,
          pitch: this.pitch,
          rate: this.rate,
          volume: this.volume,
        });
      } catch (e) {
        console.warn('[SpeechService] Error en Native Speech:', e);
      }
    }
  }
}

export default new SpeechService();
