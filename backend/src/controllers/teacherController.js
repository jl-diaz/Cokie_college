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
                .insert([{ student_id, teacher_id, code_id, observation, period }])
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
    }
};

module.exports = teacherController;
