import { useState, useEffect, useRef } from 'react';
import logoBlan from '../assets/logoBlan.png';
import StaggeredMenu from '../modulesReactBits/StaggeredMenu.jsx';
import './Navbar.css';

function Navbar() {
  const [visible, setVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollTimer = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      // SI EL MENÚ MÓVIL ESTÁ DESPLEGADO, LA NAVBAR NUNCA DESAPARECE POR MÁS QUE SE HAGA SCROLL
      if (mobileMenuOpen) {
        setVisible(true);
        return;
      }

      if (window.scrollY > 30) {
        setVisible(false);
      } else {
        setVisible(true);
      }

      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }

      scrollTimer.current = setTimeout(() => {
        setVisible(true);
      }, 250); // Aparece 250ms después de detener el scroll
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, [mobileMenuOpen]);

  const menuItems = [
    { label: 'Inicio', link: '#hero', ariaLabel: 'Ir al inicio' },
    { label: 'Niveles', link: '#niveles', ariaLabel: 'Ver niveles educativos' },
    { label: 'Clubes', link: '#clubes', ariaLabel: 'Ver clubes deportivos' },
    { label: 'Nosotros', link: '#nosotros', ariaLabel: 'Sobre Cokie Hall' },
    { label: 'Contacto', link: '#contacto', ariaLabel: 'Contactar y admisiones' },
  ];

  const socialItems = [
    { label: 'Instagram', link: 'https://instagram.com' },
    { label: 'Facebook', link: 'https://facebook.com' },
    { label: 'WhatsApp', link: 'https://wa.me/50370000000' }
  ];

  return (
    <header className={`navbar ${!visible && !mobileMenuOpen ? 'navbar--hidden' : ''}`}>
      <div className="navbar__container">
        
        <a href="#hero" className="navbar__logo">
          <img 
            src={logoBlan} 
            alt="Logo Cokie Hall" 
            className="navbar__logo-img" 
          />
        </a>

        {/* NAVEGACIÓN DESKTOP */}
        <nav className="navbar__nav">
          <ul className="navbar__menu">
            <li className="navbar__item">
              <a href="#niveles" className="navbar__link">Niveles Educativos</a>
            </li>

            <li className="navbar__item">
              <a href="#nosotros" className="navbar__link">Nosotros</a>
            </li>
            
            <li className="navbar__item">
              <a href="#contacto" className="navbar__link">Contacto</a>
            </li>
          </ul>
        </nav>

        {/* BOTÓN DE ACCIÓN / ADMISIONES Y STAGGERED MENU MÓVIL DE REACT BITS */}
        <div className="navbar__actions">
          <div className="navbar__mobile-staggered-wrapper">
            <StaggeredMenu 
              position="right"
              items={menuItems}
              socialItems={socialItems}
              displaySocials={true}
              displayItemNumbering={true}
              menuButtonColor="#ffffff"
              openMenuButtonColor="#ffd074"
              changeMenuColorOnOpen={true}
              colors={['#0b1957', '#172774']}
              logoUrl={logoBlan}
              accentColor="#ffd074"
              onMenuOpen={() => setMobileMenuOpen(true)}
              onMenuClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>

      </div>
    </header>
  );
}

export default Navbar;
