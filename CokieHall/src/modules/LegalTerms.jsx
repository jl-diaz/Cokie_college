import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ScrollToTop from './ScrollToTop.jsx';
import './LegalTerms.css';

function LegalTerms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'terminos';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['terminos', 'privacidad', 'copyright', 'pautas'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

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
          <nav className="spotify-legal-nav" aria-label="Menú de documentos legales">
            <span className="spotify-legal-nav__label">Legal</span>
            
            <button
              type="button"
              className={`spotify-legal-nav__link ${activeTab === 'terminos' ? 'spotify-legal-nav__link--active' : ''}`}
              onClick={() => handleTabChange('terminos')}
            >
              Términos y Condiciones de Uso
            </button>

            <button
              type="button"
              className={`spotify-legal-nav__link ${activeTab === 'privacidad' ? 'spotify-legal-nav__link--active' : ''}`}
              onClick={() => handleTabChange('privacidad')}
            >
              Política de Privacidad
            </button>

            <button
              type="button"
              className={`spotify-legal-nav__link ${activeTab === 'copyright' ? 'spotify-legal-nav__link--active' : ''}`}
              onClick={() => handleTabChange('copyright')}
            >
              Política de Propiedad Intelectual
            </button>

            <button
              type="button"
              className={`spotify-legal-nav__link ${activeTab === 'pautas' ? 'spotify-legal-nav__link--active' : ''}`}
              onClick={() => handleTabChange('pautas')}
            >
              Pautas para el Usuario
            </button>
          </nav>

          {/* ========================================================
              DOCUMENTO 1: TÉRMINOS Y CONDICIONES DE USO
             ======================================================== */}
          {activeTab === 'terminos' && (
            <article className="spotify-doc">
              <h1 className="spotify-doc__title">Términos de uso de Cokie College</h1>
              <p className="spotify-doc__date">Última actualización: 06/09/2026</p>

              {/* ÍNDICE NUMERADO DE ENLACES ESTILO SPOTIFY */}
              <ol className="spotify-toc">
                <li><a href="#t-1">1. Introducción</a></li>
                <li><a href="#t-2">2. El Servicio Cokie College que proporcionamos</a></li>
                <li><a href="#t-3">3. Cuentas institucionales, credenciales y seguridad</a></li>
                <li><a href="#t-4">4. Derechos de propiedad intelectual y contenido</a></li>
                <li><a href="#t-5">5. Uso del Servicio Cokie College y actividades prohibidas</a></li>
                <li><a href="#t-6">6. Limitaciones de responsabilidad y disponibilidad</a></li>
                <li><a href="#t-7">7. Problemas, resolución de disputas y legislación aplicable</a></li>
                <li><a href="#t-8">8. Acerca de estos Términos</a></li>
              </ol>

              {/* CONTENIDO SECCIÓN POR SECCIÓN */}
              <div className="spotify-doc__content">
                <section id="t-1" className="spotify-section">
                  <h2>1. Introducción</h2>
                  <p>
                    Lea atentamente estos Términos de uso (los "Términos") ya que rigen el uso de (incluido el acceso a) 
                    los servicios de la plataforma educativa Cokie College y el portal web institucional Cokie Hall, 
                    incluidos todos nuestros sitios web y aplicaciones móviles que incorporan o se vinculan a estos Términos 
                    (colectivamente, el "Servicio Cokie College") y todos los materiales académicos, calificaciones, 
                    registros disciplinarios y contenidos disponibles a través del Servicio.
                  </p>
                  <p>
                    El uso del Servicio Cokie College está sujeto a estos Términos y a la <button type="button" className="inline-text-link" onClick={() => handleTabChange('privacidad')}>Política de Privacidad</button> institucional.
                    Si no está de acuerdo con estos Términos, no debe acceder ni utilizar el Servicio.
                  </p>
                </section>

                <section id="t-2" className="spotify-section">
                  <h2>2. El Servicio Cokie College que proporcionamos</h2>
                  <p>
                    Proporcionamos una plataforma integral de tecnología educativa (EdTech) diseñada para optimizar la 
                    gestión académica, el acompañamiento formativo y la comunicación entre los miembros de la comunidad escolar:
                  </p>
                  <ul>
                    <li><strong>Módulo de Estudiantes:</strong> Consulta de calificaciones por periodo, monitoreo de asistencias mediante el Semáforo de Conducta dinámico, solicitud de justificación de inasistencias y pre-pedidos de menú en cafetín mediante código QR.</li>
                    <li><strong>Módulo de Docentes:</strong> Registro y ponderación de calificaciones (escala de 0.00 a 10.00), toma de asistencia en tiempo real y solicitud de tickets de extensión de plazo.</li>
                    <li><strong>Módulo de Coordinadores y Directivos:</strong> Supervisión de expedientes, aprobación de justificaciones, asignación de aulas, gestión de usuarios y emisión de avisos institucionales.</li>
                    <li><strong>Módulo de Cafetín Institucional:</strong> Publicación del catálogo del día y validación ágil de entrega mediante escaneo de código QR.</li>
                  </ul>
                </section>

                <section id="t-3" className="spotify-section">
                  <h2>3. Cuentas institucionales, credenciales y seguridad</h2>
                  <p>
                    Para acceder a las funciones no públicas del Servicio Cokie College se requiere una cuenta institucional autorizada. 
                    El usuario es el único responsable de salvaguardar sus credenciales de acceso y de cualquier actividad que ocurra en su cuenta.
                  </p>
                  <p>
                    En el caso de estudiantes menores de edad, las cuentas son registradas bajo la autorización expresa de sus padres o 
                    tutores legales acreditados. Queda prohibido transferir credenciales a terceros o compartir códigos QR personales de cafetín.
                  </p>
                </section>

                <section id="t-4" className="spotify-section">
                  <h2>4. Derechos de propiedad intelectual y contenido</h2>
                  <p>
                    El Servicio Cokie College y todo el software, arquitectura de base de datos, interfaces, logotipos, marcas comerciales 
                    (Cokie Hall, Cokie College, Cokie Dev) y diseños son propiedad exclusiva de Cokie Dev y de la institución educativa. 
                    Le otorgamos una licencia limitada, no exclusiva, revocable e intransferible para usar el Servicio con fines estrictamente 
                    formativos y personales.
                  </p>
                  <p>
                    Para mayor información sobre licencias y marcas, consulte nuestra <button type="button" className="inline-text-link" onClick={() => handleTabChange('copyright')}>Política de Propiedad Intelectual</button>.
                  </p>
                </section>

                <section id="t-5" className="spotify-section">
                  <h2>5. Uso del Servicio Cokie College y actividades prohibidas</h2>
                  <p>
                    Usted se compromete a cumplir con todas las leyes aplicables y las <button type="button" className="inline-text-link" onClick={() => handleTabChange('pautas')}>Pautas para el Usuario</button>. 
                    A modo de ejemplo, y sin limitación, usted acepta que no realizará lo siguiente:
                  </p>
                  <ul>
                    <li>Intentar alterar, adulterar o burlar las calificaciones, asistencias o registros disciplinarios en las bases de datos.</li>
                    <li>Eludir o intentar vulnerar las medidas de seguridad del sistema, incluidas las políticas de seguridad a nivel de fila (Row Level Security - RLS) de Supabase o los límites de peticiones (Rate Limiting).</li>
                    <li>Subir documentos médicos, certificados o evidencias falsificadas o adulteradas al módulo de justificaciones.</li>
                    <li>Suplantar la identidad de cualquier docente, directivo, padre de familia o estudiante.</li>
                    <li>Duplicar o revender códigos QR de despacho de alimentos de cafetín.</li>
                  </ul>
                </section>

                <section id="t-6" className="spotify-section">
                  <h2>6. Limitaciones de responsabilidad y disponibilidad</h2>
                  <p>
                    Hacemos todos los esfuerzos razonables para mantener el Servicio operativo las 24 horas del día; sin embargo, los servicios 
                    se proporcionan "tal cual" y "según disponibilidad". Cokie College no garantiza que el funcionamiento sea ininterrumpido o esté 
                    completamente libre de errores derivados de proveedores externos de telecomunicaciones o incidencias de fuerza mayor.
                  </p>
                  <p>
                    La institución no se hace responsable por fallas atribuibles al uso de dispositivos modificados indebidamente (root/jailbreak) 
                    o a negligencia en la custodia de contraseñas por parte del usuario.
                  </p>
                </section>

                <section id="t-7" className="spotify-section">
                  <h2>7. Problemas, resolución de disputas y legislación aplicable</h2>
                  <p>
                    Estos Términos se rigen e interpretan conforme a las leyes de la República de El Salvador. 
                    Cualquier controversia o reclamación derivada de estos Términos o del Servicio se resolverá en primera instancia 
                    mediante un proceso de conciliación amistosa directa entre las partes. De no alcanzarse un acuerdo en un plazo de treinta (30) días, 
                    la disputa se someterá a la jurisdicción de los tribunales competentes de la ciudad de San Salvador.
                  </p>
                </section>

                <section id="t-8" className="spotify-section">
                  <h2>8. Acerca de estos Términos</h2>
                  <p>
                    Podemos realizar cambios periódicos a estos Términos para reflejar mejoras operativas o modificaciones regulatorias. 
                    Cuando realicemos cambios sustanciales, se lo notificaremos a través del Servicio o por correo electrónico registrado con 
                    al menos quince (15) días de antelación a su entrada en vigor. El uso continuado del Servicio tras la fecha de entrada en vigor 
                    constituye su aceptación de los Términos actualizados.
                  </p>
                </section>
              </div>
            </article>
          )}

          {/* ========================================================
              DOCUMENTO 2: POLÍTICA DE PRIVACIDAD
             ======================================================== */}
          {activeTab === 'privacidad' && (
            <article className="spotify-doc">
              <h1 className="spotify-doc__title">Política de Privacidad de Cokie College</h1>
              <p className="spotify-doc__date">Última actualización: 06/09/2026</p>

              <ol className="spotify-toc">
                <li><a href="#p-1">1. Introducción y Responsable del tratamiento</a></li>
                <li><a href="#p-2">2. Datos personales que recopilamos</a></li>
                <li><a href="#p-3">3. Cómo y para qué utilizamos su información</a></li>
                <li><a href="#p-4">4. Protección reforzada de datos de menores de edad</a></li>
                <li><a href="#p-5">5. Almacenamiento, seguridad y políticas RLS</a></li>
                <li><a href="#p-6">6. Sus derechos de privacidad</a></li>
                <li><a href="#p-7">7. Cambios en esta Política de Privacidad</a></li>
              </ol>

              <div className="spotify-doc__content">
                <section id="p-1" className="spotify-section">
                  <h2>1. Introducción y Responsable del tratamiento</h2>
                  <p>
                    En Cokie College nos tomamos muy en serio la privacidad de nuestra comunidad educativa. 
                    Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos la información personal 
                    de estudiantes, tutores legales, docentes y personal institucional en el portal Cokie Hall y la plataforma Cokie College.
                  </p>
                  <p>
                    El responsable del tratamiento de los datos es la institución educativa Cokie Hall, con domicilio en San Salvador, El Salvador.
                  </p>
                </section>

                <section id="p-2" className="spotify-section">
                  <h2>2. Datos personales que recopilamos</h2>
                  <p>Recopilamos las siguientes categorías de datos estrictamente para el cumplimiento de los fines pedagógicos:</p>
                  <ul>
                    <li><strong>Datos de Identificación y Contacto:</strong> Nombres, apellidos, carné estudiantil, grado, sección y correo electrónico institucional.</li>
                    <li><strong>Datos Académicos y Disciplinarios:</strong> Notas por periodo escolar, ponderaciones de actividades, registro diario de inasistencias y estatus del Semáforo de Conducta.</li>
                    <li><strong>Datos de Salud y Justificaciones:</strong> Comprobantes, recetas o constancias médicas aportadas voluntariamente por los tutores para respaldar inasistencias escolares.</li>
                    <li><strong>Datos de Cafetín:</strong> Pre-órdenes de almuerzos y códigos QR de despacho vinculados al estudiante.</li>
                    <li><strong>Datos Técnicos:</strong> Tokens para notificaciones push (Expo Server SDK), registros de inicio de sesión y direcciones IP con fines exclusivos de auditoría de ciberseguridad.</li>
                  </ul>
                </section>

                <section id="p-3" className="spotify-section">
                  <h2>3. Cómo y para qué utilizamos su información</h2>
                  <p>
                    No vendemos, alquilamos ni comercializamos datos personales a terceros bajo ninguna circunstancia. La información se utiliza exclusivamente para:
                  </p>
                  <ul>
                    <li>Gestionar el expediente académico oficial y permitir la consulta en tiempo real por parte de los estudiantes y sus tutores.</li>
                    <li>Facilitar la labor docente de ingreso y evaluación de calificaciones.</li>
                    <li>Revisar y validar las justificaciones de ausencias por parte de la coordinación educativa.</li>
                    <li>Despachar de manera ordenada y segura los almuerzos en el cafetín institucional.</li>
                    <li>Enviar avisos y notificaciones de interés académico o de emergencia escolar.</li>
                  </ul>
                </section>

                <section id="p-4" className="spotify-section">
                  <h2>4. Protección reforzada de datos de menores de edad</h2>
                  <p>
                    De conformidad con la normativa de protección integral a la niñez y la adolescencia (incluidos los principios de COPPA y RGPD-K):
                  </p>
                  <ul>
                    <li>Las cuentas de estudiantes menores de edad son gestionadas con conocimiento y autorización de sus padres o tutores legales.</li>
                    <li>La plataforma está totalmente libre de anuncios publicitarios de terceros y de mecanismos de perfilamiento comercial.</li>
                    <li>La información médica aportada en justificaciones es tratada bajo estricto principio de confidencialidad y solo es accesible para la coordinación autorizada.</li>
                  </ul>
                </section>

                <section id="p-5" className="spotify-section">
                  <h2>5. Almacenamiento, seguridad y políticas RLS</h2>
                  <p>
                    Implementamos defensas técnicas de vanguardia para salvaguardar sus datos:
                  </p>
                  <ul>
                    <li>Cifrado en tránsito mediante protocolos HTTPS y TLS 1.3.</li>
                    <li>Aislamiento estricto de registros mediante Row Level Security (RLS) en base de datos Supabase PostgreSQL, garantizando que un usuario solo pueda consultar la información que le corresponde por su rol.</li>
                    <li>Protección contra ataques de denegación de servicio (Rate Limiting) y cabeceras seguras HTTP con Helmet en el servidor Node.js.</li>
                  </ul>
                </section>

                <section id="p-6" className="spotify-section">
                  <h2>6. Sus derechos de privacidad</h2>
                  <p>
                    Usted y sus tutores legales tienen derecho a acceder a sus datos personales, solicitar la rectificación de información inexacta, 
                    solicitar la supresión de datos no obligatorios por mandato educativo oficial, y oponerse a tratamientos específicos no esenciales.
                  </p>
                  <p>
                    Para ejercer cualquiera de estos derechos, el padre, madre o tutor registrado puede presentar una solicitud formal ante la administración 
                    institucional o a través de los canales de atención escolar.
                  </p>
                </section>

                <section id="p-7" className="spotify-section">
                  <h2>7. Cambios en esta Política de Privacidad</h2>
                  <p>
                    Podemos actualizar esta Política de Privacidad periódicamente. Toda actualización sustancial será comunicada a través de los canales 
                    oficiales de la plataforma institucional con anterioridad a su entrada en vigor.
                  </p>
                </section>
              </div>
            </article>
          )}

          {/* ========================================================
              DOCUMENTO 3: POLÍTICA DE PROPIEDAD INTELECTUAL
             ======================================================== */}
          {activeTab === 'copyright' && (
            <article className="spotify-doc">
              <h1 className="spotify-doc__title">Política de Propiedad Intelectual</h1>
              <p className="spotify-doc__date">Última actualización: 06/09/2026</p>

              <ol className="spotify-toc">
                <li><a href="#pi-1">1. Titularidad de la plataforma y el software</a></li>
                <li><a href="#pi-2">2. Marcas registradas y signos distintivos</a></li>
                <li><a href="#pi-3">3. Licencia de uso concedida al usuario</a></li>
                <li><a href="#pi-4">4. Contenido creado o subido por los usuarios</a></li>
                <li><a href="#pi-5">5. Reclamaciones por infracción de propiedad intelectual</a></li>
              </ol>

              <div className="spotify-doc__content">
                <section id="pi-1" className="spotify-section">
                  <h2>1. Titularidad de la plataforma y el software</h2>
                  <p>
                    Todo el código fuente, bases de datos, APIs, interfaces visuales, gráficos, animaciones, documentación 
                    y arquitectura de sistemas que componen Cokie College y Cokie Hall son propiedad intelectual exclusiva de 
                    Cokie Dev y de la institución educativa, protegidos por las leyes nacionales y tratados internacionales de derechos de autor.
                  </p>
                  <p>
                    Queda expresamente prohibida la reproducción, distribución, modificación, descompilación, ingeniería inversa 
                    o explotación comercial no autorizada de cualquier parte de la plataforma.
                  </p>
                </section>

                <section id="pi-2" className="spotify-section">
                  <h2>2. Marcas registradas y signos distintivos</h2>
                  <p>
                    Las denominaciones Cokie Hall, Cokie College, Cokie Dev, sus respectivos isotipos, logotipos y la mascota institucional 
                    son signos distintivos protegidos. No se autoriza su uso en relación con ningún producto o servicio ajeno sin el consentimiento 
                    previo y por escrito de sus titulares.
                  </p>
                </section>

                <section id="pi-3" className="spotify-section">
                  <h2>3. Licencia de uso concedida al usuario</h2>
                  <p>
                    Se concede a cada usuario debidamente matriculado y con credenciales válidas una licencia limitada, no exclusiva, 
                    intransferible y revocable para utilizar el software durante el periodo lectivo correspondiente, única y exclusivamente 
                    con fines de gestión académica y formativa.
                  </p>
                </section>

                <section id="pi-4" className="spotify-section">
                  <h2>4. Contenido creado o subido por los usuarios</h2>
                  <p>
                    Los estudiantes y docentes conservan los derechos morales y patrimoniales que correspondan sobre sus trabajos, tareas, 
                    materiales didácticos o aportes originales subidos a la plataforma. Al cargarlos en el sistema, conceden a la institución una 
                    licencia no exclusiva y libre de regalías para alojar, reproducir y archivar dichos contenidos con fines estrictamente 
                    pedagógicos y de evaluación académica.
                  </p>
                </section>

                <section id="pi-5" className="spotify-section">
                  <h2>5. Reclamaciones por infracción de propiedad intelectual</h2>
                  <p>
                    Si usted considera que algún contenido disponible en la plataforma infringe sus derechos de propiedad intelectual, 
                    puede notificarlo por escrito a la administración de Cokie College proporcionando una descripción precisa de la obra protegida, 
                    su ubicación exacta dentro del Servicio y la documentación que acredite su titularidad o representación legítima.
                  </p>
                </section>
              </div>
            </article>
          )}

          {/* ========================================================
              DOCUMENTO 4: PAUTAS PARA EL USUARIO
             ======================================================== */}
          {activeTab === 'pautas' && (
            <article className="spotify-doc">
              <h1 className="spotify-doc__title">Pautas para el Usuario de Cokie College</h1>
              <p className="spotify-doc__date">Última actualización: 06/09/2026</p>

              <ol className="spotify-toc">
                <li><a href="#u-1">1. Principios generales de convivencia digital</a></li>
                <li><a href="#u-2">2. Uso ético del Diario Pedagógico y Calificaciones</a></li>
                <li><a href="#u-3">3. Gestión responsable de inasistencias y evidencias</a></li>
                <li><a href="#u-4">4. Uso correcto del Cafetín y códigos QR</a></li>
                <li><a href="#u-5">5. Medidas y sanciones disciplinarias</a></li>
              </ol>

              <div className="spotify-doc__content">
                <section id="u-1" className="spotify-section">
                  <h2>1. Principios generales de convivencia digital</h2>
                  <p>
                    Cokie College es una extensión del entorno formativo de la institución. Todos los usuarios deben conducirse con 
                    respeto, honestidad y responsabilidad en cualquier comunicación, solicitud o interacción dentro del sistema.
                  </p>
                </section>

                <section id="u-2" className="spotify-section">
                  <h2>2. Uso ético del Diario Pedagógico y Calificaciones</h2>
                  <p>
                    Los docentes se comprometen a registrar oportunamente las calificaciones dentro de las fechas fijadas para cada periodo escolar. 
                    Cualquier solicitud de extensión debe canalizarse formalmente mediante el sistema de tickets de prórroga hacia coordinación. 
                    Los estudiantes tienen el deber de revisar con frecuencia sus notas y consultar de forma respetuosa cualquier discrepancia.
                  </p>
                </section>

                <section id="u-3" className="spotify-section">
                  <h2>3. Gestión responsable de inasistencias y evidencias</h2>
                  <p>
                    Las justificaciones de inasistencia deben ser remitidas en los plazos previstos por el reglamento escolar. 
                    Los archivos adjuntos como constancias de salud o cartas explicativas deben ser fidedignos, legibles y emitidos por 
                    profesionales o autoridades competentes.
                  </p>
                </section>

                <section id="u-4" className="spotify-section">
                  <h2>4. Uso correcto del Cafetín y códigos QR</h2>
                  <p>
                    Los pedidos de alimentos deben realizarse dentro de los horarios fijados por la administración del cafetín. 
                    El código QR de retiro es estrictamente personal y valida la entrega física del almuerzo; no debe compartirse ni cederse 
                    para evitar confusiones o cargos indebidos.
                  </p>
                </section>

                <section id="u-5" className="spotify-section">
                  <h2>5. Medidas y sanciones disciplinarias</h2>
                  <p>
                    El mal uso deliberado de la plataforma, el intento de vulnerar registros académicos o la falsedad en la documentación 
                    aportada dará lugar a la aplicación de las medidas contempladas en el Reglamento Interno de Convivencia Escolar de Cokie Hall, 
                    sin perjuicio de las acciones legales que correspondan.
                  </p>
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
