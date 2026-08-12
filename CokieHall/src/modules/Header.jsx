import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
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

import './Hero.css';
import './Header.css';

gsap.registerPlugin(ScrollTrigger);

function Header() {
  const mainRef = useRef(null);

  // Scroll suave con Lenis, sincronizado con GSAP ScrollTrigger
  useGSAP(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

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

    return () => {
      lenis.destroy();
    };
  }, { scope: mainRef });

  // === FOTOS DE ESTUDIANTES A LOS LADOS DEL SCROLL REVEAL (2 POR LADO) ===
  // Puedes reemplazar los archivos 'src' con tus propias imágenes de estudiantes
  const imagenesIzquierda = [
    { id: 'izq-1', src: futb, alt: 'Estudiante 1 (Izquierda Superior)' },
    { id: 'izq-2', src: kids1, alt: 'Estudiante 2 (Izquierda Inferior)' },
  ];

  const imagenesDerecha = [
    { id: 'der-1', src: ninos, alt: 'Estudiante 3 (Derecha Superior)' },
    { id: 'der-2', src: CokieHall, alt: 'Estudiante 4 (Derecha Inferior)' },
  ];

    const diferenciadores = [
    { icono: birrete, titulo: 'Educación de calidad' },
    { icono: ac, titulo: 'Acompañamiento cercano' },
    { icono: pizarra, titulo: 'Aprender jugando' },
    { icono: arte, titulo: 'Arte y creatividad' },
    ]; 
    const imagenesHS = [
    { icono: imagen1, titulo: 'Educación de calidad' },
    { icono: imagen2, titulo: 'Acompañamiento cercano' },
    { icono: imagen3, titulo: 'Aprender jugando' },
    { icono: imagen4, titulo: 'Arte y creatividad' },
    ]; const cifras = [
    { numero: '1,180+', etiqueta: 'Estudiantes activos', icono: birrete },
    { numero: '68', etiqueta: 'Docentes certificados', icono: ac },
    { numero: '24', etiqueta: 'Personal administrativo', icono: pizarra },
    { numero: '45+', etiqueta: 'Años de trayectoria', icono: arte },
  ];

  return (
    <>
      {/* ===== HEADER / NAVBAR INSTITUCIONAL ===== */}
      <Navbar />

      <main ref={mainRef} style={{ position: 'relative', width: '100%' }}>
        {/* ===== HERO ===== */}
        <div id="hero" className="hero-container" style={{ height: '100vh' }}>
          <div className="hero-content">
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
            <p className="hero-subtitle">
              Una comunidad educativa donde cada estudiante encuentra el acompañamiento y las
              herramientas para crecer, aprender y alcanzar su máximo potencial.
            </p>
            <a 
              href="https://github.com/jl-diaz/Cokie_college/releases/download/v1.0.0/CokieCollege.apk" 
              target="_blank" 
              rel="noopener noreferrer" 
              download
            >
              <div className="botonCont">
                <button className="button button-item">
                  <span className="button-bg">
                    <span className="button-bg-layers">
                      <span className="button-bg-layer button-bg-layer-1 -purple"></span>
                      <span className="button-bg-layer button-bg-layer-2 -turquoise"></span>
                      <span className="button-bg-layer button-bg-layer-3 -yellow"></span>
                    </span>
                  </span>
                  <span className="button-inner">
                    <span className="button-inner-static">Descargar aplicación</span>
                    <span className="button-inner-hover">Descargar aplicación</span>
                  </span>
                </button>
              </div>
            </a>
            
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
                text="Bienvenido a Cokie Hall"
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
                  Somos una comunidad educativa comprometida con ofrecer una plataforma de aprendizaje
                  sobresaliente para cada estudiante.
                </p>
                <p className="seccion-bienvenida__parrafo">
                  El ambiente cálido y cercano que se vive en nuestra escuela es la clave de nuestro
                  éxito, junto con la calidad de las relaciones y el alto nivel de cuidado entre todos
                  los miembros de la comunidad.
                </p>
                <p className="seccion-bienvenida__parrafo">
                  La vida de nuestra escuela está impulsada por el entusiasmo y el deseo de superación.
                  Queremos despertar en nuestros estudiantes una sed de aprendizaje que los acompañe
                  durante toda su vida.
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
            Nosotros hacemos la diferencia en la vida de cada niño
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