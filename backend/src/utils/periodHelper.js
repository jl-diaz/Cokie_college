const { supabaseAdmin } = require('../config/supabase');

let cachedPeriods = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché en memoria

/**
 * Obtiene los periodos académicos con caché en memoria de alta velocidad.
 */
const fetchAcademicPeriods = async () => {
    const now = Date.now();
    if (cachedPeriods && (now - lastFetchTime < CACHE_TTL_MS)) {
        return cachedPeriods;
    }

    const { data: periods, error } = await supabaseAdmin
        .from('academic_periods')
        .select('*')
        .order('period_number', { ascending: true });

    if (!error && periods && periods.length > 0) {
        cachedPeriods = periods;
        lastFetchTime = now;
        return cachedPeriods;
    }

    return cachedPeriods || [];
};

const getLocalDateString = (dateInput) => {
    const d = dateInput ? new Date(dateInput) : new Date();
    return d.toLocaleDateString('sv-SE', { timeZone: 'America/El_Salvador' });
};

/**
 * Obtiene el número de periodo académico correspondiente a una fecha dada (YYYY-MM-DD).
 * Si no se proporciona fecha, utiliza la fecha actual en la zona horaria de El Salvador.
 */
const getPeriodForDate = async (dateInput) => {
    try {
        const dateStr = getLocalDateString(dateInput);

        const periods = await fetchAcademicPeriods();

        if (periods && periods.length > 0) {
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

const invalidatePeriodsCache = () => {
    cachedPeriods = null;
    lastFetchTime = 0;
};

module.exports = { getPeriodForDate, invalidatePeriodsCache };

