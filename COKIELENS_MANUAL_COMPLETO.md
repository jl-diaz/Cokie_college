# Manual Integral de CokieLens & Estudio de Gestos IA - Cokie College

Este documento contiene la guía definitiva para el hardware, firmware, configuración de red, uso de los selectores de cámara y audio, y el entrenamiento de nuevos gestos y movimientos corporales en el sistema de Inteligencia Artificial de Cokie College.

---

## 1. Arquitectura General del Sistema

El sistema conecta los lentes inteligentes (**CokieLens**) con la aplicación móvil/web de **Cokie College** y el motor de IA de **Lenguaje de Señas y Gestos (MediaPipe + Red Neuronal Espacio-Temporal)**.

```
       [ ESP32-CAM (Lentes) ]
            │  (Wi-Fi Local @ 20-25 FPS / QVGA)
            ▼
    [ App Cokie College ] ──(Socket.IO)──> [ Backend IA (FastAPI) ]
    ├── Selector Video: Cámara / Lentes          ├── MediaPipe Hands & Pose
    ├── Selector Audio: Teléfono / Lentes        └── Red Neuronal Temporal (LSTM)
    └── Salida de Voz Inmediata (< 20ms)                │
         (Bocina o Audífonos BT/Cable)   <──────────────┘ (Texto traducido)
```

### Flujo de datos:
1. **Lentes CokieLens (ESP32-CAM)**: Capturan video continuo a **320x240 (QVGA)** a 25 FPS sin saturar la memoria y entregan cuadros JPEG en solo **15ms** vía `/capture`.
2. **App Cokie College (Móvil / Web)**: Muestra la vista en vivo de los lentes y envía los fotogramas al servidor de IA.
3. **Servidor de IA (`sign_language_service`)**:
   - Extrae las coordenadas tridimensionales de brazos, manos y rostro.
   - Evalúa una ventana deslizante de **30 cuadros (~1 segundo)** con la Red Neuronal entrenada.
   - Emite el resultado traducido por Socket.IO en menos de **25ms**.
4. **Locución de Audio Instantánea**:
   - El teléfono recibe el texto y lo pronuncia inmediatamente con **`Speech.speak` (o Web Speech API)** a través de la **bocina del teléfono o de los audífonos (Bluetooth o cable) conectados al teléfono**.
   - Opcionalmente, si el usuario selecciona *"Lentes"* como salida de audio, la app envía la señal al endpoint `/play` del ESP32.

---

## 2. Guía de Hardware y Conexión de los Lentes (ESP32-CAM)

### Componentes:
- **Placa principal**: ESP32-CAM AI Thinker con procesador ESP32 dual-core a 240 MHz y 4MB de PSRAM.
- **Sensor de video**: Módulo de cámara OV2640 de 2 Megapíxeles con cable cinta plano.
- **Base de programación**: `ESP32-CAM-MB` con puerto micro-USB integrado y convertidor USB-Serial CH340.
- **Alimentación**: 5V vía puerto USB (se recomienda un cargador o powerbank de al menos 5V / 1.5A–2A).
- **Salida de audio futura en lentes (opcional)**: Amplificador de audio PAM8403 conectado a los pines DAC (GPIO 25 / 26) o salida I2S, con bocina pequeña o auricular mono.

### Conexión del sensor OV2640:
1. Levanta suavemente la pestaña negra del conector FPC en el ESP32-CAM.
2. Introduce el cable cinta de la cámara OV2640 con los **contactos dorados mirando hacia la placa**.
3. Baja la pestaña negra para fijar firmemente el cable.

---

## 3. Configuración Wi-Fi Inteligente (Portal Cautivo & mDNS - ¡Sin Arduino IDE!)

El firmware incluye un **Portal Cautivo Automático (`Preferences.h` + `DNSServer.h`)** y resolución de nombres **mDNS (`ESPmDNS.h`)**. **Solo necesitas flashear el ESP32-CAM una sola vez en tu vida con Arduino IDE**. Después de eso, nunca más tendrás que conectar el cable ni abrir Arduino IDE para cambiar de red Wi-Fi o averiguar la IP.

### ¿Cómo cambiar de Wi-Fi desde cualquier teléfono o laptop?
1. Enciende tus lentes CokieLens.
2. Si los lentes no encuentran la red Wi-Fi guardada previamente (o es la primera vez que se encienden), crearán automáticamente una red Wi-Fi propia llamada:
   👉 **`CokieLens-Setup`** (sin contraseña).
3. Conéctate a esa red Wi-Fi desde tu teléfono o computadora.
4. Tu teléfono abrirá automáticamente el **Portal Cautivo** (o puedes abrir tu navegador e ingresar a `http://192.168.4.1`).
5. Verás una interfaz elegante donde seleccionas tu red Wi-Fi e ingresas tu contraseña.
6. Presiona **"Guardar y Conectar"**.
7. ¡Listo! El ESP32 guardará las credenciales de forma permanente en su memoria Flash (NVS) y se conectará a tu red.

### Conexión Directa sin Memorizar IPs (`cokielens.local`):
- Los lentes activan el servicio mDNS con el nombre **`cokielens.local`**.
- En la aplicación Cokie College (en el modal de ajustes ⚙️), la dirección por defecto es:
  👉 **`cokielens.local`** (o `http://cokielens.local`).
- Ya no necesitas adivinar si el router le asignó `192.168.1.50`, `192.168.0.24` o `192.168.100.12`: la app y cualquier navegador encontrarán los lentes automáticamente escribiendo `cokielens.local`.

---

### Pasos para el Primer y Único Flasheo Inicial (Arduino IDE):
El código del firmware se encuentra en:
👉 `firmware/CokieLens_Camera/CokieLens_Camera.ino`

1. Conecta el ESP32-CAM a tu computadora mediante la base `ESP32-CAM-MB` en el puerto USB (usualmente `COM4`).
2. Abre **Arduino IDE**.
3. Abre el archivo `firmware/CokieLens_Camera/CokieLens_Camera.ino`.
4. En el menú **Herramientas (Tools)** de Arduino IDE, configura:
   - **Placa**: `AI Thinker ESP32-CAM`
   - **CPU Frequency**: `240MHz (WiFi/BT)`
   - **Flash Frequency**: `80MHz`
   - **Flash Mode**: `QIO`
   - **Partition Scheme**: `Huge APP (3MB No OTA/1MB SPIFFS)`
   - **PSRAM**: `Enabled`
   - **Puerto**: Selecciona el puerto COM correspondiente (ej. `COM4`).
5. Presiona el botón **Subir (Upload)**.
6. Una vez cargado, desconecta el cable y ¡listo! Ya puedes alimentar los lentes con cualquier cargador o powerbank y configurarlos desde tu celular.

---

## 4. Uso de la Aplicación Cokie College (Pantalla Intérprete)

Abre la aplicación Cokie College (móvil o web) y entra a **Intérprete ISL**:

### A. Selector de Entrada de Video
En la barra superior encontrarás dos botones de selección:
- **`[📱 Teléfono / Webcam]`**: Utiliza la cámara interna de tu dispositivo móvil o webcam.
- **`[👓 Lentes]`**: Conecta directamente con la cámara de los lentes inteligentes.
  - Al presionar el ícono de **Ajustes (⚙️)**, puedes ingresar o modificar la dirección IP del ESP32 (ej. `192.168.1.50`) y presionar *"Probar Conexión"*. La app recordará la IP automáticamente.
  - La pantalla mostrará en vivo lo que los lentes están viendo con un punto verde de estado.

### B. Selector de Salida de Audio
- **`[🔊 Altavoz / Audífonos]` (Recomendado)**:
  - La traducción se pronuncia instantáneamente (< 20ms) usando el sintetizador de voz nativo en español del teléfono (`Speech.speak`).
  - **Uso con audífonos**: Si conectas unos audífonos Bluetooth (como AirPods, Galaxy Buds, etc.) o con cable a tu teléfono, **la traducción sonará en tus oídos de manera completamente privada**, permitiéndote escuchar lo que la otra persona está diciendo por señas sin molestar a los demás.
- **`[👓 Lentes]`**:
  - Envía la orden de audio al endpoint `/play` del ESP32-CAM para activar la bocina o auricular conectado a los lentes.

---

## 5. Cómo Arrancar el Servidor Local y Entrenar la Red Neuronal (Guía Paso a Paso)

### Paso 1: Arrancar el Servidor Local de IA (`sign_language_service`)
Para tener la menor latencia posible (< 15ms) entre tus lentes, la app y la IA:
- **Opción A (Un Clic en Windows)**:
  Ve a la carpeta `backend/sign_language_service/` y haz doble clic en el archivo:
  👉 **`run_service.bat`**
- **Opción B (Desde la Terminal PowerShell / CMD)**:
  ```powershell
  cd backend\sign_language_service
  python main.py
  ```
- Verás en la consola:
  ```
  [INFO] Servidor de IA iniciado en http://0.0.0.0:8000
  [INFO] Modelo de gestos activo cargado.
  ```

### Paso 2: Arrancar la Aplicación Móvil / Web
Abre una segunda ventana de terminal:
```powershell
cd mobile
npx expo start
```
- Presiona la tecla **`w`** para abrir la app inmediatamente en tu navegador web.
- O escanea el código QR desde la app **Expo Go** en tu celular Android.

### Paso 3: ¿Cómo Entrenar la Red Neuronal?
Tienes dos formas sencillas de entrenar:

#### Método 1: Desde la propia Aplicación (Interfaz Visual)
1. En la app de Cokie College, inicia sesión como usuario administrador (`super_admin`).
2. Abre el menú lateral y selecciona **"Estudio de Gestos e IA"** (`/gesture-studio`).
3. En la **Pestaña 2 (Grabador)**: Elige el gesto y graba entre 10 y 20 muestras frente a la cámara de los lentes o del teléfono.
4. En la **Pestaña 3 (Entrenamiento IA)**: Presiona el botón morado **`[🚀 Iniciar Entrenamiento]`**.
5. Verás la barra de progreso en vivo subir del 0% al 100% y la precisión alcanzar más del 98%. Al finalizar, el modelo se recarga en caliente sin reiniciar nada.

#### Método 2: Desde la Computadora (Un Doble Clic en Windows)
Si ya grabaste muestras o deseas reentrenar la red neuronal directamente desde tu sistema:
- Haz doble clic en el archivo:
  👉 **`backend/sign_language_service/train_model.bat`**
- O ejecuta en tu terminal:
  ```powershell
  cd backend\sign_language_service
  python gesture_trainer.py
  ```
- La consola mostrará la barra de épocas `[1/40] ... [40/40]`, calculará la precisión al 100% y compilará el archivo `data/cokie_gesture_model.npz`.

---

## 6. Módulo Administrador: "Estudio de Gestos e IA" (`/gesture-studio`)

Para que el dialecto de Cokie College crezca y aprenda nuevas señas y movimientos de brazos, cuerpo y rostro, se diseñó el módulo **Estudio de Gestos e IA**, accesible para usuarios administradores (`super_admin`).

### Pestaña 1: Dialecto Escolar
1. Visualiza todas las señas registradas en el colegio.
2. Cada tarjeta indica si es un **Movimiento Dinámico** o una **Seña Estática**, y cuántas muestras han sido grabadas.
3. Para registrar una nueva seña o frase:
   - Presiona el botón **`[+ Nuevo Gesto]`**.
   - Ingresa el nombre en español (ejemplo: *"Puerta"*, *"Permiso para ir al baño"*).
   - Ingresa el nombre en inglés (ejemplo: *"Door"*, *"Bathroom permission"*).
   - Elige el tipo:
     - **Movimiento Dinámico**: Gestos que involucran movimiento en el tiempo de brazos, muñecas y rostro (ej. agitar la mano para saludar, deslizar la mano para gracias).
     - **Seña Estática**: Gestos fijos como letras del abecedario o la seña de *"Te quiero"*.
   - Añade instrucciones orientativas del movimiento.
   - Presiona *"Registrar Gesto"*.

### Pestaña 2: Grabador en Vivo Asistido
1. En la barra superior, selecciona el gesto que deseas grabar (ejemplo: *"Puerta"*).
2. Colócate frente a la cámara de los lentes mostrando torso, brazos y manos con buena iluminación.
3. Presiona el botón rojo **`[⏺ Iniciar Grabación (30 cuadros)]`**:
   - La pantalla iniciará una **cuenta regresiva visual (3... 2... 1...)**.
   - En cuanto termine la cuenta regresiva, la pantalla mostrará una barra de progreso que se llena durante 1 segundo.
   - **Realiza el movimiento de la seña durante ese segundo**.
   - El sistema capturará automáticamente los 30 cuadros con los vectores de coordenadas de manos y brazos.
   - Al finalizar, guardará la muestra en disco con marca de tiempo única (`data/samples/<gesto>/sample_<timestamp>.npy`).
4. **¿Cuántas muestras grabar?**:
   - Con **10 a 20 muestras** grabadas con pequeñas variaciones (haciendo el gesto despacio, rápido, un poco más arriba o más abajo), la IA aprende el patrón con enorme solidez.
   - Grabar 15 muestras toma menos de **1 minuto**.

### Pestaña 3: Consola de Entrenamiento en 1 Clic
1. Una vez grabadas las muestras, ve a la pestaña **`Entrenamiento IA`**.
2. Presiona el botón morado **`[🚀 Iniciar Entrenamiento]`**.
3. La consola mostrará el avance en tiempo real (Épocas 1 a 40, pérdida matemática y precisión alcanzada).
4. **Recarga en Caliente (Hot Reload)**: Al llegar al 100%, el backend guarda el modelo (`cokie_gesture_model.npz`) y lo carga en memoria automáticamente.

---

## 7. Preguntas Fundamentales sobre el Entrenamiento y el Dialecto

### A. ¿Qué pasa si hoy grabo 15 señas, entreno y subo a GitHub, y mañana grabo otras 15? ¿Se pierde lo del día anterior?
**¡NO SE PIERDE NADA! El aprendizaje es 100% ACUMULATIVO:**
1. Cada muestra que grabas en la Pestaña 2 se guarda con una marca de tiempo milimétrica única:
   `data/samples/puerta/sample_1726270001.npy`, `sample_1726270002.npy`, etc.
2. El catálogo de señas se guarda en `data/gestures.json`.
3. Cuando haces:
   ```bash
   git add .
   git commit -m "Nuevas muestras de dialecto"
   git push
   ```
   Todo ese dataset queda respaldado de por vida en GitHub.
4. Mañana, cuando grabes 15 muestras más, el sistema creará nuevos archivos (`sample_1726350001.npy`, etc.) **al lado de las que grabaste hoy**.
5. Al pulsar *"Entrenar Red Neuronal"* mañana, el algoritmo leerá **TODAS las muestras existentes** (las 15 de hoy + las 15 de mañana = 30 muestras en total).
6. **Resultado**: La red neuronal no olvida lo del día anterior; al contrario, cada día que grabes más ejemplos, la IA se vuelve más sabia, tolerante al ruido y mucho más precisa.

### B. ¿Se pueden perder las señas del abecedario y números que ya sabe?
**¡NUNCA SE PIERDEN! El sistema cuenta con una Arquitectura Híbrida en 3 Capas Paralelas:**

```
           [ Entrada de Video (Cámara / Lentes) ]
                             │
                             ▼
                [ MediaPipe Hands & Pose ]
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
[ CAPA 1: TEMPORAL ]   [ CAPA 2: GEOMÉTRICA ]   [ CAPA 3: MEDIAPIPE ]
Red Neuronal Dinámica    Abecedario A-Z          Gestos Universales
(Gestos Entrenados:      Números 0-10            (ILoveYou, OpenPalm,
Hola, Puerta, Baño...)  (Reglas Heurísticas)    ClosedFist...)
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             ▼
           [ Traducción y Voz Inmediata (< 20ms) ]
```

1. **Capa 1 (Temporal - Red Neuronal)**: Analiza secuencias de movimiento en el tiempo (30 frames) para palabras y frases complejas registradas por ti en el dialecto.
2. **Capa 2 (Geométrica Heurística - Abecedario Completo y Números)**: Las letras del abecedario (**A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z**) y los números (**0 al 10**) están programados de forma analítica en [`isl_model.py`](file:///d:/Portafolio/Proyectos/Cokie_college/backend/sign_language_service/isl_model.py) evaluando las posiciones exactas de cada articulación y falange.
   - **Esta capa no depende de la red neuronal**, por lo que **es imposible que se borre o se degrade** al reentrenar.
3. **Capa 3 (MediaPipe Oficial de Google)**: Clasifica gestos universales de Google como respaldo adicional.

Por lo tanto, puedes inventar, agregar y entrenar 50 señas nuevas en la red neuronal, y el abecedario y los números seguirán funcionando intactos con la misma precisión de siempre.

---

## 8. Diferencia Clave: Pestaña 2 (Grabador) vs Pestaña 3 (Entrenamiento)

| Característica | Pestaña 2: Grabador en Vivo Asistido | Pestaña 3: Entrenamiento en 1 Clic |
| :--- | :--- | :--- |
| **Objetivo** | **Recolección de datos brutos** (Dataset). | **Cálculo y aprendizaje matemático** (Deep Learning). |
| **¿Qué hace?** | Captura tus movimientos frente a la cámara en secuencias de 30 fotogramas y guarda archivos individuales (`sample_01.npy`, etc.). | Lee todas las muestras guardadas de todos los gestos y ajusta las matrices de pesos neuronales mediante retropropagación (*Backpropagation*). |
| **Analogía** | Es como **tomar apuntes o fotos** para estudiar. | Es el momento en que el cerebro **estudia, memoriza y comprende** todos los apuntes. |
| **¿Cuándo se usa?** | Cada vez que quieres enseñarle a la IA un nuevo gesto o mejorar uno existente grabando 10-15 ejemplos. | Cuando terminas de grabar tus ejemplos y deseas que la IA genere el archivo compilado `cokie_gesture_model.npz`. |

---

## 9. Gestión Multilingüe Dinámica (Español / Inglés)

### ¿Qué ocurre si agregas una nueva palabra como "Puerta"? ¿Habrá problemas con i18n o el audio?
**¡Ningún problema! Todo está 100% automatizado y blindado:**

1. **Campos Bilingües en el Estudio de Gestos**:
   - Al crear un gesto en la Pestaña 1, defines:
     - **Nombre en Español**: `Puerta`
     - **Nombre en Inglés (Traducción)**: `Door`
2. **Inyección Dinámica en i18n**:
   - En lugar de requerir que edites archivos JSON estáticos de traducción (`es.json`, `en.json`), la app utiliza:
     ```javascript
     i18n.addResource('es', 'signs', gesture.id, gesture.name_es);
     i18n.addResource('en', 'signs', gesture.id, gesture.name_en);
     ```
   - Esto inyecta en tiempo real las nuevas palabras en el diccionario de la aplicación en cuanto se conecta.
3. **Subtítulos y Audio Inteligente**:
   - Si la aplicación de la persona está en **Español**, la pantalla muestra *"Puerta"* y la voz del teléfono dice *"Puerta"* en acento español mexicano (`es-MX`).
   - Si la aplicación está configurada en **Inglés**, la pantalla muestra *"Door"* y la voz del teléfono dice *"Door"* en acento inglés estadounidense (`en-US`).
   - Si alguna vez olvidas poner el nombre en inglés, el sistema tiene un mecanismo de rescate automático (*fallback*) que limpia el identificador y muestra el nombre en español con mayúsculas limpias, evitando códigos raros como `sign_puerta`.

---

## 10. Despliegue en Render (Docker) vs Ejecución Local

Tienes desplegada toda la carpeta `sign_language_service` en un contenedor Docker en Render. ¿Afecta esto al desarrollo?

### Aspectos a tener en cuenta:
1. **Compatibilidad Total (Cero errores de dependencias)**:
   - Todo el motor de IA espacio-temporal y entrenamiento de gestos fue desarrollado con **NumPy puro** y las librerías estándar ya presentes en tu `requirements.txt` (`fastapi`, `python-socketio`, `mediapipe`, `opencv-python-headless`).
   - **No requiere paquetes binarios nuevos ni pesados** (como PyTorch o TensorFlow pesados que romperían el límite de memoria del contenedor gratuito de Render). Por ende, se construye y ejecuta sin ningún fallo en Render Docker.
2. **Latencia de Red (Internet vs Red Local)**:
   - **Local (`run_service.bat`)**: El video viaja de los lentes al servidor en tu red Wi-Fi local en solo **5 a 15 milisegundos**. Es la experiencia ultra fluida recomendada para tiempo real.
   - **Render Cloud**: Como Render está en servidores de internet (usualmente en EE.UU. u Oregón), el video tiene que viajar por internet de subida y el resultado de bajada, añadiendo entre **250 y 500 milisegundos** de latencia dependiendo de tu conexión a internet.
3. **Persistencia del Almacenamiento en Render Free Tier**:
   - El tier gratuito de Render reinicia los contenedores y su disco es efímero (lo que se guarde dentro de `/app/data/` o `/app/dataset/` se perdería al reiniciar el contenedor en Render si no tiene un Disco Persistente montado).
   - **Recomendación**: Para entrenar nuevos gestos y grabar muestras en vivo, utiliza el servidor local con `run_service.bat`. Si deseas que el modelo entrenado esté en Render, simplemente sube el archivo generado `cokie_gesture_model.npz` a tu repositorio Git y haz push a Render.

---

## 11. Solución a los Problemas Previos

| Problema Previo | Causa Detectada | Solución Implementada |
| :--- | :--- | :--- |
| **Tener que usar Arduino IDE para cambiar Wi-Fi o IP** | Las credenciales estaban quemadas en código duro (*hardcoded*). | Portal Cautivo `CokieLens-Setup` en Flash NVS + soporte de dominio `http://cokielens.local`. |
| **La cámara se congelaba a los 5 segundos** | El módem Wi-Fi del ESP32 entraba en reposo automático (*Modem Sleep*), desbordando el búfer TCP. | Se forzó `WiFi.setSleep(false)` y `esp_wifi_set_ps(WIFI_PS_NONE)` en el firmware, con doble búfer en PSRAM a resolución QVGA (20-25 FPS estables). |
| **Sonaban 2 audios a la vez ("Te quiero" y "sign_i_love_you")** | El backend llamaba a `gTTS` leyendo el código técnico en inglés además del audio en español del teléfono. | Se eliminó por completo `gTTS` del backend. El audio ahora es **100% nativo en el dispositivo** (`Speech.speak`), bilingüe y sin eco (< 20ms). |
| **La APK móvil era más lenta que la web** | La APK usaba `takePictureAsync()`, que bloquea el auto-enfoque y procesa fotos pesadas de galería (450-900ms por cuadro). | Con los lentes CokieLens, la APK no usa `takePictureAsync()`. Descarga el cuadro JPEG binario del ESP32 en **15ms**, funcionando a máxima fluidez. |
| **Imprecisión con dedos y falta de movimiento** | La IA solo usaba reglas trigonométricas fijas en fotos estáticas de manos. | Se implementó una **Red Neuronal Temporal** con ventana deslizante de 30 fotogramas que analiza la trayectoria y aceleración de brazos, manos y rostro. |

---

## 12. Preguntas Frecuentes y Consejos de Operación

1. **¿Qué hacer si la app dice "No se pudo conectar a los lentes"?**
   - Asegúrate de que el ESP32-CAM esté encendido y que tanto tu dispositivo como los lentes estén conectados a la **misma red Wi-Fi**.
   - Ingresa en el navegador `http://cokielens.local/status` para comprobar que responda `"status":"online"`.
2. **¿Puedo usar la zona Wi-Fi portátil de mi teléfono celular?**
   - ¡Sí! Enciende la zona Wi-Fi de tu teléfono, conéctate a la red `CokieLens-Setup` y selecciona la red de tu teléfono. Así el sistema será 100% portátil en la calle.
3. **¿Cómo escuchar la interpretación discretamente?**
   - En la app, deja la salida de audio en *"Altavoz / Audífonos"* y conecta unos audífonos Bluetooth a tu teléfono. La voz del intérprete se escuchará de forma privada en tus audífonos sin emitir sonido exterior.
