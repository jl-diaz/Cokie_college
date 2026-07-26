# 💻 CokieCollege — Aplicación Web

Portal web administrativo e institucional desarrollado con **React**, **Vite** y **Vanilla CSS**, diseñado para ofrecer una experiencia fluida, rápida y moderna en computadoras de escritorio y laptops.

---

## 🛠️ Stack Tecnológico

- **Core:** React 18+ & Vite (Build ultrarrápido y Hot Module Replacement).
- **Estilos:** Vanilla CSS con variables de diseño personalizadas y media queries adaptativos.
- **Scroll & Animaciones:** `Lenis Scroll` (scroll suave de alta gama) y `Framer Motion` / `GSAP` para micro-animaciones.
- **Iconografía:** `Lucide React` (iconos vectoriales consistentes).
- **Autenticación & API:** Integración con la REST API de Node.js/Express y Supabase Auth.

---

## 🎨 Características Principales

- **Dashboard Dinámico por Rol**: Adaptación automática de widgets y navegación según el perfil del usuario autenticado:
  - **Super Admin**: Estadísticas globales, altas/bajas de usuarios y monitoreo de salones.
  - **Coordinador**: Aprobación de justificaciones de ausencia y tickets de extensión de notas.
  - **Docente**: Carga de notas por periodos y actividades evaluativas.
  - **Estudiante**: Consulta de materias, promedios ponderados y diario pedagógico.
- **Micro-interacciones y Scroll Suave**: Navegación fluida tipo SPA (Single Page Application) optimizada para monitores de alta resolución.
- **Diseño Adaptativo (Responsive)**: Totalmente funcional en laptops, tablets y monitores ultrawide.

---

## 📂 Estructura de Carpetas

```
web/
├── public/                       # Archivos estáticos y favicon
├── src/
    ├── assets/                   # Imágenes, logos y recursos multimedia
    ├── components/               # Componentes UI reutilizables (Navbar, Cards, Modales)
    ├── pages/                    # Páginas principales (Dashboard, Login, Perfil)
    ├── services/                 # Llamadas a la API Backend mediante Fetch/Axios
    ├── styles/                   # Hojas de estilo CSS globales y módulos
    ├── App.jsx                   # Componente principal y ruteo
    └── main.jsx                  # Punto de entrada de React
├── index.html                    # Plantilla HTML5 con metas SEO
├── package.json                  # Dependencias y scripts de Vite
└── vite.config.js                # Configuración del bundler Vite
```

---

## 🚀 Instalación y Ejecución

```bash
# Entrar a la carpeta del proyecto web
cd web

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo local
npm run dev

# Compilar paquete de producción (Build optimizado)
npm run build
```
