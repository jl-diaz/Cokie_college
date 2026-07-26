const express = require('express');
const router = express.Router();
const cafetinController = require('../controllers/cafetinController');
const { authenticate, authorize } = require('../middleware/auth');

// Middleware para asegurar autenticación y rol de cafetín en todas las rutas
router.use(authenticate);
router.use(authorize(['cafetin', 'super_admin']));

// Catálogo
router.get('/catalog', cafetinController.getCatalog);
router.post('/catalog', cafetinController.createCatalogItem);
router.delete('/catalog/:id', cafetinController.deleteCatalogItem);

// Menú Diario
router.get('/daily-menu', cafetinController.getTodayPublishedMenu);
router.post('/daily-menu', cafetinController.publishDailyMenu);

// Pedidos
router.get('/orders', cafetinController.getTodayOrders);
router.patch('/orders/:id/status', cafetinController.updateOrderStatus);
router.delete('/orders/:id', cafetinController.deleteOrder);

// QR Scanner y Despacho
router.get('/orders/verify-qr/:orderId', cafetinController.verifyOrderQR);
router.post('/orders/confirm-dispatch/:orderId', cafetinController.confirmDispatch);

module.exports = router;
