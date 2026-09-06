require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Configurar trust proxy para Vercel / proxies de producción
app.set('trust proxy', true);

// Rate limiting por capas para alto estrés y prevención de abuso
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5000, // Aumentado para soportar alto estrés en la red del colegio (muchos usuarios compartiendo IP)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo en 15 minutos.' }
});

const strictWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Máximo 1000 escrituras por IP por 15 minutos (aumentado para redes escolares NAT)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Límite de registros alcanzado temporalmente. Por favor intente más tarde.' }
});

// Middleware de seguridad y optimización
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/api/', generalLimiter);

// Aplicar limitación estricta a escrituras
app.use('/api/', (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return strictWriteLimiter(req, res, next);
    }
    next();
});

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido a la API de CokieCollege' });
});

// Import routes
const adminRoutes = require('./src/routes/adminRoutes');
const coordinatorRoutes = require('./src/routes/coordinatorRoutes');
const teacherRoutes = require('./src/routes/teacherRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const announcementRoutes = require('./src/routes/announcementRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const cafetinRoutes = require('./src/routes/cafetinRoutes');
const lunchRoutes = require('./src/routes/lunchRoutes');
const { startEventScheduler } = require('./src/utils/eventScheduler');

app.use('/api/admin', adminRoutes);
app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cafetin', cafetinRoutes);
app.use('/api/lunch', lunchRoutes);

// Middleware global para captura de errores no controlados y evitar crash serverless
app.use((err, req, res, next) => {
    console.error('[SERVER ERROR]:', err);
    res.status(err.status || 500).json({
        error: true,
        message: err.message || 'Error interno del servidor en Vercel Serverless Function.',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// En Vercel Serverless las funciones son efímeras. No debemos iniciar setInterval ni servidores persistentes.
if (process.env.VERCEL !== '1' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en el puerto ${PORT}`);
        startEventScheduler();
    });
}

module.exports = app;


