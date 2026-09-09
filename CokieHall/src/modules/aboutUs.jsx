import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '../context/LanguageContext';

import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ScrollToTop from './ScrollToTop.jsx';

// Assets
import CokieAUS from '../assets/aboutUs/CokieAUS.png';
import presidentes from '../assets/aboutUs/CokieHallPresidentes.jpg';
import alexia from '../assets/aboutUs/Alexia.jpg';
import chicos from '../assets/aboutUs/chicos.jfif';
import downArrow from '../assets/aboutUs/down-arrow.png';
import kids1 from '../assets/kids1.png';
import cokieGrow from '../assets/aboutUs/CokieGrowing.png';
import graduacion from '../assets/aboutUs/graduacion.jfif';

import ninos from '../assets/ninos.png';
import CokieKids from '../assets/CokieKids.png';
import logoBlan from '../assets/logoBlan.png';


// Estilos
import './aboutUs.css';

gsap.registerPlugin(ScrollTrigger);

function AboutUs() {
  const containerRef = useRef(null);
  const { t, lang } = useLanguage();

  useGSAP(() => {
    // Parallax y rotación sutil en el collage de imágenes de historia
    const collageItems = gsap.utils.toArray('.history-collage-item');
    collageItems.forEach((item, index) => {
      gsap.to(item, {
        y: (index + 1) * -20,
        ease: 'none',
        scrollTrigger: {
          trigger: item,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2,
        },
      });
    });

    // Fade-in con subida suave en los bloques de texto
    const textBlocks = gsap.utils.toArray('.history-content-block, .clint-phrase-container, .clint-grid-box');
    textBlocks.forEach((block) => {
      gsap.fromTo(
        block,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: block,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

  }, { scope: containerRef });

  useEffect(() => {
    const prevTitle = document.title;
    document.title = lang === 'en' ? 'About Us | Cokie Hall' : 'Sobre Nosotros | Cokie Hall';

    let canonical = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonical ? canonical.getAttribute('href') : 'https://www.cokiehall.lat/';
    if (canonical) {
      canonical.setAttribute('href', 'https://www.cokiehall.lat/nosotros');
    }

    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute('content') : '';
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        lang === 'en'
          ? 'Discover the history, vision, values, and learning community of Cokie Hall. Empowering every student to grow.'
          : 'Conoce la historia, visión, valores y comunidad formativa de Cokie Hall. Acompañamos el crecimiento de cada estudiante.'
      );
    }

    let robotsMeta = document.querySelector('meta[name="robots"]');
    const prevRobots = robotsMeta ? robotsMeta.getAttribute('content') : null;
    if (robotsMeta) {
      robotsMeta.setAttribute('content', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    }

    return () => {
      document.title = prevTitle;
      if (canonical) canonical.setAttribute('href', prevCanonical);
      if (metaDesc && prevDesc) metaDesc.setAttribute('content', prevDesc);
      if (robotsMeta && prevRobots) robotsMeta.setAttribute('content', prevRobots);
    };
  }, [lang]);

  // Desplazamiento fluido hacia "Nuestra historia"
  const handleScrollToHistory = () => {
    const target = document.getElementById('nuestra-historia');
    if (window.__lenis && target) {
      window.__lenis.scrollTo(target, { offset: -40, duration: 1.4 });
    } else if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="clint-about-page" ref={containerRef}>
      <Navbar />

      {/* ===== SECCIÓN HERO (ESTILO CLINT CON FONDO CREMA/ARENA) ===== */}
      <section className="clint-hero-section">
        <div className="clint-hero-container">
          
          {/* Lado izquierdo: Título con inclinación + Subtítulo */}
          <div className="clint-hero-left">
            <h1 className="clint-hero-title">
              {t('aboutUs.heroTitle')} <br />
              <div className="hero-tilted-group">
                <span className="clint-capsule">{t('aboutUs.heroCapsule')}</span>
                <span className="clint-hero-line-break">
                  {t('aboutUs.heroLineBreak')} <span className="clint-underlined">{t('aboutUs.heroYoung')}</span>
                </span>
              </div>
            </h1>

            <p className="clint-hero-desc">
              {t('aboutUs.heroDesc')}
            </p>
          </div>

          {/* Lado derecho: Imagen personalizada sin borde redondeado ni sombra */}
          <div className="clint-hero-right">
            <div className="clint-hero-image-box">
              <img 
                src={cokieGrow} 
                alt="Nosotros Cokie Hall" 
                className="clint-hero-custom-img" 
              />
            </div>
          </div>

        </div>

        {/* Botón Conocer más en la unión entre el Header y la sección de información con downArrow */}
        <div className="clint-hero-seam-button-container">
          <button 
            type="button" 
            onClick={handleScrollToHistory} 
            className="clint-btn-learn-more"
            aria-label={t('aboutUs.learnMore')}
          >
            <img 
              src={downArrow} 
              alt="Icono flecha hacia abajo" 
              className="clint-btn-arrow-img" 
            />
            <span>{t('aboutUs.learnMore')}</span>
          </button>
        </div>
      </section>

      {/* ===== SECCIÓN: NUESTRA HISTORIA (FONDO AZUL MARINO) ===== */}
      <section id="nuestra-historia" className="clint-history-section">
        <div className="clint-history-container">
          
          {/* Columna Izquierda: Collage de 3 imágenes fusionadas al lateral izquierdo */}
          <div className="clint-history-left">
            <div className="history-collage-vertical">
              
              {/* Imagen 1: Inclinación hacia la derecha (+4.5deg) */}
              <div className="history-collage-item history-collage-item--1">
                <img 
                  src={kids1} 
                  alt="Estudiantes en actividades dinámicas" 
                  className="history-collage-img" 
                />
              </div>

              {/* Imagen 2: Inclinación un poco a la izquierda (-2.5deg) */}
              <div className="history-collage-item history-collage-item--2">
                <img 
                  src={alexia} 
                  alt="Acompañamiento y aprendizaje en el aula" 
                  className="history-collage-img" 
                />
              </div>

              {/* Imagen 3: Inclinación sí a la izquierda (-4deg) */}
              <div className="history-collage-item history-collage-item--3">
                <img 
                  src={chicos} 
                  alt="Comunidad estudiantil Cokie Hall" 
                  className="history-collage-img" 
                />
              </div>

            </div>
          </div>

          {/* Columna Derecha: Título rosado y contenido en blanco con padding a la derecha */}
          <div className="clint-history-right">
            <div className="history-content-block">
              
              <h2 className="history-pink-title">
                {t('aboutUs.historyPink')} <span className="history-title-white">{t('aboutUs.historyWhite')}</span> {t('aboutUs.historyGoals')}
              </h2>

              <div className="history-text-body">
                <p>
                  {t('aboutUs.historyP1_1')}{' '}
                  <span className="history-text-pink">{t('aboutUs.historyP1_highlight')}</span>.
                </p>

                <p>
                  {t('aboutUs.historyP2')}
                </p>

                <p>
                  {t('aboutUs.historyP3_1')}{' '}
                  <span className="history-text-pink">{t('aboutUs.historyP3_highlight')}</span>{' '}
                  {t('aboutUs.historyP3_2')}
                </p>
              </div>

            </div>
          </div>

        </div>

        
      </section>

      {/* ===== SECCIÓN: LOGO BLANCO Y FRASE ROMANA ===== */}
      <section className="clint-phrase-section">
        <div className="clint-phrase-container">
          <img src={logoBlan} alt="Cokie Hall Logo" className="clint-phrase-logo" />
          <h3 className="clint-phrase-text">
            {t('aboutUs.phrase')}
          </h3>
        </div>
      </section>

      <section className="clint-grid-section">
        <div className="clint-grid-container">
          
          <div className="clint-grid-row clint-grid-row-top">
            {/* Izquierda: Misión (Negro suave con borde inferior de nubes SVG perfecto) */}
            <div className="clint-grid-box clint-box-dark">
              <div className="clint-box-dark-inner">
                <p className="clint-box-subtitle">{t('aboutUs.missionSubtitle')}</p>
                <h3 className="clint-box-title">
                  {t('aboutUs.missionTitle')}
                </h3>
              </div>

              <svg 
                className="cloud-scallop-svg" 
                viewBox="0 0 800 24" 
                preserveAspectRatio="none" 
                aria-hidden="true"
              >
                <path 
                  d="M 0,0 
                     A 50,24 0 0,0 100,0 
                     A 50,24 0 0,0 200,0 
                     A 50,24 0 0,0 300,0 
                     A 50,24 0 0,0 400,0 
                     A 50,24 0 0,0 500,0 
                     A 50,24 0 0,0 600,0 
                     A 50,24 0 0,0 700,0 
                     A 50,24 0 0,0 800,0 
                     Z" 
                  fill="#1a1a1a" 
                />
              </svg>
            </div>
            
            <div className="clint-grid-box clint-box-img">
              <img src={presidentes} alt="Actividades de integración" className="clint-grid-img" />
            </div>
          </div>

          {/* Fila Inferior */}
          <div className="clint-grid-row clint-grid-row-bottom">
            <div className="clint-grid-box clint-box-img">
              <img src={graduacion} alt="Acompañamiento y valores" className="clint-grid-img clint-grid-img--graduacion" />
            </div>

            {/* Derecha: Visión y Otros (Dos bloques apilados) */}
            <div className="clint-grid-box clint-box-stacked">
              
              {/* Visión (Crema/Blanco) */}
              <div className="clint-subbox clint-subbox-light">
                <p className="clint-box-subtitle">{t('aboutUs.visionSubtitle')}</p>
                <h3 className="clint-box-title clint-text-navy">
                  {t('aboutUs.visionTitle')}
                </h3>
                <p className="clint-box-desc">
                  {t('aboutUs.visionDesc')}
                </p>
              </div>

              {/* Valores / Otros (Azul Marino) */}
              <div className="clint-subbox clint-subbox-navy">
                <p className="clint-box-subtitle">{t('aboutUs.valuesSubtitle')}</p>
                <h3 className="clint-box-title clint-text-white">
                  {t('aboutUs.valuesTitle')}<br />
                  {t('aboutUs.valuesSub')}
                </h3>
              </div>

            </div>
          </div>

        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
}

export default AboutUs;