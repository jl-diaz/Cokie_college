import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock } from 'lucide-react';
import gsap from 'gsap';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const formRef = useRef(null);

  useEffect(() => {
    // GSAP Animations
    const tl = gsap.timeline();
    tl.fromTo(formRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
    );
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor completa todos los campos');
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
      setError('Credenciales inválidas o error de conexión');
      gsap.fromTo(formRef.current, { x: -10 }, { x: 10, duration: 0.1, yoyo: true, repeat: 3 });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-app-bg overflow-hidden relative font-poppins">
      
      {/* Hero Header with Layered Waves */}
      <div className="relative w-full h-[260px] md:h-[350px] shrink-0 bg-primary flex flex-col justify-center items-center pb-10 shadow-elevated">
        <h1 className="text-white text-4xl md:text-5xl font-black tracking-tighter">
          Cokie <span className="text-white/90">College</span>
        </h1>
        <p className="text-white/60 text-[11px] md:text-xs font-bold tracking-[2px] mt-1.5 uppercase">
          Plataforma Estudiantil
        </p>

        {/* Waves SVG */}
        <div className="absolute bottom-[-1px] left-0 w-full overflow-hidden leading-[0]">
          <svg 
            viewBox="0 0 375 140" 
            preserveAspectRatio="none" 
            className="w-full h-[70px] md:h-[120px]"
          >
            {/* Decorative layer 1 */}
            <path
              d="M0,70 C90,130 285,40 375,100 L375,140 L0,140 Z"
              fill="rgba(255, 255, 255, 0.15)"
            />
            {/* Main curve layer */}
            <path
              d="M0,90 C120,150 255,60 375,110 L375,140 L0,140 Z"
              fill="#F5F7FA"
            />
          </svg>
        </div>
      </div>

      {/* Form Card */}
      <div className="flex-1 flex px-6 md:px-0 mt-[-30px] md:mt-[-80px] z-10 pb-10">
        <div 
          ref={formRef}
          className="bg-white rounded-[30px] px-6 py-8 md:px-10 md:py-10 shadow-elevated w-full max-w-[450px] mx-auto h-fit border border-white/20"
        >
          <h2 className="text-2xl md:text-[28px] font-extrabold text-center text-primary mb-1.5">
            ¡Hola de nuevo!
          </h2>
          <p className="text-[13px] md:text-sm text-muted text-center mb-7">
            Ingresa tus credenciales institucionales
          </p>
          
          {error && (
            <div className="bg-bad-bg text-bad p-3 rounded-xl text-[13px] font-semibold text-center border border-bad/20 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-[1px]">
                Correo Electrónico
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-[18px] py-3.5 bg-gray-50 focus:bg-white border-[1.5px] border-gray-200 focus:border-primary rounded-2xl text-[15px] outline-none transition-all text-primary font-semibold placeholder:text-muted/50"
                  placeholder="usuario@gmail.com"
                  autoCapitalize="none"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-[1px]">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-[18px] py-3.5 bg-gray-50 focus:bg-white border-[1.5px] border-gray-200 focus:border-primary rounded-2xl text-[15px] outline-none transition-all text-primary font-semibold placeholder:text-muted/50"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-primary text-white py-4 rounded-2xl text-[16px] font-bold tracking-[0.5px] transition-all active:scale-[0.98] mt-2 flex justify-center items-center shadow-elevated ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
            >
              {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

};

export default Login;
