import { useState, useEffect } from 'react';
import './ScrollToTop.css';

function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = ({ scroll }) => {
      setIsVisible(scroll > 350);
    };

    const lenis = window.__lenis;
    if (lenis) {
      lenis.on('scroll', toggleVisibility);
    }

    return () => {
      if (lenis) {
        lenis.off('scroll', toggleVisibility);
      }
    };
  }, []);

  const scrollToTop = () => {
    if (window.__lenis) {
      window.__lenis.scrollTo(0, {
        duration: 1.4,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  return (
    <button
      className={`scroll-to-top-btn ${isVisible ? 'is-visible' : ''}`}
      onClick={scrollToTop}
      aria-label="Volver al inicio de la página"
    >
      {/* COLOCA TU PEQUEÑO ICONO AQUÍ ABAJO */}
      <span className="scroll-btn-icon-wrapper">
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="m18 15-6-6-6 6"/>
        </svg>
      </span>
    </button>
  );
}

export default ScrollToTop;
