# Cokie Hall - Sitio Web Institucional

Sitio web oficial interactivo para la institución educativa **Cokie Hall**, desarrollado con **React**, **Vite**, **GSAP** y **React Bits**, ofreciendo una experiencia moderna, animada y 100% responsive en todos los dispositivos.

---

## 🛠️ Guía de Comandos de Instalación

A continuación se detallan los comandos exactos utilizados para la creación del proyecto y la instalación de todas sus librerías y dependencias.

### 1. Creación del Proyecto con Vite y React

Para inicializar el proyecto con Vite utilizando la plantilla de React:

```bash
npm create vite@latest . -- --template react
```

---

### 2. Instalación de Librerías Principales

#### 🟢 **GSAP (GreenSock Animation Platform)**
Librería para animaciones avanzadas y ScrollTrigger (Scroll Horizontal de niveles y animaciones):

```bash
npm install gsap @gsap/react
```

#### 🟣 **Framer Motion**
Librería para animaciones de componentes (utilizada por componentes de React Bits):

```bash
npm install framer-motion
```

#### 🌊 **Lenis Scroll**
Librería para la gestión de Scroll Suave (*Smooth Scroll*):

```bash
npm install lenis
```

#### 🎨 **Tailwind CSS (Opcional / Configurado)**
Soporte para utilidades de estilos CSS:

```bash
npm install tailwindcss @tailwindcss/vite
```

---

### 📦 Comando de Instalación Único (Todas las dependencias)

Si clonas este repositorio o quieres instalar todas las dependencias en una sola línea de comando, ejecuta:

```bash
npm install gsap @gsap/react framer-motion lenis react react-dom
```

Y para las dependencias de desarrollo:

```bash
npm install -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite
```

---

## 🚀 Comandos para Ejecutar el Proyecto

### Iniciar el Servidor de Desarrollo
Para arrancar el sitio localmente con recarga en vivo (*Hot Module Replacement*):

```bash
npm run dev
```
> El sitio estará disponible normalmente en `http://localhost:5173`.

### Compilar para Producción
Para generar los archivos optimizados listos para desplegar (carpeta `dist/`):

```bash
npm run build
```

### Previsualizar el Build de Producción
Para probar localmente el resultado final del build:

```bash
npm run preview
```

---

## 📁 Estructura del Proyecto

```text
COO/
├── public/                 # Archivos estáticos
├── src/
│   ├── assets/            # Imágenes, logotipos y gráficos PNG/SVG
│   ├── modules/           # Módulos y secciones principales (Navbar, Header, HorizontalScroll, AppDownload, Footer, ScrollToTop)
│   ├── modulesReactBits/   # Componentes interactivos animados (StaggeredMenu, ScrollReveal, etc.)
│   ├── App.jsx            # Componente principal
│   ├── App.css            # Estilos globales y fuentes (Poppins)
│   └── main.jsx           # Punto de entrada de React
├── index.html             # Estructura HTML base
├── package.json           # Lista de dependencias y scripts del proyecto
└── README.md              # Documentación del proyecto
```

---

## ✨ Tecnologías Utilizadas

- **[React 19](https://react.dev/)**: Biblioteca principal de interfaz de usuario.
- **[Vite](https://vitejs.dev/)**: Empaquetador y entorno de desarrollo ultra rápido.
- **[GSAP & ScrollTrigger](https://gsap.com/)**: Motor de animaciones y desplazamiento horizontal.
- **[Framer Motion](https://www.framer.com/motion/)**: Animaciones fluidas de componentes.
- **[Lenis](https://lenis.darkroom.engineering/)**: Desplazamiento suave de página.
