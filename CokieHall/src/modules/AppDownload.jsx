import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CokiePhone from '../assets/CokiePhone.png'
// Imágenes de ejemplo existentes (reemplazables por el usuario)
import Cokie1 from '../assets/Cokie1.png';
import kids1 from '../assets/kids1.png';

import './AppDownload.css';

gsap.registerPlugin(ScrollTrigger);

function AppDownload() {
  const sectionRef = useRef(null);
  const blocksRef = useRef(null);

  useGSAP(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Animación de entrada estilo collage rotado para los 3 bloques
    const blocks = gsap.utils.toArray('.collage-block');
    
    gsap.fromTo(
      blocks,
      {
        opacity: 0,
        y: 80,
        scale: 0.85,
        rotation: (index) => (index === 0 ? -15 : index === 1 ? 15 : -10),
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        rotation: (index) => (index === 0 ? -4 : index === 1 ? 4 : -2),
        duration: 1.2,
        stagger: 0.2,
        ease: 'back.out(1.4)',
        scrollTrigger: {
          trigger: blocksRef.current,
          start: 'top 85%',
          end: 'top 45%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    // Animación sutil de levitación / parallax al hacer scroll
    blocks.forEach((block, index) => {
      gsap.to(block, {
        y: (index + 1) * -15,
        rotation: (index === 0 ? -2 : index === 1 ? 6 : -4),
        ease: 'none',
        scrollTrigger: {
          trigger: block,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      });
    });

    // Animación de entrada para las 2 columnas inferiores
    gsap.fromTo(
      '.app-two-cols',
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.app-two-cols',
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      }
    );

  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="app-download-section" id="app-download">
      <div className="app-download-container">
        
        {/* ================= BLOQUES ESTILO COLLAGE ANIMADO CON GSAP ================= */}
        <div ref={blocksRef} className="collage-blocks-wrapper">
          
          {/* Primer bloque: Azul claro */}
          <div className="collage-block block--blue">
            <span className="block-text">Pero sabemos que necesitas</span>
          </div>

          {/* Segundo bloque: Rosado */}
          <div className="collage-block block--pink">
            <span className="block-text">Herramientas</span>
          </div>

          {/* Tercer bloque: Naranja */}
          <div className="collage-block block--orange">
            <span className="block-text">Descargar Cokie College</span>
          </div>

        </div>

        
        <div className="app-two-cols">
          
          
          <div className="app-left-col">
           
            <img 
              src={CokiePhone} 
              alt="Cokie College App" 
              className="app-left-cut-img" 
            />
          </div>

     
          <div className="app-right-col">
            <h2 className="app-right-title">
              Todo el control escolar y académico en la palma de tu mano
            </h2>

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

      </div>
    </section>
  );
}

export default AppDownload;
