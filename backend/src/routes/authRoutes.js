const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const rateLimit = require('express-rate-limit');

const resolveCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Alto estrés para campus escolar
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas consultas de resolución de código. Por favor espere unos minutos.' }
});

// Endpoint público para resolver código institucional (Carnet) a correo antes del login
router.post('/resolve-code', resolveCodeLimiter, adminController.resolveInstitutionalCode);

module.exports = router;
