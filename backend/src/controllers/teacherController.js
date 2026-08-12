const { supabaseAdmin } = require('../config/supabase');
const { sendNotification } = require('../utils/notificationService');
const { getPeriodForDate } = require('../utils/periodHelper');

const fixMisassignedConductPeriods = async () => {
    try {
        const { data: periods } = await supabaseAdmin.from('academic_periods').select('*');
        if (!periods || periods.length === 0) return;

        for (const p of periods) {
            const startDateISO = `${p.start_date}T00:00:00.000Z`;
            const endDateISO = `${p.end_date}T23:59:59.999Z`;

            await supabaseAdmin
                .from('conduct_records')
                .update({ period: p.period_number })
                .gte('created_at', startDateISO)
                .lte('created_at', endDateISO)
                .neq('period', p.period_number);
        }
    } catch (e) {
        console.error('Error al corregir periodos de conducta:', e);
    }
};

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

    getClassrooms: async (req, res) => {
        try {
            const { level } = req.user;
            
            let studentGrades = level === 'Primaria' ? ['2', '3', '4', '5', '6'] : ['7', '8', '9'];

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

            let defaultSubjectId = null;
            const { data: firstSubject } = await supabaseAdmin
                .from('subjects')
                .select('id')
                .limit(1)
                .maybeSingle();

            if (firstSubject) {
                defaultSubjectId = firstSubject.id;
            }

            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

            const preparedAttendances = await Promise.all((attendances || []).map(async a => {
                const resolvedPeriod = (!a.period || Number(a.period) === 1) 
                    ? await getPeriodForDate(a.date || new Date())
                    : parseInt(a.period);

                const validSubjectId = isUUID(a.subject_id) ? a.subject_id : defaultSubjectId;
                const formattedDate = a.date ? new Date(a.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

                return {
                    student_id: a.student_id,
                    teacher_id,
                    subject_id: validSubjectId,
                    status: a.status || 'present',
                    period: resolvedPeriod,
                    date: formattedDate
                };
            }));

            let { data, error } = await supabaseAdmin
                .from('attendance')
                .upsert(preparedAttendances);

            if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
                console.warn('Teacher ID foreign key failed in attendance upsert, retrying without teacher_id:', error.message);
                const retryAttendances = preparedAttendances.map(a => {
                    const { teacher_id, ...rest } = a;
                    return rest;
                });
                const retry = await supabaseAdmin
                    .from('attendance')
                    .upsert(retryAttendances);
                error = retry.error;
            }

            if (error) {
                console.error('Error in registerAttendance:', error);
                return res.status(400).json({ error: error.message || 'No se pudo guardar la asistencia' });
            }
            res.json({ message: 'Asistencia registrada correctamente' });
        } catch (error) {
            console.error('Error in registerAttendance:', error);
            res.status(500).json({ error: error.message || 'Error interno al registrar la asistencia' });
        }
    },

    addConductRecord: async (req, res) => {
        try {
            const teacher_id = req.user.id;
            let { student_id, code_id, observation, period } = req.body;

            if (!student_id) {
                return res.status(400).json({ error: 'El ID de estudiante es obligatorio.' });
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
                    teacher_id, 
                    code_id: targetCodeId, 
                    observation: observation ? String(observation).trim() : null, 
                    period 
                }])
                .select();

            if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
                console.warn('Teacher ID foreign key failed in conduct_records, retrying without teacher_id:', error.message);
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
                console.error('Error inserting conduct record:', error);
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
                    console.error('Error sending conduct notification:', notifErr);
                }
            })();

            res.status(201).json(recordData);
        } catch (error) {
            console.error('CRITICAL Error in addConductRecord:', error);
            res.status(500).json({ error: error.message || 'Error al guardar el reporte de conducta' });
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

            const studentIds = students.map(s => s.id);
            if (studentIds.length === 0) {
                return res.json([]);
            }

            // 2. Obtener las notas existentes solo para los estudiantes de esta aula
            const { data: grades, error: gradeError } = await supabaseAdmin
                .from('grades')
                .select('*')
                .eq('subject_id', subject_id)
                .eq('activity_id', activity_id)
                .eq('period', period)
                .in('student_id', studentIds);

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

            if (!Array.isArray(grades) || grades.length === 0) {
                return res.status(400).json({ error: 'Debes proporcionar una lista válida de notas.' });
            }

            // Validar que cada nota esté en el rango 0.00 a 10.00
            for (const g of grades) {
                const numericGrade = parseFloat(g.grade);
                if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 10) {
                    return res.status(400).json({ 
                        error: `La calificación ${g.grade} es inválida. Cada nota debe ser un número entre 0.00 y 10.00.` 
                    });
                }
            }

            // Verificar si el periodo está activo o si el profesor tiene una extensión aprobada
            const permission = await checkTeacherPeriodPermission(teacher_id, period);
            if (!permission.allowed) {
                return res.status(403).json({ error: 'El periodo académico ha finalizado y no cuentas con un permiso de extensión activo.' });
            }

            // Usar upsert para insertar o actualizar notas
            const { data, error } = await supabaseAdmin
                .from('grades')
                .upsert(grades.map(g => ({ 
                    ...g, 
                    grade: parseFloat(g.grade),
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

            // Verificar si el periodo está activo o si el profesor tiene extensión aprobada
            const permission = await checkTeacherPeriodPermission(teacher_id, grade.period);
            if (!permission.allowed) {
                return res.status(403).json({ error: 'El periodo académico ha finalizado y no cuentas con un permiso de extensión activo.' });
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
    },

    getPeriodsStatus: async (req, res) => {
        try {
            const teacher_id = req.user.id;
            const { data: periods, error: periodsError } = await supabaseAdmin
                .from('academic_periods')
                .select('*')
                .order('period_number', { ascending: true });

            if (periodsError) throw periodsError;

            const { data: tickets, error: ticketsError } = await supabaseAdmin
                .from('grade_extension_tickets')
                .select('*')
                .eq('teacher_id', teacher_id)
                .order('created_at', { ascending: false });

            if (ticketsError && ticketsError.code !== 'PGRST205') throw ticketsError;

            const now = new Date();
            const result = (periods || []).map(p => {
                const periodEnd = new Date(p.end_date);
                periodEnd.setHours(23, 59, 59, 999);
                const hasExpired = now > periodEnd;

                const periodTickets = (tickets || []).filter(t => t.period === p.period_number);
                const activeTicket = periodTickets.find(t => t.status === 'approved' && t.approved_until && new Date(t.approved_until) >= now);
                const pendingTicket = periodTickets.find(t => t.status === 'pending');

                let effectiveDeadline = periodEnd;
                let isExtended = false;
                let canSubmit = false;

                if (!hasExpired) {
                    canSubmit = true;
                } else if (activeTicket) {
                    canSubmit = true;
                    effectiveDeadline = new Date(activeTicket.approved_until);
                    isExtended = true;
                }

                return {
                    period_number: p.period_number,
                    start_date: p.start_date,
                    end_date: p.end_date,
                    effective_deadline: effectiveDeadline.toISOString(),
                    can_submit: canSubmit,
                    is_extended: isExtended,
                    has_expired: hasExpired,
                    active_ticket: activeTicket || null,
                    pending_ticket: pendingTicket || null
                };
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    createTicket: async (req, res) => {
        try {
            const teacher_id = req.user.id;
            const level = req.user.level || 'Primaria';
            const { period, reason, days_requested } = req.body;

            if (![1, 3, 7].includes(Number(days_requested))) {
                return res.status(400).json({ error: 'La cantidad de días extra debe ser 1, 3 o 7 días.' });
            }

            if (!reason || !reason.trim()) {
                return res.status(400).json({ error: 'Debe ingresar una descripción de la razón del tiempo extra.' });
            }

            // Verificar que el periodo haya expirado
            const { data: periodInfo, error: periodError } = await supabaseAdmin
                .from('academic_periods')
                .select('*')
                .eq('period_number', period)
                .single();

            if (periodError) throw periodError;

            const now = new Date();
            const periodEnd = new Date(periodInfo.end_date);
            periodEnd.setHours(23, 59, 59, 999);

            if (now <= periodEnd) {
                return res.status(400).json({ error: 'El periodo aún está activo. No es necesario crear un ticket de extensión.' });
            }

            // Verificar si ya existe un ticket pendiente
            const { data: existingTicket } = await supabaseAdmin
                .from('grade_extension_tickets')
                .select('*')
                .eq('teacher_id', teacher_id)
                .eq('period', period)
                .eq('status', 'pending')
                .maybeSingle();

            if (existingTicket) {
                return res.status(400).json({ error: 'Ya existe una solicitud pendiente de revisión para este periodo.' });
            }

            const { data, error } = await supabaseAdmin
                .from('grade_extension_tickets')
                .insert([{
                    teacher_id,
                    period,
                    level,
                    reason: reason.trim(),
                    days_requested: Number(days_requested),
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) throw error;

            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getTeacherTickets: async (req, res) => {
        try {
            const teacher_id = req.user.id;
            const { data, error } = await supabaseAdmin
                .from('grade_extension_tickets')
                .select('*')
                .eq('teacher_id', teacher_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json(data || []);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

const checkTeacherPeriodPermission = async (teacher_id, period_number) => {
    const { data: periodInfo, error: periodError } = await supabaseAdmin
        .from('academic_periods')
        .select('*')
        .eq('period_number', period_number)
        .single();

    if (periodError || !periodInfo) {
        throw new Error('Periodo académico no encontrado');
    }

    const now = new Date();
    const periodEnd = new Date(periodInfo.end_date);
    periodEnd.setHours(23, 59, 59, 999);

    if (now <= periodEnd) {
        return { allowed: true, deadline: periodEnd, isExtended: false };
    }

    // Buscar ticket aprobado vigente para este profesor y periodo
    const { data: tickets, error: ticketError } = await supabaseAdmin
        .from('grade_extension_tickets')
        .select('*')
        .eq('teacher_id', teacher_id)
        .eq('period', period_number)
        .eq('status', 'approved')
        .order('approved_until', { ascending: false });

    if (!ticketError && tickets && tickets.length > 0) {
        const activeTicket = tickets.find(t => t.approved_until && new Date(t.approved_until) >= now);
        if (activeTicket) {
            return { allowed: true, deadline: new Date(activeTicket.approved_until), isExtended: true, ticket: activeTicket };
        }
    }

    return { allowed: false, deadline: periodEnd, isExtended: false };
};

module.exports = teacherController;
