const express = require('express');
const router = express.Router();
const coordinatorController = require('../controllers/coordinatorController');
const { authenticate, authorize } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol coordinator
router.use(authenticate, authorize(['coordinator']));

// Estudiantes y Diario Pedagógico
router.get('/students', coordinatorController.getStudents);
router.get('/students/:studentId/diary', coordinatorController.getStudentDiary);

// Justificaciones
router.get('/justifications', coordinatorController.getJustificationRequests);
router.put('/justifications/:id', coordinatorController.processJustification);
router.post('/justifications/direct', coordinatorController.directJustification);

// Asignación de Maestros
router.post('/schedules', coordinatorController.assignTeacher);

module.exports = router;
