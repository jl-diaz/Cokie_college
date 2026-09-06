const { supabaseAdmin } = require('../config/supabase');
const { getPeriodForDate } = require('../utils/periodHelper');
const { sendBulkNotification } = require('../utils/notificationService');
const { resolveJustificationSubjects } = require('../utils/justificationHelper');

const studentController = {
    getGrades: async (req, res) => {
        try {
            const student_id = req.user.id;
            const { period } = req.query;
            const { grade, section } = req.user;

            // Si el alumno no tiene grado o sección, no podemos buscar su horario de materias
            if (!grade || !section) {
                // Devolver solo las notas que ya tenga registradas si existen
                const { data: gradesData, error: gradesError } = await supabaseAdmin
                    .from('grades')
                    .select('*, subjects(name), evaluation_activities(name, percentage)')
                    .eq('student_id', student_id)
                    .eq('period', period || 1);
                
                if (gradesError) throw gradesError;
                return res.json(gradesData);
            }

            // 1. Obtener todas las materias asignadas al grado/sección del alumno
            const { data: scheduleData, error: scheduleError } = await supabaseAdmin
                .from('schedules')
                .select('subject_id, subjects(name)')
                .eq('grade', grade)
                .eq('section', section);

            if (scheduleError) throw scheduleError;

            // Obtener lista única de materias del horario
            const uniqueSubjects = [];
            const subjectMap = new Map();
            if (scheduleData) {
                scheduleData.forEach(s => {
                    if (s.subject_id && !subjectMap.has(s.subject_id)) {
                        subjectMap.set(s.subject_id, true);
                        uniqueSubjects.push({
                            id: s.subject_id,
                            name: s.subjects?.name || 'Materia'
                        });
                    }
                });
            }

            // 2. Obtener las notas existentes
            let gradesQuery = supabaseAdmin
                .from('grades')
                .select('*, subjects(name), evaluation_activities(name, percentage)')
                .eq('student_id', student_id);

            if (period) {
                gradesQuery = gradesQuery.eq('period', period);
            }

            const { data: gradesData, error: gradesError } = await gradesQuery;
            if (gradesError) throw gradesError;

            // 3. Combinar: Asegurar que cada materia del horario aparezca
            const result = uniqueSubjects.map(subject => {
                const subjectGrades = (gradesData || []).filter(g => g.subject_id === subject.id);
                
                if (subjectGrades.length > 0) {
                    return subjectGrades;
                } else {
                    return [{
                        id: `temp-${subject.id}`,
                        student_id,
                        subject_id: subject.id,
                        subjects: { name: subject.name },
                        grade: "No asignada",
                        period: parseInt(period) || 1,
                        evaluation_activities: { name: "Pendiente", percentage: 0 }
                    }];
                }
            }).flat();

            // También incluir notas de materias que NO están en el horario actual pero tienen notas registradas
            const subjectIdsInSchedule = new Set(uniqueSubjects.map(s => s.id));
            const extraGrades = (gradesData || []).filter(g => !subjectIdsInSchedule.has(g.subject_id));
            
            res.json([...result, ...extraGrades]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getDiary: async (req, res) => {
        try {
            const student_id = req.user.id;
            let { period } = req.query;

            if (!period) {
                period = await getPeriodForDate(new Date());
            } else {
                period = parseInt(period);
            }

            let { data: conduct, error: conductError } = await supabaseAdmin
                .from('conduct_records')
                .select('*, conduct_codes(*), teacher:profiles!conduct_records_teacher_id_fkey(id, full_name, role)')
                .eq('student_id', student_id)
                .eq('period', period);

            if (conductError) {
                console.warn('Fallback in getDiary: querying conduct_records and conduct_codes separately:', conductError.message);
                const { data: rawConduct } = await supabaseAdmin
                    .from('conduct_records')
                    .select('*')
                    .eq('student_id', student_id)
                    .eq('period', period);

                const { data: codes } = await supabaseAdmin
                    .from('conduct_codes')
                    .select('*');

                const teacherIds = [...new Set((rawConduct || []).map(r => r.teacher_id).filter(Boolean))];
                let teachers = [];
                if (teacherIds.length > 0) {
                    const { data: teacherProfiles } = await supabaseAdmin
                        .from('profiles')
                        .select('id, full_name, role')
                        .in('id', teacherIds);
                    teachers = teacherProfiles || [];
                }

                conduct = (rawConduct || []).map(r => ({
                    ...r,
                    conduct_codes: (codes || []).find(c => c.id === r.code_id) || null,
                    teacher: teachers.find(t => t.id === r.teacher_id) || null
                }));
            }

            let { data: attendance, error: attendanceError } = await supabaseAdmin
                .from('attendance')
                .select('*, subjects(name)')
                .eq('student_id', student_id)
                .eq('period', period);

            if (attendanceError) {
                console.warn('Fallback in getDiary: querying attendance and subjects separately:', attendanceError.message);
                const { data: rawAttendance } = await supabaseAdmin
                    .from('attendance')
                    .select('*')
                    .eq('student_id', student_id)
                    .eq('period', period);

                const { data: subjects } = await supabaseAdmin
                    .from('subjects')
                    .select('id, name');

                attendance = (rawAttendance || []).map(a => ({
                    ...a,
                    subjects: (subjects || []).find(s => s.id === a.subject_id) || { name: 'Materia' }
                }));
            }

            // Incluir solicitudes de justificación APROBADAS para este periodo
            const { data: justifications } = await supabaseAdmin
                .from('justifications')
                .select('*')
                .eq('student_id', student_id)
                .eq('status', 'approved');

            let attendanceList = [...(attendance || [])];
            if (justifications) {
                for (const just of justifications) {
                    const justPeriod = await getPeriodForDate(just.absence_date);
                    if (justPeriod === period) {
                        const rawReason = just.coordinator_message || just.reason || '';
                        const resolved = await resolveJustificationSubjects(student_id, just.absence_date, rawReason);

                        const existingIndices = [];
                        attendanceList.forEach((a, idx) => {
                            if (a.date === just.absence_date) existingIndices.push(idx);
                        });

                        if (existingIndices.length > 0) {
                            if (resolved.isFullDay) {
                                // Para día completo, consolidamos en un solo registro que diga 'Día completo'
                                const firstIdx = existingIndices[0];
                                attendanceList[firstIdx].status = 'justified';
                                attendanceList[firstIdx].coordinator_message = rawReason;
                                attendanceList[firstIdx].subjects = { name: 'Día completo' };
                                // Remover otros registros duplicados del mismo día
                                for (let i = existingIndices.length - 1; i > 0; i--) {
                                    attendanceList.splice(existingIndices[i], 1);
                                }
                            } else {
                                existingIndices.forEach(idx => {
                                    attendanceList[idx].status = 'justified';
                                    attendanceList[idx].coordinator_message = rawReason;
                                    attendanceList[idx].subjects = { name: resolved.title };
                                });
                            }
                        } else {
                            attendanceList.push({
                                id: just.id,
                                student_id: just.student_id,
                                status: 'justified',
                                period: period,
                                date: just.absence_date,
                                created_at: just.created_at,
                                coordinator_message: rawReason,
                                subjects: { name: resolved.title || 'Inasistencia Justificada' }
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

    requestJustification: async (req, res) => {
        try {
            const student_id = req.user.id;
            const student_level = req.user.level || 'Primaria';
            const { absence_date, reason, evidence_url } = req.body;

            if (!absence_date || !reason || !reason.trim()) {
                return res.status(400).json({ error: 'La fecha de ausencia y el motivo son obligatorios.' });
            }

            const inputDate = new Date(absence_date);
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            if (inputDate > today) {
                return res.status(400).json({ error: 'La fecha de inasistencia no puede ser una fecha futura.' });
            }

            const { data, error } = await supabaseAdmin
                .from('justifications')
                .insert([{
                    student_id,
                    absence_date,
                    reason: reason.trim(),
                    evidence_url: evidence_url || null,
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) throw error;

            // Notify coordinators of the same level
            try {
                const { data: coordinators } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('role', 'coordinator')
                    .eq('level', student_level);

                if (coordinators && coordinators.length > 0) {
                    const studentName = req.user.full_name || 'Un estudiante';
                    const title = 'Nueva justificación de inasistencia';
                    const body = `${studentName} ha enviado una justificación para revisión.`;
                    
                    const coordIds = coordinators.map(c => c.id);
                    await sendBulkNotification(
                        coordIds,
                        title,
                        body,
                        { type: 'justification', justificationId: data.id }
                    );
                }
            } catch (notifErr) {
                console.error('Error sending notification for new justification:', notifErr);
            }

            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getJustificationRequests: async (req, res) => {
        try {
            const student_id = req.user.id;
            const { data, error } = await supabaseAdmin
                .from('justifications')
                .select('*')
                .eq('student_id', student_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getSchedule: async (req, res) => {
        try {
            const { grade, section } = req.user;
            const { data, error } = await supabaseAdmin
                .from('schedules')
                .select('*, subjects(name), profiles!schedules_teacher_id_fkey(full_name)')
                .eq('grade', grade)
                .eq('section', section)
                .order('day_of_week', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getAverages: async (req, res) => {
        try {
            const student_id = req.user.id;
            const { period } = req.query;

            let query = supabaseAdmin
                .from('student_averages')
                .select('*, subjects(name)')
                .eq('student_id', student_id);

            if (period) {
                query = query.eq('period', parseInt(period));
            }

            const { data, error } = await query;

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = studentController;
