# 🏫 CokieCollege — Plataforma Estudiantil Multiplataforma

[![Expo](https://img.shields.io/badge/Expo-54.0-black?style=flat-square&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat-square&logo=react)](https://reactnative.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express)](https://expressjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-blue.style=flat-square)](#)

**CokieCollege** es una solución integral multiplataforma diseñada para la gestión académica, disciplinaria y administrativa de instituciones educativas. Permite una interacción fluida y en tiempo real entre administradores, coordinadores de nivel, maestros, estudiantes y personal de cafetín a través de aplicaciones web y móviles.

---

## 📐 Arquitectura del Sistema

```
                        ┌────────────────────────────────────────┐
                        │        Supabase PostgreSQL DB          │
                        │    (RLS, Auth, Storage, Triggers)     │
                        └──────────────────┬─────────────────────┘
                                           │
                                  ┌────────┴────────┐
                                  │ Express Backend │ (Helmet, Compression, Rate Limit)
                                  └────┬───────┬────┘
                                       │       │
                      ┌────────────────┴─┐   ┌─┴────────────────┐
                      │  App Móvil Expo  │   │  Web App React   │
                      │ (Android / iOS)  │   │   (Vite / CSS)   │
                      └──────────────────┘   └──────────────────┘
```

El proyecto está estructurado en módulos desacoplados:

- **`/backend`**: REST API en Node.js y Express 5.x. Gestiona la lógica de negocio, seguridad (Helmet, Rate Limiting), compresión GZIP, autenticación administrativa con Supabase y notificaciones Push (Expo Server SDK).
- **`/mobile`**: Aplicación móvil nativa multiplataforma (iOS & Android) desarrollada con Expo 54, Expo Router, i18next (ES/EN), diseño adaptable Claro/Oscuro con modales flotantes personalizados de alertas y selección de color primario.
- **`/web`**: Portal web interactivo desarrollado en React + Vite para monitoreo y administración institucional.
- **`/CokieCollegeMockUp`**: Prototipos visuales y recursos de diseño de la plataforma.

---

## ✨ Características Principales

### 👨‍🎓 Módulo de Estudiantes
- **Diario Pedagógico**: Monitoreo de asistencias y faltas con **Semáforo de Conducta (4 Colores)** dinámico (Sobresaliente, Normal, Precaución, Alerta Crítica).
- **Consola de Calificaciones**: Resumen interactivo por periodo con desglose porcentual de actividades (Tareas, Examen Final, Objetiva, Integradora, Formativa).
- **Solicitud de Justificaciones**: Envío de solicitudes de inasistencia con adjunto de evidencias (PDF/Imágenes) directo a Supabase Storage.
- **Pre-pedido de Almuerzos & Código QR**: Elección del menú del día en cafetines institucionales con generación instantánea de código QR para retiro y pago.

### 👩‍🏫 Módulo de Docentes
- **Ingreso e Histórico de Notas**: Registro estricto de calificaciones (validación `0.00` a `10.00`) con soporte para cuenta regresiva en vivo por periodo.
- **Tickets de Extensión de Plazo**: Solicitud formal de días extra (1, 3 o 7 días) al coordinador de nivel cuando finaliza un periodo de ingreso de notas.
- **Toma de Asistencia en Vivo**: Registro diario por clase y materia.

### 👨‍💼 Módulo de Coordinadores y Administradores
- **Gestión de Usuarios**: Registro, edición y eliminación de estudiantes, profesores y coordinadores con filtrado por rol y paginación rápida.
- **Aprobación de Justificaciones**: Panel para revisar evidencias y aprobar/rechazar ausencias registradas.
- **Avisos & Eventos Institucionales**: Difusión masiva de notificaciones y recordatorios globales o por nivel educativo (Preescolar, Primaria, Secundaria, Bachillerato).
- **Asignación de Horarios**: Configuración de clases, secciones, aulas y carga académica docente.

### 🍱 Módulo de Cafetín
- **Publicación del Menú Diario**: Selección rápida de platillos fuertes, acompañamientos y refrescos del catálogo general.
- **Gestión de Pedidos**: Control del estado de pedidos (*Ordenado*, *Preparado*, *Entregado*) con gesto rápido de doble toque.
- **Scanner de Despacho QR**: Verificación instantánea y confirmación de entrega de almuerzos escaneando el código QR del estudiante.

---

## 🚀 Inicio Rápido

### Requisitos Previos
- **Node.js** v18+ y `npm`
- **Expo CLI** (`npm install -g eas-cli`)
- Cuenta activa en **Supabase**

### 1. Configuración de Base de Datos
Ejecuta el script [supabase_schema.sql](file:///c:/Users/USUARIO/StudioProjects/CokieCollege/supabase_schema.sql) en el **SQL Editor de Supabase** para inicializar la estructura de tablas, enum types, funciones, vistas y políticas de seguridad Row Level Security (RLS).

### 2. Levantar el Backend
```bash
cd backend
npm install
# Configura el archivo .env basándote en .env.example
npm start
```

### 3. Levantar la App Móvil
```bash
cd mobile
npm install --legacy-peer-deps
npx expo start
```

---

## 📦 Compilación Móvil y Actualizaciones (EAS / OTA)

```bash
cd mobile

# Generar archivo APK de Android para distribución directa
npx eas-cli build -p android --profile preview

# Enviar actualización instantánea Over-The-Air (sin reinstalar la APK)
eas update --branch production --message "Actualización de rendimiento y UI"
```

---

## 🔐 Seguridad y Rendimiento
- **Row Level Security (RLS)**: Habilitado en las 13 tablas de Supabase.
- **Protección HTTP**: Integración de `helmet`, `express-rate-limit` (500 req/15 min) y `compression` GZIP en el servidor.
- **Índices de Base de Datos**: Optimización de consultas pesadas (`idx_grades_student_period`, `idx_attendance_student_date`, etc.).
- **Internacionalización (i18n)**: Soporte nativo para Español e Inglés.

---

*Desarrollado para CokieCollege — 2026*
