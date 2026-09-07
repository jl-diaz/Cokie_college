const { supabaseAdmin } = require('../config/supabase');

const DAYS_OF_WEEK = [1, 2, 3, 4, 5]; // Lunes a Viernes

// 8 bloques de 30 minutos (Total 4 horas al día = 240 mins)
const TIME_SLOTS = [
    { start: '07:00:00', end: '07:30:00' }, // 0
    { start: '07:30:00', end: '08:00:00' }, // 1
    { start: '08:00:00', end: '08:30:00' }, // 2
    // Receso 08:30 - 09:00
    { start: '09:00:00', end: '09:30:00' }, // 3
    { start: '09:30:00', end: '10:00:00' }, // 4
    { start: '10:00:00', end: '10:30:00' }, // 5
    // Receso 10:30 - 11:00
    { start: '11:00:00', end: '11:30:00' }, // 6
    { start: '11:30:00', end: '12:00:00' }  // 7
];

async function generateSchedule(level) {
    let studentQuery = supabaseAdmin
        .from('profiles')
        .select('grade, section')
        .eq('role', 'student')
        .neq('grade', null)
        .neq('section', null);

    if (level === 'Primaria') {
        studentQuery = studentQuery.in('grade', ['1', '2', '3', '4', '5', '6']);
    } else if (level === 'Secundaria' || level === 'Tercer Ciclo') {
        studentQuery = studentQuery.in('grade', ['7', '8', '9', '10', '11']);
    }

    const { data: students } = await studentQuery;

    const classroomsMap = new Map();
    students?.forEach(s => {
        const key = `${s.grade}-${s.section}`;
        if (!classroomsMap.has(key)) {
            classroomsMap.set(key, { grade: s.grade, section: s.section });
        }
    });
    const classrooms = Array.from(classroomsMap.values());

    if (!classrooms || classrooms.length === 0) {
        throw new Error('No se encontraron salones o estudiantes para este nivel.');
    }

    const { data: subjectsData } = await supabaseAdmin
        .from('subjects')
        .select('*');

    if (!subjectsData || subjectsData.length === 0) {
        throw new Error('No hay materias registradas en el sistema.');
    }

    let teacherLevels = [level];
    if (level === 'Secundaria' || level === 'Tercer Ciclo') {
        teacherLevels = ['Secundaria', 'Tercer Ciclo'];
    }

    const { data: teachers } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, specialty_subject_id')
        .eq('role', 'teacher')
        .in('level', teacherLevels)
        .eq('is_active', true)
        .not('specialty_subject_id', 'is', null);

    if (!teachers || teachers.length === 0) {
        throw new Error('No hay profesores configurados con especialidad para este nivel.');
    }

    const teachersBySubject = {};
    teachers.forEach(t => {
        if (!teachersBySubject[t.specialty_subject_id]) {
            teachersBySubject[t.specialty_subject_id] = [];
        }
        teachersBySubject[t.specialty_subject_id].push(t);
    });

    const numClasses = classrooms.length;
    const numSlots = 40; // 5 días × 8 bloques diarios

    // Asignar un docente específico por materia para cada salón de forma equitativa
    const classSubjectTeacher = new Map();
    subjectsData.forEach(sub => {
        const tList = teachersBySubject[sub.id] || [];
        if (tList.length === 0) return;
        classrooms.forEach((c, idx) => {
            const teacher = tList[idx % tList.length];
            classSubjectTeacher.set(`${c.grade}-${c.section}_${sub.id}`, teacher);
        });
    });

    // Función que corre un intento de optimización (Simulated Annealing / Min-Conflicts)
    const runOptimizationAttempt = () => {
        let grid = [];

        for (let c = 0; c < numClasses; c++) {
            const cObj = classrooms[c];
            const classKey = `${cObj.grade}-${cObj.section}`;
            const blocks = [];

            subjectsData.forEach(sub => {
                const teacher = classSubjectTeacher.get(`${classKey}_${sub.id}`);
                if (!teacher) return;
                const count = (sub.weekly_hours || 3) * 2;
                for (let k = 0; k < count; k++) {
                    blocks.push({
                        grade: cObj.grade,
                        section: cObj.section,
                        subject_id: sub.id,
                        subject_name: sub.name,
                        teacher_id: teacher.id,
                        teacher_name: teacher.full_name
                    });
                }
            });

            // Rellenar hasta 40 bloques si faltan
            while (blocks.length < numSlots) {
                blocks.push(null);
            }

            // Mezclar aleatoriamente el estado inicial
            for (let i = blocks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
            }

            grid.push(blocks);
        }

        // Medir choques de profesores en un slot
        const slotTeacherConflicts = (s) => {
            let conf = 0;
            const seen = {};
            for (let c = 0; c < numClasses; c++) {
                const b = grid[c][s];
                if (!b) continue;
                if (seen[b.teacher_id]) conf++;
                else seen[b.teacher_id] = true;
            }
            return conf;
        };

        // Medir límite de bloques de la misma materia en un mismo día (> 3 bloques)
        const dayLimitClashes = (c, day) => {
            let clashes = 0;
            const counts = {};
            const startSlot = day * 8;
            for (let s = startSlot; s < startSlot + 8; s++) {
                const b = grid[c][s];
                if (!b) continue;
                counts[b.subject_id] = (counts[b.subject_id] || 0) + 1;
                if (counts[b.subject_id] > 3) clashes++;
            }
            return clashes;
        };

        // Medir contigüidad (incentivo pedagógico para bloques continuos en el mismo día)
        const contiguityScore = (c, day) => {
            let score = 0;
            const startSlot = day * 8;
            // Bloques 0, 1, 2 antes del primer receso
            if (grid[c][startSlot]?.subject_id === grid[c][startSlot + 1]?.subject_id) score++;
            if (grid[c][startSlot + 1]?.subject_id === grid[c][startSlot + 2]?.subject_id) score++;
            // Bloques 3, 4, 5 entre recesos
            if (grid[c][startSlot + 3]?.subject_id === grid[c][startSlot + 4]?.subject_id) score++;
            if (grid[c][startSlot + 4]?.subject_id === grid[c][startSlot + 5]?.subject_id) score++;
            // Bloques 6, 7 después del segundo receso
            if (grid[c][startSlot + 6]?.subject_id === grid[c][startSlot + 7]?.subject_id) score++;
            return score;
        };

        const maxIters = 60000;

        for (let iter = 0; iter < maxIters; iter++) {
            const c = Math.floor(Math.random() * numClasses);
            const s1 = Math.floor(Math.random() * numSlots);
            const s2 = Math.floor(Math.random() * numSlots);
            if (s1 === s2) continue;

            const b1 = grid[c][s1];
            const b2 = grid[c][s2];
            if (!b1 && !b2) continue;
            if (b1 && b2 && b1.teacher_id === b2.teacher_id && b1.subject_id === b2.subject_id) continue;

            const d1 = Math.floor(s1 / 8);
            const d2 = Math.floor(s2 / 8);

            const oldSlotConf = slotTeacherConflicts(s1) + slotTeacherConflicts(s2);
            const oldDayClash = dayLimitClashes(c, d1) + (d1 !== d2 ? dayLimitClashes(c, d2) : 0);
            const oldContig = contiguityScore(c, d1) + (d1 !== d2 ? contiguityScore(c, d2) : 0);

            // Intentar intercambio
            grid[c][s1] = b2;
            grid[c][s2] = b1;

            const newSlotConf = slotTeacherConflicts(s1) + slotTeacherConflicts(s2);
            const newDayClash = dayLimitClashes(c, d1) + (d1 !== d2 ? dayLimitClashes(c, d2) : 0);
            const newContig = contiguityScore(c, d1) + (d1 !== d2 ? contiguityScore(c, d2) : 0);

            const costDelta = (newSlotConf - oldSlotConf) * 1000 + 
                              (newDayClash - oldDayClash) * 50 - 
                              (newContig - oldContig) * 10;

            const temp = Math.max(0.01, 1 - (iter / maxIters));
            if (costDelta <= 0 || Math.random() < Math.exp(-costDelta / (250 * temp))) {
                // Aceptar intercambio
            } else {
                // Revertir
                grid[c][s1] = b1;
                grid[c][s2] = b2;
            }
        }

        let totalTeacherConflicts = 0;
        for (let s = 0; s < numSlots; s++) {
            totalTeacherConflicts += slotTeacherConflicts(s);
        }

        return {
            success: totalTeacherConflicts === 0,
            grid,
            conflicts: totalTeacherConflicts
        };
    };

    let bestSolution = null;
    for (let attempt = 1; attempt <= 6; attempt++) {
        const result = runOptimizationAttempt();
        if (result.success) {
            bestSolution = result.grid;
            break;
        }
        if (!bestSolution || result.conflicts < bestSolution.conflicts) {
            bestSolution = result.grid;
        }
    }

    if (!bestSolution) {
        throw new Error('No se pudo encontrar una distribución de horario sin conflictos. Por favor intenta de nuevo.');
    }

    // Convertir grid al formato esperado por la base de datos y la vista
    const proposal = [];
    for (let c = 0; c < numClasses; c++) {
        for (let s = 0; s < numSlots; s++) {
            const item = bestSolution[c][s];
            if (!item) continue;

            const dayIndex = Math.floor(s / 8); // 0..4
            const slotIndex = s % 8;           // 0..7
            const day = DAYS_OF_WEEK[dayIndex];

            proposal.push({
                teacher_id: item.teacher_id,
                teacher_name: item.teacher_name,
                subject_id: item.subject_id,
                subject_name: item.subject_name,
                grade: item.grade,
                section: item.section,
                day_of_week: day,
                start_time: TIME_SLOTS[slotIndex].start,
                end_time: TIME_SLOTS[slotIndex].end,
                slot_index: slotIndex
            });
        }
    }

    return proposal;
}

module.exports = {
    generateSchedule,
    TIME_SLOTS
};
