# CokieInterpreter 🤟👓

> **Intérprete Inteligente de Lenguaje de Señas y Hub CokieLens**  
> Aplicación especializada y autónoma desarrollada con **React Native + Expo SDK 57**, diseñada para traducir lenguaje de señas en tiempo real a voz y texto, compatible con **iOS**, **Android**, **Web/PC** y **Lentes Inteligentes CokieLens (ESP32-CAM)**.

---

## 🌟 Novedades y Características Principales

1. **Trazado de Puntos y Esqueleto en Tiempo Real (MediaPipe Skeleton)**:
   - Visualización instantánea de **21 puntos clave por mano** (nodos circulares azules con núcleo blanco y líneas conectores en naranja vibrante).
   - Detección de pose corporal (hombros, codos, muñecas) y gestos faciales.
   - Botón directo en pantalla `[ 🦴 Puntos: ON/OFF ]` para verificar que la IA está capturando la geometría de tus movimientos.
2. **3 Modos de Interpretación Especializados**:
   - **Modo Frases y Gestos (Bocetos 1 y 2)**: Traduce señas continuas con tarjeta de estado ("Listo para traducir", "Detectando señas..." con ecualizador animado, "✓ Traducción actualizada").
   - **Modo Deletreo / Alfabeto A-Z (Imágenes 2 y 3)**: Tarjeta destacada de seña actual (*¡Seña Detectada! H*), mensaje acumulado y botones de acción rápida: `[ + Agregar Espacio ]`, `[ ✕ Borrar Letra ]` y `[ ✓ Limpiar Todo ]`.
   - **Modo Google SL2T (Imagen 1)**: Transcripción continua y multilingüe en tiempo real inspirada en el modelo SL2T de Google Pixel.
3. **Tutorial Interactivo en el Primer Uso**:
   - Walkthrough paso a paso con animaciones fluidas que enseña el encuadre óptimo, la calibración de puntos, el uso de los lentes y la comunicación bidireccional.
   - Accesible en cualquier momento tocando el ícono de ayuda `?` en el encabezado.
4. **Filtros Anti-Falsos Positivos**:
   - Resuelve el problema donde cualquier movimiento accidental disparaba palabras como "Hola".
   - Exige umbrales de energía de movimiento, comprobación de oscilación real en saludos y estabilidad de 3 fotogramas.
5. **Doble Fuente de Video con Soporte Optimizado para CokieLens**:
   - **Webcam / Cámara Móvil**: Captura nativa fluida.
   - **Lentes Inteligentes CokieLens (ESP32-CAM)**: Transmisión de fotogramas corregida y optimizada a **480x320 (HVGA)** con alto contraste para una detección de manos nítida a distancia de pecho.
   - Modos de red: AP directo (`192.168.4.1`) o mDNS Local (`cokielens.local`).
6. **Locución Instantánea y Accesibilidad Bidireccional**:
   - Text-To-Speech en el altavoz del dispositivo o enviado directamente al auricular de los lentes vía `/play`.
   - Barra de respuesta rápida con frases preconfiguradas e input de texto para hablar en voz alta.

---

## 🚀 Comandos de Ejecución y Desarrollo

```bash
cd CokieInterpreter
```

### 1. Iniciar en Web (Computadora / Navegador):
```bash
npm run web
# o bien
npx expo start --web
```

### 2. Iniciar con Expo Go / Simulador (Android / iOS):
```bash
npm start
# Presiona 'a' para Android, 'i' para iOS o escanea el código QR
```

### 3. Ejecutar de forma Nativa:
```bash
npm run android   # Inicia en emulador o dispositivo Android
npm run ios       # Inicia en simulador de iOS (macOS)
```

---

## 📦 Compilación y Deploy

### 1. Exportar para la Web (`dist` listo para Vercel, Netlify o cualquier CDN):
```bash
npm run build:web
# Este comando genera la carpeta `dist/` completamente optimizada y lista para producción
```
> El proyecto ya incluye `vercel.json` configurado para manejar rutas de SPA automáticamente.

### 2. Generar APK instalable para Android con EAS:
```bash
npm run build:apk
# Ejecuta internamente: eas build -p android --profile preview
```

### 3. Generar App Bundle (AAB) para Google Play Store:
```bash
npm run build:bundle
# Ejecuta internamente: eas build -p android --profile production
```

### 4. Compilar todas las plataformas a la vez:
```bash
npm run build:all
# Ejecuta internamente: eas build --all
```

---

## ⚙️ Conexión con Lentes CokieLens (ESP32-CAM)

1. **Modo Directo (Punto de Acceso Wi-Fi)**:
   - Conecta tu teléfono o PC a la red Wi-Fi emitida por los lentes: `CokieLens-Setup`.
   - Abre la app, presiona el engranaje `⚙️` y selecciona **Wi-Fi de lentes** (`192.168.4.1`).
   - Presiona **Probar** y luego **Guardar Configuración**.
2. **Modo Red Local (Router)**:
   - Si los lentes están en tu red Wi-Fi escolar/doméstica, selecciona **mDNS Local** (`cokielens.local`) o escribe la IP asignada por tu router.

---

## 🛡️ Estructura del Proyecto

```
CokieInterpreter/
├── app/
│   ├── _layout.jsx                  # Layout raíz con Providers y SafeArea
│   └── index.jsx                    # Pantalla de inicio
├── assets/                          # Iconos, splash y recursos gráficos
├── src/
│   ├── components/
│   │   ├── AudioWaveform.jsx        # Ondas de audio animadas
│   │   ├── CameraViewport.jsx       # Selector dinámico de viewport
│   │   ├── CameraViewport.native.jsx# Viewport móvil con expo-camera + stream CokieLens
│   │   ├── CameraViewport.web.jsx   # Viewport web con getUserMedia + stream CokieLens
│   │   ├── CokieLensModal.jsx       # Modal de configuración de lentes (Boceto 3)
│   │   ├── DetectionOverlay.jsx     # Retícula HUD de escaneo IA
│   │   ├── FingerspellingBar.jsx    # Barra de alfabeto A-Z (Imágenes 2 y 3)
│   │   ├── HeaderSwitch.jsx         # Selector de fuente, modos y tutorial
│   │   ├── HistoryDrawer.jsx        # Historial de frases traducidas
│   │   ├── QuickTalkBar.jsx         # Barra de frases rápidas y TTS
│   │   ├── SkeletonOverlay.jsx      # Trazado de 21 puntos y esqueleto en tiempo real
│   │   ├── SL2TContinuousCard.jsx   # Transcripción continua estilo Google SL2T
│   │   ├── SmartGlassesGraphic.jsx  # Ilustración vectorial de CokieLens
│   │   ├── TranslationCard.jsx      # Tarjeta de traducción (Bocetos 1 y 2)
│   │   └── TutorialModal.jsx        # Tutorial interactivo de primer uso
│   ├── constants/
│   │   ├── colors.js                # Tokens de diseño UI/UX Pro Max
│   │   └── quickPhrases.js          # Frases rápidas de accesibilidad
│   ├── context/
│   │   └── InterpreterContext.js    # Estado global reactivo
│   ├── screens/
│   │   └── InterpreterScreen.jsx    # Pantalla maestra responsiva
│   └── services/
│       ├── Esp32Service.js          # Conexión y streaming de lentes
│       ├── SpeechService.js         # Locución multiplataforma (Web + Native)
│       └── WebSocketService.js      # Cliente Socket.IO para IA y landmarks
├── app.json                         # Manifiesto Expo y configuración de builds
├── eas.json                         # Perfiles de build EAS (preview APK y prod AAB)
├── package.json                     # Scripts y dependencias
└── vercel.json                      # Reglas de deploy para web
```
