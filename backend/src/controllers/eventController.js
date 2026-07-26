const { supabaseAdmin } = require('../config/supabase');

// Obtener eventos según el rol y nivel del usuario
const getEvents = async (req, res) => {
    try {
        const { role, level: userLevel } = req.user;
        const { level } = req.query;

        let query = supabaseAdmin
            .from('events')
            .select('*, profiles:created_by(full_name, role)');

        if (role === 'super_admin') {
            if (level && level !== 'Todos') {
                query = query.or(`level.eq.${level},level.eq.Todos`);
            }
        } else {
            // Coordinadores, maestros y alumnos ven eventos de su nivel o 'Todos'
            if (userLevel) {
                query = query.or(`level.eq.${userLevel},level.eq.Todos`);
            }
        }

        const { data: events, error } = await query.order('event_date', { ascending: true }).order('start_time', { ascending: true });

        if (error) {
            console.error('Error fetching events:', error);
            return res.status(500).json({ error: 'Error al obtener eventos', details: error.message });
        }

        res.json(events || []);
    } catch (error) {
        console.error('Unexpected error in getEvents:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Crear un nuevo evento
const createEvent = async (req, res) => {
    try {
        const { role, level: userLevel, id: userId } = req.user;
        const { title, description, event_date, start_time, end_time, level } = req.body;

        if (!title || !event_date || !start_time || !end_time) {
            return res.status(400).json({ error: 'Título, fecha, hora de inicio y hora de fin son obligatorios' });
        }

        if (role !== 'super_admin' && role !== 'coordinator') {
            return res.status(403).json({ error: 'No tienes permiso para crear eventos' });
        }

        let assignedLevel = level || 'Todos';
        if (role === 'coordinator') {
            if (!userLevel) {
                return res.status(400).json({ error: 'El coordinador no tiene un nivel académico asignado en su perfil' });
            }
            assignedLevel = userLevel; // Coordinador solo administra su nivel
        }

        const { data: newEvent, error } = await supabaseAdmin
            .from('events')
            .insert([{
                title,
                description: description || '',
                event_date,
                start_time,
                end_time,
                level: assignedLevel,
                created_by: userId
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating event:', error);
            return res.status(500).json({ error: 'Error al crear el evento', details: error.message });
        }

        res.status(201).json(newEvent);
    } catch (error) {
        console.error('Unexpected error in createEvent:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Actualizar un evento
const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, level: userLevel } = req.user;
        const { title, description, event_date, start_time, end_time, level } = req.body;

        if (role !== 'super_admin' && role !== 'coordinator') {
            return res.status(403).json({ error: 'No tienes permiso para modificar eventos' });
        }

        // Obtener el evento existente
        const { data: existingEvent, error: fetchError } = await supabaseAdmin
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingEvent) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }

        if (role === 'coordinator' && existingEvent.level !== userLevel && existingEvent.level !== 'Todos') {
            return res.status(403).json({ error: 'Solo puedes administrar eventos de tu nivel académico' });
        }

        let updateData = {
            title: title !== undefined ? title : existingEvent.title,
            description: description !== undefined ? description : existingEvent.description,
            event_date: event_date !== undefined ? event_date : existingEvent.event_date,
            start_time: start_time !== undefined ? start_time : existingEvent.start_time,
            end_time: end_time !== undefined ? end_time : existingEvent.end_time,
        };

        if (role === 'super_admin' && level) {
            updateData.level = level;
        }

        const { data: updatedEvent, error } = await supabaseAdmin
            .from('events')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating event:', error);
            return res.status(500).json({ error: 'Error al actualizar el evento', details: error.message });
        }

        res.json(updatedEvent);
    } catch (error) {
        console.error('Unexpected error in updateEvent:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Eliminar un evento
const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, level: userLevel } = req.user;

        if (role !== 'super_admin' && role !== 'coordinator') {
            return res.status(403).json({ error: 'No tienes permiso para eliminar eventos' });
        }

        const { data: existingEvent, error: fetchError } = await supabaseAdmin
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingEvent) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }

        if (role === 'coordinator' && existingEvent.level !== userLevel && existingEvent.level !== 'Todos') {
            return res.status(403).json({ error: 'Solo puedes eliminar eventos de tu nivel académico' });
        }

        const { error: deleteError } = await supabaseAdmin
            .from('events')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting event:', deleteError);
            return res.status(500).json({ error: 'Error al eliminar el evento', details: deleteError.message });
        }

        res.json({ message: 'Evento eliminado correctamente' });
    } catch (error) {
        console.error('Unexpected error in deleteEvent:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent
};
