const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticate, authorize } = require('../middleware/auth');
const { checkUpcomingEventReminders } = require('../utils/eventScheduler');

// Ruta libre para que Vercel Cron la ejecute
router.get('/cron/reminders', async (req, res) => {
    try {
        await checkUpcomingEventReminders();
        res.status(200).send('Recordatorios revisados con éxito');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.use(authenticate);

router.get('/', eventController.getEvents);
router.post('/', authorize(['super_admin', 'coordinator']), eventController.createEvent);
router.put('/:id', authorize(['super_admin', 'coordinator']), eventController.updateEvent);
router.delete('/:id', authorize(['super_admin', 'coordinator']), eventController.deleteEvent);

module.exports = router;
