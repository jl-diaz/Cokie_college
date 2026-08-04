from fastapi import FastAPI
import socketio
import uvicorn
import base64
import io
import os
import asyncio
from gtts import gTTS
from isl_model import ISLModel, load_models

# Inicializamos FastAPI
app = FastAPI(title="Sign Language Interpreter API")

# Inicializamos el servidor Socket.IO
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

user_sessions = {}
inference_lock = asyncio.Lock()

# ── Health check para que Render no devuelva 404 ──
@app.get("/")
async def root():
    return {"status": "ok", "service": "Sign Language Interpreter"}

@app.get("/health")
async def health():
    from isl_model import _models_loaded
    return {"status": "healthy", "models_loaded": _models_loaded}

# Precargar modelos globales de Mediapipe en memoria al iniciar la app
load_models()

def generate_audio_b64(text):
    """Genera audio con Google TTS de manera síncrona (se llamará en un thread)"""
    tts = gTTS(text=text, lang='es')
    mp3_fp = io.BytesIO()
    tts.write_to_fp(mp3_fp)
    mp3_fp.seek(0)
    return base64.b64encode(mp3_fp.read()).decode('utf-8')

@sio.event
async def connect(sid, environ):
    print(f"Cliente conectado: {sid}")
    user_sessions[sid] = ISLModel()
    await sio.emit('status', {'message': 'Conectado al servidor de Intérprete'}, room=sid)

@sio.event
async def disconnect(sid):
    print(f"Cliente desconectado: {sid}")
    if sid in user_sessions:
        del user_sessions[sid]

@sio.event
async def process_frame(sid, data):
    """
    Evento principal. Recibe un frame de video en base64 desde la app.
    """
    model = user_sessions.get(sid)
    if model:
        # Mediapipe Tasks Python API es síncrona y pesada. 
        # Usamos asyncio.to_thread con un Lock para evitar colisiones y no bloquear el event loop.
        async with inference_lock:
            translation = await asyncio.to_thread(model.process_frame_base64, data)
        
        # Si se detectó una seña estable, enviar el texto
        if translation:
            print(f"Traducción detectada para {sid}: {translation}")
            
            try:
                # gTTS realiza una petición de red síncrona que bloquea el hilo por varios segundos.
                # Debe ir en un thread separado para que el servidor no desconecte clientes.
                audio_b64 = await asyncio.to_thread(generate_audio_b64, translation)
                
                await sio.emit('translation_result', {
                    'text': translation,
                    'audioBase64': audio_b64
                }, room=sid)
            except Exception as e:
                print(f"Error generando TTS: {e}")
                # Enviar sin audio en caso de error de red
                await sio.emit('translation_result', {'text': translation}, room=sid)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    print(f"Iniciando servidor en puerto {port}...")
    uvicorn.run(socket_app, host="0.0.0.0", port=port)
