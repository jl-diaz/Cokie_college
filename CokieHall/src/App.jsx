import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import Header from './modules/Header';
import AboutUs from './modules/aboutUs';
import LegalTerms from './modules/LegalTerms';
import NotFound from './modules/NotFound';
import { LanguageProvider } from './context/LanguageContext';
import './App.css';

gsap.registerPlugin(ScrollTrigger);
if (typeof window !== 'undefined') {
  window.ScrollTrigger = ScrollTrigger;
}

function ScrollHandler() {
  const location = useLocation();
  const lenisRef = useRef(null);

  useEffect(() => {
    // Inicializar Lenis smooth scroll (efecto mantequilla garantizado)
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.05,
      touchMultiplier: 1.5,
      infinite: false,
      respectReducedMotion: false, // Asegura suavidad aún si el SO tiene 'reducir movimiento'
      autoResize: true,
    });

    lenisRef.current = lenis;
    window.__lenis = lenis;

    // Sincronizar Lenis ↔ GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    const rafCallback = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(rafCallback);
    gsap.ticker.lagSmoothing(0);

    // Navegación suave para anclas (# y /#)
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      let targetSelector = null;

      if (href.startsWith('#') && href !== '#') {
        targetSelector = href;
      } else if (href.startsWith('/#') && window.location.pathname === '/') {
        targetSelector = href.replace('/', '');
      }

      if (targetSelector) {
        const target = document.querySelector(targetSelector);
        if (target) {
          e.preventDefault();
          window.history.pushState(null, '', href);
          lenis.scrollTo(target, { offset: -76, duration: 1.5 });
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);

    // Manejar scroll inicial si se entra con hash (ej: /#niveles o /#contacto)
    let hashTimer1 = null;
    let hashTimer2 = null;

    if (location.hash) {
      const scrollToHash = (duration = 1.2) => {
        const target = document.querySelector(location.hash);
        if (target && lenis) {
          lenis.scrollTo(target, { offset: -76, duration });
        }
      };
      hashTimer1 = setTimeout(() => scrollToHash(1.2), 350);
      hashTimer2 = setTimeout(() => scrollToHash(0.8), 700);
    } else {
      window.scrollTo(0, 0);
    }

    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 300);

    return () => {
      if (hashTimer1) clearTimeout(hashTimer1);
      if (hashTimer2) clearTimeout(hashTimer2);
      clearTimeout(refreshTimer);
      document.removeEventListener('click', handleAnchorClick);
      gsap.ticker.remove(rafCallback);
      lenis.destroy();
      lenisRef.current = null;
      window.__lenis = null;
    };
  }, [location.pathname, location.hash]);

  return null;
}

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <ScrollHandler />
        <Routes>
          <Route path="/" element={<Header />} />
          <Route path="/nosotros" element={<AboutUs />} />
          <Route path="/legal" element={<LegalTerms />} />
          {/* Ruta 404 para cualquier URL no encontrada */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;


