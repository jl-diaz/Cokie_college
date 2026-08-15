import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Globe, Sun, Moon, ShieldAlert } from 'lucide-react';
import gsap from 'gsap';

const Login = () => {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const formRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(formRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
    );
  }, []);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('language', nextLang);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('login.fieldsRequired', 'Por favor completa todos los campos'));
      return;
    }
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      gsap.to(formRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        onComplete: () => navigate('/dashboard')
      });
    } catch (err) {
      if (err.message === 'RESTRICTED_ROLE') {
        setError(t('login.onlyAdminAllowed', 'Acceso restringido: La plataforma web es únicamente para Administradores y Superadmins.'));
      } else {
        setError(t('login.invalidCredentials', 'Credenciales inválidas o sin permisos de administrador.'));
      }
      gsap.fromTo(formRef.current, { x: -10 }, { x: 10, duration: 0.1, yoyo: true, repeat: 3 });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] dark:bg-[#0B0F19] overflow-hidden relative font-sans transition-colors duration-300">
      
      {/* Top Floating Utility Bar */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/20 text-xs font-bold transition-all"
        >
          <Globe className="w-4 h-4" />
          <span>{i18n.language?.toUpperCase() || 'ES'}</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/20 transition-all"
          title="Cambiar tema"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-white" />}
        </button>
      </div>

      {/* Hero Header with Layered Waves */}
      <div className="relative w-full h-[280px] md:h-[350px] shrink-0 bg-[#0B1956] dark:bg-[#080d24] flex flex-col justify-center items-center pb-12 transition-colors duration-300">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-bold mb-3 uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('login.subtitle', 'PLATAFORMA ADMINISTRATIVA')}</span>
        </div>
        <h1 className="text-white text-4xl md:text-5xl font-black tracking-tight">
          Cokie <span className="text-[#F6BE2F]">College</span>
        </h1>
        <p className="text-white/60 text-xs md:text-sm font-medium mt-1">
          {t('menu.superAdminPortal', 'Portal de Administración')}
        </p>

        {/* Waves SVG */}
        <div className="absolute bottom-[-1px] left-0 w-full overflow-hidden leading-[0]">
          <svg 
            viewBox="0 0 375 140" 
            preserveAspectRatio="none" 
            className="w-full h-[70px] md:h-[120px]"
          >
            <path
              d="M0,70 C90,130 285,40 375,100 L375,140 L0,140 Z"
              fill="rgba(255, 255, 255, 0.12)"
            />
            <path
              d="M0,90 C120,150 255,60 375,110 L375,140 L0,140 Z"
              fill={theme === 'dark' ? '#0B0F19' : '#F5F7FA'}
            />
          </svg>
        </div>
      </div>

      {/* Form Card */}
      <div className="flex-1 flex px-6 md:px-0 mt-[-30px] md:mt-[-80px] z-10 pb-12">
        <div 
          ref={formRef}
          className="bg-white dark:bg-[#13192B] rounded-[28px] px-6 py-8 md:px-10 md:py-10 shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-[450px] mx-auto h-fit transition-colors duration-300"
        >
          <h2 className="text-2xl md:text-[28px] font-black text-center text-[#0B1956] dark:text-[#F6BE2F] mb-1.5">
            {t('login.welcome', '¡Hola de nuevo!')}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
            {t('login.subWelcome', 'Ingresa con tu cuenta de Administrador')}
          </p>
          
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 p-3.5 rounded-2xl text-xs font-semibold text-center border border-rose-200 dark:border-rose-900/50 mb-5 flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                {t('login.emailLabel', 'Correo o Carnet Institucional')}
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-[#182038] focus:bg-white dark:focus:bg-[#1f294a] border border-slate-200 dark:border-slate-700 focus:border-[#0B1956] dark:focus:border-[#F6BE2F] rounded-2xl text-sm outline-none transition-all text-[#0B1956] dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  placeholder={t('login.emailPlaceholder', 'admin@cokiecollege.edu o DA26001')}
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                {t('login.passwordLabel', 'Contraseña')}
              </label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-[#182038] focus:bg-white dark:focus:bg-[#1f294a] border border-slate-200 dark:border-slate-700 focus:border-[#0B1956] dark:focus:border-[#F6BE2F] rounded-2xl text-sm outline-none transition-all text-[#0B1956] dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-[#0B1956] hover:bg-[#122473] dark:bg-[#F6BE2F] dark:hover:bg-[#f8ca53] text-white dark:text-[#0B1956] py-3.5 rounded-2xl text-sm font-bold tracking-wide transition-all active:scale-[0.98] mt-3 flex justify-center items-center shadow-lg shadow-indigo-900/10 dark:shadow-amber-500/10 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white dark:border-[#0B1956] border-t-transparent rounded-full animate-spin"></div>
              ) : t('login.loginBtn', 'Iniciar Sesión')}
            </button>
          </form>

          <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-6">
            © 2026 Cokie College System • Admin Web Portal
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
