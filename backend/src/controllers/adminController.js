const { supabaseAdmin } = require('../config/supabase');
const { generateInstitutionalCode, generateRandomPassword } = require('../utils/codeGenerator');
const { sendWelcomeEmail } = require('../utils/emailService');

const adminController = {
    // --- Resolución pública de Carnet / Código Institucional ---
    resolveInstitutionalCode: async (req, res) => {
        try {
            const { code } = req.body;
            if (!code || !String(code).trim()) {
                return res.status(400).json({ error: 'El código institucional es requerido' });
            }

            const { data: profile, error } = await supabaseAdmin
                .from('profiles')
                .select('email')
                .ilike('institutional_code', String(code).trim())
                .maybeSingle();

            if (error || !profile?.email) {
                return res.status(404).json({ error: 'Código institucional no encontrado' });
            }

            res.json({ email: profile.email });
        } catch (error) {
            console.error('Error al resolver código institucional:', error);
            res.status(500).json({ error: 'Error interno al resolver código' });
        }
    },

    // --- Gestión de Usuarios ---
    
    getUsers: async (req, res) => {
        try {
            const { role, search, page = 1, limit = 50 } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const from = (pageNum - 1) * limitNum;
            const to = from + limitNum - 1;

            let query = supabaseAdmin.from('profiles').select('*', { count: 'exact' });

            if (req.user.role !== 'super_admin') {
                query = query.eq('is_active', true);
            }

            if (role) {
                query = query.eq('role', role);
            }

            if (search) {
                query = query.or(`full_name.ilike.%${search}%,institutional_code.ilike.%${search}%`);
            }

            // Coordinator filter logic
            if (req.user.role === 'coordinator' && req.user.level) {
                if (req.user.level === 'Primaria') {
                    query = query.or('grade.in.(2,3,4,5,6),level.eq.Primaria');
                } else if (req.user.level === 'Tercer Ciclo') {
                    query = query.or('grade.in.(7,8,9),level.eq.Tercer Ciclo');
                }
            }

            query = query.order('created_at', { ascending: false }).range(from, to);

            const { data, count, error } = await query;
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

    createUser: async (req, res) => {
        try {
            const { full_name, email, role, grade, section, first_surname, second_surname, level, materia_principal } = req.body;
            
            // Validación de campos requeridos
            if (!full_name || !email || !role) {
                return res.status(400).json({ error: 'El nombre completo, correo electrónico y rol son obligatorios.' });
            }

            // Mitigación de Escalada de Privilegios: Los coordinadores solo pueden crear estudiantes o docentes
            if (req.user.role === 'coordinator') {
                if (['super_admin', 'coordinator', 'admin'].includes(role)) {
                    return res.status(403).json({ error: 'Un coordinador solo tiene autorización para registrar docentes y estudiantes.' });
                }
            }

            // Validar formato de correo electrónico
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'El correo electrónico ingresado tiene un formato inválido.' });
            }

            const year = new Date().getFullYear();

            // Concatenar nombre completo para la DB si vienen por separado
            const combinedFullName = `${full_name} ${first_surname || ''} ${second_surname || ''}`.trim();

            // 1. Generar código y contraseña
            const institutional_code = generateInstitutionalCode(first_surname || 'E', second_surname || 'S', year);
            const password = generateRandomPassword();

            // 2. Crear usuario en Supabase Auth (Service Role)
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: combinedFullName, role }
            });

            if (authError) throw authError;

            // Auto-asignar level según el grado
            let computedLevel = level || null;
            if (role === 'student' || (!computedLevel && grade)) {
                const gradeNum = parseInt(grade);
                if (gradeNum >= 2 && gradeNum <= 6) {
                    computedLevel = 'Primaria';
                } else if (gradeNum >= 7 && gradeNum <= 11) {
                    computedLevel = 'Tercer Ciclo';
                }
            }

            // 3. Crear perfil en la tabla 'profiles'
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert([{
                    id: authUser.user.id,
                    full_name: combinedFullName,
                    email,
                    institutional_code,
                    role,
                    grade: grade || null,
                    section: section || null,
                    level: computedLevel,
                    specialty_subject_id: role === 'teacher' ? (materia_principal || null) : null
                }])
                .select()
                .single();

            if (profileError) {
                console.error('Error al crear perfil en DB:', profileError);
                if (profileError.code === '22P02' || profileError.message?.includes('user_role')) {
                    return res.status(400).json({
                        error: "El rol 'cafetin' no existe aún en el tipo ENUM de tu base de datos Supabase. Ejecuta esta instrucción en el SQL Editor de Supabase:\n\nALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cafetin';"
                    });
                }
                throw profileError;
            }

            // 4. Enviar correo (Intentar enviar, pero no bloquear si falla)
            try {
                await sendWelcomeEmail(full_name, email, institutional_code, password);
            } catch (emailError) {
                console.error('Fallo no crítico al enviar email:', emailError);
            }

            res.status(201).json({ 
                message: 'Usuario creado exitosamente', 
                profile,
                institutional_code,
                temp_password: password
            });
        } catch (error) {
            console.error('Error al crear usuario:', error);
            res.status(500).json({ error: error.message });
        }
    },

    updateUser: async (req, res) => {
        try {
            const { id } = req.params;
            const updates = { ...req.body };

            // 1. Un admin no se puede quitar el rol a sí mismo
            if (req.user.id === id && updates.role && updates.role !== req.user.role) {
                return res.status(400).json({ error: 'No puedes modificar o remover tu propio rol de administrador.' });
            }

            // 2. Obtener el perfil objetivo para verificar permisos especiales
            const { data: targetProfile } = await supabaseAdmin
                .from('profiles')
                .select('id, role, full_name')
                .eq('id', id)
                .maybeSingle();

            // 3. Si un coordinador intenta modificar o promover cuentas administrativas
            if (req.user.role === 'coordinator') {
                if (targetProfile && ['super_admin', 'coordinator', 'admin'].includes(targetProfile.role)) {
                    return res.status(403).json({ error: 'Un coordinador no tiene permiso para modificar cuentas de administradores o coordinadores.' });
                }
                if (updates.role && ['super_admin', 'coordinator', 'admin'].includes(updates.role)) {
                    return res.status(403).json({ error: 'Un coordinador no puede otorgar roles de administrador o coordinador.' });
                }
            }

            // 4. Si se intenta desactivar a un admin
            if (targetProfile && (targetProfile.role === 'super_admin' || targetProfile.role === 'admin')) {
                if (updates.is_active === false) {
                    if (req.user.id === id) {
                        return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta.' });
                    }
                    if (req.user.full_name !== 'Administrador Principal') {
                        return res.status(403).json({ error: 'Solo el Administrador Principal puede desactivar a otros administradores.' });
                    }
                }
            }

            // 4. Auto-asignar level si es estudiante o se actualiza el grado
            if (updates.grade && (updates.role === 'student' || (!updates.level && targetProfile?.role === 'student'))) {
                const gradeNum = parseInt(updates.grade);
                if (gradeNum >= 2 && gradeNum <= 6) {
                    updates.level = 'Primaria';
                } else if (gradeNum >= 7 && gradeNum <= 11) {
                    updates.level = 'Tercer Ciclo';
                }
            }

            const { data, error } = await supabaseAdmin
                .from('profiles')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;

            // 1. No se puede desactivar a sí mismo
            if (req.user.id === id) {
                return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta.' });
            }

            // 2. Verificar si el usuario objetivo es admin
            const { data: targetProfile, error: fetchError } = await supabaseAdmin
                .from('profiles')
                .select('id, role, full_name')
                .eq('id', id)
                .maybeSingle();

            if (fetchError || !targetProfile) {
                return res.status(404).json({ error: 'Usuario no encontrado.' });
            }

            if (req.user.role === 'coordinator') {
                if (['super_admin', 'coordinator', 'admin'].includes(targetProfile.role)) {
                    return res.status(403).json({ error: 'Un coordinador no tiene permiso para desactivar administradores o coordinadores.' });
                }
            }

            if (targetProfile.role === 'super_admin' || targetProfile.role === 'admin') {
                if (req.user.full_name !== 'Administrador Principal') {
                    return res.status(403).json({ error: 'Solo el Administrador Principal puede desactivar a otros administradores.' });
                }
            }

            const { error } = await supabaseAdmin
                .from('profiles')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;
            res.json({ message: 'Usuario desactivado correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- Gestión de Catálogo de Conducta ---

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

    createConductCode: async (req, res) => {
        try {
            let { code, name, description, category } = req.body;

            // Si el código no viene definido, generarlo automáticamente según la categoría
            if (!code || !String(code).trim()) {
                const categoryPrefixMap = {
                    'Positivo': 'P',
                    'Leve': 'L',
                    'Grave': 'G',
                    'Muy Grave': 'MG'
                };
                const prefix = categoryPrefixMap[category] || 'C';

                const { data: existingCodes } = await supabaseAdmin
                    .from('conduct_codes')
                    .select('code')
                    .eq('category', category);

                let maxNumber = 0;
                if (existingCodes && existingCodes.length > 0) {
                    existingCodes.forEach(c => {
                        const match = String(c.code || '').match(/\d+/);
                        if (match) {
                            const num = parseInt(match[0], 10);
                            if (num > maxNumber) maxNumber = num;
                        }
                    });
                }
                const nextNum = String(maxNumber + 1).padStart(2, '0');
                code = `${prefix}${nextNum}`;
            } else {
                code = String(code).trim().toUpperCase();
            }

            const { data, error } = await supabaseAdmin
                .from('conduct_codes')
                .insert([{ code, name, description, category }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    updateConductCode: async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;
            const { data, error } = await supabaseAdmin
                .from('conduct_codes')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteConductCode: async (req, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabaseAdmin.from('conduct_codes').delete().eq('id', id);
            if (error) throw error;
            res.json({ message: 'Código de conducta eliminado' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- Asignación de Materias (Horarios) ---

    // Capacidad máxima de horas semanales de clase:
    // 25h jornada semanal (07:00 a 12:00 L-V) - 5h receso (1h diaria) = 20h netas de clase (40 bloques de 30 min)
    MAX_WEEKLY_HOURS: 20,

    getSubjects: async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin
                .from('subjects')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    createSubject: async (req, res) => {
        try {
            const { name, weekly_hours } = req.body;
            if (!name || !name.trim()) {
                return res.status(400).json({ error: 'El nombre de la materia es requerido' });
            }
            const hours = parseInt(weekly_hours, 10) || 1;
            if (hours < 1) {
                return res.status(400).json({ error: 'Las horas semanales deben ser al menos 1' });
            }

            // Validar capacidad semanal considerando recesos (máximo 20 horas de clase)
            const { data: existingSubjects, error: fetchErr } = await supabaseAdmin
                .from('subjects')
                .select('id, weekly_hours');
            if (fetchErr) throw fetchErr;

            const currentTotalHours = (existingSubjects || []).reduce((acc, s) => acc + (s.weekly_hours || 0), 0);
            const newTotalHours = currentTotalHours + hours;
            const MAX_HOURS = 20;

            if (newTotalHours > MAX_HOURS) {
                const remaining = Math.max(0, MAX_HOURS - currentTotalHours);
                return res.status(400).json({
                    error: `La suma total de horas semanales (${newTotalHours}h) excede el tiempo disponible de clase (máximo 20 horas netas semanales, considerando 25h de jornada menos 5h de receso). Horas disponibles restantes: ${remaining}h.`
                });
            }

            const { data, error } = await supabaseAdmin
                .from('subjects')
                .insert([{ name: name.trim(), weekly_hours: hours }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    updateSubject: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, weekly_hours } = req.body;

            const updateData = {};
            if (name !== undefined) {
                if (!name.trim()) return res.status(400).json({ error: 'El nombre no puede estar vacío' });
                updateData.name = name.trim();
            }

            if (weekly_hours !== undefined) {
                const hours = parseInt(weekly_hours, 10);
                if (isNaN(hours) || hours < 1) {
                    return res.status(400).json({ error: 'Las horas semanales deben ser al menos 1' });
                }

                // Validar capacidad semanal considerando recesos
                const { data: existingSubjects, error: fetchErr } = await supabaseAdmin
                    .from('subjects')
                    .select('id, weekly_hours');
                if (fetchErr) throw fetchErr;

                const currentOtherHours = (existingSubjects || [])
                    .filter(s => s.id !== id)
                    .reduce((acc, s) => acc + (s.weekly_hours || 0), 0);

                const newTotalHours = currentOtherHours + hours;
                const MAX_HOURS = 20;

                if (newTotalHours > MAX_HOURS) {
                    const remainingForThis = Math.max(0, MAX_HOURS - currentOtherHours);
                    return res.status(400).json({
                        error: `La suma total de horas semanales (${newTotalHours}h) excede el tiempo disponible de clase (máximo 20 horas netas semanales, considerando 25h de jornada menos 5h de receso). Máximo asignable a esta materia: ${remainingForThis}h.`
                    });
                }

                updateData.weekly_hours = hours;
            }

            const { data, error } = await supabaseAdmin
                .from('subjects')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteSubject: async (req, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabaseAdmin.from('subjects').delete().eq('id', id);
            if (error) throw error;
            res.json({ message: 'Materia eliminada correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    createSchedule: async (req, res) => {
        try {
            const { teacher_id, subject_id, grade, section, day_of_week, start_time, end_time } = req.body;
            const { data, error } = await supabaseAdmin
                .from('schedules')
                .insert([{ teacher_id, subject_id, grade, section, day_of_week, start_time, end_time }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- Periodos Académicos ---

    getAcademicPeriods: async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin
                .from('academic_periods')
                .select('*')
                .order('period_number', { ascending: true });

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    createAcademicPeriod: async (req, res) => {
        try {
            const { period_number, start_date, end_date } = req.body;
            const pNum = parseInt(period_number, 10);
            if (!pNum || pNum < 1) {
                return res.status(400).json({ error: 'El número de periodo debe ser un entero positivo' });
            }
            if (!start_date || !end_date) {
                return res.status(400).json({ error: 'Las fechas de inicio y fin son obligatorias' });
            }
            if (end_date < start_date) {
                return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio' });
            }

            const { data: existing, error: fetchErr } = await supabaseAdmin
                .from('academic_periods')
                .select('*');
            if (fetchErr) throw fetchErr;

            if (existing?.some(p => p.period_number === pNum)) {
                return res.status(400).json({ error: `El Periodo ${pNum} ya está registrado. Edítalo en su lugar.` });
            }

            // Validar que no haya coincidencia / solapamiento con ningún periodo existente
            const collision = existing?.find(p => start_date <= p.end_date && end_date >= p.start_date);
            if (collision) {
                return res.status(400).json({
                    error: `Las fechas seleccionadas coinciden o se solapan con el Periodo ${collision.period_number} (${collision.start_date} al ${collision.end_date}). Dos periodos no pueden coincidir.`
                });
            }

            const { data, error } = await supabaseAdmin
                .from('academic_periods')
                .insert([{ period_number: pNum, start_date, end_date }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    updateAcademicPeriod: async (req, res) => {
        try {
            const { period_number } = req.params;
            const pNum = parseInt(period_number, 10);
            const { start_date, end_date } = req.body;

            if (!start_date || !end_date) {
                return res.status(400).json({ error: 'Las fechas de inicio y fin son obligatorias' });
            }
            if (end_date < start_date) {
                return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio' });
            }

            const { data: existing, error: fetchErr } = await supabaseAdmin
                .from('academic_periods')
                .select('*');
            if (fetchErr) throw fetchErr;

            // Validar solapamiento con otros periodos (excluyendo el actual)
            const collision = existing?.find(p => p.period_number !== pNum && (start_date <= p.end_date && end_date >= p.start_date));
            if (collision) {
                return res.status(400).json({
                    error: `Las fechas seleccionadas coinciden o se solapan con el Periodo ${collision.period_number} (${collision.start_date} al ${collision.end_date}). Dos periodos no pueden coincidir.`
                });
            }

            const { data, error } = await supabaseAdmin
                .from('academic_periods')
                .update({ start_date, end_date })
                .eq('period_number', pNum)
                .select()
                .single();

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteAcademicPeriod: async (req, res) => {
        try {
            const { period_number } = req.params;
            const pNum = parseInt(period_number, 10);
            const { error } = await supabaseAdmin
                .from('academic_periods')
                .delete()
                .eq('period_number', pNum);

            if (error) throw error;
            res.json({ message: `Periodo ${pNum} eliminado correctamente` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = adminController;
