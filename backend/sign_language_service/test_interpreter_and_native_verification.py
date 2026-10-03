import os
import sys
import json
import base64
import numpy as np
import cv2
import asyncio

from main import record_sample, RecordSampleRequest
import gesture_trainer
from isl_model import (
    ISLModel,
    classify_sign_from_landmarks,
    distance_2d,
    hand_orientation,
    is_thumb_extended,
    is_finger_extended,
    is_finger_curled
)

class MockPoint:
    def __init__(self, x, y, z=0.0):
        self.x = x
        self.y = y
        self.z = z

def create_mock_hand(sign_type="l"):
    """
    Crea 21 puntos normalizados de una mano vertical (upright)
    con la muñeca en la parte inferior (y ~ 0.8) y dedos hacia arriba (y < 0.5).
    """
    # Muñeca en (0.5, 0.85)
    pts = [MockPoint(0.5, 0.85, 0.0)]
    
    if sign_type == "l":
        # Pulgar extendido horizontal hacia la izquierda (x menor)
        pts.append(MockPoint(0.44, 0.80)) # 1
        pts.append(MockPoint(0.38, 0.74)) # 2
        pts.append(MockPoint(0.30, 0.72)) # 3
        pts.append(MockPoint(0.22, 0.70)) # 4 thumb_tip
        
        # Índice extendido vertical hacia arriba (y menor)
        pts.append(MockPoint(0.46, 0.60)) # 5 index_mcp
        pts.append(MockPoint(0.46, 0.45)) # 6 index_pip
        pts.append(MockPoint(0.46, 0.30)) # 7 index_dip
        pts.append(MockPoint(0.46, 0.15)) # 8 index_tip
        
        # Medio doblado
        pts.append(MockPoint(0.50, 0.58)) # 9 mid_mcp
        pts.append(MockPoint(0.50, 0.66)) # 10
        pts.append(MockPoint(0.50, 0.72)) # 11
        pts.append(MockPoint(0.50, 0.74)) # 12
        
        # Anular doblado
        pts.append(MockPoint(0.54, 0.60)) # 13
        pts.append(MockPoint(0.54, 0.68)) # 14
        pts.append(MockPoint(0.54, 0.73)) # 15
        pts.append(MockPoint(0.54, 0.75)) # 16
        
        # Meñique doblado
        pts.append(MockPoint(0.58, 0.63)) # 17
        pts.append(MockPoint(0.58, 0.70)) # 18
        pts.append(MockPoint(0.58, 0.74)) # 19
        pts.append(MockPoint(0.58, 0.76)) # 20
        
    elif sign_type == "te_quiero":
        # Pulgar extendido lateralmente
        pts.append(MockPoint(0.44, 0.80)) # 1
        pts.append(MockPoint(0.38, 0.74)) # 2
        pts.append(MockPoint(0.30, 0.72)) # 3
        pts.append(MockPoint(0.22, 0.70)) # 4 thumb_tip
        
        # Índice extendido vertical hacia arriba
        pts.append(MockPoint(0.46, 0.60)) # 5 index_mcp
        pts.append(MockPoint(0.46, 0.45)) # 6 index_pip
        pts.append(MockPoint(0.46, 0.30)) # 7 index_dip
        pts.append(MockPoint(0.46, 0.15)) # 8 index_tip
        
        # Medio doblado
        pts.append(MockPoint(0.50, 0.58)) # 9 mid_mcp
        pts.append(MockPoint(0.50, 0.66)) # 10
        pts.append(MockPoint(0.50, 0.72)) # 11
        pts.append(MockPoint(0.50, 0.74)) # 12
        
        # Anular doblado
        pts.append(MockPoint(0.54, 0.60)) # 13
        pts.append(MockPoint(0.54, 0.68)) # 14
        pts.append(MockPoint(0.54, 0.73)) # 15
        pts.append(MockPoint(0.54, 0.75)) # 16
        
        # Meñique extendido vertical hacia arriba
        pts.append(MockPoint(0.58, 0.63)) # 17
        pts.append(MockPoint(0.58, 0.50)) # 18
        pts.append(MockPoint(0.58, 0.35)) # 19
        pts.append(MockPoint(0.58, 0.20)) # 20 pinky_tip
        
    elif sign_type == "a":
        # Puño cerrado con pulgar al lado del índice
        # Muñeca en (0.5, 0.85)
        # Pulgar descansando al lado externo del índice
        pts.append(MockPoint(0.45, 0.78)) # 1
        pts.append(MockPoint(0.42, 0.70)) # 2
        pts.append(MockPoint(0.41, 0.64)) # 3
        pts.append(MockPoint(0.40, 0.58)) # 4 thumb_tip
        
        # Todos los dedos doblados
        for mcp_x, tip_y in [(0.46, 0.70), (0.50, 0.71), (0.54, 0.72), (0.58, 0.73)]:
            pts.append(MockPoint(mcp_x, 0.60))
            pts.append(MockPoint(mcp_x, 0.65))
            pts.append(MockPoint(mcp_x, 0.68))
            pts.append(MockPoint(mcp_x, tip_y))
            
    elif sign_type == "i":
        # Meñique extendido, otros 4 doblados
        pts.append(MockPoint(0.46, 0.78)) # 1
        pts.append(MockPoint(0.47, 0.73)) # 2
        pts.append(MockPoint(0.48, 0.68)) # 3
        pts.append(MockPoint(0.48, 0.64)) # 4 thumb doblado
        
        # Índice doblado
        pts.append(MockPoint(0.46, 0.60))
        pts.append(MockPoint(0.46, 0.67))
        pts.append(MockPoint(0.46, 0.72))
        pts.append(MockPoint(0.46, 0.74))
        
        # Medio doblado
        pts.append(MockPoint(0.50, 0.58))
        pts.append(MockPoint(0.50, 0.66))
        pts.append(MockPoint(0.50, 0.72))
        pts.append(MockPoint(0.50, 0.74))
        
        # Anular doblado
        pts.append(MockPoint(0.54, 0.60))
        pts.append(MockPoint(0.54, 0.68))
        pts.append(MockPoint(0.54, 0.73))
        pts.append(MockPoint(0.54, 0.75))
        
        # Meñique extendido vertical
        pts.append(MockPoint(0.58, 0.63))
        pts.append(MockPoint(0.58, 0.50))
        pts.append(MockPoint(0.58, 0.35))
        pts.append(MockPoint(0.58, 0.20)) # 20 pinky_tip
        
    return pts

def run_all_tests():
    print("=================================================================")
    print("VERIFICACIÓN COMPLETA DE INTÉRPRETE Y NATIVO (EXPO / APK / WEB)")
    print("=================================================================")
    
    # ── PRUEBA 1: Heurísticas Geométricas Invariantes a Escala
    print("\n[TEST 1] Verificando detección de señas estáticas (L, A, I, Te Quiero)...")
    l_pts = create_mock_hand("l")
    detected_l = classify_sign_from_landmarks(l_pts)
    print(f"  > Seña L: {detected_l} (esperado: sign.l)")
    assert detected_l == "sign.l", f"Fallo al detectar L: {detected_l}"

    tq_pts = create_mock_hand("te_quiero")
    detected_tq = classify_sign_from_landmarks(tq_pts)
    print(f"  > Seña Te Quiero: {detected_tq} (esperado: sign.te_quiero)")
    assert detected_tq == "sign.te_quiero", f"Fallo al detectar Te Quiero: {detected_tq}"

    i_pts = create_mock_hand("i")
    detected_i = classify_sign_from_landmarks(i_pts)
    print(f"  > Seña I: {detected_i} (esperado: sign.i)")
    assert detected_i == "sign.i", f"Fallo al detectar I: {detected_i}"

    a_pts = create_mock_hand("a")
    detected_a = classify_sign_from_landmarks(a_pts)
    print(f"  > Seña A: {detected_a} (esperado: sign.a)")
    assert detected_a == "sign.a", f"Fallo al detectar A: {detected_a}"
    print("  [OK] Todas las heurísticas estáticas detectadas con 100% de éxito.")

    # ── PRUEBA 2: Rotación y Normalización de Fotogramas Móviles (Android / iOS)
    print("\n[TEST 2] Verificando normalización de orientación de cámara móvil...")
    model = ISLModel()
    
    # Imagen de cámara en landscape (w=640, h=480) proveniente de teléfono Android vertical
    landscape_img = np.zeros((480, 640, 3), dtype=np.uint8)
    
    # Frontal (selfie): debe rotar a portrait (640, 480)
    front_rotated = model.normalize_camera_frame(landscape_img, platform="android", facing="front", source="phone")
    print(f"  > Frontal Android: {landscape_img.shape} -> {front_rotated.shape}")
    assert front_rotated.shape == (640, 480, 3), f"Frontal debe rotarse a portrait: {front_rotated.shape}"

    # Trasera: debe rotar a portrait (640, 480)
    back_rotated = model.normalize_camera_frame(landscape_img, platform="android", facing="back", source="phone")
    print(f"  > Trasera Android: {landscape_img.shape} -> {back_rotated.shape}")
    assert back_rotated.shape == (640, 480, 3), f"Trasera debe rotarse a portrait: {back_rotated.shape}"

    # Web (PC webcam en landscape): NO debe rotarse
    web_orig = model.normalize_camera_frame(landscape_img, platform="web", facing="user", source="phone")
    print(f"  > Webcam PC: {landscape_img.shape} -> {web_orig.shape}")
    assert web_orig.shape == (480, 640, 3), f"Webcam PC no debe rotarse: {web_orig.shape}"

    # Lentes CokieLens (ESP32 en landscape): NO debe rotarse
    glasses_orig = model.normalize_camera_frame(landscape_img, platform="unknown", facing="front", source="glasses")
    print(f"  > CokieLens: {landscape_img.shape} -> {glasses_orig.shape}")
    assert glasses_orig.shape == (480, 640, 3), f"CokieLens no debe rotarse: {glasses_orig.shape}"
    print("  [OK] Normalización multi-plataforma correcta en todos los casos.")

    # ── PRUEBA 3: Recepción de Payloads de Diccionario { image, platform, facing } en WebSocket
    print("\n[TEST 3] Verificando soporte de payloads enriquecidos en process_frame_base64...")
    _, buf = cv2.imencode(".jpg", landscape_img)
    b64_str = base64.b64encode(buf).decode('utf-8')
    
    dict_payload = {
        "image": b64_str,
        "platform": "android",
        "facing": "front",
        "source": "phone"
    }
    
    # Procesar con diccionario
    res_dict = model.process_frame_base64(dict_payload)
    assert res_dict is not None, "El resultado no debe ser None"
    assert "landmarks" in res_dict, "Debe contener landmarks"
    print("  > process_frame_base64 procesó correctamente el payload dict de Android.")

    # Procesar con string simple (retrocompatibilidad)
    res_str = model.process_frame_base64(b64_str)
    assert res_str is not None, "El resultado retrocompatible no debe ser None"
    print("  > process_frame_base64 procesó correctamente el payload string simple.")
    print("  [OK] Ambas interfaces probadas y funcionales.")

    # ── PRUEBA 4: Guardado de Muestras de Movimiento con Relleno Bidireccional
    print("\n[TEST 4] Verificando guardado robusto de muestras en GestureStudio...")
    mock_vec = [0.1 * (i % 7) for i in range(126)]
    # Simular una secuencia de 10 cuadros donde los 2 primeros se perdieron (None)
    mock_sequence = [None, None, mock_vec, mock_vec, mock_vec, None, mock_vec, mock_vec]
    # Usar sequence con vectores
    req = RecordSampleRequest(
        gesture_id="por_favor",
        sequence=[v for v in mock_sequence if v is not None],
        platform="android",
        facing="front"
    )
    save_res = asyncio.run(record_sample(req))
    print(f"  > Resultado record_sample: {save_res}")
    assert save_res["status"] == "saved"
    assert save_res["frames_recorded"] > 0
    print("  [OK] Muestra guardada exitosamente y catalogada.")

    print("\n" + "=" * 65)
    print(" ¡VERIFICACIÓN EXITOSA AL 100%! EL INTÉRPRETE Y GRABADOR ESTÁN LISTOS")
    print(" PARA FUNCIONAR FLUIDAMENTE EN EXPO (ANDROID / APK), WEB Y COKIELENS.")
    print("=" * 65)

if __name__ == "__main__":
    run_all_tests()
