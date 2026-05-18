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

            const { data, error } = await query;
            if (error) throw error;

            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    createUser: async (req, res) => {
        try {
            const { full_name, email, role, grade, section, first_surname, second_surname } = req.body;
            const year = new Date().getFullYear();

            // 1. Generar código y contraseña
            const institutional_code = generateInstitutionalCode(first_surname, second_surname, year);
            const password = generateRandomPassword();

            // 2. Crear usuario en Supabase Auth (Service Role)
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name, role }
            });

            if (authError) throw authError;

            // 3. Crear perfil en la tabla 'profiles'
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert([{
                    id: authUser.user.id,
                    full_name,
                    email,
                    institutional_code,
                    role,
                    grade,
                    section
                }])
                .select()
                .single();

            if (profileError) throw profileError;

            // 4. Enviar correo
            await sendWelcomeEmail(email, institutional_code, password);

            res.status(201).json({ 
                message: 'Usuario creado exitosamente', 
                profile,
                institutional_code,
                temp_password: password // En producción no devolver la contraseña en el body, solo enviarla por correo
            });
        } catch (error) {
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
            const { name, description, category } = req.body;
            const { data, error } = await supabaseAdmin
                .from('conduct_codes')
                .insert([{ name, description, category }])
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
    }
};

module.exports = adminController;
