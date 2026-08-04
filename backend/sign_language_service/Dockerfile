FROM python:3.10-slim

WORKDIR /app

# Instalar dependencias del sistema requeridas por Mediapipe y OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libgles2 \
    libegl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copiar el archivo de requerimientos y descargar paquetes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY . .

# Exponer el puerto (Render asigna el puerto en la variable PORT, por defecto 8000)
ENV PORT=8000
EXPOSE $PORT

# Comando para ejecutar el servidor con uvicorn confiando en el proxy de Render
CMD uvicorn main:socket_app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"
