# CokieCollege - Backend API

Este módulo es el núcleo de la plataforma, proporcionando los servicios necesarios para la gestión de usuarios, asistencia, notas y conducta.

## Requisitos Previos

- Node.js y npm.
- Un proyecto en Supabase con las tablas creadas (ver `supabase_schema.sql` en la raíz).

## Instalación

1. Entra a la carpeta: `cd backend`
2. Instala las dependencias: `npm install`
3. Crea un archivo `.env` basado en `.env.example`:
   ```env
   PORT=5000
   SUPABASE_URL=tu_url
   SUPABASE_ANON_KEY=tu_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   EMAIL_FROM=noreply@cokiecollege.edu
   ```

## Ejecución

Para iniciar el servidor en desarrollo:
```bash
node index.js
```

## Estructura de Carpetas

- `src/config`: Configuración de clientes (Supabase).
- `src/controllers`: Lógica de los endpoints dividida por roles.
- `src/middleware`: Protección de rutas y validación de tokens.
- `src/routes`: Definición de rutas de la API.
- `src/utils`: Servicios de correo, notificaciones y generadores de código.

## Decisiones Técnicas

- **Arquitectura Modular:** Se separaron las rutas por roles para facilitar la escalabilidad y el mantenimiento de permisos.
- **Service Role de Supabase:** Utilizado para la gestión de usuarios (Admin Auth) ya que el sistema no permite el registro público.
- **Generación de Código:** Los códigos institucionales se generan siguiendo el formato `[Iniciales Apellidos][Año][Aleatorios]`, asegurando unicidad.
