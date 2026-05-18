const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticate, authorize } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol teacher
router.use(authenticate, authorize(['teacher']));

router.get('/schedule', teacherController.getSchedule);
router.get('/class-students', teacherController.getClassStudents);
router.get('/activities', teacherController.getActivities);
router.get('/grades-by-activity', teacherController.getGradesByActivity);
router.post('/attendance', teacherController.registerAttendance);
router.post('/conduct-records', teacherController.addConductRecord);
router.post('/grades', teacherController.registerGrades);

module.exports = router;
