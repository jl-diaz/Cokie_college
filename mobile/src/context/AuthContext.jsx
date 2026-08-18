import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import api from '../utils/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrCode, password) => {
    let emailToUse = (emailOrCode || '').trim();

    // Si no contiene '@', buscar el correo asociado al carnet/código institucional mediante el backend
    if (!emailToUse.includes('@')) {
      try {
        const res = await api.post('/admin/resolve-code', { code: emailToUse });
        if (res.data?.email) {
          emailToUse = res.data.email;
        } else {
          throw new Error('INVALID_CREDENTIALS');
        }
      } catch (codeErr) {
        // Fallback a consulta directa si el backend no responde
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .ilike('institutional_code', emailToUse)
          .maybeSingle();

        if (profileData?.email) {
          emailToUse = profileData.email;
        } else {
          throw new Error('INVALID_CREDENTIALS');
        }
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
