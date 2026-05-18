# CokieCollege — Plataforma Estudiantil Multiplataforma

CokieCollege es una solución integral para la gestión académica y disciplinaria de instituciones educativas. Permite la interacción fluida entre administradores, coordinadores, maestros y estudiantes a través de aplicaciones web y móviles.

## Estructura del Proyecto

El proyecto está dividido en tres módulos principales:

- **`/backend`**: API REST desarrollada con Node.js y Express, encargada de la lógica de negocio, autenticación y notificaciones.
- **`/web`**: Aplicación administrativa y para estudiantes desarrollada en React, con un enfoque en UX fluida y animaciones modernas.
- **`/mobile`**: Aplicación móvil multiplataforma desarrollada con Expo (React Native) para uso de maestros y estudiantes.
- **`/CokieCollegeMockUp`**: Recursos de diseño y prototipos visuales originales.

## Stack Tecnológico

- **Frontend Web:** React, Vite, Tailwind CSS, GSAP, Lenis.
- **Mobile:** React Native, Expo, Expo Router.
- **Backend:** Node.js, Express, Supabase (PostgreSQL + Auth).
- **Notificaciones:** Expo Notifications (Mobile) y Web Push/Realtime (Web).
- **Almacenamiento:** Supabase Storage.

## Requisitos Previos

- Node.js (v18 o superior)
- Cuenta de Supabase con un proyecto configurado.
- Expo Go instalado en un dispositivo móvil para pruebas.

## Configuración Rápida

1. Clona el repositorio.
2. Configura las variables de entorno en cada módulo (revisa los `.env.example`).
3. Ejecuta el script SQL `supabase_schema.sql` en el editor de consultas de tu proyecto Supabase.
4. Instala dependencias en cada carpeta:
   ```bash
   cd backend && npm install
   cd ../web && npm install
   cd ../mobile && npm install
   ```

## Decisiones Técnicas

- **Supabase Auth:** Se utiliza para el manejo robusto de sesiones y protección de rutas mediante JWT.
- **Service Role:** El backend utiliza la clave `SERVICE_ROLE` para operaciones administrativas que el cliente no puede realizar directamente (como crear usuarios sin registro público).
- **Animaciones:** Se implementó Lenis y GSAP en la web para lograr un scroll suave y transiciones que mejoren la percepción de calidad del software.

---
*Desarrollado para CokieCollege - 2026*
