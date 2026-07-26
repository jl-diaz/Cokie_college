const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', eventController.getEvents);
router.post('/', authorize(['super_admin', 'coordinator']), eventController.createEvent);
router.put('/:id', authorize(['super_admin', 'coordinator']), eventController.updateEvent);
router.delete('/:id', authorize(['super_admin', 'coordinator']), eventController.deleteEvent);

module.exports = router;
