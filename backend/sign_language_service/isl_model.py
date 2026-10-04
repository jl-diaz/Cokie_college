import os
import sys

# Suprimir logs C++ ruidosos de Google MediaPipe (Clearcut telemetry, inference feedback manager, etc.)
os.environ["GLOG_minloglevel"] = "3"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["OPENCV_LOG_LEVEL"] = "OFF"

try:
    _save_c_stderr = os.dup(2)
    _devnull_fd = os.open(os.devnull, os.O_RDWR)
    os.dup2(_devnull_fd, 2)
    # Mantener el stream de stderr de Python activo hacia la consola para FastAPI, uvicorn y excepciones
    sys.stderr = open(_save_c_stderr, 'w', buffering=1, encoding='utf-8', closefd=False)
except Exception:
    pass

import time
import cv2
import numpy as np
import base64
import math
from collections import deque

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

try:
    import gesture_trainer
except ImportError:
    from . import gesture_trainer

# ─────────────────────────────────────────────────────────────────
# Mapeo de gestos MediaPipe → Translation Keys
# ─────────────────────────────────────────────────────────────────
GESTURE_TO_ISL = {
    "Closed_Fist":  "sign.closed_fist",
    "Open_Palm":    "sign.open_palm",
    "Pointing_Up":  "sign.pointing_up",
    "Thumb_Down":   "sign.thumb_down",
    "Thumb_Up":     "sign.thumb_up",
    "Victory":      "sign.victory",
    "ILoveYou":     "sign.i_love_you",
}

# ─────────────────────────────────────────────────────────────────
# Funciones auxiliares de geometría invariantes a escala y orientación
# ─────────────────────────────────────────────────────────────────
def distance_2d(p1, p2):
    x1 = p1.x if hasattr(p1, 'x') else p1['x']
    y1 = p1.y if hasattr(p1, 'y') else p1['y']
    x2 = p2.x if hasattr(p2, 'x') else p2['x']
    y2 = p2.y if hasattr(p2, 'y') else p2['y']
    return math.sqrt((x1 - x2)**2 + (y1 - y2)**2)

def distance_3d(p1, p2):
    x1 = p1.x if hasattr(p1, 'x') else p1['x']
    y1 = p1.y if hasattr(p1, 'y') else p1['y']
    z1 = p1.z if hasattr(p1, 'z') else (p1.get('z', 0) if isinstance(p1, dict) else 0)
    x2 = p2.x if hasattr(p2, 'x') else p2['x']
    y2 = p2.y if hasattr(p2, 'y') else p2['y']
    z2 = p2.z if hasattr(p2, 'z') else (p2.get('z', 0) if isinstance(p2, dict) else 0)
    return math.sqrt((x1 - x2)**2 + (y1 - y2)**2 + (z1 - z2)**2)

def angle_between_points(a, b, c):
    ax = a.x if hasattr(a, 'x') else a['x']
    ay = a.y if hasattr(a, 'y') else a['y']
    bx = b.x if hasattr(b, 'x') else b['x']
    by = b.y if hasattr(b, 'y') else b['y']
    cx = c.x if hasattr(c, 'x') else c['x']
    cy = c.y if hasattr(c, 'y') else c['y']
    ba = (ax - bx, ay - by)
    bc = (cx - bx, cy - by)
    dot = ba[0]*bc[0] + ba[1]*bc[1]
    mag_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    mag_bc = math.sqrt(bc[0]**2 + bc[1]**2)
    if mag_ba * mag_bc == 0:
        return 0
    cos_angle = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))

def get_palm_scale(landmarks):
    wrist = landmarks[0]
    middle_mcp = landmarks[9]
    scale = distance_2d(wrist, middle_mcp)
    return scale if scale >= 1e-4 else 1.0

def is_finger_extended(landmarks, finger_tip, finger_pip, finger_mcp, scale=None):
    if scale is None:
        scale = get_palm_scale(landmarks)
    tip = landmarks[finger_tip]
    pip = landmarks[finger_pip]
    mcp = landmarks[finger_mcp]
    wrist = landmarks[0]
    angle = angle_between_points(mcp, pip, tip)
    d_wrist_tip = distance_2d(tip, wrist)
    d_wrist_pip = distance_2d(pip, wrist)
    d_mcp_tip = distance_2d(tip, mcp)
    # Extendido si la articulación está abierta (> 125°) y se aleja de la muñeca/nudillo
    return (d_wrist_tip > d_wrist_pip and angle > 125) or (d_mcp_tip / scale > 0.80)

def is_finger_curled(landmarks, finger_tip, finger_pip, finger_mcp, scale=None):
    if scale is None:
        scale = get_palm_scale(landmarks)
    tip = landmarks[finger_tip]
    pip = landmarks[finger_pip]
    mcp = landmarks[finger_mcp]
    wrist = landmarks[0]
    angle = angle_between_points(mcp, pip, tip)
    d_mcp_tip = distance_2d(tip, mcp)
    d_wrist_tip = distance_2d(tip, wrist)
    d_wrist_mcp = distance_2d(mcp, wrist)
    return angle < 125 or (d_mcp_tip / scale < 0.65) or (d_wrist_tip < d_wrist_mcp * 1.2)

def is_finger_half_bent(landmarks, finger_tip, finger_pip, finger_mcp, scale=None):
    return not is_finger_extended(landmarks, finger_tip, finger_pip, finger_mcp, scale) and \
           not is_finger_curled(landmarks, finger_tip, finger_pip, finger_mcp, scale)

def is_thumb_extended(landmarks, scale=None):
    if scale is None:
        scale = get_palm_scale(landmarks)
    thumb_tip = landmarks[4]
    index_mcp = landmarks[5]
    wrist = landmarks[0]
    d_thumb_index = distance_2d(thumb_tip, index_mcp)
    d_thumb_wrist = distance_2d(thumb_tip, wrist)
    return (d_thumb_index / scale > 0.50) or (d_thumb_wrist / scale > 0.85)

def is_thumb_across_palm(landmarks, scale=None):
    if scale is None:
        scale = get_palm_scale(landmarks)
    thumb_tip = landmarks[4]
    index_mcp = landmarks[5]
    middle_mcp = landmarks[9]
    ring_mcp = landmarks[13]
    d_ring = distance_2d(thumb_tip, ring_mcp) / scale
    d_mid = distance_2d(thumb_tip, middle_mcp) / scale
    return (d_ring < 0.45 or d_mid < 0.38) and abs(thumb_tip.x - ring_mcp.x) < abs(index_mcp.x - ring_mcp.x)

def tips_touching(landmarks, tip1, tip2, scale=None, threshold=0.28):
    if scale is None:
        scale = get_palm_scale(landmarks)
    return (distance_2d(landmarks[tip1], landmarks[tip2]) / scale) < threshold

def hand_orientation(landmarks):
    wrist = landmarks[0]
    mid_mcp = landmarks[9]
    dx = abs(mid_mcp.x - wrist.x)
    dy = abs(mid_mcp.y - wrist.y)
    if dy > dx * 1.3: return 'vertical'
    elif dx > dy * 1.3: return 'horizontal'
    return 'diagonal'

def fingers_spread(landmarks, scale=None):
    if scale is None:
        scale = get_palm_scale(landmarks)
    tips = [8, 12, 16, 20]
    spreads = [distance_2d(landmarks[tips[i]], landmarks[tips[i+1]]) for i in range(len(tips) - 1)]
    avg_spread = (sum(spreads) / len(spreads)) / scale
    return avg_spread > 0.35

def palm_facing_camera(landmarks):
    wrist = landmarks[0]
    index_mcp = landmarks[5]
    pinky_mcp = landmarks[17]
    cross = (index_mcp.x - wrist.x) * (pinky_mcp.y - wrist.y) - (index_mcp.y - wrist.y) * (pinky_mcp.x - wrist.x)
    return cross > 0

# ─────────────────────────────────────────────────────────────────
# Normalizador de Puntos Clave para Movimiento Temporal
# ─────────────────────────────────────────────────────────────────
def normalize_hand_landmarks(landmarks_list):
    """
    Convierte hasta 2 manos en un vector continuo de 126 valores normalizados
    respecto a la muñeca, haciéndolo invariante a la distancia y escala.
    """
    vector = np.zeros(126, dtype=np.float32)
    if not landmarks_list:
        return vector

    for h_idx, landmarks in enumerate(landmarks_list[:2]):
        base_offset = h_idx * 63  # 21 puntos x 3 (x, y, z)
        wrist = landmarks[0]

        # Calcular factor de escala (distancia muñeca a base dedo medio)
        scale = distance_2d(wrist, landmarks[9])
        if scale < 1e-4:
            scale = 1.0

        for p_idx, pt in enumerate(landmarks):
            idx = base_offset + (p_idx * 3)
            vector[idx]     = (pt.x - wrist.x) / scale
            vector[idx + 1] = (pt.y - wrist.y) / scale
            vector[idx + 2] = (pt.z - wrist.z if hasattr(pt, 'z') else 0.0) / scale
    return vector

# ─────────────────────────────────────────────────────────────────
# Clasificador Heurístico Invariante a Escala (Alfabeto y Señas Estáticas)
# ─────────────────────────────────────────────────────────────────
def classify_sign_from_landmarks(landmarks):
    if not landmarks or len(landmarks) < 21: return None
    
    scale = get_palm_scale(landmarks)
    
    thumb = is_thumb_extended(landmarks, scale)
    thumb_across = is_thumb_across_palm(landmarks, scale)
    index = is_finger_extended(landmarks, 8, 6, 5, scale)
    middle = is_finger_extended(landmarks, 12, 10, 9, scale)
    ring = is_finger_extended(landmarks, 16, 14, 13, scale)
    pinky = is_finger_extended(landmarks, 20, 18, 17, scale)
    
    index_curled = is_finger_curled(landmarks, 8, 6, 5, scale)
    middle_curled = is_finger_curled(landmarks, 12, 10, 9, scale)
    ring_curled = is_finger_curled(landmarks, 16, 14, 13, scale)
    pinky_curled = is_finger_curled(landmarks, 20, 18, 17, scale)
    
    index_half = is_finger_half_bent(landmarks, 8, 6, 5, scale)
    middle_half = is_finger_half_bent(landmarks, 12, 10, 9, scale)
    ring_half = is_finger_half_bent(landmarks, 16, 14, 13, scale)
    pinky_half = is_finger_half_bent(landmarks, 20, 18, 17, scale)
    
    extended_count = sum([thumb, index, middle, ring, pinky])
    orientation = hand_orientation(landmarks)
    spread = fingers_spread(landmarks, scale)
    
    index_middle_dist = distance_2d(landmarks[8], landmarks[12]) / scale
    
    # ── 1. GESTOS DE PRIORIDAD ALTA / UNIVERSALES ──
    # TE QUIERO / I LOVE YOU (Pulgar, índice y meñique extendidos; medio y anular doblados)
    if thumb and index and not middle and not ring and pinky:
        return "sign.te_quiero"

    # SHAKA / LETRA Y (Pulgar y meñique extendidos lateralmente; índice, medio y anular doblados)
    if thumb and not index and not middle and not ring and pinky:
        thumb_outward = (distance_2d(landmarks[4], landmarks[5]) / scale > 0.55) or (abs(landmarks[4].x - landmarks[5].x) / scale > 0.40)
        if thumb_outward:
            return "sign.y"

    # NO (Índice y medio tocan o se juntan con el pulgar, anular y meñique doblados)
    if tips_touching(landmarks, 4, 8, scale, 0.25) and tips_touching(landmarks, 4, 12, scale, 0.25) and ring_curled and pinky_curled:
        return "sign.no"

    # PULGAR ARRIBA / ABAJO (El pulgar debe sobresalir claramente por encima o debajo del puño)
    if thumb and index_curled and middle_curled and ring_curled and pinky_curled:
        thumb_index_dist = distance_2d(landmarks[4], landmarks[5]) / scale
        if thumb_index_dist > 0.55 and landmarks[4].y < (landmarks[5].y - 0.28 * scale) and landmarks[4].y < landmarks[3].y:
            return "sign.thumb_up"
        if landmarks[4].y > (landmarks[0].y + 0.05 * scale) and landmarks[4].y > landmarks[3].y:
            return "sign.thumb_down"

    # ── 2. NÚMEROS ISL UNIMANUALES CON PRIORIDAD DE CONTACTO (6-9) ──
    # 6: Pulgar toca meñique, índice, medio y anular extendidos
    if tips_touching(landmarks, 4, 20, scale, 0.32) and index and middle and ring:
        return "sign.6"
    # 7: Pulgar toca anular, índice, medio y meñique extendidos
    if tips_touching(landmarks, 4, 16, scale, 0.32) and index and middle and pinky:
        return "sign.7"
    # 8: Pulgar toca medio, índice, anular y meñique extendidos
    if tips_touching(landmarks, 4, 12, scale, 0.32) and index and ring and pinky:
        return "sign.8"
    # 9 / F / OK: Pulgar toca índice formando círculo, otros 3 extendidos
    if tips_touching(landmarks, 4, 8, scale, 0.30) and middle and ring and pinky:
        return "sign.f"

    # L: Pulgar e índice en ángulo recto de 90° (índice hacia arriba, pulgar hacia el lado)
    if thumb and index and not middle and not ring and not pinky:
        index_pointing_up = landmarks[8].y < landmarks[6].y and landmarks[6].y < landmarks[5].y
        thumb_out = (distance_2d(landmarks[4], landmarks[5]) / scale > 0.55) or (abs(landmarks[4].x - landmarks[5].x) / scale > 0.45)
        if index_pointing_up and thumb_out and landmarks[8].y < landmarks[0].y:
            return "sign.l"

    # D: Índice extendido hacia arriba, pulgar tocando dedo medio formando círculo
    if index and not middle and not ring and not pinky and tips_touching(landmarks, 4, 12, scale, 0.25):
        return "sign.d"

    # O / 0: Puntas de pulgar e índice tocándose formando un círculo cerrado completo
    if tips_touching(landmarks, 4, 8, scale, 0.28) and not index and middle_curled and ring_curled and pinky_curled:
        return "sign.o"

    # C: Dedos y pulgar curvados formando un arco cóncavo ("C" abierta)
    if index_half and middle_half and ring_half and not index and not middle and not ring:
        c_gap = distance_2d(landmarks[4], landmarks[8]) / scale
        if 0.30 < c_gap < 0.95:
            return "sign.c"

    # K: Índice y medio extendidos hacia arriba en forma de 'V' con pulgar apoyado/entre ellos
    if index and middle and not ring and not pinky:
        if landmarks[8].y < landmarks[5].y and landmarks[12].y < landmarks[9].y:
            thumb_mid_dist = distance_2d(landmarks[4], landmarks[10]) / scale
            if thumb_mid_dist < 0.60 and orientation in ('vertical', 'diagonal'):
                return "sign.k"

    # P: Misma postura de K pero dedos índice y medio apuntando claramente HACIA ABAJO
    if index and middle and not ring and not pinky:
        if landmarks[8].y > landmarks[5].y and landmarks[12].y > landmarks[9].y:
            return "sign.p"

    # G: Pulgar e índice extendidos horizontalmente (pinza lateral)
    if thumb and index and not middle and not ring and not pinky and orientation == 'horizontal':
        if landmarks[8].y <= landmarks[5].y + 0.15 * scale:
            return "sign.g"

    # Q: Pulgar e índice extendidos apuntando hacia abajo
    if thumb and index and not middle and not ring and not pinky and landmarks[8].y > landmarks[5].y + 0.10 * scale:
        return "sign.q"

    # H: Índice y medio extendidos juntos horizontalmente
    if index and middle and not ring and not pinky and orientation == 'horizontal':
        return "sign.h"

    # R: Índice y medio extendidos y cruzados verticalmente
    if index and middle and not ring and not pinky and orientation == 'vertical':
        if index_middle_dist <= 0.18 and abs(landmarks[8].x - landmarks[12].x) < 0.12 * scale:
            return "sign.r"

    # U: Índice y medio juntos hacia arriba (paralelos)
    if not thumb and index and middle and not ring and not pinky and index_middle_dist <= 0.26 and orientation == 'vertical':
        return "sign.u"

    # V / 2: Índice y medio separados hacia arriba (forma de V / Paz)
    if not thumb and index and middle and not ring and not pinky and index_middle_dist > 0.26 and orientation == 'vertical':
        return "sign.v"

    # W: Tres dedos extendidos (índice, medio, anular) sin pulgar
    if not thumb and index and middle and ring and not pinky and orientation == 'vertical':
        return "sign.w"

    # 3: Pulgar, índice y medio extendidos (estándar IS/ASL)
    if thumb and index and middle and not ring and not pinky and orientation == 'vertical':
        return "sign.3"

    # B: Cuatro dedos extendidos hacia arriba y juntos con pulgar cruzado sobre palma
    if (not thumb or thumb_across) and index and middle and ring and pinky and not spread and landmarks[12].y < landmarks[0].y:
        return "sign.b"

    # 4: Cuatro dedos extendidos y separados, pulgar plegado
    if not thumb and index and middle and ring and pinky and landmarks[12].y < landmarks[0].y:
        return "sign.4"

    # 5: Cinco dedos completamente extendidos y separados en abanico
    if extended_count == 5 and spread:
        return "sign.5"

    # 1: Solo índice extendido vertical hacia arriba
    if not thumb and index and not middle and not ring and not pinky and landmarks[8].y < landmarks[0].y:
        return "sign.1"

    # I: Solo meñique extendido vertical hacia arriba (la letra J se aprende dinámicamente)
    if not index and not middle and not ring and pinky and landmarks[20].y < landmarks[0].y:
        thumb_shaka = thumb and ((distance_2d(landmarks[4], landmarks[5]) / scale > 0.55) or (abs(landmarks[4].x - landmarks[5].x) / scale > 0.40))
        if not thumb_shaka:
            return "sign.i"

    # X: Solo índice flexionado en gancho (half bent)
    if not thumb and not middle and not ring and not pinky and index_half:
        return "sign.x"

    # (Nota: La letra Z es un trazo dinámico en zigzag en el aire, no una postura estática. Se evalúa dinámicamente)

    # ── 4. CLASES DE PUÑO CERRADO (A, E, M, N, S, T, 10) ──
    if (index_curled or not index) and (middle_curled or not middle) and (ring_curled or not ring) and (pinky_curled or not pinky):
        # 10: Puño cerrado con pulgar bien extendido vertical hacia arriba
        if thumb and distance_2d(landmarks[4], landmarks[5]) / scale > 0.55 and landmarks[4].y < landmarks[5].y - 0.28 * scale:
            return "sign.10"

        # A: Puño cerrado con pulgar vertical erguido descansando al lado externo del índice
        thumb_beside_index = distance_2d(landmarks[4], landmarks[5]) / scale < 0.55 or distance_2d(landmarks[4], landmarks[6]) / scale < 0.55
        thumb_up = landmarks[4].y < landmarks[3].y or landmarks[4].y < landmarks[2].y
        if thumb_beside_index and thumb_up and not thumb_across:
            return "sign.a"

        # E: Cuatro dedos curvados fuertemente con pulgar plegado horizontal bajo ellos
        if landmarks[4].y > landmarks[8].y and abs(landmarks[4].x - landmarks[9].x) < 0.35 * scale:
            return "sign.e"

        # T, N, M: Posición relativa transversal del pulgar a lo largo del puente de nudillos
        # Vector de MCP índice (5) a MCP meñique (17)
        palm_vx = landmarks[17].x - landmarks[5].x
        palm_vy = landmarks[17].y - landmarks[5].y
        palm_len_sq = palm_vx * palm_vx + palm_vy * palm_vy
        if palm_len_sq > 1e-5:
            thumb_proj = ((landmarks[4].x - landmarks[5].x) * palm_vx + (landmarks[4].y - landmarks[5].y) * palm_vy) / palm_len_sq
        else:
            thumb_proj = 0.35

        dist_thumb_index = distance_2d(landmarks[4], landmarks[6]) / scale
        dist_thumb_mid = distance_2d(landmarks[4], landmarks[10]) / scale
        dist_thumb_ring = distance_2d(landmarks[4], landmarks[14]) / scale

        # T: Pulgar insertado asomando entre dedo índice y medio (zona inicial del puente de nudillos)
        if thumb_proj < 0.22 or (dist_thumb_index < dist_thumb_mid and dist_thumb_index < 0.32 and landmarks[4].y < landmarks[6].y):
            return "sign.t"

        # M: Pulgar plegado bajo 3 dedos (zona del anular y meñique, proj >= 0.48)
        if thumb_proj >= 0.48 or (dist_thumb_ring < dist_thumb_mid and thumb_proj > 0.38):
            return "sign.m"

        # N: Pulgar plegado bajo 2 dedos (zona entre medio y anular, 0.18 <= proj < 0.48)
        if thumb_proj >= 0.18:
            return "sign.n"

        # S: Puño cerrado con pulgar cruzado horizontalmente por enfrente sobre los dedos
        if abs(landmarks[4].x - landmarks[9].x) < 0.32 * scale and landmarks[4].y <= landmarks[8].y + 0.15 * scale:
            return "sign.s"

    # M / N con dedos hacia abajo (variante tradicional LSM):
    # M: 3 dedos hacia abajo (índice, medio, anular)
    if landmarks[8].y > landmarks[5].y and landmarks[12].y > landmarks[9].y and landmarks[16].y > landmarks[13].y and pinky_curled:
        return "sign.m"
    # N: 2 dedos hacia abajo (índice y medio)
    if landmarks[8].y > landmarks[5].y and landmarks[12].y > landmarks[9].y and ring_curled and pinky_curled:
        return "sign.n"

    # Rechazo por defecto para posturas intermedias, ambiguas o de reposo
    return None

# ─────────────────────────────────────────────────────────────────
# Modelos Globales de MediaPipe
# ─────────────────────────────────────────────────────────────────
_global_gesture_recognizer = None
_global_hand_landmarker = None
_global_pose_landmarker = None
_models_loaded = False

def load_models():
    global _global_gesture_recognizer, _global_hand_landmarker, _global_pose_landmarker, _models_loaded
    if _models_loaded: return
        
    model_path = os.path.join(os.path.dirname(__file__) or '.', 'gesture_recognizer.task')
    hand_model_path = os.path.join(os.path.dirname(__file__) or '.', 'hand_landmarker.task')
    pose_model_path = os.path.join(os.path.dirname(__file__) or '.', 'pose_landmarker.task')
    
    if os.path.exists(model_path):
        try:
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.GestureRecognizerOptions(
                base_options=base_options,
                num_hands=2,
                min_hand_detection_confidence=0.5,
                min_hand_presence_confidence=0.5,
                min_tracking_confidence=0.5
            )
            _global_gesture_recognizer = vision.GestureRecognizer.create_from_options(options)
            print("[OK] GestureRecognizer cargado")
        except Exception as e:
            print(f"[WARN] Error GestureRecognizer: {e}")
            
    if os.path.exists(hand_model_path):
        try:
            hand_base = python.BaseOptions(model_asset_path=hand_model_path)
            hand_options = vision.HandLandmarkerOptions(
                base_options=hand_base,
                num_hands=2,
                min_hand_detection_confidence=0.5,
                min_hand_presence_confidence=0.5,
                min_tracking_confidence=0.5
            )
            _global_hand_landmarker = vision.HandLandmarker.create_from_options(hand_options)
            print("[OK] HandLandmarker cargado")
        except Exception as e:
            print(f"[WARN] Error HandLandmarker: {e}")

    if os.path.exists(pose_model_path):
        try:
            pose_base = python.BaseOptions(model_asset_path=pose_model_path)
            pose_options = vision.PoseLandmarkerOptions(
                base_options=pose_base,
                num_poses=1,
                min_pose_detection_confidence=0.5,
                min_pose_presence_confidence=0.5,
                min_tracking_confidence=0.5
            )
            _global_pose_landmarker = vision.PoseLandmarker.create_from_options(pose_options)
            print("[OK] PoseLandmarker cargado")
        except Exception as e:
            print(f"[WARN] Error PoseLandmarker: {e}")
            
    _models_loaded = (_global_gesture_recognizer is not None or _global_hand_landmarker is not None)

# ─────────────────────────────────────────────────────────────────
# Clase Principal de Inferencia Híbrida (Estática + Temporal Dinámica)
# ─────────────────────────────────────────────────────────────────
class ISLModel:
    def __init__(self):
        load_models()
        self.gesture_recognizer = _global_gesture_recognizer
        self.hand_landmarker = _global_hand_landmarker
        self.pose_landmarker = _global_pose_landmarker
        
        # Búfer de ventana temporal deslizante (30 fotogramas para movimiento dinámico)
        self.sequence_buffer = deque(maxlen=30)
        self.recent_predictions = []
        self.last_stable_prediction = None
        self.last_stable_time = 0.0
        self.stability_threshold = 2
        self.no_detection_count = 0
        self.frame_count = 0
        self.cached_pose_landmarks = None

    def normalize_camera_frame(self, image, platform="unknown", facing="front", source="phone", glasses_rotation=0):
        """
        Normaliza la orientación del fotograma para que las manos queden verticales (upright).
        En dispositivos móviles (Android / iOS) con cámara frontal o trasera sostenida en modo vertical,
        los sensores entregan cuadros landscape (w > h) que deben rotarse para alinearse con la pantalla.
        En lentes inteligentes CokieLens montados de lado en la patilla, permite rotar 90°, 180° o 270°.
        """
        if image is None:
            return image
        h, w = image.shape[:2]

        if source == 'glasses':
            try:
                rot = int(glasses_rotation or 0)
            except Exception:
                rot = 0
            if rot == 90:
                return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
            elif rot == 180:
                return cv2.rotate(image, cv2.ROTATE_180)
            elif rot == 270:
                return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
            return image

        # Si viene explícitamente de un teléfono móvil (Android / iOS) en landscape (w > h)
        is_mobile_phone = (platform in ('android', 'ios')) or (source == 'phone' and platform not in ('web', 'browser'))
        if is_mobile_phone and w > h:
            if facing == 'front':
                return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
            else:
                return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)

        return image

    def extract_landmarks_from_base64(self, base64_img, platform="unknown", facing="front", source="phone", glasses_rotation=0):
        """
        Extrae y retorna los puntos de la mano para visualización y para grabación
        en el Módulo Administrador. Soporta base64 plano o diccionario con metadatos.
        """
        try:
            if not self.hand_landmarker:
                return None

            p = platform
            f = facing
            s = source
            rot = glasses_rotation

            if isinstance(base64_img, dict):
                encoded_data = base64_img.get("image") or base64_img.get("base64") or ""
                p = str(base64_img.get("platform", platform)).lower()
                f = str(base64_img.get("facing", facing)).lower()
                s = str(base64_img.get("source", source)).lower()
                rot = base64_img.get("glasses_rotation", glasses_rotation)
            else:
                encoded_data = base64_img

            encoded_data = encoded_data.split(',')[1] if ',' in encoded_data else encoded_data
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None: return None

            # Normalizar orientación para móviles o lentes
            image = self.normalize_camera_frame(image, platform=p, facing=f, source=s, glasses_rotation=rot)

            h, w = image.shape[:2]
            if w > 480:
                scale = 480.0 / w
                image = cv2.resize(image, (480, int(h * scale)), interpolation=cv2.INTER_AREA)

            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            hand_result = self.hand_landmarker.detect(mp_image)

            # Fallback de orientación inteligente: si no se detectó mano, probar 90°, 180° y 270°
            if not hand_result or not hand_result.hand_landmarks:
                for rot_code in [cv2.ROTATE_90_CLOCKWISE, cv2.ROTATE_180, cv2.ROTATE_90_COUNTERCLOCKWISE]:
                    alt_rot = cv2.rotate(image, rot_code)
                    alt_rgb = cv2.cvtColor(alt_rot, cv2.COLOR_BGR2RGB)
                    alt_mp = mp.Image(image_format=mp.ImageFormat.SRGB, data=alt_rgb)
                    alt_result = self.hand_landmarker.detect(alt_mp)
                    if alt_result and alt_result.hand_landmarks:
                        hand_result = alt_result
                        break

            if hand_result and hand_result.hand_landmarks:
                vector = normalize_hand_landmarks(hand_result.hand_landmarks)
                simplified = []
                for hand in hand_result.hand_landmarks:
                    simplified.append([{"x": round(p.x, 3), "y": round(p.y, 3)} for p in hand])
                return {
                    "detected": True,
                    "vector": vector.tolist(),
                    "hands": simplified
                }
            return {"detected": False, "vector": np.zeros(126).tolist(), "hands": []}
        except Exception as e:
            print(f"Error extrayendo landmarks: {e}")
            return {"detected": False, "vector": np.zeros(126).tolist(), "hands": []}

    def process_frame_base64(self, base64_img):
        """
        Procesa el fotograma con estrategia de doble capa optimizada para tiempo real (< 40ms):
        1. Capa Estática: Reconoce señas fijas (A-Z, números, Te quiero, Shaka, etc.)
        2. Capa Temporal (Red Neuronal): Reconoce señas dinámicas cuando hay movimiento
        """
        try:
            if not self.hand_landmarker and not self.gesture_recognizer:
                return None

            platform = "unknown"
            facing = "front"
            source = "phone"
            glasses_rotation = 0

            if isinstance(base64_img, dict):
                encoded_data = base64_img.get("image") or base64_img.get("base64") or ""
                platform = str(base64_img.get("platform", "unknown")).lower()
                facing = str(base64_img.get("facing", "front")).lower()
                source = str(base64_img.get("source", "phone")).lower()
                glasses_rotation = base64_img.get("glasses_rotation", 0)
            else:
                encoded_data = base64_img

            encoded_data = encoded_data.split(',')[1] if ',' in encoded_data else encoded_data
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None: return None

            self.frame_count += 1

            # Normalizar orientación en dispositivos móviles o lentes
            image = self.normalize_camera_frame(image, platform=platform, facing=facing, source=source, glasses_rotation=glasses_rotation)

            # Redimensionar a resolución óptima (360px) para máxima velocidad de inferencia
            h, w = image.shape[:2]
            if w > 360:
                scale = 360.0 / w
                image = cv2.resize(image, (360, int(h * scale)), interpolation=cv2.INTER_LINEAR)

            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            
            current_prediction = None
            hand_landmarks_list = None
            pose_landmarks_list = None
            
            # 1. Detección de puntos de mano (MediaPipe HandLandmarker)
            if self.hand_landmarker:
                hand_result = self.hand_landmarker.detect(mp_image)
                if hand_result and hand_result.hand_landmarks:
                    hand_landmarks_list = hand_result.hand_landmarks
                else:
                    # Fallback de orientación inteligente si el primer intento no detectó mano
                    for rot_code in [cv2.ROTATE_90_CLOCKWISE, cv2.ROTATE_180, cv2.ROTATE_90_COUNTERCLOCKWISE]:
                        alt_rot = cv2.rotate(image, rot_code)
                        alt_rgb = cv2.cvtColor(alt_rot, cv2.COLOR_BGR2RGB)
                        alt_mp = mp.Image(image_format=mp.ImageFormat.SRGB, data=alt_rgb)
                        alt_res = self.hand_landmarker.detect(alt_mp)
                        if alt_res and alt_res.hand_landmarks:
                            hand_landmarks_list = alt_res.hand_landmarks
                            mp_image = alt_mp
                            break

            # 2. Detección de torso, brazos y hombros (Pose con caché de fotogramas alternos)
            if self.pose_landmarker:
                if self.frame_count % 2 == 1 or self.cached_pose_landmarks is None:
                    try:
                        pose_result = self.pose_landmarker.detect(mp_image)
                        if pose_result and pose_result.pose_landmarks:
                            self.cached_pose_landmarks = pose_result.pose_landmarks
                        else:
                            self.cached_pose_landmarks = None
                    except Exception:
                        pass
                pose_landmarks_list = self.cached_pose_landmarks
            
            # Formato ligero de landmarks para emitir inmediatamente al frontend
            simplified_hands = []
            if hand_landmarks_list:
                for hand in hand_landmarks_list:
                    simplified_hands.append([{"x": round(float(p.x), 3), "y": round(float(p.y), 3)} for p in hand])

            simplified_pose = []
            if pose_landmarks_list and len(pose_landmarks_list) > 0:
                simplified_pose = [{"x": round(float(p.x), 3), "y": round(float(p.y), 3)} for p in pose_landmarks_list[0]]

            # Evaluación de gestos
            motion_energy = 0.0
            is_holding_static = False
            is_moving_dynamically = False

            if hand_landmarks_list:
                frame_vector = normalize_hand_landmarks(hand_landmarks_list)
                self.sequence_buffer.append(frame_vector)

                # Evaluar candidato de seña estática invariante a escala
                static_candidate = None
                for hand_landmarks in hand_landmarks_list:
                    s = classify_sign_from_landmarks(hand_landmarks)
                    if s:
                        static_candidate = s
                        break

                # Medir si la mano está inmóvil o en movimiento activo
                if len(self.sequence_buffer) >= 4:
                    recent = np.array(list(self.sequence_buffer)[-6:], dtype=np.float32)
                    diffs = np.diff(recent, axis=0)
                    motion_energy = float(np.mean(np.abs(diffs)))
                    max_motion = float(np.max(np.abs(diffs)))
                    # Mano reposando / fija: bajo desplazamiento
                    if max_motion < 0.12 and motion_energy < 0.020:
                        is_holding_static = True
                    # Mano moviéndose deliberadamente con intención (señas dinámicas)
                    elif max_motion >= 0.22 and motion_energy >= 0.012:
                        is_moving_dynamically = True

                # ── ESTRATEGIA DE ASIGNACIÓN PRIORIZADA ──
                # 1. PRIORIDAD 1: Seña geométrica estática (Alfabeto A-Z, números, Te quiero)
                # Si los landmarks forman una seña estática válida, se acepta directamente.
                if static_candidate:
                    current_prediction = static_candidate

                # 2. PRIORIDAD 2: Seña dinámica por Red Neuronal (solo si NO hay seña estática)
                elif is_moving_dynamically and len(self.sequence_buffer) >= 6:
                    active_model = gesture_trainer.get_active_model()
                    if active_model:
                        try:
                            feats = gesture_trainer.extract_spatiotemporal_features(list(self.sequence_buffer))
                            pred_label, confidence, margin = active_model.predict_with_margin(feats)
                            gesture_type = gesture_trainer.get_gesture_type(pred_label)

                            num_hands_detected = len(hand_landmarks_list) if hand_landmarks_list else 0

                            # COMPUERTA ESTRICTA ANTI-FALSOS POSITIVOS:
                            valid_motion = False
                            # Gestos que requieren estrictamente 2 manos
                            bimanual_gestures = ("como_estas", "como_estan", "casa", "listo", "listo___terminado", "amigo")
                            if pred_label in bimanual_gestures and num_hands_detected < 2:
                                valid_motion = False
                            elif gesture_type == "movement":
                                if pred_label in ("como_estas", "como_estan"):
                                    # Requiere 2 manos y desplazamiento amplio coordinado
                                    valid_motion = num_hands_detected >= 2 and motion_energy >= 0.030 and max_motion >= 0.70
                                elif pred_label == "bien":
                                    valid_motion = motion_energy >= 0.018 and max_motion >= 0.28
                                elif pred_label == "z":
                                    valid_motion = motion_energy >= 0.035 and max_motion >= 0.55
                                elif pred_label in ("perdon", "adios", "mi_nombre_es"):
                                    valid_motion = motion_energy >= 0.025 and max_motion >= 0.38
                                elif pred_label == "no":
                                    valid_motion = motion_energy >= 0.028 and max_motion >= 0.38
                                elif pred_label in ("casa", "listo", "listo___terminado"):
                                    valid_motion = num_hands_detected >= 2 and motion_energy >= 0.022 and max_motion >= 0.32
                                else:
                                    valid_motion = motion_energy >= 0.020 and max_motion >= 0.28
                            elif gesture_type == "static":
                                valid_motion = False  # Las señas estáticas se evalúan por heurística geométrica

                            # Unificar listo___terminado con listo
                            if pred_label == "listo___terminado":
                                pred_label = "listo"

                            # Umbral de confianza estricto (Anti-Ruido)
                            min_conf = 0.88
                            min_margin = 0.25

                            if valid_motion and pred_label and confidence >= min_conf and margin >= min_margin:
                                info = gesture_trainer.get_gesture_display_info(pred_label)
                                current_prediction = {
                                    "id": f"sign.{info['id']}",
                                    "text": info["name_es"],
                                    "name_es": info["name_es"],
                                    "name_en": info["name_en"]
                                }
                        except Exception:
                            pass

                # D) Normalizar predicción a diccionario enriquecido con metadatos bilingües
                if current_prediction is not None and isinstance(current_prediction, str):
                    clean_id = current_prediction.replace("sign.", "")
                    info = gesture_trainer.get_gesture_display_info(clean_id)
                    current_prediction = {
                        "id": f"sign.{info['id']}",
                        "text": info["name_es"],
                        "name_es": info["name_es"],
                        "name_en": info["name_en"]
                    }
            else:
                self.sequence_buffer.append(np.zeros(126, dtype=np.float32))

            # Payload visual de puntos para el esqueleto en tiempo real
            landmarks_payload = {
                "detected": bool(hand_landmarks_list or pose_landmarks_list),
                "hands": simplified_hands,
                "pose": simplified_pose,
                "motion_energy": round(motion_energy, 3),
                "is_static": bool(hand_landmarks_list and is_holding_static)
            }

            # 4. Estabilización de predicción para traducción fluida (2 cuadros consistentes ~150ms)
            stable_result = None
            if current_prediction is None:
                self.no_detection_count += 1
                if self.no_detection_count >= 2:
                    self.recent_predictions = []
                if self.no_detection_count >= 3:
                    self.last_stable_prediction = None
            else:
                self.no_detection_count = 0
                self.recent_predictions.append(current_prediction)
                self.recent_predictions = self.recent_predictions[-2:]

                if len(self.recent_predictions) >= 2:
                    cand_ids = [p.get("id") if isinstance(p, dict) else p for p in self.recent_predictions]
                    if cand_ids[0] == cand_ids[1]:
                        candidate = self.recent_predictions[-1]
                        cand_id = cand_ids[0]
                        last_id = self.last_stable_prediction.get("id") if isinstance(self.last_stable_prediction, dict) else self.last_stable_prediction
                        
                        now = time.time()
                        # Solo emitir si es una seña distinta, o tras 2.0s de sostener la misma seña
                        if cand_id != last_id or (now - self.last_stable_time) > 2.0:
                            self.last_stable_prediction = candidate
                            self.last_stable_time = now
                            stable_result = candidate

            return {
                "translation": stable_result,
                "landmarks": landmarks_payload
            }

        except Exception as e:
            print(f"Error procesando frame: {e}")
            return None

