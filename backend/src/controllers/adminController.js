const { supabaseAdmin } = require('../config/supabase');
const { generateInstitutionalCode, generateRandomPassword } = require('../utils/codeGenerator');
const { sendWelcomeEmail } = require('../utils/emailService');

const adminController = {
    // --- Gestión de Usuarios ---
    
    getUsers: async (req, res) => {
        try {
            const { role, search } = req.query;
            let query = supabaseAdmin.from('profiles').select('*');

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

            const { data, error } = await query;
            if (error) throw error;

            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    createUser: async (req, res) => {
        try {
            const { full_name, email, role, grade, section, first_surname, second_surname, level } = req.body;
            const year = new Date().getFullYear();

            // Concatenar nombre completo para la DB si vienen por separado
            const combinedFullName = `${full_name} ${first_surname} ${second_surname}`.trim();

            // 1. Generar código y contraseña
            const institutional_code = generateInstitutionalCode(first_surname, second_surname, year);
            const password = generateRandomPassword();

            // 2. Crear usuario en Supabase Auth (Service Role)
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: combinedFullName, role }
            });

            if (authError) throw authError;

            // 3. Crear perfil en la tabla 'profiles'
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert([{
                    id: authUser.user.id,
                    full_name: combinedFullName,
                    email,
                    institutional_code,
                    role,
                    grade,
                    section,
                    level
                }])
                .select()
                .single();

            if (profileError) throw profileError;

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
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
            if (authError) throw authError;

            // El perfil se elimina por CASCADE en la DB
            res.json({ message: 'Usuario eliminado correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- Gestión de Catálogo de Conducta ---

    getConductCodes: async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin.from('conduct_codes').select('*');
            if (error) throw error;
            res.json(data);
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
    }
};

module.exports = adminController;
