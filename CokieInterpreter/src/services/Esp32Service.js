import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class Esp32Service {
  constructor() {
    this.defaultIp = '192.168.4.1';
    this.currentIp = '192.168.4.1';
    this.pollInterval = null;
    this.isPolling = false;
  }

  cleanIp(ip) {
    if (!ip) return this.defaultIp;
    return ip.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
  }

  async loadSettings() {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        const ip = localStorage.getItem('cokielens_ip');
        const vol = localStorage.getItem('cokielens_volume');
        const audio = localStorage.getItem('cokielens_audio_output');
        return {
          ip: ip || this.defaultIp,
          volume: vol ? Number(vol) : 80,
          audioOutput: audio || 'device',
        };
      } else {
        const ip = await AsyncStorage.getItem('cokielens_ip');
        const vol = await AsyncStorage.getItem('cokielens_volume');
        const audio = await AsyncStorage.getItem('cokielens_audio_output');
        return {
          ip: ip || this.defaultIp,
          volume: vol ? Number(vol) : 80,
          audioOutput: audio || 'device',
        };
      }
    } catch (e) {
      return { ip: this.defaultIp, volume: 80, audioOutput: 'device' };
    }
  }

  async saveSettings({ ip, volume, audioOutput }) {
    try {
      if (ip) this.currentIp = this.cleanIp(ip);
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        if (ip) localStorage.setItem('cokielens_ip', this.cleanIp(ip));
        if (volume !== undefined) localStorage.setItem('cokielens_volume', String(volume));
        if (audioOutput) localStorage.setItem('cokielens_audio_output', audioOutput);
      } else {
        if (ip) await AsyncStorage.setItem('cokielens_ip', this.cleanIp(ip));
        if (volume !== undefined) await AsyncStorage.setItem('cokielens_volume', String(volume));
        if (audioOutput) await AsyncStorage.setItem('cokielens_audio_output', audioOutput);
      }
    } catch (e) {
      console.warn('[Esp32Service] Error guardando config:', e);
    }
  }

  async testConnection(ip) {
    const targetIp = this.cleanIp(ip || this.currentIp);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const startTime = Date.now();
    try {
      // Intentar primero /status
      const res = await fetch(`http://${targetIp}/status`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      if (res.ok) {
        return { success: true, latency, message: `Conectado a CokieLens (${targetIp})` };
      }
    } catch (err) {
      // Segundo intento: /capture (algunos firmwares solo tienen capture)
      try {
        const captureRes = await fetch(`http://${targetIp}/capture`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        if (captureRes.ok) {
          return { success: true, latency, message: `Conectado a CokieLens vía /capture (${targetIp})` };
        }
      } catch (e2) {}
    }

    clearTimeout(timeoutId);
    return {
      success: false,
      message: `No se pudo conectar a ${targetIp}. Asegúrate de estar conectado al Wi-Fi de los lentes o que estén en la misma red.`,
    };
  }

  getCaptureUrl(ip) {
    const clean = this.cleanIp(ip || this.currentIp);
    return `http://${clean}/capture?t=${Date.now()}`;
  }

  getStreamUrl(ip) {
    const clean = this.cleanIp(ip || this.currentIp);
    return `http://${clean}:81/stream`;
  }
}

export default new Esp32Service();
