const { supabase, supabaseAdmin } = require('../config/supabase');

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No se proporcionó un token de autorización' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error('Error de autenticación:', authError);
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        // Usamos supabaseAdmin para saltar RLS y asegurar que encontramos el perfil
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            console.error(`Perfil no encontrado para el usuario ID: ${user.id}. Error:`, profileError);
            return res.status(403).json({ 
                error: 'Perfil de usuario no encontrado',
                details: 'El usuario existe en Auth pero no se pudo recuperar su registro en la tabla profiles. Verifique que el UUID en la tabla coincida exactamente con el de Auth.',
                userId: user.id,
                dbError: profileError?.message
            });
        }

        req.user = { ...user, ...profile };
        next();
    } catch (error) {
        console.error('Error inesperado en middleware auth:', error);
        res.status(500).json({ error: 'Error interno del servidor en la autenticación' });
    }
};

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
        }
        next();
    };
};

module.exports = {
    authenticate,
    authorize
};
