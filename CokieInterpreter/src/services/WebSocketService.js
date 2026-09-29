import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.connectionStatus = 'disconnected'; // 'connecting' | 'connected' | 'disconnected' | 'error'
    this.lastTranslation = '';
    this.lastTranslationTime = 0;
    this.listeners = [];
    this.statusListeners = [];
    this.currentUrl = '';
  }

  connect(url) {
    const targetUrl = url || process.env.EXPO_PUBLIC_SIGN_LANGUAGE_SERVER_URL || 'https://cokie-college.onrender.com';
    if (!targetUrl) return;

    if (this.socket && this.currentUrl === targetUrl && (this.socket.connected || this.connectionStatus === 'connecting')) {
      return;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentUrl = targetUrl;
    this.notifyStatus('connecting');

    // Wake-up ping to wake Render service if sleeping on free tier
    try {
      if (typeof fetch !== 'undefined') {
        fetch(`${targetUrl}/health`, { method: 'GET' })
          .then(res => {
            if (res.ok) console.log('[CokieInterpreter] Servidor IA activo (health check ok)');
          })
          .catch(() => {});
      }
    } catch (e) {}

    this.socket = io(targetUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 6000,
      timeout: 30000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.notifyStatus('connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.notifyStatus('disconnected');
    });

    this.socket.on('connect_error', () => {
      this.isConnected = false;
      this.notifyStatus('error');
    });

    this.socket.on('translation_result', (data) => {
      let text = '';
      if (typeof data === 'string') {
        text = data;
      } else if (data && typeof data === 'object') {
        text = data.text || data.name_es || data.name_en || data.label || data.id || '';
      }

      if (text) {
        this.lastTranslation = text;
        this.lastTranslationTime = Date.now();
        this.notifyListeners(text, data);
      }
    });

    // Evento de puntos clave y esqueleto en tiempo real
    this.socket.on('landmarks_data', (data) => {
      this.currentLandmarks = data;
      this.notifyLandmarksListeners(data);
    });
  }

  notifyListeners(text, rawData) {
    if (this.listeners && this.listeners.length > 0) {
      this.listeners.forEach((cb) => {
        try {
          cb(text, rawData);
        } catch (err) {
          console.warn('[CokieInterpreter] Error en listener callback:', err);
        }
      });
    }
  }

  notifyLandmarksListeners(data) {
    if (this.landmarksListeners && this.landmarksListeners.length > 0) {
      this.landmarksListeners.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {}
      });
    }
  }

  addLandmarksListener(callback) {
    if (!this.landmarksListeners) this.landmarksListeners = [];
    this.landmarksListeners.push(callback);
    if (this.currentLandmarks) callback(this.currentLandmarks);
    return () => this.removeLandmarksListener(callback);
  }

  removeLandmarksListener(callback) {
    if (this.landmarksListeners) {
      this.landmarksListeners = this.landmarksListeners.filter((cb) => cb !== callback);
    }
  }

  addListener(callback) {
    if (!this.listeners) this.listeners = [];
    this.listeners.push(callback);
    return () => this.removeListener(callback);
  }

  removeListener(callback) {
    if (this.listeners) {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    }
  }

  addStatusListener(callback) {
    if (!this.statusListeners) this.statusListeners = [];
    this.statusListeners.push(callback);
    callback(this.connectionStatus || (this.isConnected ? 'connected' : 'disconnected'));
    return () => this.removeStatusListener(callback);
  }

  removeStatusListener(callback) {
    if (this.statusListeners) {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    }
  }

  notifyStatus(status) {
    this.connectionStatus = status;
    if (this.statusListeners && this.statusListeners.length > 0) {
      this.statusListeners.forEach((cb) => {
        try {
          cb(status);
        } catch (e) {}
      });
    }
  }

  sendFrame(base64Image) {
    if (this.socket && (this.socket.connected || this.isConnected)) {
      this.socket.emit('process_frame', base64Image);
    }
  }

  // Permite simular una traducción para pruebas o demos interactivas
  simulateTranslation(text, rawData = {}) {
    this.lastTranslation = text;
    this.lastTranslationTime = Date.now();
    this.notifyListeners(text, rawData);
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.connectionStatus = 'disconnected';
    this.notifyStatus('disconnected');
  }
}

export default new WebSocketService();
