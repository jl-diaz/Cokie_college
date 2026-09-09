import { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Incrementador from '../modulesReactBits/incrementador.jsx';
import ScrollReveal from '../modulesReactBits/ScrollReveal.jsx';
import StrokeText from './StrokeText';
import FoldText from '../modulesReactBits/FoldText';
import TextLoop from '../modulesReactBits/TextLoop';
//import de las imagenes de estudiantes
import ninos from '../assets/ninos.png';
import birrete from '../assets/birrete.png';
import ac from '../assets/ac.png';
import arte from '../assets/arte.png';
import pizarra from '../assets/pizarra.png';
import futb from '../assets/futb.png';import kids1 from '../assets/kids1.png'
import CokieHall from '../assets/CokieHall.png';
import Cokie1 from '../assets/Cokie1.png';
import imagen1 from '../assets/educacionCalidad.png';
import imagen2 from '../assets/5.png';
import imagen4 from '../assets/4.png';
import imagen3 from '../assets/play.png';


//Acaba el import de imagenes

//import del menu hamburguesa
import StaggeredMenu from '../modulesReactBits/StaggeredMenu';

//import ninoInscripcion from '../assets/nino-inscripcion.png'; 

import Navbar from './Navbar.jsx';
import HorizontalScroll from './HorizontalScroll.jsx';
import AppDownload from './AppDownload.jsx';
import Footer from './Footer.jsx';
import ScrollToTop from './ScrollToTop.jsx';
import DownloadButton from './DownloadButton.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

import './Hero.css';
import './Header.css';

gsap.registerPlugin(ScrollTrigger);

function Header() {
  const mainRef = useRef(null);
  const location = useLocation();
  const { t, lang } = useLanguage();

  useEffect(() => {
    const isEn = lang === 'en';
    let pageTitle = isEn 
      ? 'Cokie Hall | Educational Institution and Academic Community'
      : 'Cokie Hall | Institución Educativa y Comunidad Académica';
    let canonicalUrl = 'https://www.cokiehall.lat/';
    let metaDescription = isEn
      ? 'Cokie Hall is an educational community committed to academic excellence, human values, and comprehensive education for Elementary and Middle School.'
      : 'Cokie Hall es una comunidad educativa comprometida con la excelencia académica, valores y formación integral para Primaria y Tercer Ciclo. Conoce nuestra oferta académica y descarga Cokie College.';

    if (location.pathname === '/contacto') {
      pageTitle = isEn ? 'Contact | Cokie Hall' : 'Contacto | Cokie Hall';
      canonicalUrl = 'https://www.cokiehall.lat/contacto';
      metaDescription = isEn
        ? 'Contact details, phone, email, schedule, and location of Cokie Hall.'
        : 'Información de contacto, teléfono, correo institucional, horarios y atención a familias en Cokie Hall.';
    } else if (location.pathname === '/niveles') {
      pageTitle = isEn ? 'Educational Offer | Cokie Hall' : 'Oferta Educativa | Cokie Hall';
      canonicalUrl = 'https://www.cokiehall.lat/niveles';
      metaDescription = isEn
        ? 'Explore Elementary, Middle School, and Sports Clubs at Cokie Hall.'
        : 'Descubre los niveles educativos de Primaria, Tercer Ciclo y Clubes Deportivos de Cokie Hall.';
    }

    document.title = pageTitle;

    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', canonicalUrl);
    }
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', metaDescription);
    }
  }, [lang, location.pathname]);

  useGSAP(() => {
    const reveals = gsap.utils.toArray('.reveal');
    reveals.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    const leftImgs = gsap.utils.toArray('.side-img-left');
    leftImgs.forEach((el, index) => {
      gsap.fromTo(
        el,
        {
          opacity: 0.1,
          filter: 'blur(8px)',
          x: -70,
          scale: 0.85,
          rotation: index === 0 ? -8 : 6,
        },
        {
          opacity: 1,
          filter: 'blur(0px)',
          x: 0,
          scale: 1,
          rotation: index === 0 ? -5 : 5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            end: 'top 35%',
            scrub: 1,
          },
        }
      );
    });

    const rightImgs = gsap.utils.toArray('.side-img-right');
    rightImgs.forEach((el, index) => {
      gsap.fromTo(
        el,
        {
          opacity: 0.1,
          filter: 'blur(8px)',
          x: 70,
          scale: 0.85,
          rotation: index === 0 ? 8 : -6,
        },
        {
          opacity: 1,
          filter: 'blur(0px)',
          x: 0,
          scale: 1,
          rotation: index === 0 ? 5 : -5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            end: 'top 35%',
            scrub: 1,
          },
        }
      );
    });

    // Animación para los 4 cuadros de "Nosotros hacemos la diferencia"
    // Aparecen primero dos y luego los otros dos con fade desde fuera de la pantalla
    const tlDiferenciadores = gsap.timeline({
      scrollTrigger: {
        trigger: '.seccion-diferenciadores',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });

    tlDiferenciadores
      .fromTo(
        '.diferenciador-cuadro-pair1',
        { opacity: 0, x: -140, scale: 0.9 },
        { opacity: 1, x: 0, scale: 1, duration: 0.9, stagger: 0.2, ease: 'power3.out' }
      )
      .fromTo(
        '.diferenciador-cuadro-pair2',
        { opacity: 0, x: 140, scale: 0.9 },
        { opacity: 1, x: 0, scale: 1, duration: 0.9, stagger: 0.2, ease: 'power3.out' },
        '-=0.4'
      );
  }, { scope: mainRef });

  
  const imagenesIzquierda = [
    { id: 'izq-1', src: futb, alt: 'Estudiante 1 (Izquierda Superior)' },
    { id: 'izq-2', src: kids1, alt: 'Estudiante 2 (Izquierda Inferior)' },
  ];

  const imagenesDerecha = [
    { id: 'der-1', src: ninos, alt: 'Estudiante 3 (Derecha Superior)' },
    { id: 'der-2', src: CokieHall, alt: 'Estudiante 4 (Derecha Inferior)' },
  ];

    const diferenciadores = [
    { icono: birrete, titulo: t('diferenciadores.quality') },
    { icono: ac, titulo: t('diferenciadores.support') },
    { icono: pizarra, titulo: t('diferenciadores.play') },
    { icono: arte, titulo: t('diferenciadores.art') },
    ]; 
    const imagenesHS = [
    { icono: imagen1, titulo: t('diferenciadores.quality') },
    { icono: imagen2, titulo: t('diferenciadores.support') },
    { icono: imagen3, titulo: t('diferenciadores.play') },
    { icono: imagen4, titulo: t('diferenciadores.art') },
    ]; const cifras = [
    { numero: '1,180+', etiqueta: t('stats.students'), icono: birrete },
    { numero: '68', etiqueta: t('stats.teachers'), icono: ac },
    { numero: '24', etiqueta: t('stats.staff'), icono: pizarra },
    { numero: '45+', etiqueta: t('stats.years'), icono: arte },
  ];

  return (
    <>
      {/* ===== HEADER / NAVBAR INSTITUCIONAL ===== */}
      <Navbar />

      <main ref={mainRef} style={{ position: 'relative', width: '100%' }}>
        {/* ===== HERO ===== */}
        <div id="hero" className="hero-container" style={{ height: '100vh' }}>
          <div className="hero-content">
            <h1 className="hero-title-h1" style={{ margin: 0, padding: 0, lineHeight: 1, fontSize: 'inherit', fontWeight: 'inherit', display: 'flex', justifyContent: 'center' }}>
              <StrokeText
                text="Cokie Hall"
                strokeColor="#4820bd"
                fillColor="#F8FAFC"
                strokeWidth={1.4}
                drawDuration={1.6}
                fillDelay={0.2}
                stagger={0.05}
                ease="power2.out"
                trigger="scroll"
                fillMode="wipe"
                fontSize={128}
                fontWeight={800}
                letterSpacing={-4}
                reverse={false}
              />
            </h1>
            <p className="hero-subtitle">
              {t('hero.subtitle')}
            </p>
            {/* Imagen institucional para rastreadores y buscadores con dimensiones reales */}
            <div 
              className="hero-crawler-media-box" 
              style={{ 
                position: 'absolute', 
                inset: 0, 
                overflow: 'hidden', 
                pointerEvents: 'none', 
                zIndex: 0, 
                opacity: 0.035 
              }}
              aria-hidden="true"
            >
              <img
                src="/og-image.png"
                alt="Cokie Hall | Institución Educativa y Comunidad Académica"
                width="1200"
                height="630"
                loading="eager"
                fetchPriority="high"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
              />
            </div>
            <DownloadButton />
            
          </div>
        </div>

        <section id="nosotros" className="seccion-bienvenida">
          <div className="seccion-bienvenida__grid">
            
            <div className="lateral-col lateral-col--izq">
              {imagenesIzquierda.map((img) => (
                <div key={img.id} className="lateral-img-card side-img-left">
                  <img src={img.src} alt={img.alt} />
                </div>
              ))}
            </div>

            <div className="seccion-bienvenida__centro">
              <FoldText
                text={t('welcome.title')}
                splitBy="char"
                hinge="top"
                trigger="scroll"
                duration={0.65}
                stagger={0.03}
                ease="power3.out"
                perspective={850}
                creaseShading={0}
                fontSize={62}
                fontWeight={800}
                color="#0B1957"
              />

              <ScrollReveal
                enableBlur={true}
                baseOpacity={0.1}
                baseRotation={3}
                blurStrength={6}
                containerClassName="seccion-bienvenida__scroll-reveal"
                wordAnimationEnd="bottom 30%"
              >
                <p className="seccion-bienvenida__parrafo">
                  {t('welcome.p1')}
                </p>
                <p className="seccion-bienvenida__parrafo">
                  {t('welcome.p2')}
                </p>
                <p className="seccion-bienvenida__parrafo">
                  {t('welcome.p3')}
                </p>
              </ScrollReveal>
            </div>

            <div className="lateral-col lateral-col--der">
              {imagenesDerecha.map((img) => (
                <div key={img.id} className="lateral-img-card side-img-right">
                  <img src={img.src} alt={img.alt} />
                </div>
              ))}
            </div>
          </div>

          <div className="seccion-bienvenida__imagen-contenedor reveal">
            <img src={Cokie1} alt="Cokie1" className="seccion-bienvenida__imagen" />
          </div>
        </section>

        <section className="seccion-diferenciadores">
          <h2 className="seccion-diferenciadores__titulo reveal">
            {t('diferenciadores.title')}
          </h2>
          
          <div className="diferenciadores-seamless-grid">
            {imagenesHS.map((item, i) => (
              <div 
                className={`diferenciador-cuadro ${i < 2 ? 'diferenciador-cuadro-pair1' : 'diferenciador-cuadro-pair2'}`} 
                key={i}
              >
                <h3 className="diferenciador-cuadro__titulo">{item.titulo}</h3>
                <img 
                  src={item.icono} 
                  alt={item.titulo} 
                  className="diferenciador-cuadro__img-png" 
                />
              </div>
            ))}
          </div>
        </section>

        <section className="seccion-cifras">
          <svg className="ola ola--top" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,50 Q90,0 180,50 T360,50 T540,50 T720,50 T900,50 T1080,50 T1260,50 T1440,50 L1440,100 L0,100 Z" />
          </svg>

          <div className="seccion-cifras__contenido">
            {cifras.map((c, i) => (
                <div className="cifra reveal" key={i}>
                <img src={c.icono} alt={c.etiqueta} className="cifra__icono-png" />
                <span className="cifra__numero">
                    <Incrementador valorFinal={c.numero} duracion={2500} />
                </span>
                <span className="cifra__etiqueta">{c.etiqueta}</span>
                </div>
            ))}
          </div>

          <svg className="ola ola--bottom" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,50 Q90,100 180,50 T360,50 T540,50 T720,50 T900,50 T1080,50 T1260,50 T1440,0 L0,0 Z" />
          </svg>
        </section>

        <HorizontalScroll />

        <AppDownload />

        <Footer />

        <ScrollToTop />
      </main>
    </>
  );
}

export default Header;