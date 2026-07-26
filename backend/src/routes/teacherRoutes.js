const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticate, authorize } = require('../middleware/auth');

// Rutas de profesores y aulas (accesibles para teacher, coordinator y super_admin)
router.use(authenticate, authorize(['teacher', 'coordinator', 'super_admin']));

router.get('/schedule', teacherController.getSchedule);
router.get('/classrooms', teacherController.getClassrooms);
router.get('/class-students', teacherController.getClassStudents);
router.get('/activities', teacherController.getActivities);
router.get('/grades-by-activity', teacherController.getGradesByActivity);
router.get('/conduct-codes', teacherController.getConductCodes);
router.post('/attendance', teacherController.registerAttendance);
router.post('/conduct-records', teacherController.addConductRecord);
router.post('/grades', teacherController.registerGrades);
router.delete('/grades/:id', teacherController.deleteGrade);
router.get('/periods-status', teacherController.getPeriodsStatus);
router.post('/tickets', teacherController.createTicket);
router.get('/tickets', teacherController.getTeacherTickets);

module.exports = router;
