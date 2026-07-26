const { supabaseAdmin } = require('../config/supabase');

const getUserNotifications = async (req, res) => {
    try {
        const { id: userId } = req.user;

        const { data: notifications, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) {
            console.error('Error fetching user notifications:', error);
            return res.status(500).json({ error: 'Error al obtener notificaciones' });
        }

        res.json(notifications || []);
    } catch (error) {
        console.error('Unexpected error in getUserNotifications:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const markNotificationsAsRead = async (req, res) => {
    try {
        const { id: userId } = req.user;

        const { error } = await supabaseAdmin
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId);

        if (error) {
            console.error('Error marking notifications as read:', error);
            return res.status(500).json({ error: 'Error al actualizar notificaciones' });
        }

        res.json({ message: 'Notificaciones marcadas como leídas' });
    } catch (error) {
        console.error('Unexpected error in markNotificationsAsRead:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const clearUserNotifications = async (req, res) => {
    try {
        const { id: userId } = req.user;

        const { error } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('Error clearing notifications:', error);
            return res.status(500).json({ error: 'Error al eliminar notificaciones' });
        }

        res.json({ message: 'Notificaciones eliminadas correctamente' });
    } catch (error) {
        console.error('Unexpected error in clearUserNotifications:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    getUserNotifications,
    markNotificationsAsRead,
    clearUserNotifications
};
