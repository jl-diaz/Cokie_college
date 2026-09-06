import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import Header from './modules/Header';
import AboutUs from './modules/aboutUs';
import LegalTerms from './modules/LegalTerms';
import './App.css';

gsap.registerPlugin(ScrollTrigger);

function ScrollHandler() {
  const location = useLocation();
  const lenisRef = useRef(null);

  useEffect(() => {
    // Inicializar Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.35,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothTouch: false,
      smooth: true,
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
    if (location.hash) {
      setTimeout(() => {
        const target = document.querySelector(location.hash);
        if (target && lenis) {
          lenis.scrollTo(target, { offset: -76, duration: 1.2 });
        }
      }, 350);
    } else {
      window.scrollTo(0, 0);
    }

    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 300);

    return () => {
      clearTimeout(refreshTimer);
      document.removeEventListener('click', handleAnchorClick);
      gsap.ticker.remove(rafCallback);
      lenis.destroy();
      lenisRef.current = null;
      window.__lenis = null;
    };
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollHandler />
      <Routes>
        <Route path="/" element={<Header />} />
        <Route path="/nosotros" element={<AboutUs />} />
        <Route path="/legal" element={<LegalTerms />} />
        {/* Fallback a home */}
        <Route path="*" element={<Header />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


