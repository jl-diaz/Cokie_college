import { useState, useEffect } from 'react';

const APK_URL = 'https://github.com/jl-diaz/Cokie_college/releases/download/v1.2/CokieCollege.apk';
const WEB_URL = 'https://app.cokiehall.lat/';

function DownloadButton({ className = '' }) {
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator?.userAgent) {
      setIsAndroid(/Android/i.test(navigator.userAgent));
    }
  }, []);

  const href = isAndroid ? APK_URL : WEB_URL;
  const buttonText = isAndroid ? 'Descargar aplicación' : 'Probar versión web';

  return (
    <div className={`botonCont ${className}`}>
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        download={isAndroid ? 'CokieCollege.apk' : undefined}
        style={{ textDecoration: 'none' }}
      >
        <button className="button button-item" type="button">
          <span className="button-bg">
            <span className="button-bg-layers">
              <span className="button-bg-layer button-bg-layer-1 -purple"></span>
              <span className="button-bg-layer button-bg-layer-2 -turquoise"></span>
              <span className="button-bg-layer button-bg-layer-3 -yellow"></span>
            </span>
          </span>
          <span className="button-inner">
            <span className="button-inner-static">{buttonText}</span>
            <span className="button-inner-hover">{buttonText}</span>
          </span>
        </button>
      </a>

      {isAndroid && (
        <a
          href={WEB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="button-globe"
          title="Visitar Cokie College en Web"
          aria-label="Visitar Cokie College en Web"
        >
          <span className="button-bg">
            <span className="button-bg-layers">
              <span className="button-bg-layer button-bg-layer-1 -purple"></span>
              <span className="button-bg-layer button-bg-layer-2 -turquoise"></span>
              <span className="button-bg-layer button-bg-layer-3 -yellow"></span>
            </span>
          </span>
          <span className="button-globe-inner">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </span>
        </a>
      )}
    </div>
  );
}

export default DownloadButton;
