const { supabaseAdmin } = require('../config/supabase');
const { sendNotification, sendBulkNotification } = require('../utils/notificationService');

// Obtener avisos para el usuario actual
const getAnnouncements = async (req, res) => {
    try {
        const { role, level: userLevel } = req.user;

        let query = supabaseAdmin
            .from('announcements')
            .select('*, profiles:created_by(full_name, role)');

        if (role === 'super_admin') {
            // Super Admin ve todos los avisos
        } else if (role === 'coordinator') {
            // Coordinador ve los avisos de su nivel o 'Todos'
            if (userLevel) {
                query = query.or(`level.eq.${userLevel},level.eq.Todos`);
            }
        } else if (role === 'teacher') {
            // Profesores ven avisos dirigidos a 'teachers' o 'both', de su nivel o 'Todos'
            query = query
                .in('target_role', ['teachers', 'both']);
            if (userLevel) {
                query = query.or(`level.eq.${userLevel},level.eq.Todos`);
            }
        } else if (role === 'student') {
            // Estudiantes ven avisos dirigidos a 'students' o 'both', de su nivel o 'Todos'
            query = query
                .in('target_role', ['students', 'both']);
            if (userLevel) {
                query = query.or(`level.eq.${userLevel},level.eq.Todos`);
            }
        }

        const { data: announcements, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching announcements:', error);
            return res.status(500).json({ error: 'Error al obtener avisos', details: error.message });
        }

        res.json(announcements || []);
    } catch (error) {
        console.error('Unexpected error in getAnnouncements:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Crear un aviso y notificar instantáneamente
const createAnnouncement = async (req, res) => {
    try {
        const { role, level: userLevel, id: userId } = req.user;
        const { title, message, target_role, level } = req.body;

        if (!title || !message || !target_role) {
            return res.status(400).json({ error: 'Título, mensaje y destinatarios son obligatorios' });
        }

        if (role !== 'super_admin' && role !== 'coordinator') {
            return res.status(403).json({ error: 'Solo los coordinadores y el super admin pueden enviar avisos' });
        }

        let assignedLevel = level || 'Todos';
        if (role === 'coordinator') {
            if (!userLevel) {
                return res.status(400).json({ error: 'El coordinador no tiene un nivel académico asignado' });
            }
            assignedLevel = userLevel;
        }

        const { data: newAnnouncement, error } = await supabaseAdmin
            .from('announcements')
            .insert([{
                title,
                message,
                target_role,
                level: assignedLevel,
                created_by: userId
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating announcement:', error);
            return res.status(500).json({ error: 'Error al guardar el aviso', details: error.message });
        }

        // --- Notificar al instante a los destinatarios en segundo plano (Bulk) ---
        (async () => {
            try {
                let userQuery = supabaseAdmin.from('profiles').select('id, push_token, level, role').eq('is_active', true);
                
                if (target_role === 'teachers') {
                    userQuery = userQuery.eq('role', 'teacher');
                } else if (target_role === 'students') {
                    userQuery = userQuery.eq('role', 'student');
                } else {
                    userQuery = userQuery.in('role', ['teacher', 'student']);
                }

                if (assignedLevel && assignedLevel !== 'Todos') {
                    userQuery = userQuery.eq('level', assignedLevel);
                }

                const { data: targetUsers, error: userError } = await userQuery;

                if (!userError && targetUsers && targetUsers.length > 0) {
                    await sendBulkNotification(
                        targetUsers,
                        `📢 Nuevo Aviso: ${title}`,
                        message,
                        { type: 'announcement', announcementId: newAnnouncement.id }
                    );
                }
            } catch (notifErr) {
                console.error('Error sending instant notifications for announcement:', notifErr);
            }
        })();

        res.status(201).json(newAnnouncement);
    } catch (error) {
        console.error('Unexpected error in createAnnouncement:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Eliminar un aviso
const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, level: userLevel } = req.user;

        if (role !== 'super_admin' && role !== 'coordinator') {
            return res.status(403).json({ error: 'No tienes permiso para eliminar avisos' });
        }

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('announcements')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ error: 'Aviso no encontrado' });
        }

        if (role === 'coordinator' && existing.level !== userLevel && existing.level !== 'Todos') {
            return res.status(403).json({ error: 'Solo puedes eliminar avisos de tu nivel académico' });
        }

        const { error: deleteError } = await supabaseAdmin
            .from('announcements')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting announcement:', deleteError);
            return res.status(500).json({ error: 'Error al eliminar el aviso', details: deleteError.message });
        }

        res.json({ message: 'Aviso eliminado correctamente' });
    } catch (error) {
        console.error('Unexpected error in deleteAnnouncement:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    getAnnouncements,
    createAnnouncement,
    deleteAnnouncement
};
