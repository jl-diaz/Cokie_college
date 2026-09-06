import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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

  useGSAP(() => {
    // Animación de aparición de las 3 imágenes del collage vertical
    const collageCards = gsap.utils.toArray('.history-collage-item');
    collageCards.forEach((card, index) => {
      const targetRotation = index === 0 ? 4.5 : index === 1 ? -2.5 : -4;
      
      gsap.fromTo(
        card,
        {
          opacity: 0,
          x: -60,
          y: 40,
          rotation: 0,
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          rotation: targetRotation,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // Animación para el contenido de texto en Nuestra Historia
    gsap.fromTo(
      '.history-content-block',
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.history-content-block',
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      }
    );

  }, { scope: containerRef });

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
              Nosotros <br />
              <div className="hero-tilted-group">
                <span className="clint-capsule">hacemos crecer</span> <br />
                a los <span className="clint-underlined">jovenes</span>
              </div>
            </h1>

            <p className="clint-hero-desc">
              Acompañamos a cada estudiante con metodologías modernas, valores sólidos y
              un entorno diseñado para descubrir y potenciar su verdadero talento.
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
            aria-label="Conocer más sobre nuestra historia"
          >
            <img 
              src={downArrow} 
              alt="Icono flecha hacia abajo" 
              className="clint-btn-arrow-img" 
            />
            <span>Conocer más</span>
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
                Nuestra historia <span className="history-title-white">impulsa nuevas</span> metas
              </h2>

              <div className="history-text-body">
                <p>
                  En Cokie Hall creemos que cada estudiante tiene un potencial extraordinario listo
                  para ser despertado. Enfrentamos los desafíos educativos del presente con un modelo
                  humano, cercano y enfocado en <span className="history-text-pink">brindar soluciones de aprendizaje significativas</span>.
                </p>

                <p>
                  A lo largo de nuestra trayectoria, hemos consolidado un equipo docente certificado,
                  apasionado y comprometido con la excelencia académica, integrando las mejores prácticas
                  pedagógicas para formar líderes con valores sólidos e integridad.
                </p>

                <p>
                  Nuestra misión fundamental es <span className="history-text-pink">acompañar a las familias</span> en el desarrollo integral
                  de sus hijos, preparándolos no solo para superar con éxito sus etapas escolares, sino para
                  transformar positivamente la sociedad del mañana.
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
            Creemos que la educación de calidad y en valores es el verdadero motor de cambio en la sociedad.
          </h3>
        </div>
      </section>

      <section className="clint-grid-section">
        <div className="clint-grid-container">
          
          <div className="clint-grid-row clint-grid-row-top">
            {/* Izquierda: Misión (Negro suave con borde inferior de nubes SVG perfecto) */}
            <div className="clint-grid-box clint-box-dark">
              <div className="clint-box-dark-inner">
                <p className="clint-box-subtitle">Nuestra misión</p>
                <h3 className="clint-box-title">
                  FORMAR LÍDERES<br />
                  COMPROMETIDOS,<br />
                  UNIDOS Y CON<br />
                  PENSAMIENTO CRÍTICO.
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
              <img src={graduacion} alt="Acompañamiento y valores" className="clint-grid-img" />
            </div>

            {/* Derecha: Visión y Otros (Dos bloques apilados) */}
            <div className="clint-grid-box clint-box-stacked">
              
              {/* Visión (Crema/Blanco) */}
              <div className="clint-subbox clint-subbox-light">
                <p className="clint-box-subtitle">Nuestra visión</p>
                <h3 className="clint-box-title clint-text-navy">
                  INNOVACIÓN,<br />
                  COMUNIDAD &<br />
                  EXCELENCIA.
                </h3>
                <p className="clint-box-desc">
                  Ser la institución educativa referente por nuestro enfoque humano e integral para el desarrollo de los futuros talentos.
                </p>
              </div>

              {/* Valores / Otros (Azul Marino) */}
              <div className="clint-subbox clint-subbox-navy">
                <p className="clint-box-subtitle">Nuestros valores</p>
                <h3 className="clint-box-title clint-text-white">
                  AQUÍ ESTAMOS PARA<br />
                  CAMBIAR EL MUNDO,<br />
                  y acompañar a las familias en cada paso.
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