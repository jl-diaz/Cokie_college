# ⚙️ CokieCollege — Backend API

REST API desarrollada en **Node.js** y **Express 5.x** conectada a la infraestructura de **Supabase (PostgreSQL + Auth + Storage)**. Proporciona la lógica de negocio, control de acceso basado en roles (RBAC), seguridad de peticiones, compresión de datos y notificaciones Push.

---

## 🛠️ Stack Tecnológico

- **Entorno de Ejecución:** Node.js v18+
- **Framework Web:** Express 5.x
- **Base de Datos & Auth:** Supabase Client (`@supabase/supabase-js`) con bypass mediante `SUPABASE_SERVICE_ROLE_KEY` para operaciones administrativas.
- **Seguridad HTTP:** `helmet` (cabeceras HTTP seguras) y `express-rate-limit` (prevención de ataques DDoS).
- **Rendimiento:** `compression` (compresión GZIP para alta concurrencia).
- **Notificaciones Push:** `expo-server-sdk` para el envío masivo de notificaciones push a dispositivos móviles.
- **Formato de Respuestas:** JSON estandarizado con códigos de estado HTTP semánticos.

---

## 📋 Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz de la carpeta `/backend` tomando como base la siguiente plantilla:

```env
# Puerto del Servidor
PORT=5000

# Conexión a Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_publica
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_privada

# Configuración de Correo Electrónico
EMAIL_FROM=noreply@cokiecollege.edu
RESEND_API_KEY=tu_resend_api_key
```

---

## 📂 Estructura de Carpetas

```
backend/
├── index.js                      # Punto de entrada de la aplicación Express
├── package.json                  # Dependencias del proyecto
└── src/
    ├── config/
    │   └── supabase.js           # Inicialización de clientes Supabase (Admin y Normal)
    ├── controllers/
    │   ├── adminController.js    # Usuarios, salones y configuración institucional
    │   ├── coordinatorController.js # Aprobación de justificaciones y tickets de notas
    │   ├── teacherController.js  # Ingreso de notas (0-10), horarios y toma de asistencia
    │   ├── studentController.js  # Solicitud de justificaciones y consulta de notas
    │   ├── cafetinController.js  # Catálogo de alimentos, menú diario y despacho QR
    │   └── lunchController.js    # Pre-pedidos de almuerzos para estudiantes/maestros
    ├── middleware/
    │   ├── auth.js               # Verificación de JWT de Supabase
    │   └── authorize.js          # Control de acceso por rol (super_admin, coordinator, etc.)
    ├── routes/
    │   ├── adminRoutes.js        # Rutas de administración
    │   ├── coordinatorRoutes.js  # Rutas de coordinación
    │   ├── teacherRoutes.js      # Rutas de docentes
    │   ├── studentRoutes.js      # Rutas de estudiantes
    │   ├── eventRoutes.js        # Rutas de eventos institucionales (Protegidas)
    │   ├── announcementRoutes.js # Rutas de avisos institucionales (Protegidas)
    │   ├── cafetinRoutes.js      # Rutas de gestión de cafetín
    │   └── lunchRoutes.js        # Rutas de pedidos de almuerzo
    └── utils/
        ├── codeGenerator.js      # Generador de códigos institucionales únicos
        └── pushNotifications.js  # Integración con Expo Push Notifications
```

---

## 🚦 Principales Rutas de la API

### 🛡️ Autenticación y Administración (`/api/admin`)
- `GET /api/admin/users`: Listado de usuarios con soporte de paginación (`?page=1&limit=50&role=student`).
- `POST /api/admin/users`: Registro de nuevo usuario (valida formato de correo por Regex).
- `PUT /api/admin/users/:id`: Edición de datos del perfil.
- `DELETE /api/admin/users/:id`: Eliminación de cuenta de usuario.

### 👩‍🏫 Docentes (`/api/teacher`)
- `POST /api/teacher/grades`: Registro o actualización de calificaciones (Validación estricta `0.00 <= grade <= 10.00`).
- `POST /api/teacher/tickets`: Creación de ticket de solicitud de días extra para el ingreso de notas.
- `GET /api/teacher/schedule`: Consulta del horario asignado al docente.

### 👨‍💼 Coordinadores (`/api/coordinator`)
- `GET /api/coordinator/justifications`: Solicitudes de inasistencia con filtro por estado (`?status=pending`).
- `PUT /api/coordinator/justifications/:id`: Aprobación o rechazo de justificaciones de inasistencia.
- `PUT /api/coordinator/tickets/:id`: Aprobación o rechazo de tickets de extensión de plazo de notas.

### 🍱 Cafetín y Almuerzos (`/api/cafetin` & `/api/lunch`)
- `POST /api/cafetin/daily-menu`: Publicación del menú diario de alimentos.
- `POST /api/cafetin/orders/confirm-dispatch/:id`: Confirmación de entrega de almuerzo escaneando código QR.
- `POST /api/lunch/orders`: Realización del pre-pedido diario de almuerzo.

---

## ⚡ Comandos de Ejecución

```bash
# Instalar dependencias
npm install

# Iniciar servidor en modo desarrollo con reload automático
npm run dev

# Iniciar en modo producción
npm start
```
---

## Interprete
```bash
##Seleccionar carpeta
cd backend/sign_language_service/

##Instalar dependencias
pip install -r requirements.txt

##Iniciar servicio
python main.py