from fastapi import FastAPI
import socketio
import uvicorn
import base64
import io
from gtts import gTTS
from isl_model import ISLModel

# Inicializamos FastAPI
app = FastAPI(title="Sign Language Interpreter API")

# Inicializamos el servidor Socket.IO (Asíncrono para soportar miles de conexiones concurrentes)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

# Diccionario para mantener una instancia del modelo por usuario (sesión)
# Esto asegura que la secuencia de video de cada usuario se procese independientemente
user_sessions = {}

@sio.event
async def connect(sid, environ):
    print(f"Cliente conectado: {sid}")
    # Instanciamos el modelo para este usuario en particular
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
    Evento principal. Recibe un frame de video en base64 desde la app móvil.
    """
    model = user_sessions.get(sid)
    if model:
        # Procesar el frame
        translation = model.process_frame_base64(data)
        
        # Si se detectó una seña, enviar el texto de regreso
        if translation:
            print(f"Traducción detectada para {sid}: {translation}")
            
            # Generar audio usando gTTS
            try:
                tts = gTTS(text=translation, lang='es')
                mp3_fp = io.BytesIO()
                tts.write_to_fp(mp3_fp)
                mp3_fp.seek(0)
                audio_b64 = base64.b64encode(mp3_fp.read()).decode('utf-8')
                
                await sio.emit('translation_result', {
                    'text': translation,
                    'audioBase64': audio_b64
                }, room=sid)
            except Exception as e:
                print(f"Error generando TTS: {e}")
                # Enviar sin audio en caso de error
                await sio.emit('translation_result', {'text': translation}, room=sid)

if __name__ == '__main__':
    print("Iniciando servidor en puerto 8000...")
    # Correr el servidor usando uvicorn. 
    # En producción (Render/AWS) esto se ejecuta vía comando de consola.
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)
