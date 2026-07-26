const express = require('express');
const router = express.Router();
const lunchController = require('../controllers/lunchController');
const { authenticate } = require('../middleware/auth');

// Todas las rutas requieren usuario autenticado
router.use(authenticate);

router.get('/cafetines', lunchController.getCafetines);
router.get('/cafetines/:cafetinId/menu', lunchController.getCafetinDailyMenu);
router.get('/my-today-order', lunchController.getUserTodayOrder);
router.delete('/my-today-order', lunchController.cancelMyTodayOrder);
router.post('/orders', lunchController.createOrder);

module.exports = router;
