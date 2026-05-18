const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol student
router.use(authenticate, authorize(['student']));

router.get('/grades', studentController.getGrades);
router.get('/diary', studentController.getDiary);
router.post('/justifications', studentController.requestJustification);
router.get('/justifications', studentController.getJustificationRequests);
router.get('/schedule', studentController.getSchedule);

module.exports = router;
