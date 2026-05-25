const { supabaseAdmin } = require('../config/supabase');

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
            const { period } = req.query;

            // Obtener registros de conducta
            const { data: conduct, error: conductError } = await supabaseAdmin
                .from('conduct_records')
                .select(`
                    *,
                    conduct_codes(*),
                    maestro_aplicador:teacher_id (
                        id,
                        full_name,
                        materia_principal
                    )
                `)
                .eq('student_id', student_id)
                .eq('period', period || 1)
                .order('fecha_aplicacion', { ascending: false, nullsFirst: false });

            // Obtener asistencia
            const { data: attendance, error: attendanceError } = await supabaseAdmin
                .from('attendance')
                .select('*')
                .eq('student_id', student_id)
                .eq('period', period || 1);

            // Si hay error en conducta, registrar pero continuar
            if (conductError) {
                console.error('Conduct error:', conductError);
            }

            // Si hay error en asistencia, registrar pero continuar
            if (attendanceError) {
                console.error('Attendance error:', attendanceError);
            }

            // Formatear la respuesta de conducta según el requerimiento
            const formattedConduct = (conduct || []).map(record => {
                const names = record.maestro_aplicador?.full_name?.split(' ') || [];
                return {
                    id: record.id,
                    codigo: {
                        nombre: record.conduct_codes?.name,
                        descripcion: record.conduct_codes?.description,
                        nivel_gravedad: record.conduct_codes?.category
                    },
                    fecha_aplicacion: record.fecha_aplicacion,
                    maestro_aplicador: record.maestro_aplicador ? {
                        id: record.maestro_aplicador.id,
                        nombre: names[0] || 'N/A',
                        apellido: names.slice(1).join(' ') || 'N/A',
                        materia_principal: record.maestro_aplicador.materia_principal || 'No asignada'
                    } : null,
                    observacion: record.observation
                };
            });

            res.json({ conduct: formattedConduct, attendance: attendance || [] });
        } catch (error) {
            console.error('Diary error:', error);
            res.status(500).json({ error: error.message || 'Error al obtener el diario' });
        }
    },

    requestJustification: async (req, res) => {
        try {
            const student_id = req.user.id;
            const { absence_date, reason, evidence_url } = req.body;

            if (!absence_date || !reason) {
                return res.status(400).json({ error: 'Faltan campos obligatorios: absence_date, reason' });
            }

            const { data, error } = await supabaseAdmin
                .from('justifications')
                .insert([{
                    student_id,
                    absence_date,
                    reason,
                    evidence_url,
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
            const { grade, section } = req.user;

            // 1. Obtener todas las materias del horario
            const { data: scheduleData, error: scheduleError } = await supabaseAdmin
                .from('schedules')
                .select('subject_id, subjects(name)')
                .eq('grade', grade)
                .eq('section', section);

            if (scheduleError) throw scheduleError;

            const subjectMap = new Map();
            if (scheduleData) {
                scheduleData.forEach(s => {
                    if (s.subject_id && !subjectMap.has(s.subject_id)) {
                        subjectMap.set(s.subject_id, s.subjects?.name || 'Materia');
                    }
                });
            }

            // 2. Obtener promedios calculados por la vista
            let query = supabaseAdmin
                .from('student_averages')
                .select('*, subjects(name)')
                .eq('student_id', student_id);

            if (period) {
                query = query.eq('period', parseInt(period));
            }

            const { data: averageData, error: averageError } = await query;
            if (averageError) throw averageError;

            // 3. Combinar: Asegurar que todas las materias del horario tengan un promedio (aunque sea 0)
            const results = Array.from(subjectMap.entries()).map(([id, name]) => {
                const avg = (averageData || []).find(a => a.subject_id === id);
                return {
                    student_id,
                    subject_id: id,
                    period: parseInt(period) || 1,
                    final_average: avg ? parseFloat(avg.final_average) : 0,
                    subjects: { name }
                };
            });

            // Añadir materias que no están en el horario pero tienen notas
            const subjectIdsInSchedule = new Set(subjectMap.keys());
            const extraAverages = (averageData || []).filter(a => !subjectIdsInSchedule.has(a.subject_id));
            
            res.json([...results, ...extraAverages]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = studentController;
