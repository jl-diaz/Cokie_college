const { supabaseAdmin } = require('../config/supabase');

const parseTime24 = (tStr) => {
    if (!tStr) return '00:00:00';
    const clean = tStr.trim();
    const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) {
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(clean)) {
            const p = clean.split(':');
            return `${p[0].padStart(2, '0')}:${p[1].padStart(2, '0')}:00`;
        }
        return clean;
    }
    const h = parseInt(match[1], 10);
    const m = match[2];
    const meridiem = match[3];
    let hours = h;
    if (meridiem) {
        const mer = meridiem.toUpperCase();
        if (mer === 'PM' && hours < 12) hours += 12;
        if (mer === 'AM' && hours === 12) hours = 0;
    }
    return `${String(hours).padStart(2, '0')}:${m}:00`;
};

/**
 * Determina las materias correspondientes a una inasistencia o justificación.
 * Si es jornada completa, no devuelve materias individuales, sino 'Día completo'.
 * Si es por horario, busca en schedules todas las materias en ese rango.
 */
const resolveJustificationSubjects = async (studentId, absenceDate, rawReason) => {
    try {
        const text = rawReason || '';
        const isFullDay = text.includes('[JORNADA COMPLETA]');
        if (isFullDay) {
            return {
                title: 'Día completo',
                isFullDay: true,
                subjects: []
            };
        }

        const timeMatch = text.match(/\[HORARIO:\s*([^\]]+)\]/i);
        if (timeMatch) {
            const timeRange = timeMatch[1].trim();
            const parts = timeRange.split('-');
            if (parts.length === 2) {
                const start24 = parseTime24(parts[0]);
                const end24 = parseTime24(parts[1]);

                // Consultar grado y sección del estudiante
                const { data: student } = await supabaseAdmin
                    .from('profiles')
                    .select('grade, section')
                    .eq('id', studentId)
                    .single();

                if (student?.grade && student?.section) {
                    const dateObj = new Date(`${absenceDate}T12:00:00`);
                    const dayOfWeek = dateObj.getDay(); // 1=Lunes, ..., 5=Viernes

                    const { data: scheds } = await supabaseAdmin
                        .from('schedules')
                        .select('start_time, end_time, subjects(name)')
                        .eq('grade', student.grade)
                        .eq('section', student.section)
                        .eq('day_of_week', dayOfWeek)
                        .order('start_time', { ascending: true });

                    if (scheds && scheds.length > 0) {
                        const matching = scheds.filter(s => {
                            const sStart = s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time;
                            const sEnd = s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time;
                            return sStart < end24 && sEnd > start24;
                        });

                        const names = [...new Set(matching.map(m => m.subjects?.name).filter(Boolean))];
                        if (names.length > 0) {
                            return {
                                title: names.join(', '),
                                isFullDay: false,
                                timeScope: timeRange,
                                subjects: names
                            };
                        }
                    }
                }
            }
            return {
                title: 'Clases del horario',
                isFullDay: false,
                timeScope: timeMatch[1].trim(),
                subjects: []
            };
        }
    } catch (err) {
        console.error('Error resolving justification subjects:', err);
    }

    return {
        title: 'Inasistencia Justificada',
        isFullDay: false,
        subjects: []
    };
};

module.exports = {
    parseTime24,
    resolveJustificationSubjects
};
