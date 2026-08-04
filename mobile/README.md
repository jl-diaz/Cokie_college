# 📱 CokieCollege — Aplicación Móvil

Aplicación móvil nativa multiplataforma (**iOS y Android**) desarrollada con **Expo 54** y **React Native 0.81**, diseñada para la gestión académica, control de asistencia, seguimiento conductual, registro de notas, pre-pedido de almuerzos y despacho mediante código QR en tiempo real.

---

## ✨ Novedades y Componentes Exclusivos

### 💬 1. Sistema de Alertas y Confirmaciones Amigables (`AlertContext`)
Se reemplazaron las ventanas flotantes grises del sistema operativo (`Alert.alert`) por un **Modal UI Integrado** personalizado ([AlertContext.jsx](file:///c:/Users/USUARIO/StudioProjects/CokieCollege/mobile/src/context/AlertContext.jsx)):
- **Adaptativo**: Compatible con la paleta de colores del Modo Claro y Modo Oscuro.
- **Categorización Visual**:
  - `success` (Verde): Ícono `CheckCircle2` para guardado de notas, envío de justificaciones y despachos.
  - `danger` (Rojo): Ícono `Trash2` o `XCircle` para confirmación de eliminación o errores críticos.
  - `warning` (Amarillo): Ícono `AlertTriangle` para campos requeridos o advertencias de plazos.
  - `info` (Azul): Ícono `Info` para notificaciones informativas.

---

### 🎨 2. Personalización de Color Primario en Modo Oscuro
Permite a cada usuario personalizar la paleta de acento del Modo Oscuro:
- **¿Cómo cambiar el color?**: Mantén presionado (**Long Press**, ~300ms) el ícono de **Sol / Luna** en la barra superior.
- **Persistencia**: La elección del tema y color se guarda localmente en el dispositivo utilizando `@react-native-async-storage/async-storage`.
- **Configuración**: Presets centralizados en `mobile/src/constants/themePresets.js`.

---

### 🚦 3. Semáforo de Conducta de 4 Colores (Diario Pedagógico)
Evaluador visual inteligente integrado en el módulo de conducta:
1. **🔵 Azul (Sobresaliente)**: `>= 6` códigos positivos, `<= 1` falta leve y `<= 2` ausencias.
2. **🟢 Verde (Normal)**: Estado regular y dentro de la norma académica.
3. **🟡 Amarillo (Precaución)**: `1` falta Grave O `>= 6` faltas leves.
4. **🔴 Rojo (Alerta Crítica)**: `1` falta Muy Grave, `>= 2` faltas Graves O `>= 12` faltas Leves.

---

### 🌐 4. Internacionalización Completa (i18n)
- Soporte para cambio dinámico entre **Español (`es`)** e **Inglés (`en`)** mediante el botón de globo terráqueo en la barra superior.
- Archivos de traducción localizados en `mobile/src/locales/es.json` y `mobile/src/locales/en.json`.

---

### 🍱 5. Pre-pedido de Almuerzo & Despacho por QR
- **Estudiantes/Docentes**: Selección de platillo fuerte, acompañamientos, tortillas y bebida con cálculo automático de costo y **generación de código QR**.
- **Personal de Cafetín**: Escaneo o ingreso de código QR para verificar la orden y confirmar la entrega.

---

## 📂 Estructura de Carpetas (Expo Router)

```
mobile/
├── app/                          # Pantallas y rutas principales (Expo Router)
│   ├── _layout.jsx               # Layout raíz (ThemeProvider, AuthProvider, AlertProvider)
│   ├── index.jsx                 # Pantalla de bienvenida / Splash
│   ├── (auth)/login.jsx          # Login con credenciales institucionales
│   ├── home.jsx                  # Dashboard principal por rol
│   ├── users.jsx                 # Gestión de usuarios (Admin)
│   ├── teacher-grades.jsx        # Calificaciones con timer y rango 0-10 (Docentes)
│   ├── coordinator-justifications.jsx # Aprobación de inasistencias y filtro por estado
│   ├── cafetin.jsx               # Menú diario, pedidos y despacho QR
│   ├── lunch.jsx                 # Pre-pedido de almuerzo y código QR del usuario
│   ├── diary.jsx                 # Diario pedagógico y semáforo de conducta
│   ├── justifications.jsx        # Solicitud de ausencia y adjunto de evidencias
│   └── announcements.jsx         # Avisos institucionales
└── src/
    ├── components/               # Componentes UI reutilizables (PageHeader, CustomDrawer, etc.)
    ├── constants/                # Tema visual, colores y presets (`themePresets.js`)
    ├── context/                  # AuthContext, ThemeContext, AlertContext
    ├── hooks/                    # `usePushNotifications.js`
    ├── locales/                  # `es.json` y `en.json`
    └── utils/                    # Configuración de Axios (`api.js`)
```

---

## 📦 Generación de APKs y Updates OTA con EAS

### 1. Instalación de EAS CLI e Inicio
```bash
npm install -g eas-cli
eas login
cd mobile
eas project:init
```

### 2. Generar APK para Android
```bash
# Perfil de prueba / Preview (Descarga directa .apk)
npx eas-cli build -p android --profile preview

# Perfil de Producción
npx eas-cli build -p android --profile production
```

### 3. Publicar Actualizaciones Sencillas Over-The-Air (OTA)
Envía correcciones de código en tiempo real sin requerir que los usuarios reinstalen la APK:
```bash
npx eas-cli update --branch production --message "Mensaje"
```

---

## 🛠️ Requisitos e Instalación Local

```bash
# Entrar a la carpeta
cd mobile

# Instalar dependencias
npm install --legacy-peer-deps

# Iniciar servidor de desarrollo de Expo
npx expo start

# Editar /dist
npx expo export -p web