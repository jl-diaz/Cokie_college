const { supabase, supabaseAdmin } = require('../config/supabase');

// Caché en memoria para perfiles autenticados (TTL: 60 segundos, Capacidad máx: 1000)
const profileCache = new Map();
const PROFILE_CACHE_TTL_MS = 60 * 1000;
const MAX_PROFILE_CACHE_SIZE = 1000;

// Caché en memoria para tokens validados (TTL: 45 segundos, Capacidad máx: 2000)
// Protege a Supabase Auth de saturación 429 durante picos de alto estrés escolar
const tokenCache = new Map();
const TOKEN_CACHE_TTL_MS = 45 * 1000;
const MAX_TOKEN_CACHE_SIZE = 2000;

const getCachedUser = async (token) => {
    const now = Date.now();
    const cached = tokenCache.get(token);
    if (cached && (now - cached.timestamp < TOKEN_CACHE_TTL_MS)) {
        return cached.user;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        tokenCache.delete(token);
        return null;
    }

    if (tokenCache.size >= MAX_TOKEN_CACHE_SIZE) {
        const firstKey = tokenCache.keys().next().value;
        if (firstKey) tokenCache.delete(firstKey);
    }
    tokenCache.set(token, { user, timestamp: now });
    return user;
};

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
        // Evitar crecimiento desmedido en memoria bajo alto estrés
        if (profileCache.size >= MAX_PROFILE_CACHE_SIZE) {
            const firstKey = profileCache.keys().next().value;
            if (firstKey) profileCache.delete(firstKey);
        }
        profileCache.set(userId, { profile, timestamp: now });
        return profile;
    }

    return null;
};

const invalidateUserProfileCache = (userId) => {
    if (userId) {
        profileCache.delete(userId);
    } else {
        profileCache.clear();
        tokenCache.clear();
    }
};

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No se proporcionó un token de autorización' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Formato de token de autorización inválido' });
    }
    
    try {
        const user = await getCachedUser(token);

        if (!user) {
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
    authorize,
    invalidateUserProfileCache
};
