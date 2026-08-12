const { supabaseAdmin } = require('../config/supabase');
const { generateInstitutionalCode, generateRandomPassword } = require('../utils/codeGenerator');
const { sendWelcomeEmail } = require('../utils/emailService');

const adminController = {
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
            // ── RetoFecha: Se incluye birth_date junto a materia_principal y demás campos ──
            const { full_name, email, role, grade, section, first_surname, second_surname, level, materia_principal, birth_date } = req.body;
            
            // Validación de campos requeridos
            if (!full_name || !email || !role) {
                return res.status(400).json({ error: 'El nombre completo, correo electrónico y rol son obligatorios.' });
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
            if (!computedLevel && grade) {
                const gradeNum = parseInt(grade);
                if (gradeNum >= 2 && gradeNum <= 6) {
                    computedLevel = 'Primaria';
                } else if (gradeNum >= 7 && gradeNum <= 11) {
                    computedLevel = 'Tercer Ciclo';
                }
            }

            // 3. Crear perfil en la tabla 'profiles' (incluyendo birth_date)
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
                    specialty_subject_id: role === 'teacher' ? (materia_principal || null) : null,
                    birth_date: birth_date || null
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
            const updates = req.body;

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
            const { page = 1, limit = 50 } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const from = (pageNum - 1) * limitNum;
            const to = from + limitNum - 1;

            const { data, count, error } = await supabaseAdmin
                .from('conduct_codes')
                .select('*', { count: 'exact' })
                .order('name', { ascending: true })
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
            const { code, name, description, category } = req.body;
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

    getSubjects: async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin.from('subjects').select('*');
            if (error) throw error;
            res.json(data);
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
    }
};

module.exports = adminController;
