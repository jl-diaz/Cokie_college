const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('[CRITICAL ERROR] Missing Supabase environment variables in Vercel! Please configure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in Vercel settings.');
}

const createProxyOrClient = (url, key, clientName) => {
    if (url && key) {
        return createClient(url, key);
    }
    return new Proxy({}, {
        get(target, prop) {
            if (prop === 'then') return undefined; // Avoid promise resolution issues
            return () => {
                throw new Error(`[Supabase Error] Tried to use '${clientName}.${String(prop)}', but environment variables (SUPABASE_URL / keys) are not set in Vercel Dashboard.`);
            };
        }
    });
};

const supabase = createProxyOrClient(supabaseUrl, supabaseAnonKey, 'supabase');
const supabaseAdmin = createProxyOrClient(supabaseUrl, supabaseServiceRoleKey, 'supabaseAdmin');

module.exports = {
    supabase,
    supabaseAdmin
};
