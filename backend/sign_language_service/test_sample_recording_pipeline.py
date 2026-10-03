import os
import sys
import json
import base64
import numpy as np
import cv2
import asyncio

# Import backend modules
from main import record_sample, RecordSampleRequest
import gesture_trainer
from isl_model import ISLModel, load_models

def create_synthetic_hand_frame(with_hand=True):
    """Genera una imagen sintética en base64 con o sin dibujo de mano."""
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    if with_hand:
        # Dibujar una palma y dedos básicos en blanco para simulación visual
        cv2.circle(img, (150, 180), 40, (255, 255, 255), -1)
        for i, dx in enumerate([-30, -15, 0, 15, 30]):
            cv2.line(img, (150 + dx, 160), (150 + dx, 80 + abs(dx)), (255, 255, 255), 10)
    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')

def test_pipeline():
    print("=" * 60)
    print("TEST PIPELINE: GRABACIÓN Y GUARDADO DE MUESTRAS IA")
    print("=" * 60)

    # 1. Asegurar catálogo y muestras base
    gestures = gesture_trainer.load_gestures()
    print(f"[PASO 1] Catálogo de gestos cargado: {len(gestures)} gestos disponibles.")
    assert len(gestures) >= 10, "El catálogo debería contener los gestos predefinidos"

    # Seleccionar gesto de prueba
    test_gesture_id = "hola"
    initial_hola = next(g for g in gestures if g["id"] == test_gesture_id)
    initial_count = initial_hola.get("sample_count", 0)
    print(f"[PASO 2] Gesto de prueba '{test_gesture_id}': Muestras iniciales = {initial_count}")

    # 2. Prueba de guardado con secuencia de vectores (Modo 1: vectores pre-extraídos)
    mock_vector = [0.05 * (i % 10) for i in range(126)]
    mock_sequence = [mock_vector] * 12 # 12 cuadros capturados en movimiento
    req1 = RecordSampleRequest(
        gesture_id=test_gesture_id,
        sequence=mock_sequence
    )
    res1 = asyncio.run(record_sample(req1))
    print(f"[PASO 3] Guardado con secuencia de vectores: {res1}")
    assert res1["status"] == "saved"
    assert res1["sample_count"] == initial_count + 1
    assert res1["frames_recorded"] == 12

    # Verificar que el archivo .npy generado tiene exactamente 30 fotogramas interpolados
    filepath1 = os.path.join(gesture_trainer.SAMPLES_DIR, test_gesture_id, res1["file"])
    assert os.path.exists(filepath1), f"El archivo {filepath1} debe existir en disco"
    arr1 = np.load(filepath1)
    print(f"[PASO 4] Archivo guardado verificado en disco: {arr1.shape} (esperado: 30, 126)")
    assert arr1.shape == (30, 126), f"Formato erróneo: {arr1.shape}, se esperaba (30, 126)"

    # 3. Prueba de guardado con una sola postura estática (1 vector replicado)
    req2 = RecordSampleRequest(
        gesture_id="te_quiero",
        sequence=[mock_vector] # 1 solo fotograma de postura fija
    )
    res2 = asyncio.run(record_sample(req2))
    print(f"[PASO 5] Guardado de postura estática (1 frame): {res2}")
    assert res2["status"] == "saved"
    filepath2 = os.path.join(gesture_trainer.SAMPLES_DIR, "te_quiero", res2["file"])
    arr2 = np.load(filepath2)
    assert arr2.shape == (30, 126), f"Debe replicarse a (30, 126): {arr2.shape}"

    # 4. Prueba de entrenamiento inmediato con las muestras guardadas
    print("[PASO 6] Ejecutando entrenamiento de IA con datos actualizados...")
    train_res = gesture_trainer.train_dialect_model(epochs=10)
    print(f"[PASO 7] Resultado del entrenamiento: {train_res.get('success')}, Calidad: {train_res.get('quality_gate_passed')}, Accuracy: {train_res.get('test_accuracy')}%")
    assert train_res.get("success") == True, f"El entrenamiento falló: {train_res}"
    assert train_res.get("test_accuracy") > 70.0, "La precisión debe superar el quality gate"

    # 5. Verificar modelo activo recargado en caliente
    active = gesture_trainer.get_active_model()
    assert active is not None, "El modelo activo debe estar cargado en memoria"
    assert test_gesture_id in active.labels, f"'{test_gesture_id}' debe estar en las clases del modelo"

    print("=" * 60)
    print("¡TODAS LAS PRUEBAS DEL PIPELINE DE GUARDADO Y ENTRENAMIENTO PASARON AL 100%!")
    print("=" * 60)

if __name__ == "__main__":
    test_pipeline()
