const { supabaseAdmin } = require('../config/supabase');

/**
 * Obtiene el número de periodo académico correspondiente a una fecha dada (YYYY-MM-DD).
 * Si no se proporciona fecha, utiliza la fecha actual.
 */
const getPeriodForDate = async (dateInput) => {
    try {
        const dateStr = dateInput ? new Date(dateInput).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        const { data: periods, error } = await supabaseAdmin
            .from('academic_periods')
            .select('*');

        if (!error && periods && periods.length > 0) {
            const match = periods.find(p => dateStr >= p.start_date && dateStr <= p.end_date);
            if (match) return match.period_number;

            // Si es antes del primer periodo
            if (dateStr < periods[0].start_date) return periods[0].period_number;
            
            // Buscar el último periodo activo previo
            const pastPeriods = periods.filter(p => dateStr >= p.start_date).sort((a,b) => b.period_number - a.period_number);
            if (pastPeriods.length > 0) return pastPeriods[0].period_number;
        }

        return 3; // Fallback al periodo 3 activo
    } catch (e) {
        console.error('Error al resolver periodo para fecha:', e);
        return 3;
    }
};

module.exports = { getPeriodForDate };
