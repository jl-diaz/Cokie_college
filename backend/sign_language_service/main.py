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

# Inicializamos el servidor Socket.IO con opciones para Render proxy
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    ping_timeout=60,
    ping_interval=25,
    max_http_buffer_size=10000000
)
socket_app = socketio.ASGIApp(sio, app)

user_sessions = {}
inference_lock = asyncio.Lock()

# ── Health check para que Render no devuelva 404 / 405 ──
@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"status": "ok", "service": "Sign Language Interpreter"}

@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    from isl_model import _models_loaded, _global_gesture_recognizer, _global_hand_landmarker
    return {
        "status": "healthy",
        "models_loaded": _models_loaded,
        "gesture_recognizer": _global_gesture_recognizer is not None,
        "hand_landmarker": _global_hand_landmarker is not None
    }

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
    Si el servidor está ocupado procesando otro frame, descarta este para evitar backlog.
    """
    model = user_sessions.get(sid)
    if not model:
        return
    
    # Si el lock está ocupado, descartar frame para evitar acumulación
    if inference_lock.locked():
        return
    
    async with inference_lock:
        translation = await asyncio.to_thread(model.process_frame_base64, data)
    
    # Si se detectó una seña estable, enviar el texto inmediatamente
    if translation:
        print(f"Traducción detectada para {sid}: {translation}")
        
        # Enviar texto inmediatamente (sin esperar audio)
        await sio.emit('translation_result', {'text': translation}, room=sid)
        
        # Generar y enviar audio en segundo plano sin bloquear
        try:
            audio_b64 = await asyncio.to_thread(generate_audio_b64, translation)
            await sio.emit('translation_audio', {
                'text': translation,
                'audioBase64': audio_b64
            }, room=sid)
        except Exception as e:
            print(f"Error generando TTS: {e}")

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    print(f"Iniciando servidor en puerto {port}...")
    uvicorn.run(socket_app, host="0.0.0.0", port=port)
