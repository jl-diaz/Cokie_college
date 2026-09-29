import cv2
import numpy as np
import base64
import os
import math
from collections import deque

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

import gesture_trainer

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
    wrist = landmarks[0]
    angle = angle_between_points(mcp, pip, tip)
    # Dedo extendido si está recto y la punta está más alejada de la muñeca que las articulaciones
    is_straight = angle > 135
    is_dist = distance_2d(tip, wrist) > distance_2d(pip, wrist)
    return is_dist and (is_straight or tip.y < pip.y)

def is_finger_curled(landmarks, finger_tip, finger_pip, finger_mcp):
    tip = landmarks[finger_tip]
    pip = landmarks[finger_pip]
    mcp = landmarks[finger_mcp]
    wrist = landmarks[0]
    angle = angle_between_points(mcp, pip, tip)
    # Dedo doblado en puño o hacia la palma
    is_closer = distance_2d(tip, wrist) < distance_2d(mcp, wrist) * 1.3
    return is_closer or tip.y > pip.y or angle < 130

def is_finger_half_bent(landmarks, finger_tip, finger_pip, finger_mcp):
    return not is_finger_extended(landmarks, finger_tip, finger_pip, finger_mcp) and \
           not is_finger_curled(landmarks, finger_tip, finger_pip, finger_mcp)

def is_thumb_extended(landmarks):
    thumb_tip = landmarks[4]
    index_mcp = landmarks[5]
    # El pulgar está extendido hacia afuera si se separa claramente del nudillo del índice
    return distance_2d(thumb_tip, index_mcp) > 0.11

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
    return (sum(spreads) / len(spreads)) > 0.075

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
# Clasificador Heurístico de Alfabeto y Señas Estáticas
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
    
    # ── ALFABETO LSM / ASL (A-Z) ──
    # A: Puño cerrado con pulgar al lado vertical (no cruzado sobre dedos)
    if index_curled and middle_curled and ring_curled and pinky_curled and not thumb_across:
        return "sign.a"
    # B: Cuatro dedos extendidos hacia arriba
    if index and middle and ring and pinky and not spread and orientation == 'vertical':
        return "sign.b"
    # C: Dedos medio doblados formando curvatura de C
    if index_half and middle_half and ring_half:
        y_diff = abs(landmarks[4].y - landmarks[8].y)
        if y_diff < 0.18: return "sign.c"
    # D: Índice extendido hacia arriba, pulgar tocando dedos medio/anular
    if index and not middle and not ring and not pinky and tips_touching(landmarks, 4, 12, 0.08):
        return "sign.d"
    # E: Cuatro dedos curvados fuertemente con pulgar cruzado enfrente
    if index_curled and middle_curled and ring_curled and pinky_curled and thumb_across:
        return "sign.e"
    # F: Índice tocando pulgar, demás dedos extendidos
    if tips_touching(landmarks, 4, 8, 0.06) and middle and ring and pinky:
        return "sign.f"
    # G: Pulgar e índice extendidos horizontalmente
    if thumb and index and not middle and not ring and not pinky and orientation == 'horizontal':
        return "sign.g"
    # H: Índice y medio extendidos horizontalmente
    if not thumb and index and middle and not ring and not pinky and orientation == 'horizontal':
        return "sign.h"
    # I: Solo meñique extendido
    if not thumb and not index and not middle and not ring and pinky:
        if orientation == 'diagonal': return "sign.j"
        return "sign.i"
    # L: Pulgar e índice en ángulo recto
    if thumb and index and not middle and not ring and not pinky and orientation == 'vertical':
        return "sign.l"
    # O: Puntas de pulgar e índice tocándose formando un círculo
    if tips_touching(landmarks, 4, 8, 0.06) and not index and middle_curled and ring_curled and pinky_curled:
        return "sign.o"
    # U: Índice y medio juntos hacia arriba
    if not thumb and index and middle and not ring and not pinky and index_middle_dist <= 0.04 and orientation == 'vertical':
        return "sign.u"
    # V: Índice y medio separados hacia arriba (Paz)
    if not thumb and index and middle and not ring and not pinky and index_middle_dist > 0.04:
        return "sign.v"
    # W: Tres dedos extendidos (índice, medio, anular)
    if not thumb and index and middle and ring and not pinky:
        return "sign.w"
    # X: Índice doblado en gancho
    if not thumb and not middle and not ring and not pinky and index_half:
        return "sign.x"
    # Y: Pulgar y meñique extendidos (Shaka)
    if thumb and not index and not middle and not ring and pinky:
        return "sign.y"
    # Z: Índice apuntando diagonalmente
    if not thumb and index and not middle and not ring and not pinky and orientation == 'diagonal':
        return "sign.z"

    # ── GESTOS Y SEÑAS COMUNES ──
    # NO
    if tips_touching(landmarks, 4, 8, 0.05) and tips_touching(landmarks, 4, 12, 0.05) and ring_curled and pinky_curled:
        return "sign.no"
    
    # TE QUIERO / I LOVE YOU
    if thumb and index and not middle and not ring and pinky:
        return "sign.i_love_you"
            
    # ── NÚMEROS ──
    if tips_touching(landmarks, 4, 8, 0.04) and not middle and not ring and not pinky: return "sign.0"
    if not thumb and index and not middle and not ring and not pinky and orientation == 'vertical': return "sign.1"
    if not thumb and index and middle and not ring and not pinky and index_middle_dist > 0.04 and orientation == 'vertical': return "sign.2"
    if thumb and index and middle and not ring and not pinky and orientation == 'vertical': return "sign.3"
    if not thumb and index and middle and ring and pinky and orientation == 'vertical': return "sign.4"
    if extended_count == 5 and spread: return "sign.5"
    if thumb and index and middle and not ring and not pinky and orientation == 'horizontal': return "sign.7"
    if index and tips_touching(landmarks, 4, 12, 0.04) and not ring and not pinky: return "sign.8"
    if tips_touching(landmarks, 4, 8, 0.04) and middle and ring and pinky: return "sign.9"
    
    # FRASES / GESTOS EXTRA
    if extended_count == 5 and not spread: return "sign.please_wait"
    if extended_count == 0: return "sign.closed_fist"
    
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
        self.stability_threshold = 2
        self.no_detection_count = 0

    def extract_landmarks_from_base64(self, base64_img):
        """
        Extrae y retorna los puntos de la mano para visualización y para grabación
        en el Módulo Administrador.
        """
        try:
            if not self.hand_landmarker:
                return None
            encoded_data = base64_img.split(',')[1] if ',' in base64_img else base64_img
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None: return None

            h, w = image.shape[:2]
            if w > 480:
                scale = 480.0 / w
                image = cv2.resize(image, (480, int(h * scale)), interpolation=cv2.INTER_AREA)

            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            hand_result = self.hand_landmarker.detect(mp_image)

            if hand_result and hand_result.hand_landmarks:
                vector = normalize_hand_landmarks(hand_result.hand_landmarks)
                # Formato ligero de landmarks para dibujar en frontend
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
        Procesa el fotograma con estrategia de doble capa:
        1. Capa Temporal (Red Neuronal del Administrador): Reconoce movimientos dinámicos
           de brazos y manos en la ventana de 30 frames.
        2. Capa Estática (MediaPipe): Reconoce señas fijas y letras del alfabeto (A-Z).
        """
        try:
            if not self.gesture_recognizer and not self.hand_landmarker:
                return None
                
            encoded_data = base64_img.split(',')[1] if ',' in base64_img else base64_img
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None: return None

            # Redimensionar si la imagen es grande para acelerar la inferencia
            h, w = image.shape[:2]
            if w > 360:
                scale = 360.0 / w
                image = cv2.resize(image, (360, int(h * scale)), interpolation=cv2.INTER_AREA)

            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            
            current_prediction = None
            hand_landmarks_list = None
            pose_landmarks_list = None
            
            # 1. Detección de puntos de mano
            if self.hand_landmarker:
                hand_result = self.hand_landmarker.detect(mp_image)
                if hand_result and hand_result.hand_landmarks:
                    hand_landmarks_list = hand_result.hand_landmarks

            # 2. Detección de torso, brazos y hombros (Pose)
            if self.pose_landmarker:
                try:
                    pose_result = self.pose_landmarker.detect(mp_image)
                    if pose_result and pose_result.pose_landmarks:
                        pose_landmarks_list = pose_result.pose_landmarks
                except Exception:
                    pass
            
            # Preparar landmarks simplificados para enviar al frontend
            simplified_hands = []
            if hand_landmarks_list:
                for hand in hand_landmarks_list:
                    simplified_hands.append([{"x": round(float(p.x), 3), "y": round(float(p.y), 3)} for p in hand])

            simplified_pose = []
            if pose_landmarks_list and len(pose_landmarks_list) > 0:
                simplified_pose = [{"x": round(float(p.x), 3), "y": round(float(p.y), 3)} for p in pose_landmarks_list[0]]

            # Si hay manos detectadas, guardar en la ventana de movimiento temporal
            motion_energy = 0.0
            if hand_landmarks_list:
                frame_vector = normalize_hand_landmarks(hand_landmarks_list)
                self.sequence_buffer.append(frame_vector)

                # 1. EVALUAR CAPA ESTÁTICA (Alfabeto A-Z, Números 0-10, Señas Fijas)
                static_candidate = None
                for hand_landmarks in hand_landmarks_list:
                    s = classify_sign_from_landmarks(hand_landmarks)
                    if s:
                        static_candidate = s
                        break

                # Medir si la mano está inmóvil o en movimiento dinámico
                is_holding_static = False
                is_moving_dynamically = False
                if len(self.sequence_buffer) >= 4:
                    recent = np.array(list(self.sequence_buffer)[-6:], dtype=np.float32)
                    diffs = np.diff(recent, axis=0)
                    motion_energy = float(np.mean(np.abs(diffs)))
                    max_motion = float(np.max(np.abs(diffs)))
                    if max_motion < 0.08:
                        is_holding_static = True
                    if max_motion >= 0.08:
                        is_moving_dynamically = True

                # 1. EVALUAR CAPA DEL MODELO ENTRENADO (Vocabulario aprendido: hola, gracias, que, etc.)
                if current_prediction is None:
                    active_model = gesture_trainer.get_active_model()
                    if active_model and len(self.sequence_buffer) >= 8:
                        try:
                            feats = gesture_trainer.extract_spatiotemporal_features(list(self.sequence_buffer))
                            pred_label, confidence = active_model.predict(feats)
                            if pred_label and confidence >= 0.70:
                                info = gesture_trainer.get_gesture_display_info(pred_label)
                                current_prediction = {
                                    "id": f"sign.{info['id']}",
                                    "text": info["name_es"],
                                    "name_es": info["name_es"],
                                    "name_en": info["name_en"]
                                }
                        except Exception:
                            pass

                # 2. CAPA ESTÁTICA HEURÍSTICA (Alfabeto A-Z, Números, Señas fijas)
                if current_prediction is None and static_candidate:
                    current_prediction = static_candidate
            else:
                self.sequence_buffer.append(np.zeros(126, dtype=np.float32))

            # 3. Fallback a GestureRecognizer de Google solo si no hubo predicción previa
            if current_prediction is None and self.gesture_recognizer:
                result = self.gesture_recognizer.recognize(mp_image)
                if result and result.gestures:
                    for hand_gestures in result.gestures:
                        if hand_gestures:
                            gesture = hand_gestures[0]
                            # Prevenir falsos positivos masivos de "ILoveYou"
                            if gesture.category_name == "ILoveYou":
                                valid_ily = False
                                if hand_landmarks_list:
                                    for hl in hand_landmarks_list:
                                        if (is_thumb_extended(hl) and is_finger_extended(hl, 8, 6, 5) and
                                            is_finger_extended(hl, 20, 18, 17) and is_finger_curled(hl, 12, 10, 9) and
                                            is_finger_curled(hl, 16, 14, 13)):
                                            valid_ily = True
                                            break
                                if not valid_ily:
                                    continue

                            if gesture.score > 0.85 and gesture.category_name != "None":
                                current_prediction = GESTURE_TO_ISL.get(gesture.category_name, gesture.category_name)
                                break

            # Payload de landmarks para que el frontend dibuje los puntos y el esqueleto
            landmarks_payload = {
                "detected": bool(hand_landmarks_list or pose_landmarks_list),
                "hands": simplified_hands,
                "pose": simplified_pose,
                "motion_energy": round(motion_energy, 3),
                "is_static": bool(hand_landmarks_list and is_holding_static)
            }

            # 4. Estabilización de predicción (umbral de 2 para reconocimiento instantáneo sin lag)
            stable_result = None
            if current_prediction is None:
                self.no_detection_count += 1
                if self.no_detection_count >= 2:
                    self.last_stable_prediction = None
                    self.recent_predictions = []
                    self.no_detection_count = 0
            else:
                self.no_detection_count = 0
                self.recent_predictions.append(current_prediction)
                self.recent_predictions = self.recent_predictions[-2:]

                if len(self.recent_predictions) >= 2:
                    if self.recent_predictions[0] == self.recent_predictions[1]:
                        candidate = self.recent_predictions[0]
                        if candidate != self.last_stable_prediction:
                            self.last_stable_prediction = candidate
                            self.recent_predictions = []
                            stable_result = candidate

            return {
                "translation": stable_result,
                "landmarks": landmarks_payload
            }

        except Exception as e:
            print(f"Error procesando frame: {e}")
            return None

