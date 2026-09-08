const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// Endpoint público para resolver código institucional (Carnet) a correo antes del login
router.post('/resolve-code', adminController.resolveInstitutionalCode);

// Las rutas siguientes requieren autenticación y rol super_admin o coordinator
router.use(authenticate, authorize(['super_admin', 'coordinator']));

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

// Materias y Asignación de Horarios
router.get('/subjects', adminController.getSubjects);
router.post('/subjects', adminController.createSubject);
router.put('/subjects/:id', adminController.updateSubject);
router.delete('/subjects/:id', adminController.deleteSubject);
router.post('/schedules', adminController.createSchedule);

// Periodos académicos
router.get('/academic-periods', adminController.getAcademicPeriods);
router.post('/academic-periods', adminController.createAcademicPeriod);
router.put('/academic-periods/:period_number', adminController.updateAcademicPeriod);
router.delete('/academic-periods/:period_number', adminController.deleteAcademicPeriod);

module.exports = router;
