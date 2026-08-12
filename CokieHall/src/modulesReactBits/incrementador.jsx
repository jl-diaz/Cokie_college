// incrementador.jsx
import React, { useState, useEffect, useRef } from 'react';

export default function Incrementador({ valorFinal, duracion = 2000 }) {
  const [numero, setNumero] = useState(0);
  const elementoRef = useRef(null);
  const animadoRef = useRef(false);

  const numeroLimpio = parseInt(String(valorFinal).replace(/[^0-9]/g, ''), 10) || 0;
  const prefijo = String(valorFinal).match(/^[^\d]+/)?.[0] || '';
  const sufijo = String(valorFinal).match(/[^\d]+$/)?.[0] || '';

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !animadoRef.current) {
          animadoRef.current = true;
          iniciarConteo();
        }
      },
      { threshold: 0.3 }
    );

    if (elementoRef.current) observer.observe(elementoRef.current);

    return () => observer.disconnect();
  }, [valorFinal]);

  const iniciarConteo = () => {
    let tiempoInicio = null;

    const animar = (tiempoActual) => {
      if (!tiempoInicio) tiempoInicio = tiempoActual;
      const progreso = Math.min((tiempoActual - tiempoInicio) / duracion, 1);
      const progresoSuave = 1 - (1 - progreso) * (1 - progreso);
      
      setNumero(Math.floor(progresoSuave * numeroLimpio));

      if (progreso < 1) {
        requestAnimationFrame(animar);
      }
    };

    requestAnimationFrame(animar);
  };

  return (
    <span ref={elementoRef}>
      {prefijo}{numero.toLocaleString()}{sufijo}
    </span>
  );
}