const { supabaseAdmin } = require('../config/supabase');

const teacherController = {
    getSchedule: async (req, res) => {
        try {
            const teacher_id = req.user.id;
            const { data, error } = await supabaseAdmin
                .from('schedules')
                .select('*, subjects(name)')
                .eq('teacher_id', teacher_id)
                .order('day_of_week', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getActiveClass: async (req, res) => {
        try {
            const teacher_id = req.user.id;
            
            // 1. Obtener día y hora actual en America/El_Salvador (UTC-6)
            const now = new Date();
            // Convertir a hora de El Salvador
            const svTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/El_Salvador' }));
            
            const dayOfWeek = svTime.getDay(); // 0 (Dom) - 6 (Sáb)
            // En JS 0=Dom, 1=Lun... El Salvador usualmente usa 1=Lun...
            // Si en la DB 1=Lunes, 5=Viernes:
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                return res.json({ claseActiva: false, proximaClase: null, mensaje: 'Hoy es fin de semana.' });
            }

            const currentTime = svTime.toTimeString().split(' ')[0]; // "HH:MM:SS"

            // 2. Buscar clase activa
            const { data: schedule, error: scheduleError } = await supabaseAdmin
                .from('schedules')
                .select('*, subjects(name)')
                .eq('teacher_id', teacher_id)
                .eq('day_of_week', dayOfWeek.toString())
                .lte('start_time', currentTime)
                .gte('end_time', currentTime)
                .single();

            // 3. Obtener el periodo actual basado en la fecha
            const { data: periodData } = await supabaseAdmin
                .from('academic_periods')
                .select('period_number')
                .lte('start_date', now.toISOString())
                .gte('end_date', now.toISOString())
                .limit(1)
                .single();

            const currentPeriod = periodData?.period_number || 1;

            if (schedule) {
                // Obtener estudiantes
                const { data: estudiantes, error: studentError } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, institutional_code')
                    .eq('role', 'student')
                    .eq('grade', schedule.grade)
                    .eq('section', schedule.section)
                    .order('full_name', { ascending: true });

                return res.json({
                    claseActiva: true,
                    materia: schedule.subjects.name,
                    subject_id: schedule.subject_id,
                    grade: schedule.grade,
                    section: schedule.section,
                    start_time: schedule.start_time,
                    end_time: schedule.end_time,
                    period: currentPeriod,
                    estudiantes
                });
            }

            // 3. Si no hay activa, buscar la próxima del día
            const { data: nextClass, error: nextError } = await supabaseAdmin
                .from('schedules')
                .select('*, subjects(name)')
                .eq('teacher_id', teacher_id)
                .eq('day_of_week', dayOfWeek.toString())
                .gt('start_time', currentTime)
                .order('start_time', { ascending: true })
                .limit(1)
                .single();

            res.json({
                claseActiva: false,
                proximaClase: nextClass ? {
                    materia: nextClass.subjects.name,
                    start_time: nextClass.start_time,
                    grade: nextClass.grade,
                    section: nextClass.section,
                    period: currentPeriod
                } : null
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener la clase activa' });
        }
    },

    getClassrooms: async (req, res) => {
        try {
            const { level } = req.user;
            
            let studentGrades = level === 'Primaria' ? ['2', '3', '4', '5', '6'] : ['7', '8', '9'];

            // Si el maestro no tiene nivel, podríamos mostrar solo las aulas donde da clase.
            // Pero según requerimiento, debe ver "todos los salones de su nivel".
            if (!level) {
                return res.status(400).json({ error: 'El maestro no tiene un nivel asignado.' });
            }

            const { data: students, error } = await supabaseAdmin
                .from('profiles')
                .select('grade, section')
                .eq('role', 'student')
                .in('grade', studentGrades);

            if (error) throw error;

            const classroomsMap = {};
            students.forEach(s => {
                if (s.grade && s.section) {
                    const key = `${s.grade}-${s.section}`;
                    classroomsMap[key] = { grade: s.grade, section: s.section };
                }
            });

            const classrooms = Object.values(classroomsMap).sort((a, b) => {
                if (a.grade !== b.grade) return parseInt(a.grade) - parseInt(b.grade);
                return a.section.localeCompare(b.section);
            });

            res.json(classrooms);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getClassStudents: async (req, res) => {
        try {
            const { grade, section } = req.query;
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('role', 'student')
                .eq('grade', grade)
                .eq('section', section)
                .order('full_name', { ascending: true });

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    registerAttendance: async (req, res) => {
        try {
            const teacher_id = req.user.id;
            const { attendances } = req.body; // Array de { student_id, subject_id, status, period, date }

            if (!Array.isArray(attendances) || attendances.length === 0) {
                return res.status(400).json({ error: 'Se requiere un array de asistencias' });
            }

            const { data, error } = await supabaseAdmin
                .from('attendance')
                .upsert(attendances.map(a => ({ ...a, teacher_id })));

            if (error) throw error;
            res.json({ message: 'Asistencia registrada correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    addConductRecord: async (req, res) => {
        try {
            const teacher_id = req.user.id;
            const { student_id, code_id, observation, period } = req.body;

            const { data, error } = await supabaseAdmin
                .from('conduct_records')
                .insert([{ 
                    student_id, 
                    teacher_id, 
                    code_id, 
                    observation, 
                    period,
                    fecha_aplicacion: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getActivities: async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin
                .from('evaluation_activities')
                .select('*')
                .order('percentage', { ascending: true });
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getConductCodes: async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin
                .from('conduct_codes')
                .select('*')
                .order('code', { ascending: true });
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getGradesByActivity: async (req, res) => {
        try {
            const { subject_id, activity_id, period, grade, section } = req.query;

            // 1. Obtener todos los estudiantes de ese grado y sección
            const { data: students, error: studentError } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, institutional_code')
                .eq('role', 'student')
                .eq('grade', grade)
                .eq('section', section)
                .order('full_name', { ascending: true });

            if (studentError) throw studentError;

            // 2. Obtener las notas existentes para esa actividad/materia/periodo
            const { data: grades, error: gradeError } = await supabaseAdmin
                .from('grades')
                .select('*')
                .eq('subject_id', subject_id)
                .eq('activity_id', activity_id)
                .eq('period', period);

            if (gradeError) throw gradeError;

            // 3. Mapear estudiantes con sus notas
            const studentsWithGrades = students.map(student => {
                const gradeRecord = grades.find(g => g.student_id === student.id);
                return {
                    ...student,
                    grade: gradeRecord ? gradeRecord.grade : 0.00,
                    grade_id: gradeRecord ? gradeRecord.id : null
                };
            });

            res.json(studentsWithGrades);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    registerGrades: async (req, res) => {
        try {
            const teacher_id = req.user.id;
            const { grades, period } = req.body; // Array de { student_id, subject_id, activity_id, grade }

            if (!Array.isArray(grades) || grades.length === 0 || !period) {
                return res.status(400).json({ error: 'Se requiere un array de notas y el periodo' });
            }

            // Validar que todas las notas estén en el rango 0-10
            const invalidGrade = grades.find(g => g.grade < 0 || g.grade > 10);
            if (invalidGrade) {
                return res.status(400).json({ error: `La nota ${invalidGrade.grade} no es válida. Debe estar entre 0 y 10.` });
            }

            // Verificar si el periodo está activo
            const { data: periodInfo, error: periodError } = await supabaseAdmin
                .from('academic_periods')
                .select('*')
                .eq('period_number', period)
                .single();

            if (periodError) throw periodError;

            const now = new Date();
            const deadline = new Date(periodInfo.end_date);

            if (now > deadline) {
                return res.status(403).json({ error: 'El periodo académico ya ha finalizado. No se pueden ingresar notas.' });
            }

            // Usar upsert para insertar o actualizar notas
            const { data, error } = await supabaseAdmin
                .from('grades')
                .upsert(grades.map(g => ({ 
                    ...g, 
                    teacher_id,
                    period 
                })), { onConflict: 'student_id, subject_id, activity_id, period' });

            if (error) throw error;
            res.json({ message: 'Notas actualizadas correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteGrade: async (req, res) => {
        try {
            const teacher_id = req.user.id;
            const { id } = req.params;

            // Verificar que la nota pertenece al maestro
            const { data: grade, error: gradeError } = await supabaseAdmin
                .from('grades')
                .select('teacher_id, period')
                .eq('id', id)
                .single();

            if (gradeError) throw gradeError;

            if (grade.teacher_id !== teacher_id) {
                return res.status(403).json({ error: 'No tienes permiso para eliminar esta nota' });
            }

            // Verificar si el periodo está activo
            const { data: periodInfo, error: periodError } = await supabaseAdmin
                .from('academic_periods')
                .select('*')
                .eq('period_number', grade.period)
                .single();

            if (periodError) throw periodError;

            const now = new Date();
            const deadline = new Date(periodInfo.end_date);

            if (now > deadline) {
                return res.status(403).json({ error: 'El periodo académico ya ha finalizado. No se pueden eliminar notas.' });
            }

            const { error } = await supabaseAdmin
                .from('grades')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ message: 'Nota eliminada correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = teacherController;
