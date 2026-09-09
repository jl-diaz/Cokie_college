import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (fs.existsSync(indexHtmlPath)) {
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  // 1. Generar dist/nosotros/index.html con metadatos propios para Google Sitelinks
  const nosotrosDir = path.join(distDir, 'nosotros');
  if (!fs.existsSync(nosotrosDir)) {
    fs.mkdirSync(nosotrosDir, { recursive: true });
  }

  const nosotrosHtml = indexHtml
    .replace(
      /<title>.*?<\/title>/,
      '<title>Sobre Nosotros | Cokie Hall</title>'
    )
    .replace(
      /<meta name="title" content=".*?" \/>/,
      '<meta name="title" content="Sobre Nosotros | Cokie Hall" />'
    )
    .replace(
      /<meta name="description" content=".*?" \/>/,
      '<meta name="description" content="Conoce la historia, visión, valores y comunidad formativa de Cokie Hall. Acompañamos el crecimiento académico y personal de cada estudiante." />'
    )
    .replace(
      /<link rel="canonical" href=".*?" \/>/,
      '<link rel="canonical" href="https://www.cokiehall.lat/nosotros" />'
    )
    .replace(
      /<meta property="og:title" content=".*?" \/>/,
      '<meta property="og:title" content="Sobre Nosotros | Cokie Hall" />'
    )
    .replace(
      /<meta property="og:description" content=".*?" \/>/,
      '<meta property="og:description" content="Conoce la historia, visión, valores y comunidad formativa de Cokie Hall." />'
    )
    .replace(
      /<meta property="og:url" content=".*?" \/>/,
      '<meta property="og:url" content="https://www.cokiehall.lat/nosotros" />'
    )
    .replace(
      /<meta name="twitter:title" content=".*?" \/>/,
      '<meta name="twitter:title" content="Sobre Nosotros | Cokie Hall" />'
    )
    .replace(
      /<meta name="twitter:description" content=".*?" \/>/,
      '<meta name="twitter:description" content="Conoce la historia, visión, valores y comunidad formativa de Cokie Hall." />'
    )
    .replace(
      /<meta name="twitter:url" content=".*?" \/>/,
      '<meta name="twitter:url" content="https://www.cokiehall.lat/nosotros" />'
    );

  fs.writeFileSync(path.join(nosotrosDir, 'index.html'), nosotrosHtml, 'utf8');
  console.log('✓ dist/nosotros/index.html generado exitosamente para Google Sitelinks.');
} else {
  console.error('No se encontró dist/index.html');
}
