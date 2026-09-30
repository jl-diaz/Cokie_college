# CHANGELOG - CokieCollege & CokieLens

Todos los cambios notables, auditorías y correcciones en este proyecto están documentados aquí.

---

## [2026-09-30] - Auditoría Exhaustiva de ML, Visión por Computadora, Seguridad y CokieLens

### 🛡️ Seguridad y Resguardo
- **Respaldo Versionado de Datos**: Se creó el respaldo completo de `backend/sign_language_service/data` en `backend/sign_language_service/data_backup_1790792659` (192 archivos incluyendo `cokie_gesture_model.npz`, `gestures.json`, `labels.json` y todas las 189 muestras `.npy`).
- **Actualización de `.gitignore`**: Se incorporó el patrón `backend/sign_language_service/data_backup_*` para evitar subir respaldos temporales o versionados al repositorio de control de código.
- **Auditoría de Credenciales**:
  - Verificado que `Credenciales.pdf` permanece estrictamente fuera del historial de commits de Git (ignorado por `.gitignore`).
  - Reportada la exposición de claves cliente de Firebase (`google-services.json`) y llaves públicas de Supabase en archivos de configuración móvil (`app.json`, `eas.json`, `supabase.js`) para su migración a variables de entorno seguras.

### 🧠 Diagnóstico de Inteligencia Artificial & Dataset
- **Auditoría de Métricas**:
  - Identificado sobreajuste del 100.00% en el entrenamiento original debido a evaluación sobre el conjunto de entrenamiento sin partición (*data leakage*).
  - Ejecutada validación cruzada estratificada (3-Fold CV): la precisión real sobre muestras retenidas del mismo signante cae a **86.25% ± 0.48%**.
- **Auditoría del Dataset**:
  - 189 muestras grabadas en 3 sesiones continuas por 1 solo signante.
  - 0 muestras de letras del abecedario en el dataset de entrenamiento.
  - Detección de falta de clase de reposo/rechazo ("no-seña"), provocando falsos positivos continuos con gestos cotidianos y transiciones.
- **Catálogo Oficial ISL**:
  - Mapeo completo de las 26 letras (A-Z) y 11 números (0-10) del alfabeto dactilológico unimanual internacional.
  - Documentación de pares confusos y detección de omisiones en las reglas heurísticas de `isl_model.py` (faltaban F, K, M, N, P, Q, R, S, T, 2, 6, 7, 8, 9, 10).
  - Formulación de propuesta técnica para letras del español (Ñ, CH, LL, RR) pendiente de decisión.

### 👓 CokieLens & Multiplataforma
- **Auditoría del Firmware**: Verificación de endpoints `/capture`, `/stream`, `/status`, `/play` y compatibilidad CORS `OPTIONS`.
- **Selector de Cámara**: Documentación de la capa de captura móvil (`CameraView` de Expo vs `fetch(/capture)` de ESP32) y fallback inteligente de mDNS a IP estática (`192.168.4.1`).
- **Compatibilidad Web**: Identificada la restricción de contenido mixto (Mixed Content) al consumir stream HTTP del ESP32 desde Vercel HTTPS.

### 📄 Documentación
- Actualizado `README.md` con sección completa del módulo CokieLens, ISL, arquitectura de inferencia y matriz multiplataforma.
- Generado informe técnico detallado de ingeniería en artefacto `reporte_ingenieria_isl_fases.md`.
