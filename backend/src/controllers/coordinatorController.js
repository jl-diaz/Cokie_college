const { supabaseAdmin } = require('../config/supabase');

const coordinatorController = {
    // --- Gestión de Estudiantes ---
    
    getStudents: async (req, res) => {
        try {
            const { level } = req.user; // 'Primaria' o 'Secundaria'
            const { grade, section } = req.query;

            let query = supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('role', 'student');

            // Filtrar por el nivel del coordinador
            if (level === 'Primaria') {
                query = query.in('grade', ['2', '3', '4', '5', '6']);
            } else if (level === 'Secundaria') {
                query = query.in('grade', ['7', '8', '9']);
            }

            if (grade) query = query.eq('grade', grade);
            if (section) query = query.eq('section', section);

            const { data, error } = await query;
            if (error) throw error;

            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getStudentDiary: async (req, res) => {
        try {
            const { studentId } = req.params;
            const { period } = req.query;

            const { data: conduct, error: conductError } = await supabaseAdmin
                .from('conduct_records')
                .select('*, conduct_codes(*)')
                .eq('student_id', studentId)
                .eq('period', period);

            const { data: attendance, error: attendanceError } = await supabaseAdmin
                .from('attendance')
                .select('*')
                .eq('student_id', studentId)
                .eq('period', period);

            if (conductError || attendanceError) throw conductError || attendanceError;

            res.json({ conduct, attendance });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- Justificaciones ---

    getJustificationRequests: async (req, res) => {
        try {
            const { level } = req.user;
            
            // Un poco más complejo: necesitamos filtrar justificaciones de estudiantes del nivel del coordinador
            // Primero obtenemos los IDs de los estudiantes de ese nivel
            let studentGrades = level === 'Primaria' ? ['2', '3', '4', '5', '6'] : ['7', '8', '9'];
            
            const { data: students, error: studentError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .in('grade', studentGrades);

            if (studentError) throw studentError;
            const studentIds = students.map(s => s.id);

            const { data, error } = await supabaseAdmin
                .from('justifications')
                .select('*, profiles(full_name, institutional_code)')
                .in('student_id', studentIds)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    processJustification: async (req, res) => {
        try {
            const { id } = req.params;
            const { status, coordinator_message } = req.body;
            const coordinator_id = req.user.id;

            // 1. Actualizar solicitud
            const { data: justification, error: justError } = await supabaseAdmin
                .from('justifications')
                .update({ status, coordinator_message, coordinator_id })
                .eq('id', id)
                .select()
                .single();

            if (justError) throw justError;

            // 2. Si se aprueba, actualizar la asistencia
            if (status === 'approved') {
                const { error: attError } = await supabaseAdmin
                    .from('attendance')
                    .update({ status: 'justified' })
                    .eq('student_id', justification.student_id)
                    .eq('date', justification.absence_date);

                if (attError) throw attError;
            }

            res.json({ message: `Solicitud ${status}`, justification });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    directJustification: async (req, res) => {
        try {
            const { institutional_code, absence_date, reason } = req.body;
            const coordinator_id = req.user.id;

            // 1. Buscar estudiante por código
            const { data: student, error: studentError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('institutional_code', institutional_code)
                .single();

            if (studentError || !student) return res.status(404).json({ error: 'Estudiante no encontrado' });

            // 2. Crear justificación aprobada directamente
            const { error: justError } = await supabaseAdmin
                .from('justifications')
                .insert([{
                    student_id: student.id,
                    coordinator_id,
                    absence_date,
                    reason,
                    status: 'approved'
                }]);

            if (justError) throw justError;

            // 3. Actualizar asistencia
            const { error: attError } = await supabaseAdmin
                .from('attendance')
                .update({ status: 'justified' })
                .eq('student_id', student.id)
                .eq('date', absence_date);

            if (attError) throw attError;

            res.json({ message: 'Justificación directa registrada correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- Asignación de Maestros ---

    assignTeacher: async (req, res) => {
        try {
            const { teacher_id, subject_id, grade, section, day_of_week, start_time, end_time } = req.body;

            const { data, error } = await supabaseAdmin
                .from('schedules')
                .insert([{
                    teacher_id,
                    subject_id,
                    grade,
                    section,
                    day_of_week,
                    start_time,
                    end_time
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = coordinatorController;
