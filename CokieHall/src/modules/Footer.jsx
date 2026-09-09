import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Footer.css';
import CokieKids from '../assets/CokieKids.png';

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="site-footer" id="contacto">
      <div className="footer-container">
        
        <div className="footer-top-row">
          
          <div className="footer-left-info" data-nosnippet="true">
            <h2 className="footer-dev-title">{t('footer.devTitle')}</h2>
            <p className="footer-dev-desc">
              {t('footer.devDesc')}
            </p>
          </div>

          <div className="footer-right-contact">
            <a href="tel:+50370000000" className="footer-contact-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span>+503 7000-0000</span>
            </a>

            <a href="mailto:cokiedev@gmail.com" className="footer-contact-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              <span>cokiecollege@gmail.com</span>
            </a>
          </div>

        </div>

        <div className="footer-middle-columns" data-nosnippet="true">
          
          <div className="footer-col">
            <h4 className="footer-col-title">{t('footer.aboutTitle')}</h4>
            <p className="footer-col-text">
              {t('footer.aboutDesc')}
            </p>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">{t('footer.navTitle')}</h4>
            <nav aria-label="Navegación secundaria del pie de página">
              <ul className="footer-col-list">
                <li><Link to="/#hero" className="footer-col-link">{t('nav.home')}</Link></li>
                <li><Link to="/nosotros" className="footer-col-link">{t('nav.about')}</Link></li>
                <li><Link to="/#niveles" className="footer-col-link">{t('nav.levels')}</Link></li>
                <li><Link to="/#app-download" className="footer-col-link">{t('nav.app')}</Link></li>
              </ul>
            </nav>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">{t('footer.legalTitle')}</h4>
            <ul className="footer-col-list">
              <li><Link to="/legal?tab=terminos" className="footer-col-link">{t('footer.terms')}</Link></li>
              <li><Link to="/legal?tab=privacidad" className="footer-col-link">{t('footer.privacy')}</Link></li>
              <li><Link to="/legal?tab=copyright" className="footer-col-link">{t('footer.copyright')}</Link></li>
              <li><span className="footer-col-copy">© 2026 Cokie Dev</span></li>
            </ul>
          </div>

        </div>

        <div className="footer-bottom-brand-row">
          
          <div className="footer-big-brand">
            <span className="footer-big-brand-text">Cokie HALL</span>
          </div>

          <div className="footer-big-png-wrapper">
            <img 
              src={CokieKids} 
              alt="Cokie Hall Footer PNG" 
              className="footer-big-png" 
            />
          </div>

        </div>

      </div>
    </footer>
  );
}

export default Footer;
