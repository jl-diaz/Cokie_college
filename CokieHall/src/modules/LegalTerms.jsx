import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ScrollToTop from './ScrollToTop.jsx';
import './LegalTerms.css';

function LegalTerms() {
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'terminos';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['terminos', 'privacidad', 'copyright', 'pautas'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const isEn = lang === 'en';
    const tabTitles = {
      terminos: isEn ? 'Terms & Conditions of Use | Cokie Hall' : 'Términos y Condiciones de Uso | Cokie Hall',
      privacidad: isEn ? 'Privacy Policy | Cokie Hall' : 'Política de Privacidad | Cokie Hall',
      copyright: isEn ? 'Copyright & Intellectual Property | Cokie Hall' : 'Derechos de Autor y Propiedad Intelectual | Cokie Hall',
      pautas: isEn ? 'Digital Citizenship & User Guidelines | Cokie Hall' : 'Pautas de Convivencia Digital | Cokie Hall',
    };

    const tabDescriptions = {
      terminos: isEn 
        ? 'Terms and conditions for Cokie College EdTech platform and Cokie Hall institutional portal.'
        : 'Términos y condiciones de uso de la plataforma educativa Cokie College y portal institucional Cokie Hall.',
      privacidad: isEn 
        ? 'Privacy policy and data protection for the Cokie Hall academic community.'
        : 'Política de privacidad, tratamiento y protección de datos personales de la comunidad académica de Cokie Hall.',
      copyright: isEn 
        ? 'Intellectual property policies, registered trademarks and copyrights of Cokie Hall.'
        : 'Políticas de propiedad intelectual, marcas registradas y derechos de autor de Cokie Hall.',
      pautas: isEn 
        ? 'User guidelines, pedagogical ethics and digital citizenship in Cokie College.'
        : 'Pautas para el usuario, ética pedagógica y convivencia digital en la plataforma Cokie College.',
    };

    const prevTitle = document.title;
    document.title = tabTitles[activeTab] || (isEn ? 'Terms and Privacy Policies | Cokie Hall' : 'Términos y Políticas de Privacidad | Cokie Hall');

    // Canonical consolidado hacia la página principal
    let canonical = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonical ? canonical.getAttribute('href') : 'https://www.cokiehall.lat/';
    if (canonical) {
      canonical.setAttribute('href', 'https://www.cokiehall.lat/');
    }

    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute('content') : '';
    if (metaDesc) {
      metaDesc.setAttribute('content', tabDescriptions[activeTab] || (isEn ? 'Review Cokie Hall terms of use and privacy policies.' : 'Consulta los términos de uso y políticas de privacidad de Cokie Hall.'));
    }

    // Directiva noindex para no competir con la página principal en motores de búsqueda
    let robotsMeta = document.querySelector('meta[name="robots"]');
    const prevRobots = robotsMeta ? robotsMeta.getAttribute('content') : null;
    if (robotsMeta) {
      robotsMeta.setAttribute('content', 'noindex, follow');
    } else {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      robotsMeta.content = 'noindex, follow';
      document.head.appendChild(robotsMeta);
    }

    return () => {
      document.title = prevTitle;
      if (canonical) canonical.setAttribute('href', prevCanonical);
      if (metaDesc && prevDesc) metaDesc.setAttribute('content', prevDesc);
      if (robotsMeta) {
        if (prevRobots) {
          robotsMeta.setAttribute('content', prevRobots);
        } else {
          robotsMeta.setAttribute('content', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
        }
      }
    };
  }, [activeTab, lang]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="spotify-legal-page">
      <Navbar />

      <main className="spotify-legal-main">
        <div className="spotify-legal-container">

          {/* ===== SUB-BARRA DE NAVEGACIÓN SUPERIOR ESTILO SPOTIFY ===== */}
          <nav className="spotify-legal-nav" aria-label={t('legal.navLabel')}>
            <span className="spotify-legal-nav__label">{t('legal.navLabel')}</span>
            
            <button
              type="button"
              className={`spotify-legal-nav__link ${activeTab === 'terminos' ? 'spotify-legal-nav__link--active' : ''}`}
              onClick={() => handleTabChange('terminos')}
            >
              {t('legal.termsTab')}
            </button>

            <button
              type="button"
              className={`spotify-legal-nav__link ${activeTab === 'privacidad' ? 'spotify-legal-nav__link--active' : ''}`}
              onClick={() => handleTabChange('privacidad')}
            >
              {t('legal.privacyTab')}
            </button>

            <button
              type="button"
              className={`spotify-legal-nav__link ${activeTab === 'copyright' ? 'spotify-legal-nav__link--active' : ''}`}
              onClick={() => handleTabChange('copyright')}
            >
              {t('legal.copyrightTab')}
            </button>

            <button
              type="button"
              className={`spotify-legal-nav__link ${activeTab === 'pautas' ? 'spotify-legal-nav__link--active' : ''}`}
              onClick={() => handleTabChange('pautas')}
            >
              {t('legal.guidelinesTab')}
            </button>
          </nav>

          {/* ========================================================
              DOCUMENTO 1: TÉRMINOS Y CONDICIONES DE USO
             ======================================================== */}
          {activeTab === 'terminos' && (
            <article className="spotify-doc">
              <h1 className="spotify-doc__title">{t('legal.terms.title')}</h1>
              <p className="spotify-doc__date">{t('legal.lastUpdated')}</p>

              {/* ÍNDICE NUMERADO DE ENLACES ESTILO SPOTIFY */}
              <ol className="spotify-toc">
                <li><a href="#t-1">{t('legal.terms.toc1')}</a></li>
                <li><a href="#t-2">{t('legal.terms.toc2')}</a></li>
                <li><a href="#t-3">{t('legal.terms.toc3')}</a></li>
                <li><a href="#t-4">{t('legal.terms.toc4')}</a></li>
                <li><a href="#t-5">{t('legal.terms.toc5')}</a></li>
                <li><a href="#t-6">{t('legal.terms.toc6')}</a></li>
                <li><a href="#t-7">{t('legal.terms.toc7')}</a></li>
                <li><a href="#t-8">{t('legal.terms.toc8')}</a></li>
              </ol>

              {/* CONTENIDO SECCIÓN POR SECCIÓN */}
              <div className="spotify-doc__content">
                <section id="t-1" className="spotify-section">
                  <h2>{t('legal.terms.s1_title')}</h2>
                  <p>{t('legal.terms.s1_p1')}</p>
                  <p>
                    {lang === 'en' ? 'Your use of the Cokie College Service is subject to these Terms and the institutional ' : 'El uso del Servicio Cokie College está sujeto a estos Términos y a la '}
                    <button type="button" className="inline-text-link" onClick={() => handleTabChange('privacidad')}>
                      {lang === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}
                    </button>
                    {lang === 'en' ? '. If you do not agree to these Terms, you must not access or use the Service.' : ' institucional. Si no está de acuerdo con estos Términos, no debe acceder ni utilizar el Servicio.'}
                  </p>
                </section>

                <section id="t-2" className="spotify-section">
                  <h2>{t('legal.terms.s2_title')}</h2>
                  <p>{t('legal.terms.s2_p1')}</p>
                  <ul>
                    <li><strong>{t('legal.terms.s2_li1_strong')}</strong>{t('legal.terms.s2_li1')}</li>
                    <li><strong>{t('legal.terms.s2_li2_strong')}</strong>{t('legal.terms.s2_li2')}</li>
                    <li><strong>{t('legal.terms.s2_li3_strong')}</strong>{t('legal.terms.s2_li3')}</li>
                    <li><strong>{t('legal.terms.s2_li4_strong')}</strong>{t('legal.terms.s2_li4')}</li>
                  </ul>
                </section>

                <section id="t-3" className="spotify-section">
                  <h2>{t('legal.terms.s3_title')}</h2>
                  <p>{t('legal.terms.s3_p1')}</p>
                  <p>{t('legal.terms.s3_p2')}</p>
                </section>

                <section id="t-4" className="spotify-section">
                  <h2>{t('legal.terms.s4_title')}</h2>
                  <p>{t('legal.terms.s4_p1')}</p>
                  <p>
                    {lang === 'en' ? 'For further details regarding licensing and trademarks, please review our ' : 'Para mayor información sobre licencias y marcas, consulte nuestra '}
                    <button type="button" className="inline-text-link" onClick={() => handleTabChange('copyright')}>
                      {lang === 'en' ? 'Intellectual Property Policy' : 'Política de Propiedad Intelectual'}
                    </button>.
                  </p>
                </section>

                <section id="t-5" className="spotify-section">
                  <h2>{t('legal.terms.s5_title')}</h2>
                  <p>
                    {lang === 'en' ? 'You agree to comply with all applicable laws and the ' : 'Usted se compromete a cumplir con todas las leyes aplicables y las '}
                    <button type="button" className="inline-text-link" onClick={() => handleTabChange('pautas')}>
                      {lang === 'en' ? 'User Guidelines' : 'Pautas para el Usuario'}
                    </button>
                    {lang === 'en' ? '. By way of example, and without limitation, you agree that you will not:' : '. A modo de ejemplo, y sin limitación, usted acepta que no realizará lo siguiente:'}
                  </p>
                  <ul>
                    <li>{t('legal.terms.s5_li1')}</li>
                    <li>{t('legal.terms.s5_li2')}</li>
                    <li>{t('legal.terms.s5_li3')}</li>
                    <li>{t('legal.terms.s5_li4')}</li>
                    <li>{t('legal.terms.s5_li5')}</li>
                  </ul>
                </section>

                <section id="t-6" className="spotify-section">
                  <h2>{t('legal.terms.s6_title')}</h2>
                  <p>{t('legal.terms.s6_p1')}</p>
                  <p>{t('legal.terms.s6_p2')}</p>
                </section>

                <section id="t-7" className="spotify-section">
                  <h2>{t('legal.terms.s7_title')}</h2>
                  <p>{t('legal.terms.s7_p1')}</p>
                </section>

                <section id="t-8" className="spotify-section">
                  <h2>{t('legal.terms.s8_title')}</h2>
                  <p>{t('legal.terms.s8_p1')}</p>
                </section>
              </div>
            </article>
          )}

          {/* ========================================================
              DOCUMENTO 2: POLÍTICA DE PRIVACIDAD
             ======================================================== */}
          {activeTab === 'privacidad' && (
            <article className="spotify-doc">
              <h1 className="spotify-doc__title">{t('legal.privacy.title')}</h1>
              <p className="spotify-doc__date">{t('legal.lastUpdated')}</p>

              <ol className="spotify-toc">
                <li><a href="#p-1">{t('legal.privacy.toc1')}</a></li>
                <li><a href="#p-2">{t('legal.privacy.toc2')}</a></li>
                <li><a href="#p-3">{t('legal.privacy.toc3')}</a></li>
                <li><a href="#p-4">{t('legal.privacy.toc4')}</a></li>
                <li><a href="#p-5">{t('legal.privacy.toc5')}</a></li>
                <li><a href="#p-6">{t('legal.privacy.toc6')}</a></li>
                <li><a href="#p-7">{t('legal.privacy.toc7')}</a></li>
              </ol>

              <div className="spotify-doc__content">
                <section id="p-1" className="spotify-section">
                  <h2>{t('legal.privacy.s1_title')}</h2>
                  <p>{t('legal.privacy.s1_p1')}</p>
                  <p>{t('legal.privacy.s1_p2')}</p>
                </section>

                <section id="p-2" className="spotify-section">
                  <h2>{t('legal.privacy.s2_title')}</h2>
                  <p>{t('legal.privacy.s2_intro')}</p>
                  <ul>
                    <li><strong>{t('legal.privacy.s2_li1_strong')}</strong>{t('legal.privacy.s2_li1')}</li>
                    <li><strong>{t('legal.privacy.s2_li2_strong')}</strong>{t('legal.privacy.s2_li2')}</li>
                    <li><strong>{t('legal.privacy.s2_li3_strong')}</strong>{t('legal.privacy.s2_li3')}</li>
                    <li><strong>{t('legal.privacy.s2_li4_strong')}</strong>{t('legal.privacy.s2_li4')}</li>
                    <li><strong>{t('legal.privacy.s2_li5_strong')}</strong>{t('legal.privacy.s2_li5')}</li>
                  </ul>
                </section>

                <section id="p-3" className="spotify-section">
                  <h2>{t('legal.privacy.s3_title')}</h2>
                  <p>{t('legal.privacy.s3_intro')}</p>
                  <ul>
                    <li>{t('legal.privacy.s3_li1')}</li>
                    <li>{t('legal.privacy.s3_li2')}</li>
                    <li>{t('legal.privacy.s3_li3')}</li>
                    <li>{t('legal.privacy.s3_li4')}</li>
                    <li>{t('legal.privacy.s3_li5')}</li>
                  </ul>
                </section>

                <section id="p-4" className="spotify-section">
                  <h2>{t('legal.privacy.s4_title')}</h2>
                  <p>{t('legal.privacy.s4_intro')}</p>
                  <ul>
                    <li>{t('legal.privacy.s4_li1')}</li>
                    <li>{t('legal.privacy.s4_li2')}</li>
                    <li>{t('legal.privacy.s4_li3')}</li>
                  </ul>
                </section>

                <section id="p-5" className="spotify-section">
                  <h2>{t('legal.privacy.s5_title')}</h2>
                  <p>{t('legal.privacy.s5_intro')}</p>
                  <ul>
                    <li>{t('legal.privacy.s5_li1')}</li>
                    <li>{t('legal.privacy.s5_li2')}</li>
                    <li>{t('legal.privacy.s5_li3')}</li>
                  </ul>
                </section>

                <section id="p-6" className="spotify-section">
                  <h2>{t('legal.privacy.s6_title')}</h2>
                  <p>{t('legal.privacy.s6_p1')}</p>
                  <p>{t('legal.privacy.s6_p2')}</p>
                </section>

                <section id="p-7" className="spotify-section">
                  <h2>{t('legal.privacy.s7_title')}</h2>
                  <p>{t('legal.privacy.s7_p1')}</p>
                </section>
              </div>
            </article>
          )}

          {/* ========================================================
              DOCUMENTO 3: POLÍTICA DE PROPIEDAD INTELECTUAL
             ======================================================== */}
          {activeTab === 'copyright' && (
            <article className="spotify-doc">
              <h1 className="spotify-doc__title">{t('legal.copyright.title')}</h1>
              <p className="spotify-doc__date">{t('legal.lastUpdated')}</p>

              <ol className="spotify-toc">
                <li><a href="#pi-1">{t('legal.copyright.toc1')}</a></li>
                <li><a href="#pi-2">{t('legal.copyright.toc2')}</a></li>
                <li><a href="#pi-3">{t('legal.copyright.toc3')}</a></li>
                <li><a href="#pi-4">{t('legal.copyright.toc4')}</a></li>
                <li><a href="#pi-5">{t('legal.copyright.toc5')}</a></li>
              </ol>

              <div className="spotify-doc__content">
                <section id="pi-1" className="spotify-section">
                  <h2>{t('legal.copyright.s1_title')}</h2>
                  <p>{t('legal.copyright.s1_p1')}</p>
                  <p>{t('legal.copyright.s1_p2')}</p>
                </section>

                <section id="pi-2" className="spotify-section">
                  <h2>{t('legal.copyright.s2_title')}</h2>
                  <p>{t('legal.copyright.s2_p1')}</p>
                </section>

                <section id="pi-3" className="spotify-section">
                  <h2>{t('legal.copyright.s3_title')}</h2>
                  <p>{t('legal.copyright.s3_p1')}</p>
                </section>

                <section id="pi-4" className="spotify-section">
                  <h2>{t('legal.copyright.s4_title')}</h2>
                  <p>{t('legal.copyright.s4_p1')}</p>
                </section>

                <section id="pi-5" className="spotify-section">
                  <h2>{t('legal.copyright.s5_title')}</h2>
                  <p>{t('legal.copyright.s5_p1')}</p>
                </section>
              </div>
            </article>
          )}

          {/* ========================================================
              DOCUMENTO 4: PAUTAS PARA EL USUARIO
             ======================================================== */}
          {activeTab === 'pautas' && (
            <article className="spotify-doc">
              <h1 className="spotify-doc__title">{t('legal.pautas.title')}</h1>
              <p className="spotify-doc__date">{t('legal.lastUpdated')}</p>

              <ol className="spotify-toc">
                <li><a href="#u-1">{t('legal.pautas.toc1')}</a></li>
                <li><a href="#u-2">{t('legal.pautas.toc2')}</a></li>
                <li><a href="#u-3">{t('legal.pautas.toc3')}</a></li>
                <li><a href="#u-4">{t('legal.pautas.toc4')}</a></li>
                <li><a href="#u-5">{t('legal.pautas.toc5')}</a></li>
              </ol>

              <div className="spotify-doc__content">
                <section id="u-1" className="spotify-section">
                  <h2>{t('legal.pautas.s1_title')}</h2>
                  <p>{t('legal.pautas.s1_p1')}</p>
                </section>

                <section id="u-2" className="spotify-section">
                  <h2>{t('legal.pautas.s2_title')}</h2>
                  <p>{t('legal.pautas.s2_p1')}</p>
                </section>

                <section id="u-3" className="spotify-section">
                  <h2>{t('legal.pautas.s3_title')}</h2>
                  <p>{t('legal.pautas.s3_p1')}</p>
                </section>

                <section id="u-4" className="spotify-section">
                  <h2>{t('legal.pautas.s4_title')}</h2>
                  <p>{t('legal.pautas.s4_p1')}</p>
                </section>

                <section id="u-5" className="spotify-section">
                  <h2>{t('legal.pautas.s5_title')}</h2>
                  <p>{t('legal.pautas.s5_p1')}</p>
                </section>
              </div>
            </article>
          )}

        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}

export default LegalTerms;
