import cv2
import numpy as np
import base64
import os
import math

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

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
# Funciones auxiliares de geometría
# ─────────────────────────────────────────────────────────────────
def distance_2d(p1, p2):
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)

def distance_3d(p1, p2):
    dz = (p1.z - p2.z) if hasattr(p1, 'z') and hasattr(p2, 'z') else 0
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + dz**2)

def angle_between_points(a, b, c):
    ba = (a.x - b.x, a.y - b.y)
    bc = (c.x - b.x, c.y - b.y)
    dot = ba[0]*bc[0] + ba[1]*bc[1]
    mag_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    mag_bc = math.sqrt(bc[0]**2 + bc[1]**2)
    if mag_ba * mag_bc == 0:
        return 0
    cos_angle = max(-1, min(1, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))

def is_finger_extended(landmarks, finger_tip, finger_pip, finger_mcp):
    tip = landmarks[finger_tip]
    pip = landmarks[finger_pip]
    mcp = landmarks[finger_mcp]
    
    y_extended = tip.y < pip.y
    angle = angle_between_points(mcp, pip, tip)
    angle_extended = angle > 150
    return y_extended and angle_extended

def is_finger_curled(landmarks, finger_tip, finger_pip, finger_mcp):
    tip = landmarks[finger_tip]
    pip = landmarks[finger_pip]
    mcp = landmarks[finger_mcp]
    angle = angle_between_points(mcp, pip, tip)
    return tip.y > pip.y and angle < 120

def is_finger_half_bent(landmarks, finger_tip, finger_pip, finger_mcp):
    return not is_finger_extended(landmarks, finger_tip, finger_pip, finger_mcp) and \
           not is_finger_curled(landmarks, finger_tip, finger_pip, finger_mcp)

def is_thumb_extended(landmarks):
    thumb_tip = landmarks[4]
    thumb_mcp = landmarks[2]
    index_mcp = landmarks[5]
    dist_tip = abs(thumb_tip.x - index_mcp.x)
    dist_mcp = abs(thumb_mcp.x - index_mcp.x)
    return dist_tip > dist_mcp * 1.2

def is_thumb_across_palm(landmarks):
    thumb_tip = landmarks[4]
    index_mcp = landmarks[5]
    middle_mcp = landmarks[9]
    return abs(thumb_tip.x - middle_mcp.x) < abs(index_mcp.x - middle_mcp.x) * 0.5

def tips_touching(landmarks, tip1, tip2, threshold=0.04):
    return distance_2d(landmarks[tip1], landmarks[tip2]) < threshold

def hand_orientation(landmarks):
    wrist = landmarks[0]
    middle_tip = landmarks[12]
    dx = abs(middle_tip.x - wrist.x)
    dy = abs(middle_tip.y - wrist.y)
    if dy > dx * 1.5: return 'vertical'
    elif dx > dy * 1.5: return 'horizontal'
    return 'diagonal'

def fingers_spread(landmarks):
    tips = [8, 12, 16, 20]
    spreads = [distance_2d(landmarks[tips[i]], landmarks[tips[i+1]]) for i in range(len(tips) - 1)]
    return sum(spreads) / len(spreads) > 0.04

def palm_facing_camera(landmarks):
    wrist = landmarks[0]
    index_mcp = landmarks[5]
    pinky_mcp = landmarks[17]
    cross = (index_mcp.x - wrist.x) * (pinky_mcp.y - wrist.y) - (index_mcp.y - wrist.y) * (pinky_mcp.x - wrist.x)
    return cross > 0

# ─────────────────────────────────────────────────────────────────
# Clasificador de señas (Traducciones clave)
# ─────────────────────────────────────────────────────────────────
def classify_sign_from_landmarks(landmarks):
    if not landmarks or len(landmarks) < 21: return None
    
    thumb = is_thumb_extended(landmarks)
    thumb_across = is_thumb_across_palm(landmarks)
    index = is_finger_extended(landmarks, 8, 6, 5)
    middle = is_finger_extended(landmarks, 12, 10, 9)
    ring = is_finger_extended(landmarks, 16, 14, 13)
    pinky = is_finger_extended(landmarks, 20, 18, 17)
    
    index_curled = is_finger_curled(landmarks, 8, 6, 5)
    middle_curled = is_finger_curled(landmarks, 12, 10, 9)
    ring_curled = is_finger_curled(landmarks, 16, 14, 13)
    pinky_curled = is_finger_curled(landmarks, 20, 18, 17)
    
    index_half = is_finger_half_bent(landmarks, 8, 6, 5)
    middle_half = is_finger_half_bent(landmarks, 12, 10, 9)
    ring_half = is_finger_half_bent(landmarks, 16, 14, 13)
    pinky_half = is_finger_half_bent(landmarks, 20, 18, 17)
    
    extended_count = sum([thumb, index, middle, ring, pinky])
    orientation = hand_orientation(landmarks)
    spread = fingers_spread(landmarks)
    
    index_middle_dist = distance_2d(landmarks[8], landmarks[12])
    
    # ── NUEVAS SEÑAS COMUNES ──
    # NO (Índice y Medio tocando Pulgar, resto cerrado)
    if tips_touching(landmarks, 4, 8, 0.05) and tips_touching(landmarks, 4, 12, 0.05) and ring_curled and pinky_curled:
        return "sign.no"
    
    # SÍ (Puño cerrado moviéndose, aproximado con pulgar cerrado sobre puño vertical)
    # Lo mapearemos como un puño ligeramente inclinado o "S"
    
    # OK (Pulgar e índice en círculo, resto arriba)
    if tips_touching(landmarks, 4, 8, 0.05) and middle and ring and pinky:
        return "sign.ok"
        
    # TE QUIERO / I LOVE YOU (Rock on pero pulgar fuera)
    if thumb and index and not middle and not ring and pinky:
        return "sign.i_love_you"

    # PERDÓN / SORRY (Puño cerrado frotando pecho - aproximado a puño cerrado frente a cámara con pulgar cruzado)
    if index_curled and middle_curled and ring_curled and pinky_curled and thumb_across and orientation == 'vertical':
        # Podría confundirse con 'S' o 'A'. Añadimos un pequeño chequeo extra.
        if palm_facing_camera(landmarks):
            return "sign.a" # Sigue siendo A, es difícil hacer 'perdón' sin trackear pecho
            
    # NÚMEROS
    if tips_touching(landmarks, 4, 8, 0.04) and not middle and not ring and not pinky: return "sign.0"
    if not thumb and index and not middle and not ring and not pinky and orientation == 'vertical': return "sign.1"
    if not thumb and index and middle and not ring and not pinky and index_middle_dist > 0.04 and orientation == 'vertical': return "sign.2"
    if thumb and index and middle and not ring and not pinky and orientation == 'vertical': return "sign.3"
    if not thumb and index and middle and ring and pinky and orientation == 'vertical': return "sign.4"
    if extended_count == 5 and spread: return "sign.5"
    if thumb and index and middle and not ring and not pinky and orientation == 'horizontal': return "sign.7"
    if index and tips_touching(landmarks, 4, 12, 0.04) and not ring and not pinky: return "sign.8"
    if tips_touching(landmarks, 4, 8, 0.04) and middle and ring and pinky: return "sign.9"
    if thumb and not index and not middle and not ring and not pinky and orientation == 'vertical': return "sign.10"
    
    # ALFABETO A-Z
    if thumb and index_curled and middle_curled and ring_curled and pinky_curled and not thumb_across: return "sign.a"
    if not thumb and index and middle and ring and pinky and not spread and orientation == 'vertical': return "sign.b"
    if index_half and middle_half and ring_half and pinky_half:
        y_diff = abs(landmarks[4].y - landmarks[8].y)
        x_diff = abs(landmarks[4].x - landmarks[8].x)
        if 0.03 < y_diff < 0.15 and x_diff > 0.02: return "sign.c"
    if index and not middle and not ring and not pinky and tips_touching(landmarks, 4, 12, 0.06): return "sign.d"
    if index_curled and middle_curled and ring_curled and pinky_curled and thumb_across: return "sign.e"
    if tips_touching(landmarks, 4, 8, 0.05) and middle and ring and pinky: return "sign.f"
    if thumb and index and not middle and not ring and not pinky and orientation == 'horizontal': return "sign.g"
    if not thumb and index and middle and not ring and not pinky and orientation == 'horizontal': return "sign.h"
    if not thumb and not index and not middle and not ring and pinky:
        if orientation == 'diagonal': return "sign.j"
        return "sign.i"
    if thumb and index and middle and not ring and not pinky and distance_2d(landmarks[4], landmarks[10]) < 0.05: return "sign.k"
    if thumb and index and not middle and not ring and not pinky and orientation == 'vertical' and angle_between_points(landmarks[4], landmarks[2], landmarks[8]) > 60: return "sign.l"
    if not index and not middle and not ring and not pinky and thumb_across and landmarks[8].y > landmarks[5].y and landmarks[12].y > landmarks[9].y: return "sign.m"
    if not index and not middle and ring_curled and pinky_curled and thumb_across and landmarks[8].y > landmarks[5].y and landmarks[12].y > landmarks[9].y: return "sign.n"
    if tips_touching(landmarks, 4, 8, 0.04) and not middle and not ring and not pinky and middle_curled and ring_curled and pinky_curled: return "sign.o"
    if thumb and index and middle and not ring and not pinky and landmarks[8].y > landmarks[0].y: return "sign.p"
    if thumb and index and not middle and not ring and not pinky and landmarks[8].y > landmarks[0].y: return "sign.q"
    if not thumb and index and middle and not ring and not pinky and landmarks[12].x < landmarks[8].x: return "sign.r"
    if index_curled and middle_curled and ring_curled and pinky_curled and thumb_across and landmarks[4].y < landmarks[8].y: return "sign.s"
    if index_curled and middle_curled and ring_curled and pinky_curled and abs(landmarks[4].x - landmarks[6].x) < 0.03: return "sign.t"
    if not thumb and index and middle and not ring and not pinky:
        if index_middle_dist < 0.03 and orientation == 'vertical': return "sign.u"
        if index_middle_dist > 0.04: return "sign.v"
    if not thumb and index and middle and ring and not pinky: return "sign.w"
    if not thumb and not middle and not ring and not pinky and index_half: return "sign.x"
    if thumb and not index and not middle and not ring and pinky: return "sign.y"
    if not thumb and index and not middle and not ring and not pinky and orientation == 'diagonal': return "sign.z"
    
    # FRASES / GESTOS EXTRA
    if extended_count == 5 and not spread: return "sign.please_wait"
    if extended_count == 0: return "sign.closed_fist"
    
    return None

# ─────────────────────────────────────────────────────────────────
# Global Models
# ─────────────────────────────────────────────────────────────────
_global_gesture_recognizer = None
_global_hand_landmarker = None
_models_loaded = False

def load_models():
    global _global_gesture_recognizer, _global_hand_landmarker, _models_loaded
    if _models_loaded: return
        
    model_path = os.path.join(os.path.dirname(__file__) or '.', 'gesture_recognizer.task')
    hand_model_path = os.path.join(os.path.dirname(__file__) or '.', 'hand_landmarker.task')
    
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
            
    _models_loaded = (_global_gesture_recognizer is not None or _global_hand_landmarker is not None)

class ISLModel:
    def __init__(self):
        load_models()
        self.gesture_recognizer = _global_gesture_recognizer
        self.hand_landmarker = _global_hand_landmarker
        
        # Aumentamos el threshold para evitar parpadeo y falsos positivos
        self.recent_predictions = []
        self.last_stable_prediction = None
        self.stability_threshold = 4  # 4 frames seguidos para confirmar = ~1 seg a 4fps
        self.no_detection_count = 0

    def process_frame_base64(self, base64_img):
        try:
            if not self.gesture_recognizer and not self.hand_landmarker:
                return None
                
            encoded_data = base64_img.split(',')[1] if ',' in base64_img else base64_img
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None: return None

            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            
            current_prediction = None
            
            if self.gesture_recognizer:
                result = self.gesture_recognizer.recognize(mp_image)
                if result and result.gestures:
                    for hand_gestures in result.gestures:
                        if hand_gestures:
                            gesture = hand_gestures[0]
                            if gesture.score > 0.75 and gesture.category_name != "None":
                                current_prediction = GESTURE_TO_ISL.get(gesture.category_name, gesture.category_name)
                                break
            
            if current_prediction is None and self.hand_landmarker:
                hand_result = self.hand_landmarker.detect(mp_image)
                if hand_result and hand_result.hand_landmarks:
                    for hand_landmarks in hand_result.hand_landmarks:
                        sign = classify_sign_from_landmarks(hand_landmarks)
                        if sign:
                            current_prediction = sign
                            break
            
            # Estabilización
            if current_prediction is None:
                self.no_detection_count += 1
                if self.no_detection_count >= 5: # Resetear rápido si no hay manos
                    self.last_stable_prediction = None
                    self.recent_predictions = []
                    self.no_detection_count = 0
                return None
            
            self.no_detection_count = 0
            self.recent_predictions.append(current_prediction)
            self.recent_predictions = self.recent_predictions[-self.stability_threshold:]
            
            # Verificamos si todos los elementos del threshold son iguales
            if len(self.recent_predictions) == self.stability_threshold:
                if all(p == self.recent_predictions[0] for p in self.recent_predictions):
                    stable = self.recent_predictions[0]
                    if stable != self.last_stable_prediction:
                        self.last_stable_prediction = stable
                        self.recent_predictions = []
                        return stable
            
            return None

        except Exception as e:
            print(f"Error procesando frame: {e}")
            return None
