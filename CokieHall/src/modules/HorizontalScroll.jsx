import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Imágenes de ejemplo para los tags <img>
import kids1 from '../assets/kids1.png';
import ninos from '../assets/ninos.png';
import CokieHall from '../assets/CokieHall.png';
import Cokie1 from '../assets/Cokie1.png';
import futb from '../assets/futb.png';
import CokieNino from '../assets/CokieNino.png';
import Kid from '../assets/kid.png';
import CokieTekwando from '../assets/CokieTekwando.png';
import atletismo from '../assets/atletismo.png';
import taek from '../assets/taek.png';
import lucha from '../assets/lucha.png';
import foro from '../assets/foro.png';
import './HorizontalScroll.css';
import play from '../assets/play.png';
gsap.registerPlugin(ScrollTrigger);

function HorizontalScroll() {
  const containerRef = useRef(null);
  const trackRef = useRef(null);

  useGSAP(() => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container) return;

    const mm = gsap.matchMedia();

    // Scroll horizontal fijado (pin) ÚNICAMENTE para pantallas de escritorio (> 768px)
    mm.add('(min-width: 769px)', () => {
      const getScrollAmount = () => -(track.scrollWidth - window.innerWidth);

      const tween = gsap.to(track, {
        x: getScrollAmount,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          pin: true,
          scrub: 0.8,
          start: 'top top',
          end: () => `+=${track.scrollWidth - window.innerWidth}`,
          invalidateOnRefresh: true,
        },
      });

      return () => {
        tween.kill();
      };
    });

    return () => {
      mm.revert();
    };
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="hs-container" id="niveles">
      <div ref={trackRef} className="hs-track">
        
        <div className="hs-panel hs-panel--intro">
          <div className="hs-intro-minimal">
            <h2 className="hs-intro-title">
              En Cokie Hall encontrarás los siguientes niveles
            </h2>  
          </div>
        </div>

        <div className="hs-panel hs-panel--level">
          <div className="hs-level-header">
            <h3 className="hs-level-title">Primaria</h3>
          </div>

          <div className="hs-img-card-png">
            <img 
              src={CokieNino} 
              alt="Imagen PNG extra Primaria" 
              className="hs-img-png" 
            />
          </div>

          <div className="hs-images-row">
            <div className="hs-img-card">
              <img 
                src={Kid} 
                alt="Imagen 1 de Primaria" 
                className="hs-img" 
              />
            </div>

            <div className="hs-img-card">
              <img 
                src={ninos} 
                alt="Imagen 2 de Primaria" 
                className="hs-img" 
              />
            </div>
          </div>
        </div>

        <div className="hs-panel hs-panel--level">
          <div className="hs-level-header">
            <h3 className="hs-level-title">Tercer ciclo</h3>
          </div>

          <div className="hs-img-card-png">
            <img 
              src={play} 
              alt="Imagen PNG extra Tercer Ciclo" 
              className="hs-img-png" 
            />
          </div>

          <div className="hs-images-row">
            <div className="hs-img-card">
              <img 
                src={kids1} 
                alt="Imagen 1 de Tercer Ciclo" 
                className="hs-img" 
              />
            </div>

            <div className="hs-img-card">
              <img 
                src={foro} 
                alt="Imagen 2 de Tercer Ciclo" 
                className="hs-img" 
              />
            </div>
          </div>
        </div>

        <div className="hs-panel hs-panel--clubes" id="clubes">
          <div className="hs-level-header">
            <h3 className="hs-level-title">Y Clubes deportivos:</h3>
          </div>

          <div className="hs-img-card-png">
            <img 
              src={CokieTekwando} 
              alt="Imagen PNG Clubes Deportivos" 
              className="hs-img-png" 
            />
          </div>

          <div className="hs-images-row hs-clubs-row">
            <div className="hs-img-card hs-club-card">
              <img 
                src={futb} 
                alt="Club 1" 
                className="hs-img" 
              />
            </div>

            <div className="hs-img-card hs-club-card">
              <img 
                src={atletismo} 
                alt="Club 2" 
                className="hs-img" 
              />
            </div>

            <div className="hs-img-card hs-club-card">
              <img 
                src={taek} 
                alt="Club 3" 
                className="hs-img" 
              />
            </div>

            <div className="hs-img-card hs-club-card">
              <img 
                src={lucha} 
                alt="Club 4" 
                className="hs-img" 
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default HorizontalScroll;
