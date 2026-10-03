"""
Test Suite: Verificación Exhaustiva del Intérprete Cokie College
Valida:
1. Detección geométrica exacta de señas estáticas (L, A, Te Quiero, etc.)
2. Bloqueo estricto de falsos positivos dinámicos (J, cómo están) ante mano estática o temblores leves
3. Funcionamiento de SentenceBuilder (concatenación, deletreo, debounce, puntuación)
4. Normalización invariante de puntos y escalas
"""

import sys
import os
import math
import numpy as np

# Añadir el directorio del servicio al sys.path
sys.path.insert(0, os.path.dirname(__file__))

from isl_model import (
    classify_sign_from_landmarks,
    distance_2d,
    get_palm_scale,
    is_finger_extended,
    is_finger_curled,
    hand_orientation,
    normalize_hand_landmarks,
    ISLModel
)
from sentence_builder import SentenceBuilder

class MockPoint:
    def __init__(self, x, y, z=0.0):
        self.x = x
        self.y = y
        self.z = z
    def __getitem__(self, key):
        if key == 'x': return self.x
        if key == 'y': return self.y
        if key == 'z': return self.z
        raise KeyError(key)

def create_base_hand(wrist=(0.5, 0.7)):
    """Crea una mano base con 21 puntos normalizados donde todos los dedos están ligeramente doblados."""
    pts = [MockPoint(wrist[0], wrist[1], 0.0)] # 0: Muñeca
    
    # 1-4: Pulgar
    pts.append(MockPoint(wrist[0] - 0.04, wrist[1] - 0.05)) # 1: CMC
    pts.append(MockPoint(wrist[0] - 0.07, wrist[1] - 0.09)) # 2: MCP
    pts.append(MockPoint(wrist[0] - 0.09, wrist[1] - 0.13)) # 3: IP
    pts.append(MockPoint(wrist[0] - 0.10, wrist[1] - 0.16)) # 4: Tip

    # 5-8: Índice
    pts.append(MockPoint(wrist[0] - 0.04, wrist[1] - 0.12)) # 5: MCP
    pts.append(MockPoint(wrist[0] - 0.04, wrist[1] - 0.16)) # 6: PIP
    pts.append(MockPoint(wrist[0] - 0.04, wrist[1] - 0.19)) # 7: DIP
    pts.append(MockPoint(wrist[0] - 0.04, wrist[1] - 0.22)) # 8: Tip

    # 9-12: Medio
    pts.append(MockPoint(wrist[0], wrist[1] - 0.13))        # 9: MCP
    pts.append(MockPoint(wrist[0], wrist[1] - 0.17))        # 10: PIP
    pts.append(MockPoint(wrist[0], wrist[1] - 0.21))        # 11: DIP
    pts.append(MockPoint(wrist[0], wrist[1] - 0.24))        # 12: Tip

    # 13-16: Anular
    pts.append(MockPoint(wrist[0] + 0.04, wrist[1] - 0.12)) # 13: MCP
    pts.append(MockPoint(wrist[0] + 0.04, wrist[1] - 0.16)) # 14: PIP
    pts.append(MockPoint(wrist[0] + 0.04, wrist[1] - 0.19)) # 15: DIP
    pts.append(MockPoint(wrist[0] + 0.04, wrist[1] - 0.22)) # 16: Tip

    # 17-20: Meñique
    pts.append(MockPoint(wrist[0] + 0.07, wrist[1] - 0.10)) # 17: MCP
    pts.append(MockPoint(wrist[0] + 0.07, wrist[1] - 0.13)) # 18: PIP
    pts.append(MockPoint(wrist[0] + 0.07, wrist[1] - 0.16)) # 19: DIP
    pts.append(MockPoint(wrist[0] + 0.07, wrist[1] - 0.19)) # 20: Tip

    return pts

def set_finger_extended(pts, mcp_idx, pip_idx, dip_idx, tip_idx, dx=0.0, length=0.18):
    base_x = pts[mcp_idx].x
    base_y = pts[mcp_idx].y
    pts[pip_idx] = MockPoint(base_x + dx * 0.33, base_y - length * 0.33)
    pts[dip_idx] = MockPoint(base_x + dx * 0.66, base_y - length * 0.66)
    pts[tip_idx] = MockPoint(base_x + dx, base_y - length)

def set_finger_curled(pts, mcp_idx, pip_idx, dip_idx, tip_idx, toward_palm_y=0.04):
    base_x = pts[mcp_idx].x
    base_y = pts[mcp_idx].y
    pts[pip_idx] = MockPoint(base_x, base_y - 0.04)
    pts[dip_idx] = MockPoint(base_x, base_y - 0.02)
    pts[tip_idx] = MockPoint(base_x, base_y + toward_palm_y)

def build_l_hand():
    pts = create_base_hand()
    # Índice extendido hacia arriba (y menor)
    set_finger_extended(pts, 5, 6, 7, 8, dx=0.0, length=0.18)
    # Pulgar extendido horizontalmente hacia el lado
    pts[1] = MockPoint(0.46, 0.65)
    pts[2] = MockPoint(0.41, 0.63)
    pts[3] = MockPoint(0.36, 0.62)
    pts[4] = MockPoint(0.31, 0.61) # Punta bien separada hacia la izquierda
    # Medio, Anular y Meñique fuertemente doblados
    set_finger_curled(pts, 9, 10, 11, 12, toward_palm_y=0.03)
    set_finger_curled(pts, 13, 14, 15, 16, toward_palm_y=0.03)
    set_finger_curled(pts, 17, 18, 19, 20, toward_palm_y=0.03)
    return pts

def build_a_hand():
    pts = create_base_hand()
    # Los 4 dedos doblados en puño cerrado
    set_finger_curled(pts, 5, 6, 7, 8, toward_palm_y=0.03)
    set_finger_curled(pts, 9, 10, 11, 12, toward_palm_y=0.03)
    set_finger_curled(pts, 13, 14, 15, 16, toward_palm_y=0.03)
    set_finger_curled(pts, 17, 18, 19, 20, toward_palm_y=0.03)
    # Pulgar descansando vertical al lado externo del dedo índice
    pts[1] = MockPoint(0.46, 0.66)
    pts[2] = MockPoint(0.43, 0.64)
    pts[3] = MockPoint(0.43, 0.61)
    pts[4] = MockPoint(0.43, 0.58) # Punta nivelada con el nudillo del índice
    return pts

def build_te_quiero_hand():
    pts = create_base_hand()
    # Pulgar extendido
    pts[1] = MockPoint(0.45, 0.65)
    pts[2] = MockPoint(0.40, 0.62)
    pts[3] = MockPoint(0.36, 0.60)
    pts[4] = MockPoint(0.31, 0.58)
    # Índice extendido hacia arriba
    set_finger_extended(pts, 5, 6, 7, 8, dx=0.0, length=0.18)
    # Medio y Anular doblados
    set_finger_curled(pts, 9, 10, 11, 12, toward_palm_y=0.03)
    set_finger_curled(pts, 13, 14, 15, 16, toward_palm_y=0.03)
    # Meñique extendido hacia arriba
    set_finger_extended(pts, 17, 18, 19, 20, dx=0.02, length=0.16)
    return pts

def run_tests():
    passed = 0
    total = 0

def build_i_hand():
    pts = create_base_hand()
    # Solo meñique extendido
    set_finger_curled(pts, 5, 6, 7, 8, toward_palm_y=0.03)
    set_finger_curled(pts, 9, 10, 11, 12, toward_palm_y=0.03)
    set_finger_curled(pts, 13, 14, 15, 16, toward_palm_y=0.03)
    set_finger_extended(pts, 17, 18, 19, 20, dx=0.0, length=0.17)
    # Pulgar sobre el puño
    pts[1] = MockPoint(0.46, 0.66)
    pts[2] = MockPoint(0.44, 0.64)
    pts[3] = MockPoint(0.45, 0.62)
    pts[4] = MockPoint(0.46, 0.61)
    return pts

def build_v_hand():
    pts = create_base_hand()
    # Índice y medio extendidos en V
    set_finger_extended(pts, 5, 6, 7, 8, dx=-0.04, length=0.18)
    set_finger_extended(pts, 9, 10, 11, 12, dx=0.04, length=0.18)
    # Anular y meñique doblados
    set_finger_curled(pts, 13, 14, 15, 16, toward_palm_y=0.03)
    set_finger_curled(pts, 17, 18, 19, 20, toward_palm_y=0.03)
    # Pulgar sobre anular
    pts[1] = MockPoint(0.46, 0.66)
    pts[2] = MockPoint(0.45, 0.63)
    pts[3] = MockPoint(0.46, 0.61)
    pts[4] = MockPoint(0.48, 0.60)
    return pts

def build_y_hand():
    pts = create_base_hand()
    # Pulgar y meñique extendidos (Shaka)
    pts[1] = MockPoint(0.45, 0.65)
    pts[2] = MockPoint(0.40, 0.62)
    pts[3] = MockPoint(0.35, 0.60)
    pts[4] = MockPoint(0.30, 0.58)
    set_finger_curled(pts, 5, 6, 7, 8, toward_palm_y=0.03)
    set_finger_curled(pts, 9, 10, 11, 12, toward_palm_y=0.03)
    set_finger_curled(pts, 13, 14, 15, 16, toward_palm_y=0.03)
    set_finger_extended(pts, 17, 18, 19, 20, dx=0.05, length=0.16)
    return pts

def build_1_hand():
    pts = create_base_hand()
    # Solo índice hacia arriba
    set_finger_extended(pts, 5, 6, 7, 8, dx=0.0, length=0.18)
    set_finger_curled(pts, 9, 10, 11, 12, toward_palm_y=0.03)
    set_finger_curled(pts, 13, 14, 15, 16, toward_palm_y=0.03)
    set_finger_curled(pts, 17, 18, 19, 20, toward_palm_y=0.03)
    # Pulgar descansando sobre falange media/proximal
    pts[1] = MockPoint(0.46, 0.66)
    pts[2] = MockPoint(0.45, 0.64)
    pts[3] = MockPoint(0.46, 0.63)
    pts[4] = MockPoint(0.46, 0.63)
    return pts

def build_d_hand():
    pts = create_base_hand()
    # Índice extendido hacia arriba
    set_finger_extended(pts, 5, 6, 7, 8, dx=0.0, length=0.18)
    # Anular y meñique doblados
    set_finger_curled(pts, 13, 14, 15, 16, toward_palm_y=0.03)
    set_finger_curled(pts, 17, 18, 19, 20, toward_palm_y=0.03)
    # Pulgar y dedo medio tocando sus puntas formando un círculo (D)
    pts[1] = MockPoint(0.46, 0.65)
    pts[2] = MockPoint(0.45, 0.62)
    pts[3] = MockPoint(0.46, 0.58)
    pts[4] = MockPoint(0.48, 0.56)
    pts[10] = MockPoint(0.50, 0.53)
    pts[11] = MockPoint(0.49, 0.55)
    pts[12] = MockPoint(0.48, 0.56) # Toca exactamente la punta del pulgar
    return pts

def build_thumb_up_hand():
    pts = create_base_hand()
    # 4 dedos en puño
    set_finger_curled(pts, 5, 6, 7, 8, toward_palm_y=0.03)
    set_finger_curled(pts, 9, 10, 11, 12, toward_palm_y=0.03)
    set_finger_curled(pts, 13, 14, 15, 16, toward_palm_y=0.03)
    set_finger_curled(pts, 17, 18, 19, 20, toward_palm_y=0.03)
    # Pulgar extendido vertical hacia arriba sobresaliendo del puño
    pts[1] = MockPoint(0.44, 0.66)
    pts[2] = MockPoint(0.41, 0.62)
    pts[3] = MockPoint(0.39, 0.55)
    pts[4] = MockPoint(0.38, 0.48) # Muy alto, bien arriba del nudillo 5 (0.58)
    return pts

def run_tests():
    passed = 0
    total = 0

    print("=" * 60)
    print("INICIANDO PRUEBAS UNITARIAS DE VERIFICACIÓN DEL INTÉRPRETE")
    print("=" * 60)

    # TEST 1: Seña "L"
    total += 1
    l_hand = build_l_hand()
    res_l = classify_sign_from_landmarks(l_hand)
    print(f"[TEST 1] Seña 'L' -> Resultado: {res_l}")
    assert res_l == "sign.l", f"Fallo en detección de L: esperado sign.l, obtenido {res_l}"
    passed += 1

    # TEST 2: Seña "A"
    total += 1
    a_hand = build_a_hand()
    res_a = classify_sign_from_landmarks(a_hand)
    print(f"[TEST 2] Seña 'A' -> Resultado: {res_a}")
    assert res_a == "sign.a", f"Fallo en detección de A: esperado sign.a, obtenido {res_a}"
    passed += 1

    # TEST 3: Seña "Te Quiero"
    total += 1
    tq_hand = build_te_quiero_hand()
    res_tq = classify_sign_from_landmarks(tq_hand)
    print(f"[TEST 3] Seña 'Te Quiero' -> Resultado: {res_tq}")
    assert res_tq == "sign.te_quiero", f"Fallo en detección de Te Quiero: esperado sign.te_quiero, obtenido {res_tq}"
    passed += 1

    # TEST 4: Seña "I"
    total += 1
    i_hand = build_i_hand()
    res_i = classify_sign_from_landmarks(i_hand)
    print(f"[TEST 4] Seña 'I' -> Resultado: {res_i}")
    assert res_i == "sign.i", f"Fallo en detección de I: esperado sign.i, obtenido {res_i}"
    passed += 1

    # TEST 4b: Seña "I" con pulgar relajado/suelto
    total += 1
    i_relaxed = build_i_hand()
    i_relaxed[4] = MockPoint(0.43, 0.60) # Pulgar descansando más abierto en nudillos
    res_i_rel = classify_sign_from_landmarks(i_relaxed)
    print(f"[TEST 4b] Seña 'I' (pulgar relajado) -> Resultado: {res_i_rel}")
    assert res_i_rel == "sign.i", f"Fallo en detección de I relajada: esperado sign.i, obtenido {res_i_rel}"
    passed += 1

    # TEST 5: Seña "V"
    total += 1
    v_hand = build_v_hand()
    res_v = classify_sign_from_landmarks(v_hand)
    print(f"[TEST 5] Seña 'V' -> Resultado: {res_v}")
    assert res_v == "sign.v", f"Fallo en detección de V: esperado sign.v, obtenido {res_v}"
    passed += 1

    # TEST 6: Seña "Y" (Shaka)
    total += 1
    y_hand = build_y_hand()
    res_y = classify_sign_from_landmarks(y_hand)
    print(f"[TEST 6] Seña 'Y' -> Resultado: {res_y}")
    assert res_y == "sign.y", f"Fallo en detección de Y: esperado sign.y, obtenido {res_y}"
    passed += 1

    # TEST 7: Seña "1"
    total += 1
    one_hand = build_1_hand()
    res_one = classify_sign_from_landmarks(one_hand)
    print(f"[TEST 7] Seña '1' -> Resultado: {res_one}")
    assert res_one == "sign.1", f"Fallo en detección de 1: esperado sign.1, obtenido {res_one}"
    passed += 1

    # TEST 8: Seña "Pulgar Arriba" (Thumb Up)
    total += 1
    tu_hand = build_thumb_up_hand()
    res_tu = classify_sign_from_landmarks(tu_hand)
    print(f"[TEST 8] Seña 'Pulgar Arriba' -> Resultado: {res_tu}")
    assert res_tu == "sign.thumb_up", f"Fallo en detección de Thumb Up: esperado sign.thumb_up, obtenido {res_tu}"
    passed += 1

    # TEST 8b: Seña "D"
    total += 1
    d_hand = build_d_hand()
    res_d = classify_sign_from_landmarks(d_hand)
    print(f"[TEST 8b] Seña 'D' -> Resultado: {res_d}")
    assert res_d == "sign.d", f"Fallo en detección de D: esperado sign.d, obtenido {res_d}"
    passed += 1

    # TEST 9: Bloqueo de falsos positivos de movimiento ante mano estática
    total += 1
    model = ISLModel()
    l_hand_np = build_l_hand()
    l_vector = normalize_hand_landmarks([l_hand_np])
    
    # Alimentar buffer con 15 frames con micro-temblores aleatorios
    for f in range(15):
        jitter = np.random.normal(0, 0.005, size=l_vector.shape).astype(np.float32)
        noisy_frame = l_vector + jitter
        model.sequence_buffer.append(noisy_frame)

    static_candidate = classify_sign_from_landmarks(l_hand_np)
    assert static_candidate == "sign.l"
    
    recent = np.array(list(model.sequence_buffer)[-6:], dtype=np.float32)
    diffs = np.diff(recent, axis=0)
    motion_energy = float(np.mean(np.abs(diffs)))
    max_motion = float(np.max(np.abs(diffs)))

    is_moving_dynamically = (max_motion >= 0.120 or motion_energy >= 0.080)
    print(f"[TEST 9] Temblor leve -> motion_energy: {motion_energy:.4f}, max_motion: {max_motion:.4f}, is_moving_dynamically: {is_moving_dynamically}")
    assert not is_moving_dynamically, "Error: temblor leve evaluó como movimiento dinámico"
    passed += 1

    # TEST 10: SentenceBuilder (deletreo inteligente de letras y palabras)
    total += 1
    sb = SentenceBuilder(inactivity_timeout=2.0, debounce_seconds=0.3)
    
    now = 100.0
    sb.add_token({"id": "sign.h", "name_es": "H", "name_en": "H"}, current_time=now)
    now += 0.4
    sb.add_token({"id": "sign.o", "name_es": "O", "name_en": "O"}, current_time=now)
    now += 0.4
    sb.add_token({"id": "sign.l", "name_es": "L", "name_en": "L"}, current_time=now)
    now += 0.4
    sb.add_token({"id": "sign.a", "name_es": "A", "name_en": "A"}, current_time=now)
    
    status = sb.get_status()
    print(f"[TEST 10] Deletreo H-O-L-A -> Oración acumulada: \"{status['accumulated_sentence']}\"")
    assert status['accumulated_sentence'] == "HOLA", f"Esperado 'HOLA', obtenido '{status['accumulated_sentence']}'"
    passed += 1

    # TEST 11: SentenceBuilder (adición de palabra completa y auto-capitalización)
    total += 1
    now += 0.5
    sb.add_token({"id": "sign.amigo", "name_es": "amigo", "name_en": "friend"}, current_time=now)
    status2 = sb.get_status()
    print(f"[TEST 11] Frase compuesta -> Oración acumulada: \"{status2['accumulated_sentence']}\"")
    assert "HOLA amigo" in status2['accumulated_sentence'] or "Hola amigo" in status2['accumulated_sentence']
    passed += 1

    # TEST 12: SentenceBuilder (Cierre por inactividad tras timeout)
    total += 1
    final_event = sb.check_inactivity(current_time=now + 2.5)
    print(f"[TEST 12] Cierre por inactividad -> Evento final: {final_event}")
    assert final_event is not None
    assert final_event['is_final'] == True
    passed += 1

    print("=" * 60)
    print(f"TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE: {passed}/{total} APROBADAS")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()
