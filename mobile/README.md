# CokieCollege - Aplicación Móvil

App multiplataforma (iOS/Android) desarrollada con Expo para la gestión en tiempo real de la vida escolar.

## Tecnologías

- **Expo / React Native:** Para despliegue multiplataforma rápido.
- **Expo Router:** Navegación basada en archivos (similar a Next.js).
- **Lucide React Native:** Iconos optimizados para móvil.
- **Expo Notifications:** Gestión de alertas push.

## Instalación y Pruebas

1. `cd mobile`
2. `npm install` o `npm install --legacy-peer-deps`
3. Inicia el servidor de Expo: `npx expo start`
4. Escanea el código QR con la app **Expo Go** en tu teléfono.

## Funcionalidades Clave

- **Splash Screen Animada:** Pantalla de carga con el logo institucional.
- **Justificaciones con Cámara:** Los estudiantes pueden tomar fotos de sus comprobantes médicos directamente desde la app.
- **Notificaciones Push:** Alertas inmediatas para ausencias y códigos de conducta.

## Decisiones Técnicas

- **Expo Router:** Facilita la estructura de pestañas (tabs) y pantallas de autenticación de forma nativa.
- **Image Picker:** Integración sencilla con la cámara y galería para la subida de evidencias.
