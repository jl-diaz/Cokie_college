from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import socketio
import uvicorn
import base64
import io
import os
import asyncio
import json
import urllib.request

from isl_model import ISLModel, load_models
import gesture_trainer

# Inicializamos FastAPI con metadatos claros
app = FastAPI(title="Cokie College - Sign Language & Gesture AI Service")

# Habilitar CORS para permitir llamadas directas desde la app Web y Móvil
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializamos el servidor Socket.IO
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
training_lock = asyncio.Lock()

# Precargar modelos de Mediapipe y el modelo activo de gestos
load_models()
gesture_trainer.get_active_model()

# ── MODELOS PYDANTIC PARA ENDPOINTS REST ──────────────────────────────────────
class CreateGestureRequest(BaseModel):
    name: str
    name_en: str = ""
    type: str = "movement"
    description: str = ""

class RecordSampleRequest(BaseModel):
    gesture_id: str
    sequence: list  # Lista de 30 vectores de puntos o diccionarios

class ExtractFrameRequest(BaseModel):
    image_base64: str

class RouteAudioRequest(BaseModel):
    esp32_ip: str
    text: str

# ── ENDPOINTS DE SALUD Y CONTROL ──────────────────────────────────────────────
@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {
        "status": "ok",
        "service": "Cokie College Gesture & Sign Language Service",
        "version": "2.0-holistic"
    }

@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    from isl_model import _models_loaded, _global_gesture_recognizer, _global_hand_landmarker
    active_model = gesture_trainer.get_active_model()
    return {
        "status": "healthy",
        "models_loaded": _models_loaded,
        "gesture_recognizer": _global_gesture_recognizer is not None,
        "hand_landmarker": _global_hand_landmarker is not None,
        "trained_dialect_active": active_model is not None,
        "trained_classes": active_model.labels if active_model else []
    }

# ── ENDPOINTS DEL MÓDULO ADMINISTRADOR ("ESTUDIO DE GESTOS E IA") ─────────────

@app.get("/api/gestures")
async def get_gestures():
    """Retorna el catálogo completo de señas y movimientos del dialecto."""
    return gesture_trainer.load_gestures()

@app.post("/api/gestures")
async def create_gesture(req: CreateGestureRequest):
    """Agrega un nuevo gesto o movimiento al dialecto escolar con soporte bilingüe."""
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="El nombre del gesto es obligatorio")
    gesture = gesture_trainer.add_gesture(req.name, req.type, req.description, req.name_en)
    return {"status": "created", "gesture": gesture}

@app.delete("/api/gestures/{gesture_id}")
async def delete_gesture(gesture_id: str):
    """Elimina un gesto y sus muestras asociadas."""
    success = gesture_trainer.delete_gesture(gesture_id)
    return {"status": "deleted", "gesture_id": gesture_id, "success": success}

_global_extractor_model = None

def get_extractor_model():
    global _global_extractor_model
    if _global_extractor_model is None:
        _global_extractor_model = ISLModel()
    return _global_extractor_model

@app.post("/api/gestures/extract-frame")
async def extract_frame_landmarks(req: ExtractFrameRequest):
    """
    Extrae puntos en tiempo real de un fotograma para alimentar la vista del
    esqueleto visual y recopilar muestras de entrenamiento de forma instantánea.
    """
    model = get_extractor_model()
    res = model.extract_landmarks_from_base64(req.image_base64)
    return res or {"detected": False, "vector": [], "hands": []}

@app.post("/api/gestures/record-sample")
async def record_sample(req: RecordSampleRequest):
    """
    Guarda una secuencia de 30 fotogramas grabada por el administrador.
    """
    try:
        filepath = gesture_trainer.save_sample(req.gesture_id, req.sequence)
        gestures = gesture_trainer.load_gestures()
        count = 0
        for g in gestures:
            if g["id"] == req.gesture_id:
                count = g.get("sample_count", 0)
                break
        return {
            "status": "saved",
            "gesture_id": req.gesture_id,
            "sample_count": count,
            "file": os.path.basename(filepath)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/gestures/train")
async def train_model_endpoint(background_tasks: BackgroundTasks):
    """
    Inicia el entrenamiento de la Red Neuronal de dialecto en segundo plano.
    Emite el progreso en tiempo real a través de Socket.IO.
    """
    if training_lock.locked():
        return {"status": "busy", "message": "Ya hay un entrenamiento en progreso."}

    async def run_training():
        async with training_lock:
            def progress_callback(epoch, total_epochs, loss, accuracy):
                asyncio.run(sio.emit("training_progress", {
                    "epoch": epoch,
                    "total_epochs": total_epochs,
                    "loss": round(loss, 4),
                    "accuracy": round(accuracy * 100, 1),
                    "percent": int((epoch / total_epochs) * 100)
                }))

            await sio.emit("training_started", {"message": "Iniciando entrenamiento de IA..."})
            result = await asyncio.to_thread(gesture_trainer.train_dialect_model, 40, progress_callback)
            
            if result.get("success"):
                await sio.emit("training_completed", {
                    "success": True,
                    "message": "Entrenamiento completado exitosamente!",
                    "accuracy": result.get("final_accuracy"),
                    "classes": result.get("classes"),
                    "total_samples": result.get("total_samples")
                })
            else:
                await sio.emit("training_failed", {
                    "success": False,
                    "error": result.get("error", "Error desconocido en el entrenamiento")
                })

    background_tasks.add_task(run_training)
    return {"status": "training_started", "message": "Entrenamiento iniciado en segundo plano."}

# ── ENDPOINT PARA ENCAMINAR AUDIO A LOS LENTES ESP32-CAM ──────────────────────
@app.post("/api/esp32/audio")
async def route_audio_to_esp32(req: RouteAudioRequest):
    """
    Si el usuario seleccionó como salida de audio 'Lentes CokieLens',
    envía el comando HTTP POST al ESP32 para reproducir en sus audífonos/bocina.
    """
    try:
        target_url = f"http://{req.esp32_ip.replace('http://', '').strip('/')}/play"
        data = req.text.encode('utf-8')
        request = urllib.request.Request(target_url, data=data, headers={'Content-Type': 'text/plain'})
        with urllib.request.urlopen(request, timeout=2) as response:
            return {"status": "sent_to_lentes", "esp32_status": response.status}
    except Exception as e:
        # Si no responde el ESP32, avisar sin colapsar
        return {"status": "failed_lentes", "error": str(e)}

# ── SOCKET.IO EVENTOS (STREAMING DE INFERENCIA EN TIEMPO REAL) ────────────────
@sio.event
async def connect(sid, environ):
    print(f"[SOCKET.IO] Cliente conectado: {sid}")
    user_sessions[sid] = ISLModel()
    await sio.emit('status', {'message': 'Conectado al servidor de Intérprete Cokie College'}, room=sid)

@sio.event
async def disconnect(sid):
    print(f"[SOCKET.IO] Cliente desconectado: {sid}")
    if sid in user_sessions:
        del user_sessions[sid]

@sio.event
async def process_frame(sid, data):
    """
    Recibe fotogramas de la app (capturados de los Lentes ESP32 o de la cámara móvil/web).
    Ejecuta inferencia de alta velocidad y emite el texto resultante de forma inmediata.
    """
    model = user_sessions.get(sid)
    if not model:
        return
    
    # Descarte proactivo: si la IA está ocupada con un frame, ignorar para evitar retrasos acumulados
    if inference_lock.locked():
        return
    
    async with inference_lock:
        translation = await asyncio.to_thread(model.process_frame_base64, data)
    
    # Si se detectó una seña o movimiento estable, emitir INMEDIATAMENTE
    if translation:
        if isinstance(translation, dict):
            payload = translation
        else:
            payload = {"id": translation, "text": translation}
        print(f"[TRADUCCIÓN] {sid} => {payload}")
        # Enviar texto/objeto bilingüe. La app móvil/web lo pronuncia al instante en el idioma del usuario
        await sio.emit('translation_result', payload, room=sid)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    print(f"Iniciando Cokie College AI Service en puerto {port}...")
    uvicorn.run(socket_app, host="0.0.0.0", port=port)
