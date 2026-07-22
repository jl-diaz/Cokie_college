# CokieCollege — Plataforma Estudiantil Multiplataforma

CokieCollege es una solución integral para la gestión académica y disciplinaria de instituciones educativas. Permite la interacción fluida entre administradores, coordinadores, maestros y estudiantes a través de aplicaciones web y móviles.

## Estructura del Proyecto

El proyecto está dividido en tres módulos principales:

- **`/backend`**: API REST desarrollada con Node.js y Express, encargada de la lógica de negocio, autenticación y notificaciones.
- **`/web`**: Aplicación administrativa y para estudiantes desarrollada en React, con un enfoque en UX fluida y animaciones modernas.
- **`/mobile`**: Aplicación móvil multiplataforma desarrollada con Expo (React Native) para uso de maestros y estudiantes.
- **`/CokieCollegeMockUp`**: Recursos de diseño y prototipos visuales originales.

## Stack Tecnológico

- **Frontend Web:** React, Vite, Vanilla CSS, GSAP.
- **Mobile:** React Native, Expo 54, Expo Router, Lucide Icons, i18next, AsyncStorage, Expo Notifications.
- **Backend:** Node.js, Express, Supabase (PostgreSQL + Auth).
- **Notificaciones:** Expo Notifications (Mobile) y Web Push/Realtime.
- **Compilación & Despliegue Móvil:** EAS (Expo Application Services) + Expo OTA Updates.

---

## 📱 Novedades de la App Móvil

1. **Modal de Color Primario en Modo Oscuro**:
   - Mantén presionado el botón de modo oscuro (Sol/Luna) para personalizar la paleta de color primario (`darkColors.primary`, `primaryLight`, `primaryDark`, `text.headerTxtC`).
   - Las opciones se gestionan en `mobile/src/constants/themePresets.js`.

2. **Semáforo de Conducta (4 Colores)**:
   - Evaluador inteligente en *Diario Pedagógico* (Azul: Sobresaliente, Verde: Normal, Amarillo: Precaución, Rojo: Alerta Crítica).

3. **Panel de Notificaciones Interactivo**:
   - Acceso desde la campana en el header con botón para probar notificaciones nativas en vivo.

4. **Traducción Integral (i18n)**:
   - Cambio dinámico entre Español e Inglés con el botón del globo terráqueo.

5. **Generación de APKs y Actualizaciones Sencillas (OTA)**:
   - Instrucciones completas para compilar APKs de Android y desplegar actualizaciones sin reinstall en `mobile/README.md`.

---

## 📦 Comandos Rápidos de Compilación APK y OTA Updates

```bash
# Entrar a la carpeta mobile
cd mobile

# Instalar EAS CLI
npm install -g eas-cli

# Generar APK directa de Android
eas build -p android --profile preview

# Enviar actualización instantánea Over-The-Air (sin reinstalar APK)
eas update --branch production --message "Nueva actualización de app"
```

---
*Desarrollado para CokieCollege - 2026*
