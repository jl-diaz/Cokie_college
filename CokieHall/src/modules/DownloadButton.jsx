import { useState, useEffect } from 'react';

const APK_URL = 'https://github.com/jl-diaz/Cokie_college/releases/download/v1.2/CokieCollege.apk';
const WEB_URL = 'https://cokie-college-ten.vercel.app/';

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
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      download={isAndroid ? 'CokieCollege.apk' : undefined}
      className={className}
    >
      <div className="botonCont">
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
      </div>
    </a>
  );
}

export default DownloadButton;
