const { supabaseAdmin } = require('../config/supabase');
const { sendNotification } = require('./notificationService');

/**
 * Tarea periódica para revisar eventos próximos (24h antes) y notificar a alumnos y profesores
 */
const checkUpcomingEventReminders = async () => {
    try {
        const now = new Date();
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const nowStr = now.toISOString().split('T')[0];
        const in24hStr = in24Hours.toISOString().split('T')[0];

        // Buscar eventos no notificados cuyo event_date esté entre hoy y mañana
        const { data: upcomingEvents, error } = await supabaseAdmin
            .from('events')
            .select('*')
            .eq('reminder_sent', false)
            .gte('event_date', nowStr)
            .lte('event_date', in24hStr);

        if (error || !upcomingEvents || upcomingEvents.length === 0) {
            return;
        }

        for (const event of upcomingEvents) {
            // Calcular fecha/hora de inicio exacta del evento
            const eventStartDateTime = new Date(`${event.event_date}T${event.start_time}`);
            const diffMs = eventStartDateTime.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            // Si falta entre 0 y 24.5 horas para el evento, enviar recordatorio
            if (diffHours >= 0 && diffHours <= 24.5) {
                console.log(`[EventScheduler] Enviando recordatorio 24h para evento: "${event.title}" (${event.event_date} ${event.start_time})`);

                let userQuery = supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .in('role', ['teacher', 'student']);

                if (event.level && event.level !== 'Todos') {
                    userQuery = userQuery.eq('level', event.level);
                }

                const { data: recipients } = await userQuery;

                if (recipients && recipients.length > 0) {
                    for (const recipient of recipients) {
                        await sendNotification(
                            recipient.id,
                            `📅 Recordatorio de Evento: ${event.title}`,
                            `El evento "${event.title}" comenzará mañana a las ${event.start_time.substring(0, 5)}. ${event.description || ''}`,
                            { type: 'event_reminder', eventId: event.id }
                        );
                    }
                }

                // Marcar reminder_sent como true
                await supabaseAdmin
                    .from('events')
                    .update({ reminder_sent: true })
                    .eq('id', event.id);
            }
        }
    } catch (err) {
        console.error('[EventScheduler] Error en verificación de recordatorios de eventos:', err);
    }
};

// Iniciar verificador de eventos periódicos (cada 15 minutos)
const startEventScheduler = () => {
    console.log('[EventScheduler] Scheduler de recordatorios de eventos activado (frecuencia: 15 min).');
    checkUpcomingEventReminders();
    setInterval(checkUpcomingEventReminders, 15 * 60 * 1000);
};

module.exports = {
    startEventScheduler,
    checkUpcomingEventReminders
};
