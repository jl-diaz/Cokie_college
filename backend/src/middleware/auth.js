const { supabase, supabaseAdmin } = require('../config/supabase');

// Caché en memoria para perfiles autenticados (TTL: 60 segundos)
const profileCache = new Map();
const PROFILE_CACHE_TTL_MS = 60 * 1000;

const getCachedProfile = async (userId) => {
    const cached = profileCache.get(userId);
    const now = Date.now();
    if (cached && (now - cached.timestamp < PROFILE_CACHE_TTL_MS)) {
        return cached.profile;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (!profileError && profile) {
        profileCache.set(userId, { profile, timestamp: now });
        return profile;
    }

    return null;
};

const invalidateUserProfileCache = (userId) => {
    if (userId) profileCache.delete(userId);
    else profileCache.clear();
};

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No se proporcionó un token de autorización' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        const profile = await getCachedProfile(user.id);

        if (!profile) {
            return res.status(403).json({ 
                error: 'Perfil de usuario no encontrado. Por favor contacte al administrador.'
            });
        }

        if (profile.is_active === false) {
            return res.status(403).json({ 
                error: 'Tu cuenta ha sido desactivada. Por favor contacte al administrador.'
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
