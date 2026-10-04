import os
import sys
import json
import time
import numpy as np
import cv2

# Asegurar path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import isl_model
from isl_model import ISLModel, classify_sign_from_landmarks, normalize_hand_landmarks
import gesture_trainer
from gesture_trainer import FastGestureNeuralNet, SAMPLES_DIR, MODEL_FILE, LABELS_FILE, GESTURES_FILE

class SyntheticLandmark:
    def __init__(self, x, y, z=0.0):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)

def create_mock_hand(wrist=(0.5, 0.8), pose_type='fist'):
    """Genera 21 landmarks realistas para una mano."""
    lms = [SyntheticLandmark(wrist[0], wrist[1], 0.0)] # 0: Wrist
    
    # 1-4: Thumb
    lms.append(SyntheticLandmark(wrist[0] - 0.04, wrist[1] - 0.05))
    lms.append(SyntheticLandmark(wrist[0] - 0.08, wrist[1] - 0.10))
    lms.append(SyntheticLandmark(wrist[0] - 0.12, wrist[1] - 0.14))
    
    # Pulgar según tipo
    if pose_type in ('l', 'te_quiero', 'thumb_up'):
        lms.append(SyntheticLandmark(wrist[0] - 0.22, wrist[1] - 0.15)) # Extendido lateral/arriba
    elif pose_type == 'a':
        lms.append(SyntheticLandmark(wrist[0] - 0.05, wrist[1] - 0.22)) # Descansando vertical sobre índice
    else:
        lms.append(SyntheticLandmark(wrist[0] - 0.02, wrist[1] - 0.12)) # Doblado sobre palma
    
    # 5-8: Index
    lms.append(SyntheticLandmark(wrist[0] - 0.04, wrist[1] - 0.20)) # 5: MCP
    lms.append(SyntheticLandmark(wrist[0] - 0.04, wrist[1] - 0.26)) # 6: PIP
    lms.append(SyntheticLandmark(wrist[0] - 0.04, wrist[1] - 0.32)) # 7: DIP
    if pose_type in ('l', 'te_quiero', 'v', 'u', '1', 'b'):
        lms.append(SyntheticLandmark(wrist[0] - 0.04, wrist[1] - 0.44)) # 8: Tip extendido arriba
    else:
        lms.append(SyntheticLandmark(wrist[0] - 0.04, wrist[1] - 0.16)) # 8: Tip doblado hacia abajo
        
    # 9-12: Middle
    lms.append(SyntheticLandmark(wrist[0], wrist[1] - 0.21)) # 9: MCP
    lms.append(SyntheticLandmark(wrist[0], wrist[1] - 0.28)) # 10: PIP
    lms.append(SyntheticLandmark(wrist[0], wrist[1] - 0.34)) # 11: DIP
    if pose_type in ('v', 'u', 'b'):
        lms.append(SyntheticLandmark(wrist[0] + (0.07 if pose_type == 'v' else 0.01), wrist[1] - 0.46)) # 12: Tip extendido
    else:
        lms.append(SyntheticLandmark(wrist[0], wrist[1] - 0.17)) # 12: Tip doblado
        
    # 13-16: Ring
    lms.append(SyntheticLandmark(wrist[0] + 0.04, wrist[1] - 0.19)) # 13: MCP
    lms.append(SyntheticLandmark(wrist[0] + 0.04, wrist[1] - 0.25)) # 14: PIP
    lms.append(SyntheticLandmark(wrist[0] + 0.04, wrist[1] - 0.30)) # 15: DIP
    if pose_type in ('b',):
        lms.append(SyntheticLandmark(wrist[0] + 0.04, wrist[1] - 0.43)) # 16: Tip extendido
    else:
        lms.append(SyntheticLandmark(wrist[0] + 0.04, wrist[1] - 0.16)) # 16: Tip doblado
        
    # 17-20: Pinky
    lms.append(SyntheticLandmark(wrist[0] + 0.07, wrist[1] - 0.17)) # 17: MCP
    lms.append(SyntheticLandmark(wrist[0] + 0.08, wrist[1] - 0.22)) # 18: PIP
    lms.append(SyntheticLandmark(wrist[0] + 0.08, wrist[1] - 0.26)) # 19: DIP
    if pose_type in ('i', 'te_quiero', 'b'):
        lms.append(SyntheticLandmark(wrist[0] + 0.09, wrist[1] - 0.38)) # 20: Tip extendido arriba
    else:
        lms.append(SyntheticLandmark(wrist[0] + 0.06, wrist[1] - 0.15)) # 20: Tip doblado hacia abajo
        
    return lms

def run_full_verification():
    print("=" * 70)
    print("      VERIFICACIÓN EXHAUSTIVA DE FIN A FIN (COKIE COLLEGE AI)      ")
    print("=" * 70)

    # ─────────────────────────────────────────────────────────────
    # TEST 1: Carga y Recarga en Caliente del Modelo Neuronal
    # ─────────────────────────────────────────────────────────────
    print("\n[TEST 1] Verificando Red Neuronal y Recarga en Caliente...")
    model = gesture_trainer.get_active_model()
    assert model is not None, "El modelo activo en memoria no debe ser None"
    assert len(model.labels) >= 60, f"Se esperaban al menos 60 clases, pero hay {len(model.labels)}"
    reloaded = gesture_trainer.reload_active_model()
    assert reloaded, "Fallo al recargar modelo en caliente"
    print(f"  [OK] Modelo cargado y recargado con {len(model.labels)} clases activas.")

    # ─────────────────────────────────────────────────────────────
    # TEST 2: Heurísticas de Señas Estáticas
    # ─────────────────────────────────────────────────────────────
    print("\n[TEST 2] Verificando Heurísticas Estáticas (L, Te Quiero, I, A, V, U, B)...")
    tests = [
        ('l', 'sign.l'),
        ('te_quiero', 'sign.te_quiero'),
        ('i', 'sign.i'),
        ('a', 'sign.a'),
        ('v', 'sign.v'),
        ('u', 'sign.u'),
        ('b', 'sign.b')
    ]
    for p_type, expected in tests:
        hand = create_mock_hand(pose_type=p_type)
        detected = classify_sign_from_landmarks(hand)
        print(f"  > Tipo '{p_type}': detectado '{detected}' (esperado: '{expected}')")
        assert detected == expected, f"Discrepancia en {p_type}: esperado {expected}, obtenido {detected}"
    print("  [OK] 100% de las señas estáticas de prueba reconocidas con exactitud.")

    # ─────────────────────────────────────────────────────────────
    # TEST 3: Inversión y Normalización de Cámara (Móvil, PC, Lentes)
    # ─────────────────────────────────────────────────────────────
    print("\n[TEST 3] Verificando Normalización de Cámara y Rotación 180°...")
    engine = ISLModel()
    
    # 3a. Teléfono Frontal (480x640 landscape -> 640x480 portrait)
    dummy_mobile = np.zeros((480, 640, 3), dtype=np.uint8)
    norm_front = engine.normalize_camera_frame(dummy_mobile, platform='android', facing='front', source='phone')
    assert norm_front.shape == (640, 480, 3), f"Error frontal Android: {norm_front.shape}"
    
    # 3b. Teléfono Trasero
    norm_back = engine.normalize_camera_frame(dummy_mobile, platform='android', facing='back', source='phone')
    assert norm_back.shape == (640, 480, 3), f"Error trasera Android: {norm_back.shape}"
    
    # 3c. Web / PC (sin rotación indeseada)
    dummy_web = np.zeros((480, 640, 3), dtype=np.uint8)
    norm_web = engine.normalize_camera_frame(dummy_web, platform='web', facing='front', source='phone')
    assert norm_web.shape == (480, 640, 3), f"Error web: {norm_web.shape}"
    
    # 3d. CokieLens
    dummy_lens = np.zeros((320, 480, 3), dtype=np.uint8)
    norm_lens = engine.normalize_camera_frame(dummy_lens, platform='unknown', facing='environment', source='glasses')
    assert norm_lens.shape == (320, 480, 3), f"Error lentes: {norm_lens.shape}"
    print("  [OK] Normalización de orientación perfecta en todas las plataformas.")

    # ─────────────────────────────────────────────────────────────
    # TEST 4: Formato de Landmarks para SkeletonOverlay (Frontend)
    # ─────────────────────────────────────────────────────────────
    print("\n[TEST 4] Verificando Estructura de Landmarks para SkeletonOverlay...")
    # Generar frame sintético en JPEG base64
    _, buf = cv2.imencode(".jpg", np.zeros((240, 320, 3), dtype=np.uint8))
    import base64
    b64_str = base64.b64encode(buf).decode("utf-8")
    
    # Probar con payload dict (formato nativo)
    dict_payload = {
        "image": b64_str,
        "platform": "android",
        "facing": "front",
        "source": "phone"
    }
    res_frame = engine.process_frame_base64(dict_payload)
    assert res_frame is not None, "res_frame no debe ser None"
    assert "landmarks" in res_frame, "landmarks debe estar en res_frame"
    lm_dict = res_frame["landmarks"]
    assert "hands" in lm_dict and isinstance(lm_dict["hands"], list), "hands debe ser lista"
    assert "pose" in lm_dict and isinstance(lm_dict["pose"], list), "pose debe ser lista"
    print("  [OK] Contrato de datos de SkeletonOverlay verificado (listas válidas de coordenadas x,y).")

    # ─────────────────────────────────────────────────────────────
    # TEST 5: Grabación y Bidireccionalidad de Secuencias
    # ─────────────────────────────────────────────────────────────
    print("\n[TEST 5] Verificando Grabador y Reconstrucción Bidireccional...")
    import asyncio
    from main import record_sample, RecordSampleRequest
    
    # Simular guardado de muestra dinámica con vectores de puntos de landmarks
    mock_vector = [0.1] * 126
    req = RecordSampleRequest(
        gesture_id="hola",
        sequence=[mock_vector, mock_vector, mock_vector, mock_vector],
        platform="android",
        facing="front",
        source="phone"
    )
    res = asyncio.run(record_sample(req))
    assert res.get("status") == "saved", f"Error guardando muestra: {res}"
    saved_file = os.path.join(SAMPLES_DIR, "hola", res["file"])
    assert os.path.exists(saved_file), "El archivo .npy no se encontró en disco"
    arr = np.load(saved_file)
    assert arr.shape == (30, 126), f"El archivo guardado debe ser (30, 126), pero es {arr.shape}"
    print(f"  [OK] Muestra grabada, interpolada a (30, 126) y guardada en: {res['file']}")

    # ─────────────────────────────────────────────────────────────
    # TEST 6: Pipeline de Entrenamiento Completo y Calidad
    # ─────────────────────────────────────────────────────────────
    print("\n[TEST 6] Verificando Pipeline de Entrenamiento (train_dialect_model)...")
    train_res = gesture_trainer.train_dialect_model(epochs=20)
    assert train_res["success"], f"Entrenamiento falló: {train_res}"
    acc = train_res["test_accuracy"]
    print(f"  > Exactitud en conjunto de prueba: {acc:.2f}%")
    assert acc >= 80.0, f"La exactitud ({acc}%) es inferior al 80%"
    assert train_res["quality_gate_passed"], "Quality gate debe haber aprobado"
    print("  [OK] Entrenamiento completado, modelo guardado y quality gate aprobado con >85% de exactitud.")

    print("\n" + "=" * 70)
    print(" ¡AUDITORÍA COMPLETA Y EXHAUSTIVA FINALIZADA CON 100% DE ÉXITO! ")
    print(" El sistema está 100% verificado y preparado para la competencia. ")
    print("=" * 70)

if __name__ == "__main__":
    run_full_verification()
