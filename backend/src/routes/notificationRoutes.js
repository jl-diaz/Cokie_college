const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', notificationController.getUserNotifications);
router.put('/mark-read', notificationController.markNotificationsAsRead);
router.delete('/', notificationController.clearUserNotifications);
router.delete('/clear', notificationController.clearUserNotifications);

module.exports = router;
