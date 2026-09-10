import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useLanguage } from '../context/LanguageContext';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ScrollToTop from './ScrollToTop.jsx';
import notFoundImg from '../assets/Cokie404.png';
import './NotFound.css';

function NotFound() {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const imgRef = useRef(null);
  const { t, lang } = useLanguage();

  useEffect(() => {
    // Configurar título y meta robots para noindex en errores 404
    document.title = t('notfound.metaTitle', '404: Página no encontrada | Cokie Hall');
    
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://www.cokiehall.lat/');
    }

    let metaRobots = document.querySelector('meta[name="robots"]');
    const originalRobots = metaRobots ? metaRobots.getAttribute('content') : null;
    if (metaRobots) {
      metaRobots.setAttribute('content', 'noindex, follow');
    }

    window.scrollTo(0, 0);

    return () => {
      if (metaRobots && originalRobots) {
        metaRobots.setAttribute('content', originalRobots);
      }
    };
  }, [lang, t]);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(
      cardRef.current,
      { opacity: 0, y: 35, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.85 }
    );

    // Animación de levitación suave en la ilustración
    gsap.to(imgRef.current, {
      y: -12,
      rotation: 1.2,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }, { scope: containerRef });

  return (
    <div className="nf-page-wrapper" ref={containerRef}>
      <Navbar />

      <main className="nf-main" id="main-content">
        <div className="nf-container">
          <div className="nf-card" ref={cardRef}>
            
            {/* Columna de Ilustración */}
            <div className="nf-visual-col">
              <div className="nf-glow-circle" aria-hidden="true" />
              <div className="nf-img-frame" ref={imgRef}>
                <img 
                  src={notFoundImg} 
                  alt="Ilustración 404 Cokie Hall - Aula no encontrada" 
                  className="nf-illustration" 
                  loading="eager"
                  width="480"
                  height="480"
                />
              </div>
            </div>

            {/* Columna de Contenido */}
            <div className="nf-content-col">
              <div className="nf-badge">
                <span className="nf-badge-dot" />
                <span className="nf-badge-text">{t('notfound.badge', 'Error 404')}</span>
              </div>

              <h1 className="nf-title">
                {t('notfound.title', '¡Ups! Esta aula no fue encontrada')}
              </h1>

              <p className="nf-subtitle">
                {t('notfound.subtitle', 'Parece que la página que buscas no existe, cambió de ubicación o ha sido movida.')}
              </p>

              {/* Botón Principal al HOME requerido */}
              <div className="nf-actions">
                <Link to="/" className="nf-btn nf-btn--primary">
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="nf-btn-icon"
                  >
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span>{t('notfound.homeBtn', 'Volver al Inicio')}</span>
                </Link>

                <Link to="/nosotros" className="nf-btn nf-btn--secondary">
                  <span>{t('notfound.aboutBtn', 'Sobre Nosotros')}</span>
                </Link>
              </div>

              {/* Enlaces Rápidos de Navegación */}
              <div className="nf-quicklinks-section">
                <span className="nf-quicklinks-hint">
                  {t('notfound.hint', 'Puedes regresar a la página principal o explorar nuestras secciones destacadas:')}
                </span>
                <div className="nf-quicklinks-row">
                  <Link to="/#niveles" className="nf-quicklink-pill">
                    {t('notfound.levelsBtn', 'Oferta Educativa')}
                  </Link>
                  <Link to="/#app-download" className="nf-quicklink-pill">
                    {t('nav.app', 'Cokie College')}
                  </Link>
                  <Link to="/#contacto" className="nf-quicklink-pill">
                    {t('notfound.contactBtn', 'Contacto')}
                  </Link>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}

export default NotFound;
