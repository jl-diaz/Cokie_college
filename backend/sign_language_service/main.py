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
import time

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
inactivity_task = None

async def inactivity_monitor_task():
    """
    Vigila periódicamente el tiempo de inactividad de las sesiones activas.
    Si el usuario deja de hacer señas o pausa el flujo por inactivity_timeout segundos,
    se finaliza y puntúa la oración automáticamente y se emite sentence_complete.
    """
    while True:
        try:
            await asyncio.sleep(0.4)
            for sid, model in list(user_sessions.items()):
                if hasattr(model, 'sentence_builder'):
                    final_payload = model.sentence_builder.check_inactivity()
                    if final_payload:
                        print(f"[ORACIÓN COMPLETADA POR TIMEOUT] {sid} => {final_payload['sentence']}")
                        await sio.emit('sentence_complete', final_payload, room=sid)
        except asyncio.CancelledError:
            break
        except Exception as e:
            pass

@app.on_event("startup")
async def startup_event():
    global inactivity_task
    inactivity_task = asyncio.create_task(inactivity_monitor_task())

@app.on_event("shutdown")
async def shutdown_event():
    global inactivity_task
    if inactivity_task:
        inactivity_task.cancel()

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
                    "quality_gate_passed": result.get("quality_gate_passed", True),
                    "message": "Entrenamiento completado y validado!" if result.get("quality_gate_passed") else "Entrenamiento completado, pero no superó el quality gate (<70%). Se conserva el modelo previo.",
                    "accuracy": result.get("final_accuracy"),
                    "train_accuracy": result.get("train_accuracy"),
                    "test_accuracy": result.get("test_accuracy"),
                    "classes": result.get("classes"),
                    "total_samples": result.get("total_samples"),
                    "per_class_metrics": result.get("per_class_metrics", {})
                })
            else:
                await sio.emit("training_failed", {
                    "success": False,
                    "error": result.get("error", "Error desconocido en el entrenamiento")
                })

    background_tasks.add_task(run_training)
    return {"status": "training_started", "message": "Entrenamiento iniciado en segundo plano."}

@app.get("/api/gestures/model-status")
async def get_model_status():
    """Retorna metadatos del modelo activo, clases entrenadas y disponibilidad de rollback."""
    active_model = gesture_trainer.get_active_model()
    has_backup = os.path.exists(gesture_trainer.PREV_MODEL_FILE)
    model_exists = os.path.exists(gesture_trainer.MODEL_FILE)
    model_mtime = None
    if model_exists:
        model_mtime = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(gesture_trainer.MODEL_FILE)))
    backup_mtime = None
    if has_backup:
        backup_mtime = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(gesture_trainer.PREV_MODEL_FILE)))
        
    return {
        "model_exists": model_exists,
        "active_classes": active_model.labels if active_model else [],
        "num_classes": len(active_model.labels) if active_model else 0,
        "last_trained": model_mtime,
        "has_rollback_backup": has_backup,
        "backup_date": backup_mtime
    }

@app.post("/api/gestures/rollback")
async def rollback_model_endpoint():
    """Restaura el modelo previo guardado ante degradación de métricas."""
    res = gesture_trainer.rollback_model()
    return res


# ── ENDPOINT PARA ENCAMINAR AUDIO A LOS LENTES ESP32-CAM ──────────────────────
@app.post("/api/esp32/audio")
async def route_audio_to_esp32(req: RouteAudioRequest):
    """
    Si el usuario seleccionó como salida de audio 'Lentes CokieLens',
    envía el comando HTTP POST al ESP32 para reproducir en sus audífonos/bocina.
    """
    try:
        clean_ip = req.esp32_ip.replace('https://', '').replace('http://', '').strip().strip('/')
        target_url = f"http://{clean_ip}/play"
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

@app.get("/api/sessions/{sid}/sentence")
async def get_session_sentence(sid: str):
    """Retorna el estado de la oración acumulada para una sesión."""
    model = user_sessions.get(sid)
    if not model or not hasattr(model, 'sentence_builder'):
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return model.sentence_builder.get_status()

@sio.event
async def clear_sentence(sid):
    """Permite al cliente reiniciar/limpiar la oración en curso manualmente."""
    model = user_sessions.get(sid)
    if model and hasattr(model, 'sentence_builder'):
        cleared_info = model.sentence_builder.clear()
        print(f"[ORACIÓN LIMPIADA] {sid}")
        await sio.emit('sentence_cleared', cleared_info, room=sid)

@sio.event
async def set_sentence_timeout(sid, data):
    """Permite configurar el tiempo de inactividad (ej. 2.0s a 8.0s) desde el cliente."""
    model = user_sessions.get(sid)
    if model and hasattr(model, 'sentence_builder'):
        try:
            raw_timeout = data.get('timeout') if isinstance(data, dict) else data
            new_timeout = float(raw_timeout)
            model.sentence_builder.inactivity_timeout = max(1.5, min(10.0, new_timeout))
            print(f"[TIMEOUT ACTUALIZADO] {sid} => {model.sentence_builder.inactivity_timeout}s")
            await sio.emit('status', {'message': f'Timeout de oración configurado a {model.sentence_builder.inactivity_timeout}s'}, room=sid)
        except Exception as e:
            print(f"Error configurando timeout: {e}")

@sio.event
async def process_frame(sid, data):
    """
    Recibe fotogramas de la app (capturados de los Lentes ESP32 o de la cámara móvil/web).
    Ejecuta inferencia de alta velocidad, actualiza la oración acumulada y emite el texto resultante.
    """
    model = user_sessions.get(sid)
    if not model:
        return
    
    # Descarte proactivo: si la IA está ocupada con un frame, ignorar para evitar retrasos acumulados
    if inference_lock.locked():
        return
    
    async with inference_lock:
        result = await asyncio.to_thread(model.process_frame_base64, data)

    if result and isinstance(result, dict):
        landmarks = result.get("landmarks")
        if landmarks:
            await sio.emit('landmarks_data', landmarks, room=sid)

        # 1. Evento de actualización de oración (cuando se formula o añade una nueva seña)
        sentence_update = result.get("sentence_update")
        if sentence_update:
            await sio.emit('sentence_update', sentence_update, room=sid)

        # 2. Evento de finalización de oración (cuando se cumple el tiempo de inactividad sin señas)
        sentence_complete = result.get("sentence_complete")
        if sentence_complete:
            print(f"[ORACIÓN COMPLETADA] {sid} => {sentence_complete['sentence']}")
            await sio.emit('sentence_complete', sentence_complete, room=sid)

        # 3. Evento clásico translation_result (enriquecido para retrocompatibilidad total)
        translation = result.get("translation")
        if translation:
            payload = translation if isinstance(translation, dict) else {"id": translation, "text": translation}
            if sentence_update:
                payload["accumulated_sentence"] = sentence_update.get("accumulated_sentence", "")
                payload["accumulated_sentence_en"] = sentence_update.get("accumulated_sentence_en", "")
                payload["words"] = sentence_update.get("words", [])
                payload["is_final"] = False
            elif hasattr(model, 'sentence_builder'):
                status = model.sentence_builder.get_status()
                payload["accumulated_sentence"] = status.get("accumulated_sentence", "")
                payload["accumulated_sentence_en"] = status.get("accumulated_sentence_en", "")
                payload["words"] = model.sentence_builder.tokens_es
                payload["is_final"] = status.get("is_final", False)

            print(f"[TRADUCCIÓN] {sid} => {payload.get('text')} | Oración: \"{payload.get('accumulated_sentence', payload.get('text'))}\"")
            await sio.emit('translation_result', payload, room=sid)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    print(f"Iniciando Cokie College AI Service en puerto {port}...")
    uvicorn.run(socket_app, host="0.0.0.0", port=port)
