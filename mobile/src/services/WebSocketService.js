import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.connectionStatus = 'disconnected'; // 'connecting' | 'connected' | 'disconnected' | 'error'
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
    this.listeners = [];
    this.landmarksListeners = [];
    this.trainingListeners = [];
    this.statusListeners = [];
    this.sentenceListeners = [];
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

    this.notifyStatus('connecting');

    // Wake-up ping para despertar a Render si está suspendido en plan gratuito
    try {
      fetch(`${url}/health`, { method: 'GET' })
        .then(res => console.log('[SOCKET.IO] Servidor IA activo (health check):', res.status))
        .catch(err => console.log('[SOCKET.IO] Despertando servidor IA:', err.message));
    } catch (e) {}

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 25,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 45000,
    });

    this.socket.on('connect', () => {
      console.log('[SOCKET.IO] Conectado al servidor de IA Cokie College');
      this.isConnected = true;
      this.notifyStatus('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SOCKET.IO] Desconectado del servidor:', reason);
      this.isConnected = false;
      this.notifyStatus('disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[SOCKET.IO] Error de conexión:', err.message);
      this.isConnected = false;
      this.notifyStatus('error');
    });

    // ── EVENTO: Trazado de puntos y esqueleto en tiempo real ──
    this.socket.on('landmarks_data', (data) => {
      if (this.landmarksListeners && this.landmarksListeners.length > 0) {
        this.landmarksListeners.forEach(cb => {
          try {
            cb(data);
          } catch (err) {
            console.warn('[SOCKET.IO] Error en landmarks listener:', err);
          }
        });
      }
    });

    // ── EVENTO: Traducción instantánea recibida de la IA ──
    this.socket.on('translation_result', (data) => {
      let text = '';
      if (typeof data === 'string') {
        text = data;
      } else if (data && typeof data === 'object') {
        text = data.text || data.name_es || data.name_en || data.label || data.id || '';
      }

      if (text) {
        this.lastSpokenText = text;
        this.lastSpokenTime = Date.now();
        if (this.listeners && this.listeners.length > 0) {
          this.listeners.forEach(cb => {
            try {
              cb(text, data);
            } catch (err) {
              console.warn('[SOCKET.IO] Error en listener callback:', err);
            }
          });
        }
      }
    });

    // ── EVENTO: Actualización y formulación de oraciones en tiempo real ──
    this.socket.on('sentence_update', (data) => {
      if (this.sentenceListeners && this.sentenceListeners.length > 0) {
        this.sentenceListeners.forEach(cb => {
          try {
            cb('update', data);
          } catch (err) {
            console.warn('[SOCKET.IO] Error en sentence listener (update):', err);
          }
        });
      }
    });

    this.socket.on('sentence_complete', (data) => {
      if (this.sentenceListeners && this.sentenceListeners.length > 0) {
        this.sentenceListeners.forEach(cb => {
          try {
            cb('complete', data);
          } catch (err) {
            console.warn('[SOCKET.IO] Error en sentence listener (complete):', err);
          }
        });
      }
    });

    this.socket.on('sentence_cleared', (data) => {
      if (this.sentenceListeners && this.sentenceListeners.length > 0) {
        this.sentenceListeners.forEach(cb => {
          try {
            cb('cleared', data);
          } catch (err) {
            console.warn('[SOCKET.IO] Error en sentence listener (cleared):', err);
          }
        });
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

  addSentenceListener(callback) {
    if (!this.sentenceListeners) this.sentenceListeners = [];
    this.sentenceListeners.push(callback);
  }

  removeSentenceListener(callback) {
    if (this.sentenceListeners) {
      this.sentenceListeners = this.sentenceListeners.filter(cb => cb !== callback);
    }
  }

  clearSentence() {
    if (this.socket && (this.socket.connected || this.isConnected)) {
      this.socket.emit('clear_sentence');
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

  addLandmarksListener(callback) {
    if (!this.landmarksListeners) this.landmarksListeners = [];
    this.landmarksListeners.push(callback);
  }

  removeLandmarksListener(callback) {
    if (this.landmarksListeners) {
      this.landmarksListeners = this.landmarksListeners.filter(cb => cb !== callback);
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

  addStatusListener(callback) {
    if (!this.statusListeners) this.statusListeners = [];
    this.statusListeners.push(callback);
    callback(this.connectionStatus || (this.isConnected ? 'connected' : 'disconnected'));
  }

  removeStatusListener(callback) {
    if (this.statusListeners) {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    }
  }

  notifyStatus(status) {
    this.connectionStatus = status;
    if (this.statusListeners && this.statusListeners.length > 0) {
      this.statusListeners.forEach(cb => {
        try { cb(status); } catch (e) {}
      });
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
    this.landmarksListeners = [];
    this.trainingListeners = [];
    this.isConnected = false;
    this.connectionStatus = 'disconnected';
    this.notifyStatus('disconnected');
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
  }
}

export default new WebSocketService();
