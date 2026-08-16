import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import Header from './modules/Header';
import './App.css';

gsap.registerPlugin(ScrollTrigger);

function App() {
  const lenisRef = useRef(null);

  useEffect(() => {
    // ─── Lenis Smooth Scroll (FÍSICA IDÉNTICA A TU CÓDIGO) ───
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

    // Navegación suave para anclas (#)
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href !== '#' && href.startsWith('#')) {
          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            lenis.scrollTo(target, { offset: -76, duration: 1.5 });
          }
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);

    // Refrescar ScrollTrigger después del layout completo
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
  }, []);

  return (
    <>
      <Header />
    </>
  );
}

export default App;


