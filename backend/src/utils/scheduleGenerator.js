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

    const { data: subjectsData } = await supabaseAdmin
        .from('subjects')
        .select('*');

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

    const subjects = [...subjectsData].sort((a, b) => {
        const hoursA = a.weekly_hours || 4;
        const hoursB = b.weekly_hours || 4;
        if (hoursB !== hoursA) return hoursB - hoursA;
        const teachersA = teachersBySubject[a.id]?.length || 0;
        const teachersB = teachersBySubject[b.id]?.length || 0;
        return teachersA - teachersB;
    });

    let proposal = [];
    let teacherScheduleMap = new Map(); 
    let classScheduleMap = new Map(); 
    const teacherPeriodsMap = new Map(); 

    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    };

    classrooms.forEach(classroom => {
        const classKey = `${classroom.grade}-${classroom.section}`;
        
        subjects.forEach(subject => {
            // Conversión: 1 hora reloj = 2 bloques de 30 minutos
            const weeklyHours = subject.weekly_hours || 3;
            const requiredBlocks = weeklyHours * 2;
            const maxBlocksPerDay = 3; // Límite diario (1.5h máximo) por materia

            const availableTeachers = teachersBySubject[subject.id];
            
            if (!availableTeachers || availableTeachers.length === 0) {
                return; 
            }

            const sortedTeachers = [...availableTeachers].sort((a, b) => {
                const periodsA = teacherPeriodsMap.get(a.id) || 0;
                const periodsB = teacherPeriodsMap.get(b.id) || 0;
                return periodsA - periodsB;
            });

            let success = false;

            for (const teacher of sortedTeachers) {
                const backupProposal = [...proposal];
                const backupTeacherSchedule = new Map(teacherScheduleMap);
                const backupClassSchedule = new Map(classScheduleMap);

                let blocksAssigned = 0;
                
                // Track daily blocks for this specific subject/classroom to enforce maxBlocksPerDay
                let subjectDailyBlocks = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                
                // Mezclamos días para empezar a probar aleatoriamente
                let daysPool = [...DAYS_OF_WEEK];
                shuffleArray(daysPool);

                let keepTrying = true;
                // Loop principal de Backtracking para asignar todos los bloques requeridos
                while (blocksAssigned < requiredBlocks && keepTrying) {
                    keepTrying = false; // asume falso hasta que logremos colocar al menos 1 bloque
                    
                    for (let day of daysPool) {
                        if (blocksAssigned >= requiredBlocks) break;
                        
                        // Si ya superamos el límite diario, saltar de día
                        if (subjectDailyBlocks[day] >= maxBlocksPerDay) continue;

                        let slotsPool = [0, 1, 2, 3, 4, 5, 6, 7];
                        
                        // Preferimos colocar los bloques de una misma materia en slots contiguos
                        // Pero por ahora solo iteramos todos los posibles slots del día
                        for (let slot of slotsPool) {
                            if (blocksAssigned >= requiredBlocks) break;
                            if (subjectDailyBlocks[day] >= maxBlocksPerDay) break;

                            const teacherKey = `${teacher.id}_${day}_${slot}`;
                            const cKey = `${classKey}_${day}_${slot}`;

                            if (!teacherScheduleMap.has(teacherKey) && !classScheduleMap.has(cKey)) {
                                teacherScheduleMap.set(teacherKey, true);
                                classScheduleMap.set(cKey, true);
                                subjectDailyBlocks[day]++;
                                
                                proposal.push({
                                    teacher_id: teacher.id,
                                    teacher_name: teacher.full_name,
                                    subject_id: subject.id,
                                    subject_name: subject.name,
                                    grade: classroom.grade,
                                    section: classroom.section,
                                    day_of_week: day,
                                    start_time: TIME_SLOTS[slot].start,
                                    end_time: TIME_SLOTS[slot].end,
                                    slot_index: slot
                                });
                                blocksAssigned++;
                                keepTrying = true; // Logramos avanzar, mantenemos el ciclo vivo
                            }
                        }
                    }
                }

                if (blocksAssigned === requiredBlocks) {
                    teacherPeriodsMap.set(teacher.id, (teacherPeriodsMap.get(teacher.id) || 0) + requiredBlocks);
                    success = true;
                    break;
                } else {
                    // Rollback
                    proposal = backupProposal;
                    teacherScheduleMap = backupTeacherSchedule;
                    classScheduleMap = backupClassSchedule;
                }
            }

            if (!success) {
                console.warn(`No se pudieron asignar ${requiredBlocks} bloques de ${subject.name} para ${classKey}`);
            }
        });
    });

    return proposal;
}

module.exports = {
    generateSchedule,
    TIME_SLOTS
};
