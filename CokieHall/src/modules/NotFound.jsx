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
  const heroRef = useRef(null);
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
    // Animación sutil de entrada única al cargar (sin loop de movimiento continuo)
    gsap.fromTo(
      heroRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }
    );
  }, { scope: containerRef });

  return (
    <div className="nf-page" ref={containerRef}>
      <Navbar />

      <main className="nf-main" id="main-content">
        <div className="nf-center-content" ref={heroRef}>
          
          {/* Columna Izquierda: 404, Texto y Botón */}
          <div className="nf-text-col">
            <div className="nf-number" aria-hidden="true">
              {t('notfound.number', '404')}
            </div>
            
            <h1 className="nf-heading">
              {t('notfound.title', 'Lo sentimos, no encontramos la página que buscas')}
            </h1>

            <Link to="/" className="nf-home-link">
              {t('notfound.homeBtn', 'Ir a la página principal ›')}
            </Link>
          </div>

          {/* Columna Derecha: Mascota Cokie estática y más grande */}
          <div className="nf-mascot-col">
            <img 
              src={notFoundImg} 
              alt="Mascota Cokie Hall 404" 
              className="nf-mascot-img"
              loading="eager"
              width="460"
              height="440"
            />
          </div>

        </div>

        {/* Sección Dato Curioso en la parte inferior */}
        <div className="nf-did-you-know">
          <h2 className="nf-dyk-title">
            {t('notfound.didYouKnowTitle', '¿Sabías que...?')}
          </h2>
          <p className="nf-dyk-text">
            {t('notfound.didYouKnowText', 'Los perros tienen un sentido del olfato entre 10,000 y 100,000 veces más potente que el humano, y son capaces de aprender y asociar más de 150 palabras y señales gestuales.')}
          </p>
        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}

export default NotFound;
