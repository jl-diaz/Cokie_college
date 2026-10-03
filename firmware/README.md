# 👓 CokieLens - Firmware ESP32-CAM & Sistema de IA Cokie College

Este directorio contiene el firmware oficial para los lentes inteligentes **CokieLens** (basados en el microcontrolador ESP32-CAM AI-Thinker con sensor OV2640), diseñado para la captura de video en tiempo real, transmisión HTTP de baja latencia hacia la app móvil/web y recepción de audio sintetizado.

Para el manual completo de usuario y hardware, consulta [COKIELENS_MANUAL_COMPLETO.md](file:///d:/Portafolio/Proyectos/Cokie_college/COKIELENS_MANUAL_COMPLETO.md).

---

## 📁 Estructura del Firmware

* **`CokieLens_Camera/`**:
  * **`CokieLens_Camera.ino`**: Código fuente principal en C++/Arduino.
    * Servidor Web HTTP multi-hilo (AsyncWebServer / WebServer).
    * Endpoints:
      * `GET /capture`: Retorna un fotograma JPEG optimizado (resolución HVGA/QVGA en ~15ms).
      * `GET /status`: Comprueba estado de conexión, IP asignada y RSSI Wi-Fi.
      * `POST /play`: Recibe texto o comando para reproducción de audio en la bocina/auricular.
      * `OPTIONS /*`: Cabeceras CORS abiertas para permitir peticiones directas desde navegadores web.
    * Portal Cautivo Wi-Fi (`CokieLens-Setup`) con IP fija `192.168.4.1` y soporte mDNS `cokielens.local`.

---

## ⚡ Comandos para Entrenar y Verificar la IA

El sistema de IA que interpreta las imágenes capturadas por los lentes CokieLens cuenta con los siguientes comandos desde la terminal:

### 1. Entrenar la Red Neuronal Localmente (CLI)
Procesa todo el dataset de muestras (`data/samples/`), aplica aumentación automática (espejado para zurdos y factores de escala para manos pequeñas/grandes) y compila el modelo neuronal:

```bash
# Desde la raíz del proyecto Cokie College:
python backend/sign_language_service/gesture_trainer.py
```

* **Tiempo estimado**: ~10 segundos.
* **Precisión obtenida**: > 97% con recarga en caliente automática (*hot-reload*).

### 2. Ejecutar Pruebas Unitarias de Verificación (14/14 Tests)
Audita el 100% de la lógica de señas estáticas (A-Z, números, Te Quiero, I relajada, etc.), compuertas de movimiento y el constructor de oraciones:

```bash
# Desde la raíz del proyecto:
python backend/sign_language_service/test_interpreter_verification.py
```

### 3. Disparo Remoto de Entrenamiento vía API
Si el backend FastAPI está activo:

* **PowerShell (Windows):**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:8000/api/gestures/train" -Method Post
  ```
* **cURL (Linux / macOS / Git Bash):**
  ```bash
  curl -X POST http://localhost:8000/api/gestures/train
  ```
* **Producción (Render):**
  ```bash
  curl -X POST https://cokie-college.onrender.com/api/gestures/train
  ```

### 4. Desde la App (Móvil / Web)
* Menú lateral -> **"Estudio de Gestos e IA"** -> Botón **"Entrenar Modelo"**.

---

## 🛠️ Parámetros de Flasheo en Arduino IDE

* **Placa**: `AI Thinker ESP32-CAM`
* **CPU Frequency**: `240MHz (WiFi/BT)`
* **Flash Frequency**: `80MHz`
* **Flash Mode**: `QIO`
* **Partition Scheme**: `Huge APP (3MB No OTA/1MB SPIFFS)`
* **PSRAM**: `Enabled`
* **Upload Speed**: `115200` o `921600`
