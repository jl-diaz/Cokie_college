const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol super_admin
router.use(authenticate, authorize(['super_admin']));

// Usuarios
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Catálogo de Conducta
router.get('/conduct-codes', adminController.getConductCodes);
router.post('/conduct-codes', adminController.createConductCode);
router.put('/conduct-codes/:id', adminController.updateConductCode);
router.delete('/conduct-codes/:id', adminController.deleteConductCode);

module.exports = router;
