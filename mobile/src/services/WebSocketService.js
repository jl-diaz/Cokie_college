import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
    this.listeners = [];
    this.trainingListeners = [];
  }

  // Conexión al servidor de IA y Lenguaje de Señas
  connect(url) {
    if (!url) {
      console.warn('Falta la URL del servidor de lenguaje de señas');
      return;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
    });

    this.socket.on('connect', () => {
      console.log('[SOCKET.IO] Conectado al servidor de IA Cokie College');
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SOCKET.IO] Desconectado del servidor:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[SOCKET.IO] Error de conexión:', err.message);
      this.isConnected = false;
    });

    // ── EVENTO: Traducción instantánea recibida de la IA ──
    this.socket.on('translation_result', (data) => {
      if (data && data.text) {
        this.lastSpokenText = data.text;
        this.lastSpokenTime = Date.now();
        if (this.listeners && this.listeners.length > 0) {
          this.listeners.forEach(cb => cb(data.text));
        }
      }
    });

    // ── EVENTOS DEL MÓDULO ADMINISTRADOR: Progreso de Entrenamiento de IA ──
    this.socket.on('training_started', (data) => {
      this.notifyTrainingListeners('started', data);
    });

    this.socket.on('training_progress', (data) => {
      this.notifyTrainingListeners('progress', data);
    });

    this.socket.on('training_completed', (data) => {
      this.notifyTrainingListeners('completed', data);
    });

    this.socket.on('training_failed', (data) => {
      this.notifyTrainingListeners('failed', data);
    });
  }

  notifyTrainingListeners(event, data) {
    if (this.trainingListeners && this.trainingListeners.length > 0) {
      this.trainingListeners.forEach(cb => cb(event, data));
    }
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

  addTrainingListener(callback) {
    if (!this.trainingListeners) this.trainingListeners = [];
    this.trainingListeners.push(callback);
  }

  removeTrainingListener(callback) {
    if (this.trainingListeners) {
      this.trainingListeners = this.trainingListeners.filter(cb => cb !== callback);
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
    this.trainingListeners = [];
    this.isConnected = false;
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
  }
}

export default new WebSocketService();
