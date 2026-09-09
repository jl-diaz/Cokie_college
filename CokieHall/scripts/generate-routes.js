import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (fs.existsSync(indexHtmlPath)) {
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  const createRouteHtml = ({ title, description, canonical, robots }) => {
    let html = indexHtml
      .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
      .replace(/<meta name="title" content=".*?" \/>/, `<meta name="title" content="${title}" />`)
      .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${description}" />`)
      .replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${canonical}" />`)
      .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description}" />`)
      .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${canonical}" />`)
      .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${title}" />`)
      .replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${description}" />`)
      .replace(/<meta name="twitter:url" content=".*?" \/>/, `<meta name="twitter:url" content="${canonical}" />`);

    if (robots) {
      html = html.replace(
        /<meta name="robots" content=".*?" \/>/,
        `<meta name="robots" content="${robots}" />\n    <meta name="googlebot" content="${robots}" />`
      );
    }
    return html;
  };

  const routes = [
    {
      dir: 'nosotros',
      title: 'Sobre Nosotros | Cokie Hall',
      description: 'Conoce la historia, visión, valores y comunidad formativa de Cokie Hall. Acompañamos el crecimiento de cada estudiante.',
      canonical: 'https://www.cokiehall.lat/nosotros'
    },
    {
      dir: 'niveles',
      title: 'Oferta Educativa | Cokie Hall',
      description: 'Descubre los niveles educativos de Primaria, Tercer Ciclo y Clubes Deportivos de Cokie Hall.',
      canonical: 'https://www.cokiehall.lat/niveles'
    },
    {
      dir: 'contacto',
      title: 'Contacto y Admisiones | Cokie Hall',
      description: 'Información de admisiones, horarios, ubicación y atención a familias en Cokie Hall.',
      canonical: 'https://www.cokiehall.lat/contacto'
    },
    {
      dir: 'legal',
      title: 'Aviso Legal | Cokie Hall',
      description: 'Términos de uso, política de privacidad y normativas institucionales de Cokie Hall.',
      canonical: 'https://www.cokiehall.lat/',
      robots: 'noindex, nofollow, noarchive'
    }
  ];

  routes.forEach((route) => {
    const targetDir = path.join(distDir, route.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const html = createRouteHtml(route);
    fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf8');
    console.log(`✓ dist/${route.dir}/index.html generado exitosamente.`);
  });

} else {
  console.error('No se encontró dist/index.html');
}
