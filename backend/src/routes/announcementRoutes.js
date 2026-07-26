const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', announcementController.getAnnouncements);
router.post('/', authorize(['super_admin', 'coordinator']), announcementController.createAnnouncement);
router.delete('/:id', authorize(['super_admin', 'coordinator']), announcementController.deleteAnnouncement);

module.exports = router;
