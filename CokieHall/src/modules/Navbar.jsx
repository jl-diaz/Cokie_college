import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logoBlan from '../assets/logoBlan.png';
import StaggeredMenu from '../modulesReactBits/StaggeredMenu.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import './Navbar.css';

function Navbar() {
  const [visible, setVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, lang, toggleLang } = useLanguage();

  useEffect(() => {
    let lastScroll = 0;

    const onLenisScroll = ({ scroll, direction }) => {
      // Si el menú móvil está desplegado, siempre visible
      if (mobileMenuOpen) {
        setVisible(true);
        return;
      }

      // Cerca del top → siempre visible
      if (scroll < 30) {
        setVisible(true);
        lastScroll = scroll;
        return;
      }

      // direction: 1 = bajando, -1 = subiendo
      if (direction === -1) {
        setVisible(true);
      } else if (direction === 1 && scroll - lastScroll > 5) {
        setVisible(false);
      }

      lastScroll = scroll;
    };

    // Suscribirse al scroll de Lenis en vez del nativo
    const lenis = window.__lenis;
    if (lenis) {
      lenis.on('scroll', onLenisScroll);
    }

    return () => {
      if (lenis) {
        lenis.off('scroll', onLenisScroll);
      }
    };
  }, [mobileMenuOpen]);

  const menuItems = [
    { label: t('nav.home'), link: '/', ariaLabel: t('nav.home') },
    { label: t('nav.about'), link: '/nosotros', ariaLabel: t('nav.about') },
    { label: t('nav.levels'), link: '/#niveles', ariaLabel: t('nav.levels') },
    { label: t('nav.app'), link: '/#app-download', ariaLabel: t('nav.app') },
    { label: t('nav.contact'), link: '/#contacto', ariaLabel: t('nav.contact') },
  ];

  const socialItems = [
    { label: 'Instagram', link: 'https://instagram.com' },
    { label: 'Facebook', link: 'https://facebook.com' }
  ];

  return (
    <header className={`navbar ${!visible && !mobileMenuOpen ? 'navbar--hidden' : ''}`}>
      <div className="navbar__container">
        
        <Link to="/" className="navbar__logo">
          <img 
            src={logoBlan} 
            alt="Logo Cokie Hall" 
            className="navbar__logo-img" 
          />
        </Link>

        {/* NAVEGACIÓN DESKTOP */}
        <nav className="navbar__nav">
          <ul className="navbar__menu">
            <li className="navbar__item">
              <Link to="/nosotros" className="navbar__link">{t('nav.about')}</Link>
            </li>

            <li className="navbar__item">
              <Link to="/#niveles" className="navbar__link">{t('nav.levels')}</Link>
            </li>

            <li className="navbar__item">
              <Link to="/#app-download" className="navbar__link">{t('nav.app')}</Link>
            </li>

            <li className="navbar__item">
              <Link to="/#contacto" className="navbar__link">{t('nav.contact')}</Link>
            </li>
          </ul>
        </nav>

        {/* SELECTOR DE IDIOMA & MENÚ MÓVIL */}
        <div className="navbar__actions">
          <button
            type="button"
            onClick={toggleLang}
            className="navbar__lang-btn"
            aria-label={t('nav.langAria')}
            title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          >
            <span className={`lang-pill ${lang === 'es' ? 'lang-pill--active' : ''}`}>ES</span>
            <span className="lang-divider">/</span>
            <span className={`lang-pill ${lang === 'en' ? 'lang-pill--active' : ''}`}>EN</span>
          </button>

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

