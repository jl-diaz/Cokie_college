const express = require('express');
const router = express.Router();
const coordinatorController = require('../controllers/coordinatorController');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol coordinator
router.use(authenticate, authorize(['coordinator']));

// Estudiantes y Diario Pedagógico
router.get('/students', coordinatorController.getStudents);
router.get('/students/:studentId/diary', coordinatorController.getStudentDiary);
router.get('/students/:studentId/grades', coordinatorController.getStudentGrades);
router.get('/students/:studentId/averages', coordinatorController.getStudentAverages);
router.get('/students/:studentId/schedule', coordinatorController.getStudentSchedule);

// Maestros y Salones
router.get('/teachers', coordinatorController.getTeachers);
router.get('/teachers/:teacherId/schedule', coordinatorController.getTeacherSchedule);
router.get('/classrooms', coordinatorController.getClassrooms);

// Periodos académicos
router.get('/academic-periods', adminController.getAcademicPeriods);

// Conducta
router.get('/conduct-codes', coordinatorController.getConductCodes);
router.post('/conduct-records', coordinatorController.addConductRecord);

// Justificaciones
router.get('/justifications', coordinatorController.getJustificationRequests);
router.put('/justifications/:id', coordinatorController.processJustification);
router.post('/justifications/direct', coordinatorController.directJustification);
router.post('/justifications/student', coordinatorController.createJustificationForStudent);

// Asignación de Maestros
router.post('/schedules', coordinatorController.assignTeacher);

module.exports = router;
