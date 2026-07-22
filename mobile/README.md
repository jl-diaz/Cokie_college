# CokieCollege - Aplicación Móvil

Aplicación móvil nativa (iOS/Android) desarrollada con **Expo (React Native)** para la gestión académica, asistencia, calificaciones y diario pedagógico en tiempo real.

---

## 🎨 Personalización de Color Primario en Modo Oscuro

La aplicación permite personalizar el color primario en el Modo Oscuro por usuario.

### ¿Cómo cambiar el color desde la App?
- Mantén presionado (**Long Press**, ~300ms) el ícono de **Sol / Luna** en la barra superior de navegación.
- Se abrirá un modal flotante con la paleta de colores primarios disponibles.
- Al seleccionar una opción, se editarán automáticamente:
  - `darkColors.primary`
  - `darkColors.primaryLight`
  - `darkColors.primaryDark`
  - `darkColors.text.headerTxtC`
- La preferencia elegida se guardará automáticamente en el dispositivo por usuario utilizando `AsyncStorage`.

### ¿Cómo agregar, editar o eliminar opciones de color?
Todas las opciones de la lista están centralizadas en el archivo:
`mobile/src/constants/themePresets.js`

Ejemplo de estructura de preset:
```javascript
{
  id: 'purple',
  name: 'Violeta Neón',
  primary: '#8b5cf6',
  primaryLight: '#a78bfa',
  primaryDark: '#7c3aed',
  headerTxtC: '#a78bfa',
}
```
Puedes agregar nuevos objetos al arreglo `DARK_PRIMARY_PRESETS` o modificar los colores existentes sin alterar la lógica de la app.

---

## 🚦 Semáforo de Conducta de 4 Colores (Diario Pedagógico)

En el apartado **Diario Pedagógico**, se incluye un indicador visual de 4 colores entre el filtro de periodo y los registros de conducta:

1. **🔵 Azul (Sobresaliente)**:
   - Acumular `>= 6` códigos positivos.
   - Tener máximo `1` código leve (`<= 1`).
   - Tener máximo `2` ausencias injustificadas (`<= 2`).
2. **🟢 Verde (Normal - Default)**:
   - Estado regular y dentro de la norma académica.
3. **🟡 Amarillo (Precaución)**:
   - Tener `1` código Grave OR `>= 6` códigos leves (acumulado equivalente `>= 6` puntos).
4. **🔴 Rojo (Alerta Crítica)**:
   - Tener `1` código Muy Grave OR `>= 2` códigos Graves OR `>= 12` códigos Leves.
   - *Nota:* 6 códigos Leves equivalen a 1 Grave (1 Grave + 6 Leves = 2 Graves equivalentes = Rojo).

---

## 🔔 Centro de Notificaciones

- Toca el ícono de **Campana** en el header para abrir el panel de notificaciones.
- El panel incluye la función **"Probar Notificación"** que dispara una notificación local nativa mediante `expo-notifications` para verificar el correcto funcionamiento en dispositivos físicos o simuladores.

---

## 📦 Generación de APKs y Actualizaciones Automáticas (OTA) con EAS

Para distribuir la aplicación en Android sin publicar en Google Play y enviar actualizaciones instantáneas sin obligar al usuario a descargar nuevamente la APK, utiliza **EAS (Expo Application Services)**.

### 1. Requisitos Previos e Instalación de EAS CLI

Instala la herramienta CLI de EAS globalmente y autentícate con tu cuenta de Expo:
```bash
npm install -g eas-cli
eas login
```

### 2. Inicializar el Proyecto en EAS
Dentro de la carpeta `mobile/`:
```bash
cd mobile
eas project:init
```
*Esto vinculará el proyecto con tu cuenta de Expo y actualizará el `extra.eas.projectId` en `app.json`.*

---

### 3. Generar archivo APK de Android

Para generar la APK directamente en los servidores de Expo sin necesidad de Android Studio local:

#### Opción A: Build de Prueba (Perfil Preview)
```bash
eas build -p android --profile preview
```

#### Opción B: Build de Producción (Perfil Production APK)
```bash
eas build -p android --profile production
```

Una vez finalizada la compilación en la nube, la terminal te proporcionará un **enlace directo de descarga `.apk`** para instalar en teléfonos Android.

---

### 4. Publicar Actualizaciones Sencillas Over-The-Air (OTA)
**¡Sin volver a descargar o reinstalar la APK!**

Expo Updates permite enviar correcciones de código JavaScript, diseño y componentes en tiempo real a los usuarios que ya tienen la APK instalada.

#### ¿Cómo enviar una actualización instantánea?
1. Realiza los cambios necesarios en el código fuente de `mobile/`.
2. Ejecuta el comando de actualización apuntando a la rama deseada (por ejemplo, `production` o `preview`):
```bash
eas update --branch production --message "Corrección de errores y nueva interfaz"
```
3. Al abrir la app en el teléfono móvil, Expo verificará automáticamente en segundo plano la presencia de nuevas actualizaciones y la aplicará en el siguiente inicio.

---

## 🛠️ Tecnologías y Librerías

- **Expo 54 / React Native 0.81**
- **Expo Router 6** (Navegación tipo App Directory)
- **i18next & react-i18next** (Soporte multilenguaje Español e Inglés)
- **lucide-react-native** (Sistema de iconografía)
- **@react-native-async-storage/async-storage** (Persistencia local)
- **expo-notifications** (Alertas nativas y push tokens)
