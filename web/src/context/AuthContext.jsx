import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

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
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrCode, password) => {
    let emailToUse = (emailOrCode || '').trim();

    // Si no contiene '@', buscar el correo asociado al carnet/código institucional
    if (!emailToUse.includes('@')) {
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('email')
        .ilike('institutional_code', emailToUse)
        .maybeSingle();

      if (profileErr || !profileData?.email) {
        throw new Error('INVALID_CREDENTIALS');
      }
      emailToUse = profileData.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });
    if (error) throw error;

    // Verify role is super_admin or admin
    if (data.user) {
      const userProfile = await fetchProfile(data.user.id);
      if (userProfile && userProfile.role !== 'super_admin' && userProfile.role !== 'admin') {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        throw new Error('RESTRICTED_ROLE');
      }
    }
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
