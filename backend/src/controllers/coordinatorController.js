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
                query = query.in('grade', ['1', '2', '3', '4', '5', '6']);
            } else if (level === 'Secundaria') {
                query = query.in('grade', ['7', '8', '9', '10', '11']);
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

    getStudentGrades: async (req, res) => {
        try {
            const { studentId } = req.params;
            const { period } = req.query;
            
            let query = supabaseAdmin
                .from('grades')
                .select('*, subjects(name), evaluation_activities(name, percentage)')
                .eq('student_id', studentId);

            if (period) {
                query = query.eq('period', period);
            }

            const { data, error } = await query;
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getStudentAverages: async (req, res) => {
        try {
            const { studentId } = req.params;
            const { period } = req.query;
            
            let query = supabaseAdmin
                .from('student_averages')
                .select('*, subjects(name)')
                .eq('student_id', studentId);

            if (period) {
                query = query.eq('period', period);
            }

            const { data, error } = await query;
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
                .order('name', { ascending: true });
            
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    addConductRecord: async (req, res) => {
        try {
            const coordinator_id = req.user.id;
            const { student_id, code_id, observation, period } = req.body;

            const { data, error } = await supabaseAdmin
                .from('conduct_records')
                .insert([{
                    student_id,
                    teacher_id: coordinator_id,
                    code_id,
                    observation,
                    period
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- Gestión de Maestros ---
    getTeachers: async (req, res) => {
        try {
            const { level } = req.user;
            let query = supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('role', 'teacher');
            
            if (level) {
                query = query.eq('level', level);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- Gestión de Salones ---
    getClassrooms: async (req, res) => {
        try {
            const { level } = req.user;
            
            let query = supabaseAdmin
                .from('profiles')
                .select('grade, section')
                .eq('role', 'student');

            if (level === 'Primaria') {
                query = query.in('grade', ['1', '2', '3', '4', '5', '6']);
            } else if (level === 'Secundaria') {
                query = query.in('grade', ['7', '8', '9', '10', '11']);
            }

            const { data: students, error } = await query;

            if (error) throw error;

            // Get distinct combinations
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

    // --- Justificaciones ---

    getJustificationRequests: async (req, res) => {
        try {
            const { level } = req.user;
            console.log('Fetching justifications for level:', level);
            
            // 1. Obtener IDs de estudiantes según el nivel del coordinador
            let query = supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('role', 'student');

            if (level === 'Primaria') {
                query = query.in('grade', ['1', '2', '3', '4', '5', '6']);
            } else if (level === 'Secundaria' || level === 'Tercer Ciclo') {
                query = query.in('grade', ['7', '8', '9', '10', '11']);
            }
            
            const { data: students, error: studentError } = await query;

            if (studentError) {
                console.error('Error fetching students for justifications:', studentError);
                throw studentError;
            }

            if (!students || students.length === 0) {
                console.log('No students found for this level');
                return res.json([]);
            }

            const studentIds = students.map(s => s.id);

            // 2. Obtener justificaciones con una sintaxis más simple para la relación
            const { data, error } = await supabaseAdmin
                .from('justifications')
                .select(`
                    *,
                    profiles:student_id (
                        full_name,
                        institutional_code
                    )
                `)
                .in('student_id', studentIds)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching justifications from table:', error);
                throw error;
            }

            res.json(data || []);
        } catch (error) {
            console.error('CRITICAL ERROR in getJustificationRequests:', error);
            res.status(500).json({ error: error.message || 'Internal Server Error' });
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

    createJustificationForStudent: async (req, res) => {
        try {
            const coordinator_id = req.user.id;
            const { student_id, absence_date, reason } = req.body;

            // 1. Verificar que el estudiante existe
            const { data: student, error: studentError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('id', student_id)
                .eq('role', 'student')
                .single();

            if (studentError || !student) {
                return res.status(404).json({ error: 'Estudiante no encontrado' });
            }

            // 2. Crear justificación aprobada directamente
            const { data, error: justError } = await supabaseAdmin
                .from('justifications')
                .insert([{
                    student_id,
                    coordinator_id,
                    absence_date,
                    reason,
                    status: 'approved'
                }])
                .select()
                .single();

            if (justError) throw justError;

            // 3. Actualizar asistencia
            const { error: attError } = await supabaseAdmin
                .from('attendance')
                .update({ status: 'justified' })
                .eq('student_id', student_id)
                .eq('date', absence_date);

            if (attError) throw attError;

            res.status(201).json(data);
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
    },

    // --- Horarios de otros usuarios ---

    getTeacherSchedule: async (req, res) => {
        try {
            const { teacherId } = req.params;
            const { data, error } = await supabaseAdmin
                .from('schedules')
                .select('*, subjects(name), profiles!schedules_teacher_id_fkey(full_name)')
                .eq('teacher_id', teacherId)
                .order('day_of_week', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getStudentSchedule: async (req, res) => {
        try {
            const { studentId } = req.params;
            // Get student's grade and section
            const { data: student, error: studentError } = await supabaseAdmin
                .from('profiles')
                .select('grade, section')
                .eq('id', studentId)
                .single();

            if (studentError) throw studentError;

            const { data, error } = await supabaseAdmin
                .from('schedules')
                .select('*, subjects(name), profiles!schedules_teacher_id_fkey(full_name)')
                .eq('grade', student.grade)
                .eq('section', student.section)
                .order('day_of_week', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = coordinatorController;
