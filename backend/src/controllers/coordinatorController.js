const { supabaseAdmin } = require('../config/supabase');
const { generateSchedule } = require('../utils/scheduleGenerator');
const { sendNotification } = require('../utils/notificationService');
const { getPeriodForDate } = require('../utils/periodHelper');

const ensureJustifiedAttendanceRecord = async (student_id, absence_date) => {
    try {
        const periodNum = await getPeriodForDate(absence_date);
        const { data: updated } = await supabaseAdmin
            .from('attendance')
            .update({ status: 'justified', period: periodNum })
            .eq('student_id', student_id)
            .eq('date', absence_date)
            .select();

        if (!updated || updated.length === 0) {
            const { data: firstSubject } = await supabaseAdmin
                .from('subjects')
                .select('id')
                .limit(1)
                .maybeSingle();

            if (firstSubject) {
                await supabaseAdmin
                    .from('attendance')
                    .insert([{
                        student_id,
                        subject_id: firstSubject.id,
                        status: 'justified',
                        period: periodNum,
                        date: absence_date
                    }]);
            }
        }
    } catch (e) {
        console.error('Error al asegurar registro de asistencia justificada:', e);
    }
};

const coordinatorController = {
    // --- Gestión de Estudiantes ---
    
    getStudents: async (req, res) => {
        try {
            const { level } = req.user; // 'Primaria' o 'Secundaria'
            const { grade, section } = req.query;

            let query = supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('role', 'student')
                .eq('is_active', true);

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
            let { period } = req.query;

            if (!period) {
                period = await getPeriodForDate(new Date());
            } else {
                period = parseInt(period);
            }

            let { data: conduct, error: conductError } = await supabaseAdmin
                .from('conduct_records')
                .select('*, conduct_codes(*)')
                .eq('student_id', studentId)
                .eq('period', period);

            if (conductError) {
                console.warn('Fallback in getStudentDiary: querying conduct_records and conduct_codes separately:', conductError.message);
                const { data: rawConduct } = await supabaseAdmin
                    .from('conduct_records')
                    .select('*')
                    .eq('student_id', studentId)
                    .eq('period', period);

                const { data: codes } = await supabaseAdmin
                    .from('conduct_codes')
                    .select('*');

                conduct = (rawConduct || []).map(r => ({
                    ...r,
                    conduct_codes: (codes || []).find(c => c.id === r.code_id) || null
                }));
            }

            let { data: attendance, error: attendanceError } = await supabaseAdmin
                .from('attendance')
                .select('*, subjects(name)')
                .eq('student_id', studentId)
                .eq('period', period);

            if (attendanceError) {
                console.warn('Fallback in getStudentDiary: querying attendance and subjects separately:', attendanceError.message);
                const { data: rawAttendance } = await supabaseAdmin
                    .from('attendance')
                    .select('*')
                    .eq('student_id', studentId)
                    .eq('period', period);

                const { data: subjects } = await supabaseAdmin
                    .from('subjects')
                    .select('id, name');

                attendance = (rawAttendance || []).map(a => ({
                    ...a,
                    subjects: (subjects || []).find(s => s.id === a.subject_id) || { name: 'Materia' }
                }));
            }

            // Incluir justificaciones aprobadas
            const { data: justifications } = await supabaseAdmin
                .from('justifications')
                .select('*')
                .eq('student_id', studentId)
                .eq('status', 'approved');

            const attendanceList = [...(attendance || [])];
            if (justifications) {
                for (const just of justifications) {
                    const justPeriod = await getPeriodForDate(just.absence_date);
                    if (justPeriod === period) {
                        const existingIndex = attendanceList.findIndex(a => a.date === just.absence_date);
                        if (existingIndex >= 0) {
                            attendanceList[existingIndex].status = 'justified';
                            attendanceList[existingIndex].coordinator_message = just.coordinator_message || just.reason;
                        } else {
                            attendanceList.push({
                                id: just.id,
                                student_id: just.student_id,
                                status: 'justified',
                                period: period,
                                date: just.absence_date,
                                created_at: just.created_at,
                                coordinator_message: just.coordinator_message || just.reason,
                                subjects: { name: 'Inasistencia Justificada' }
                            });
                        }
                    }
                }
            }

            res.json({ conduct, attendance: attendanceList });
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
            const { page = 1, limit = 50, category } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const from = (pageNum - 1) * limitNum;
            const to = from + limitNum - 1;

            let query = supabaseAdmin
                .from('conduct_codes')
                .select('*', { count: 'exact' });

            if (category) {
                query = query.eq('category', category);
            }

            const { data, count, error } = await query
                .order('code', { ascending: true })
                .range(from, to);
            
            if (error) throw error;
            res.json({
                data: data || [],
                total: count || 0,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil((count || 0) / limitNum)
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    addConductRecord: async (req, res) => {
        try {
            const coordinator_id = req.user.id;
            let { student_id, code_id, observation, period } = req.body;

            if (!student_id) {
                return res.status(400).json({ error: 'El ID de estudiante es obligatorio.' });
            }

            const coordinator_level = req.user.level;
            
            // Mitigación de BOLA: Verificar si el estudiante pertenece al nivel del coordinador
            const { data: studentProfile, error: studentError } = await supabaseAdmin
                .from('profiles')
                .select('grade')
                .eq('id', student_id)
                .single();

            if (studentError || !studentProfile) {
                return res.status(404).json({ error: 'Estudiante no encontrado.' });
            }

            const grade = studentProfile.grade;
            if (coordinator_level === 'Primaria' && !['1','2','3','4','5','6'].includes(grade)) {
                return res.status(403).json({ error: 'No tienes permiso para registrar conducta a estudiantes de este nivel.' });
            }
            if ((coordinator_level === 'Secundaria' || coordinator_level === 'Tercer Ciclo') && !['7','8','9','10','11'].includes(grade)) {
                return res.status(403).json({ error: 'No tienes permiso para registrar conducta a estudiantes de este nivel.' });
            }

            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

            let targetCodeId = typeof code_id === 'object' ? code_id?.id : code_id;

            if (!isUUID(targetCodeId)) {
                try {
                    const { data: codeByCode } = await supabaseAdmin
                        .from('conduct_codes')
                        .select('id')
                        .eq('code', String(targetCodeId || '').trim())
                        .maybeSingle();

                    if (codeByCode && codeByCode.id) {
                        targetCodeId = codeByCode.id;
                    } else {
                        const { data: fallbackCode } = await supabaseAdmin
                            .from('conduct_codes')
                            .select('id')
                            .limit(1)
                            .maybeSingle();
                        if (fallbackCode) targetCodeId = fallbackCode.id;
                    }
                } catch (codeErr) {
                    console.error('Error resolving conduct code:', codeErr);
                }
            }

            if (!targetCodeId || !isUUID(targetCodeId)) {
                return res.status(400).json({ error: 'Debes seleccionar un código de conducta válido.' });
            }

            if (!period || Number(period) === 1) {
                period = await getPeriodForDate(new Date());
            } else {
                period = parseInt(period);
            }

            let { data, error } = await supabaseAdmin
                .from('conduct_records')
                .insert([{
                    student_id,
                    teacher_id: coordinator_id,
                    code_id: targetCodeId,
                    observation: observation ? String(observation).trim() : null,
                    period
                }])
                .select();

            if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
                console.warn('Teacher ID foreign key failed in conduct_records for coordinator, retrying without teacher_id:', error.message);
                const retry = await supabaseAdmin
                    .from('conduct_records')
                    .insert([{ 
                        student_id, 
                        code_id: targetCodeId, 
                        observation: observation ? String(observation).trim() : null, 
                        period 
                    }])
                    .select();
                data = retry.data;
                error = retry.error;
            }

            if (error) {
                console.error('Error inserting conduct record from coordinator:', error);
                return res.status(400).json({ error: error.message || 'Error al guardar el reporte de conducta' });
            }

            const recordData = Array.isArray(data) ? data[0] : data;

            // Notificar al estudiante en segundo plano
            (async () => {
                try {
                    const { data: conductCode } = await supabaseAdmin
                        .from('conduct_codes')
                        .select('*')
                        .eq('id', targetCodeId)
                        .maybeSingle();

                    const categoryEmoji = conductCode?.category === 'Positivo' ? '⭐' : '⚠️';
                    const title = `${categoryEmoji} Reporte de Conducta (${conductCode?.category || 'Conducta'})`;
                    const body = `Se ha registrado el código "${conductCode?.code || ''} - ${conductCode?.name || 'Reporte de conducta'}". ${observation ? `Observación: ${observation}` : ''}`;

                    await sendNotification(student_id, title, body, { type: 'conduct', codeId: targetCodeId });
                } catch (notifErr) {
                    console.error('Error sending conduct notification from coordinator:', notifErr);
                }
            })();

            res.status(201).json(recordData);
        } catch (error) {
            console.error('CRITICAL Error in coordinator addConductRecord:', error);
            res.status(500).json({ error: error.message || 'Error al guardar el reporte de conducta' });
        }
    },

    // --- Gestión de Maestros ---
    getTeachers: async (req, res) => {
        try {
            const { level } = req.user;
            let query = supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('role', 'teacher')
                .eq('is_active', true);
            
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
            const { status, page = 1, limit = 50 } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const from = (pageNum - 1) * limitNum;
            const to = from + limitNum - 1;

            console.log('Fetching justifications for level:', level, 'status:', status);
            
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
                return res.json({ data: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 });
            }

            const studentIds = students.map(s => s.id);

            // 2. Obtener justificaciones con filtro por estado opcional y paginación
            let justQuery = supabaseAdmin
                .from('justifications')
                .select(`
                    *,
                    profiles:student_id (
                        full_name,
                        institutional_code
                    )
                `, { count: 'exact' })
                .in('student_id', studentIds);

            if (status) {
                justQuery = justQuery.eq('status', status);
            }

            justQuery = justQuery.order('created_at', { ascending: false }).range(from, to);

            const { data, count, error } = await justQuery;

            if (error) {
                console.error('Error fetching justifications from table:', error);
                throw error;
            }

            res.json({
                data: data || [],
                total: count || 0,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil((count || 0) / limitNum)
            });
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
            const coordinator_level = req.user.level;

            // 1. Validar IDOR (Propiedad del nivel)
            const { data: existingJust, error: existingErr } = await supabaseAdmin
                .from('justifications')
                .select('*, student:student_id(grade)')
                .eq('id', id)
                .single();

            if (existingErr || !existingJust) {
                return res.status(404).json({ error: 'Justificación no encontrada' });
            }

            const grade = existingJust.student?.grade;
            if (coordinator_level === 'Primaria' && !['1','2','3','4','5','6'].includes(grade)) {
                return res.status(403).json({ error: 'No tienes permiso para procesar justificaciones de este nivel' });
            }
            if ((coordinator_level === 'Secundaria' || coordinator_level === 'Tercer Ciclo') && !['7','8','9','10','11'].includes(grade)) {
                return res.status(403).json({ error: 'No tienes permiso para procesar justificaciones de este nivel' });
            }

            // 2. Actualizar solicitud
            const { data: justification, error: justError } = await supabaseAdmin
                .from('justifications')
                .update({ status, coordinator_message, coordinator_id })
                .eq('id', id)
                .select()
                .single();

            if (justError) throw justError;

            // 2. Si se aprueba, asegurar registro de asistencia justificada
            if (status === 'approved') {
                await ensureJustifiedAttendanceRecord(justification.student_id, justification.absence_date);
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

            // 3. Asegurar asistencia justificada
            await ensureJustifiedAttendanceRecord(student.id, absence_date);

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

            // 3. Asegurar asistencia justificada
            await ensureJustifiedAttendanceRecord(student_id, absence_date);

            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- Generador de Horarios ---

    generateScheduleProposal: async (req, res) => {
        try {
            const { level } = req.user;
            if (!level) {
                return res.status(400).json({ error: 'El coordinador no tiene un nivel asignado.' });
            }

            // Verificar si ya existe un horario guardado para los maestros de este nivel
            let teacherLevels = [level];
            if (level === 'Secundaria' || level === 'Tercer Ciclo') {
                teacherLevels = ['Secundaria', 'Tercer Ciclo'];
            }
            
            const { data: existingTeachers } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('role', 'teacher')
                .in('level', teacherLevels);
            
            if (existingTeachers && existingTeachers.length > 0) {
                const teacherIds = existingTeachers.map(t => t.id);
                const { data: existingSchedules } = await supabaseAdmin
                    .from('schedules')
                    .select('id')
                    .in('teacher_id', teacherIds)
                    .limit(1);

                if (existingSchedules && existingSchedules.length > 0) {
                    return res.status(400).json({ 
                        error: 'Ya existe un horario aprobado para este nivel. Elimínalo primero para generar uno nuevo.',
                        code: 'SCHEDULE_EXISTS'
                    });
                }
            }

            const proposal = await generateSchedule(level);
            res.json(proposal);
        } catch (error) {
            console.error('Error al generar propuesta de horario:', error);
            res.status(500).json({ error: error.message });
        }
    },

    applySchedule: async (req, res) => {
        try {
            const { proposal } = req.body;
            const { level } = req.user;

            if (!proposal || !Array.isArray(proposal)) {
                return res.status(400).json({ error: 'Propuesta inválida' });
            }

            // Opcional: Eliminar horarios anteriores para los salones/maestros de este nivel
            // Para simplificar, borramos los de los maestros de este nivel
            const { data: teachers } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('role', 'teacher')
                .eq('level', level);
            
            if (teachers && teachers.length > 0) {
                const teacherIds = teachers.map(t => t.id);
                await supabaseAdmin
                    .from('schedules')
                    .delete()
                    .in('teacher_id', teacherIds);
            }

            // Insertar nuevos
            // Cleanup proposal objects to match db schema
            const recordsToInsert = proposal.map(p => ({
                teacher_id: p.teacher_id,
                subject_id: p.subject_id,
                grade: p.grade,
                section: p.section,
                day_of_week: p.day_of_week,
                start_time: p.start_time,
                end_time: p.end_time
            }));

            const { data, error } = await supabaseAdmin
                .from('schedules')
                .insert(recordsToInsert)
                .select();

            if (error) throw error;
            res.status(201).json({ message: 'Horario aplicado correctamente', data });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteSchedule: async (req, res) => {
        try {
            const { level } = req.user;
            let teacherLevels = [level];
            if (level === 'Secundaria' || level === 'Tercer Ciclo') {
                teacherLevels = ['Secundaria', 'Tercer Ciclo'];
            }
            const { data: teachers } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('role', 'teacher')
                .in('level', teacherLevels);

            if (teachers && teachers.length > 0) {
                const teacherIds = teachers.map(t => t.id);
                const { error } = await supabaseAdmin
                    .from('schedules')
                    .delete()
                    .in('teacher_id', teacherIds);
                if (error) throw error;
            }
            res.json({ message: 'Horario eliminado exitosamente.' });
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
    },

    // --- Tickets de Extensión de Notas ---

    getGradeTickets: async (req, res) => {
        try {
            const { level } = req.user;
            const { page = 1, limit = 50 } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const from = (pageNum - 1) * limitNum;
            const to = from + limitNum - 1;

            let query = supabaseAdmin
                .from('grade_extension_tickets')
                .select(`
                    *,
                    teacher:teacher_id (
                        full_name,
                        email,
                        institutional_code,
                        level
                    )
                `, { count: 'exact' })
                .order('created_at', { ascending: false });

            if (level) {
                query = query.eq('level', level);
            }

            query = query.range(from, to);

            const { data, count, error } = await query;
            if (error && error.code !== 'PGRST205') throw error;

            res.json({
                data: data || [],
                total: count || 0,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil((count || 0) / limitNum)
            });
        } catch (error) {
            console.error('Error in getGradeTickets:', error);
            res.status(500).json({ error: error.message });
        }
    },

    processGradeTicket: async (req, res) => {
        try {
            const { id } = req.params;
            const { status, coordinator_message } = req.body; // 'approved' | 'rejected'
            const coordinator_id = req.user.id;

            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ error: 'Estado no válido' });
            }

            // 1. Obtener ticket actual y validar nivel (IDOR)
            const { data: ticket, error: ticketErr } = await supabaseAdmin
                .from('grade_extension_tickets')
                .select('*, teacher:teacher_id(level)')
                .eq('id', id)
                .single();

            if (ticketErr || !ticket) {
                return res.status(404).json({ error: 'Ticket no encontrado' });
            }

            const ticketLevel = ticket.level || ticket.teacher?.level;
            if (req.user.level && ticketLevel && req.user.level !== ticketLevel) {
                return res.status(403).json({ error: 'No tienes permiso para procesar tickets de este nivel' });
            }

            let approvedUntil = null;
            if (status === 'approved') {
                const now = new Date();
                now.setDate(now.getDate() + Number(ticket.days_requested));
                now.setHours(23, 59, 59, 999);
                approvedUntil = now.toISOString();
            }

            // 2. Actualizar ticket
            const { data: updatedTicket, error: updateErr } = await supabaseAdmin
                .from('grade_extension_tickets')
                .update({
                    status,
                    coordinator_id,
                    coordinator_message: coordinator_message ? coordinator_message.trim() : null,
                    approved_until: approvedUntil
                })
                .eq('id', id)
                .select(`
                    *,
                    teacher:teacher_id (
                        full_name,
                        email,
                        institutional_code
                    )
                `)
                .single();

            if (updateErr) throw updateErr;

            // 3. Notificar al profesor
            const isApp = status === 'approved';
            const notifTitle = isApp ? 'Ticket de Extensión Aprobado' : 'Ticket de Extensión Denegado';
            const notifBody = isApp 
                ? `Tu solicitud para el Periodo ${ticket.period} fue APROBADA. Tienes ${ticket.days_requested} día(s) adicionales para ingresar notas.`
                : `Tu solicitud para el Periodo ${ticket.period} fue DENEGADA.${coordinator_message ? ` Motivo: ${coordinator_message}` : ''}`;

            await sendNotification(ticket.teacher_id, notifTitle, notifBody, {
                type: 'grade_ticket',
                ticketId: id,
                status
            });

            res.json({ message: `Ticket ${status === 'approved' ? 'aprobado' : 'denegado'} correctamente`, ticket: updatedTicket });
        } catch (error) {
            console.error('Error in processGradeTicket:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = coordinatorController;
