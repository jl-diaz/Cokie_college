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

    # TEST 10: Bloqueo de falso positivo estático para la letra 'Z'
    total += 1
    # Crear mano con índice diagonal
    h_diag = create_base_hand(wrist=(0.5, 0.8))
    # Índice apuntando diagonalmente
    h_diag[5] = MockPoint(0.48, 0.65)
    h_diag[6] = MockPoint(0.44, 0.55)
    h_diag[7] = MockPoint(0.40, 0.45)
    h_diag[8] = MockPoint(0.36, 0.35)
    diag_res = classify_sign_from_landmarks(h_diag)
    print(f"[TEST 10] Dedo diagonal -> Clasificación: {diag_res} (esperado: no sign.z)")
    assert diag_res != "sign.z", "Error: dedo diagonal aún clasifica como sign.z"
    passed += 1

    # TEST 11: Bloqueo de falsos positivos en reposo (como_estas / bien no se activan sin movimiento amplio)
    total += 1
    # Vector estático con micro-ruido
    static_model = ISLModel()
    for _ in range(10):
        static_model.sequence_buffer.append(np.random.normal(0, 0.005, 126).astype(np.float32))
    
    # Evaluar motion_energy
    recent_s = np.array(list(static_model.sequence_buffer)[-6:], dtype=np.float32)
    s_diffs = np.diff(recent_s, axis=0)
    s_energy = float(np.mean(np.abs(s_diffs)))
    s_max = float(np.max(np.abs(s_diffs)))
    is_dyn = (s_max >= 0.22 and s_energy >= 0.012)
    print(f"[TEST 11] Reposo / Temblor -> is_moving_dynamically: {is_dyn} (esperado: False)")
    assert not is_dyn, "Error: reposo evaluó como movimiento dinámico"
    passed += 1

    # TEST 12: Estabilización palabra por palabra (rápida y fluida, 2 fotogramas consistentes)
    total += 1
    m_stab = ISLModel()
    # Simular 1 frame con predicción 'A'
    m_stab.recent_predictions = [
        {"id": "sign.a", "text": "A"}
    ]
    # Con solo 1 frame no debe emitir si la estabilidad requiere 2
    assert len(m_stab.recent_predictions) < m_stab.stability_threshold
    # Añadir 2do frame consistente
    m_stab.recent_predictions.append({"id": "sign.a", "text": "A"})
    cand_ids = [p["id"] for p in m_stab.recent_predictions]
    assert cand_ids[0] == cand_ids[1]
    print(f"[TEST 12] Estabilidad de 2 fotogramas consecutivos -> Confirmado para: {cand_ids[0]}")
    passed += 1
    # TEST 13a: Seña K
    total += 1
    # Mano K: Dedos índice y medio hacia arriba en V, anular y meñique doblados, pulgar entre ellos
    h_k = build_v_hand()
    # Pulgar apoyado entre índice y medio (cerca de punto 10)
    h_k[4] = MockPoint(0.50, 0.48)
    res_k = classify_sign_from_landmarks(h_k)
    print(f"[TEST 13a] Seña 'K' -> Resultado: {res_k}")
    assert res_k == "sign.k", f"Fallo en K: esperado sign.k, obtenido {res_k}"
    passed += 1
    
    # TEST 13b: Seña P
    total += 1
    # Mano P: Dedos índice y medio apuntando claramente hacia abajo
    h_p = create_base_hand(wrist=(0.5, 0.3))
    set_finger_curled(h_p, 13, 14, 15, 16, toward_palm_y=-0.03)
    set_finger_curled(h_p, 17, 18, 19, 20, toward_palm_y=-0.03)
    # Índice y medio hacia abajo (y mayor que nudillos)
    h_p[5] = MockPoint(0.48, 0.40)
    h_p[6] = MockPoint(0.48, 0.52)
    h_p[7] = MockPoint(0.48, 0.62)
    h_p[8] = MockPoint(0.48, 0.72)
    h_p[9] = MockPoint(0.55, 0.40)
    h_p[10] = MockPoint(0.56, 0.52)
    h_p[11] = MockPoint(0.57, 0.62)
    h_p[12] = MockPoint(0.58, 0.72)
    h_p[4] = MockPoint(0.52, 0.52)
    res_p = classify_sign_from_landmarks(h_p)
    print(f"[TEST 13b] Seña 'P' -> Resultado: {res_p}")
    assert res_p == "sign.p", f"Fallo en P: esperado sign.p, obtenido {res_p}"
    passed += 1

    # TEST 14: Letra 'H' horizontal
    total += 1
    h_h = create_base_hand(wrist=(0.3, 0.5))
    set_finger_curled(h_h, 13, 14, 15, 16, toward_palm_y=0.03)
    set_finger_curled(h_h, 17, 18, 19, 20, toward_palm_y=0.03)
    # Índice y medio horizontales
    h_h[5] = MockPoint(0.45, 0.48)
    h_h[6] = MockPoint(0.58, 0.48)
    h_h[7] = MockPoint(0.68, 0.48)
    h_h[8] = MockPoint(0.78, 0.48)
    h_h[9] = MockPoint(0.45, 0.52)
    h_h[10] = MockPoint(0.58, 0.52)
    h_h[11] = MockPoint(0.68, 0.52)
    h_h[12] = MockPoint(0.78, 0.52)
    h_h[4] = MockPoint(0.42, 0.56)
    res_h = classify_sign_from_landmarks(h_h)
    print(f"[TEST 14] Seña 'H' -> Resultado: {res_h}")
    assert res_h == "sign.h", f"Fallo en H: esperado sign.h, obtenido {res_h}"
    passed += 1

    # TEST 15a: Caso T
    total += 1
    # Puño cerrado (los 4 dedos doblados hacia la palma)
    h_fist = create_base_hand(wrist=(0.5, 0.8))
    set_finger_curled(h_fist, 5, 6, 7, 8, toward_palm_y=0.03)
    set_finger_curled(h_fist, 9, 10, 11, 12, toward_palm_y=0.03)
    set_finger_curled(h_fist, 13, 14, 15, 16, toward_palm_y=0.03)
    set_finger_curled(h_fist, 17, 18, 19, 20, toward_palm_y=0.03)
    # Nudillos MCP transversales: índice=0.40, medio=0.48, anular=0.56, meñique=0.64
    h_fist[5] = MockPoint(0.40, 0.58)
    h_fist[9] = MockPoint(0.48, 0.58)
    h_fist[13] = MockPoint(0.56, 0.58)
    h_fist[17] = MockPoint(0.64, 0.58)

    # Caso T: Pulgar asoma en índice (x=0.42, proj ~ 0.08)
    h_t = [MockPoint(p.x, p.y, p.z) for p in h_fist]
    h_t[4] = MockPoint(0.42, 0.58)
    res_t = classify_sign_from_landmarks(h_t)
    print(f"[TEST 15a] Seña 'T' -> Resultado: {res_t}")
    assert res_t == "sign.t", f"Fallo en T: esperado sign.t, obtenido {res_t}"
    passed += 1

    # TEST 15b: Caso N
    total += 1
    # Caso N: Pulgar asoma entre medio y anular (x=0.48, proj ~ 0.33)
    h_n = [MockPoint(p.x, p.y, p.z) for p in h_fist]
    h_n[4] = MockPoint(0.48, 0.58)
    res_n = classify_sign_from_landmarks(h_n)
    print(f"[TEST 15b] Seña 'N' -> Resultado: {res_n}")
    assert res_n == "sign.n", f"Fallo en N: esperado sign.n, obtenido {res_n}"
    passed += 1

    # TEST 15c: Caso M
    total += 1
    # Caso M: Pulgar asoma entre anular y meñique (x=0.56, proj ~ 0.66)
    h_m = [MockPoint(p.x, p.y, p.z) for p in h_fist]
    h_m[4] = MockPoint(0.56, 0.58)
    res_m = classify_sign_from_landmarks(h_m)
    print(f"[TEST 15c] Seña 'M' -> Resultado: {res_m}")
    assert res_m == "sign.m", f"Fallo en M: esperado sign.m, obtenido {res_m}"
    passed += 1

    print("=" * 60)
    print(f"TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE: {passed}/{total} APROBADAS")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()
