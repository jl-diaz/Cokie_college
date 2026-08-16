import './Footer.css';
import CokieKids from '../assets/CokieKids.png';
function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        
        <div className="footer-top-row">
          
          <div className="footer-left-info">
            <h2 className="footer-dev-title">Cokie Dev</h2>
            <p className="footer-dev-desc">
              Una empresa emergente de desarrollo de software y experiencias digitales enfocada 
              en transformar la tecnología educativa con soluciones intuitivas y de alto rendimiento.
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
            <h4 className="footer-col-title">Sobre Nosotros</h4>
            <p className="footer-col-text">
              Cokie Hall es una comunidad educativa comprometida con la excelencia académica, 
              valores y formación integral para Primaria y Tercer Ciclo.
            </p>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Navegación</h4>
            <nav aria-label="Navegación secundaria del pie de página">
              <ul className="footer-col-list">
                <li><a href="#hero" className="footer-col-link">Home</a></li>
                <li><a href="#nosotros" className="footer-col-link">Nosotros</a></li>
                <li><a href="#niveles" className="footer-col-link">Niveles Educativos</a></li>
                <li><a href="#app-download" className="footer-col-link">Cokie College</a></li>
              </ul>
            </nav>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Legales & Privacidad</h4>
            <ul className="footer-col-list">
              <li><a href="#privacidad" className="footer-col-link">Contrato de Privacidad</a></li>
              <li><a href="#terminos" className="footer-col-link">Términos y Condiciones</a></li>
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
