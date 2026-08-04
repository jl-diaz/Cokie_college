import cv2
import numpy as np
import base64
import os
import math

# Importar nueva API de Tasks de MediaPipe
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


# ─────────────────────────────────────────────────────────────────
# Mapeo de gestos MediaPipe → Lenguaje de Señas Internacional
# MediaPipe GestureRecognizer detecta: 
#   Closed_Fist, Open_Palm, Pointing_Up, Thumb_Down, Thumb_Up, Victory, ILoveYou
# ─────────────────────────────────────────────────────────────────
GESTURE_TO_ISL = {
    "Closed_Fist":  "Puño cerrado (S)",
    "Open_Palm":    "Hola / Alto",
    "Pointing_Up":  "Atención / Uno",
    "Thumb_Down":   "No / Incorrecto",
    "Thumb_Up":     "Sí / Correcto / De acuerdo",
    "Victory":      "Paz / Victoria / Dos",
    "ILoveYou":     "Te quiero",
}


# ─────────────────────────────────────────────────────────────────
# Funciones auxiliares de geometría para análisis de landmarks
# ─────────────────────────────────────────────────────────────────

def distance_2d(p1, p2):
    """Distancia euclidiana 2D entre dos landmarks."""
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)

def distance_3d(p1, p2):
    """Distancia euclidiana 3D entre dos landmarks (usa z si disponible)."""
    dz = (p1.z - p2.z) if hasattr(p1, 'z') and hasattr(p2, 'z') else 0
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + dz**2)

def angle_between_points(a, b, c):
    """Calcula el ángulo en el punto b formado por los puntos a-b-c (en grados)."""
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
    """
    Revisa si un dedo está extendido usando múltiples criterios:
    1. La punta está más arriba que el PIP (coordenada Y invertida en imagen)
    2. El ángulo MCP-PIP-TIP es relativamente recto (>140°)
    """
    tip = landmarks[finger_tip]
    pip = landmarks[finger_pip]
    mcp = landmarks[finger_mcp]
    
    # Criterio principal: punta más arriba que PIP
    y_extended = tip.y < pip.y
    
    # Criterio secundario: ángulo relativamente recto
    angle = angle_between_points(mcp, pip, tip)
    angle_extended = angle > 140
    
    return y_extended and angle_extended

def is_finger_curled(landmarks, finger_tip, finger_pip, finger_mcp):
    """Revisa si un dedo está completamente flexionado/cerrado."""
    tip = landmarks[finger_tip]
    pip = landmarks[finger_pip]
    mcp = landmarks[finger_mcp]
    
    # La punta está por debajo del PIP y el ángulo es agudo
    angle = angle_between_points(mcp, pip, tip)
    return tip.y > pip.y and angle < 120

def is_finger_half_bent(landmarks, finger_tip, finger_pip, finger_mcp):
    """Revisa si un dedo está semi-doblado (ni extendido ni cerrado)."""
    return not is_finger_extended(landmarks, finger_tip, finger_pip, finger_mcp) and \
           not is_finger_curled(landmarks, finger_tip, finger_pip, finger_mcp)

def is_thumb_extended(landmarks):
    """Revisa si el pulgar está extendido lateralmente."""
    thumb_tip = landmarks[4]
    thumb_ip = landmarks[3]
    thumb_mcp = landmarks[2]
    index_mcp = landmarks[5]
    
    dist_tip = abs(thumb_tip.x - index_mcp.x)
    dist_mcp = abs(thumb_mcp.x - index_mcp.x)
    return dist_tip > dist_mcp * 1.2

def is_thumb_across_palm(landmarks):
    """Revisa si el pulgar está cruzado sobre la palma."""
    thumb_tip = landmarks[4]
    index_mcp = landmarks[5]
    middle_mcp = landmarks[9]
    
    # El pulgar cruza si su punta está cerca o pasando el MCP del medio
    return abs(thumb_tip.x - middle_mcp.x) < abs(index_mcp.x - middle_mcp.x) * 0.5

def tips_touching(landmarks, tip1, tip2, threshold=0.04):
    """Revisa si dos puntas de dedos se están tocando."""
    return distance_2d(landmarks[tip1], landmarks[tip2]) < threshold

def hand_orientation(landmarks):
    """
    Determina la orientación de la mano: 'vertical', 'horizontal', 'diagonal'.
    Basado en el ángulo entre la muñeca y el dedo medio.
    """
    wrist = landmarks[0]
    middle_tip = landmarks[12]
    
    dx = abs(middle_tip.x - wrist.x)
    dy = abs(middle_tip.y - wrist.y)
    
    if dy > dx * 1.5:
        return 'vertical'
    elif dx > dy * 1.5:
        return 'horizontal'
    else:
        return 'diagonal'

def fingers_spread(landmarks):
    """Revisa si los dedos están separados entre sí."""
    tips = [8, 12, 16, 20]  # índice, medio, anular, meñique
    spreads = []
    for i in range(len(tips) - 1):
        dist = distance_2d(landmarks[tips[i]], landmarks[tips[i+1]])
        spreads.append(dist)
    avg_spread = sum(spreads) / len(spreads)
    return avg_spread > 0.04

def palm_facing_camera(landmarks):
    """
    Estima si la palma está orientada hacia la cámara.
    Usa la relación entre la muñeca, el MCP del índice y el MCP del meñique.
    """
    wrist = landmarks[0]
    index_mcp = landmarks[5]
    pinky_mcp = landmarks[17]
    
    # Si el meñique está a la izquierda del índice (mano derecha mirando a cámara)
    # o viceversa para mano izquierda
    cross = (index_mcp.x - wrist.x) * (pinky_mcp.y - wrist.y) - \
            (index_mcp.y - wrist.y) * (pinky_mcp.x - wrist.x)
    return cross > 0


# ─────────────────────────────────────────────────────────────────
# Clasificador expandido de señas ISL
# Alfabeto completo A-Z + Números 0-10 + Frases comunes
# Optimizado para presentaciones estudiantiles
# ─────────────────────────────────────────────────────────────────

def classify_sign_from_landmarks(landmarks):
    """
    Clasifica señas del lenguaje de señas internacional usando landmarks.
    Soporta: Alfabeto A-Z, Números 0-10, Frases comunes de presentación.
    Retorna la seña detectada o None si no se reconoce.
    """
    if not landmarks or len(landmarks) < 21:
        return None
    
    # ── Analizar estado de cada dedo ──
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
    
    fingers = [thumb, index, middle, ring, pinky]
    extended_count = sum(fingers)
    
    orientation = hand_orientation(landmarks)
    spread = fingers_spread(landmarks)
    
    # Distancias clave
    thumb_index_dist = distance_2d(landmarks[4], landmarks[8])
    thumb_middle_dist = distance_2d(landmarks[4], landmarks[12])
    index_middle_dist = distance_2d(landmarks[8], landmarks[12])
    
    # ═══════════════════════════════════════════════════════════
    # NÚMEROS (0-10)
    # ═══════════════════════════════════════════════════════════
    
    # 0: Pulgar e índice forman un círculo, resto cerrado
    if tips_touching(landmarks, 4, 8, 0.04) and not middle and not ring and not pinky:
        return "0 (Cero)"
    
    # 1: Solo índice extendido vertical
    if not thumb and index and not middle and not ring and not pinky and orientation == 'vertical':
        return "1 (Uno)"
    
    # 2: Victoria / Paz (índice y medio separados)
    if not thumb and index and middle and not ring and not pinky:
        if index_middle_dist > 0.04 and orientation == 'vertical':
            return "2 (Dos)"
    
    # 3: Pulgar, índice y medio extendidos
    if thumb and index and middle and not ring and not pinky:
        if orientation == 'vertical':
            return "3 (Tres)"
    
    # 4: Cuatro dedos extendidos (sin pulgar)
    if not thumb and index and middle and ring and pinky:
        if orientation == 'vertical':
            return "4 (Cuatro)"
    
    # 5: Mano abierta con todos los dedos extendidos y separados
    if extended_count == 5 and spread:
        return "5 (Cinco)"
    
    # 6: Pulgar y meñique extendidos, resto cerrado (similar a Y pero con giro)
    # Diferenciado de Y por la orientación
    
    # 7: Pulgar, índice y medio extendidos horizontal
    if thumb and index and middle and not ring and not pinky and orientation == 'horizontal':
        return "7 (Siete)"
    
    # 8: Pulgar y medio tocándose, índice extendido
    if index and tips_touching(landmarks, 4, 12, 0.04) and not ring and not pinky:
        return "8 (Ocho)"
    
    # 9: Pulgar e índice tocándose (OK), resto extendido
    if tips_touching(landmarks, 4, 8, 0.04) and middle and ring and pinky:
        return "9 (Nueve)"
    
    # 10: Pulgar extendido moviéndose (sacudida) — se detecta como pulgar solo arriba
    if thumb and not index and not middle and not ring and not pinky:
        if orientation == 'vertical':
            return "10 (Diez)"
    
    # ═══════════════════════════════════════════════════════════
    # ALFABETO A-Z (Completo)
    # ═══════════════════════════════════════════════════════════
    
    # A: Puño cerrado con pulgar al costado
    if thumb and index_curled and middle_curled and ring_curled and pinky_curled:
        if not thumb_across:
            return "A"
    
    # B: Cuatro dedos extendidos juntos, pulgar sobre la palma
    if not thumb and index and middle and ring and pinky:
        if not spread and orientation == 'vertical':
            return "B"
    
    # C: Mano en forma de C (todos los dedos curvados formando semicírculo)
    if index_half and middle_half and ring_half and pinky_half:
        y_diff = abs(landmarks[4].y - landmarks[8].y)
        x_diff = abs(landmarks[4].x - landmarks[8].x)
        if 0.03 < y_diff < 0.15 and x_diff > 0.02:
            return "C"
    
    # D: Índice extendido arriba, resto formando O con pulgar
    if index and not middle and not ring and not pinky:
        if tips_touching(landmarks, 4, 12, 0.06):
            return "D"
    
    # E: Todos los dedos flexionados, puntas tocando la palma, pulgar cruzado
    if index_curled and middle_curled and ring_curled and pinky_curled and thumb_across:
        return "E"
    
    # F: OK sign - Pulgar e índice formando círculo, resto extendido
    if tips_touching(landmarks, 4, 8, 0.05) and middle and ring and pinky:
        return "F"
    
    # G: Índice y pulgar apuntando horizontalmente
    if thumb and index and not middle and not ring and not pinky:
        if orientation == 'horizontal':
            return "G"
    
    # H: Índice y medio extendidos horizontalmente
    if not thumb and index and middle and not ring and not pinky:
        if orientation == 'horizontal':
            return "H"
    
    # I: Solo meñique extendido
    if not thumb and not index and not middle and not ring and pinky:
        return "I"
    
    # J: Meñique extendido con movimiento de gancho (similar a I pero con giro)
    # Difícil detectar movimiento, lo mapeamos como variante de I con posición diagonal
    if not thumb and not index and not middle and not ring and pinky:
        if orientation == 'diagonal':
            return "J"
    
    # K: Índice y medio en V, pulgar tocando la base del medio
    if thumb and index and middle and not ring and not pinky:
        thumb_touching_middle_base = distance_2d(landmarks[4], landmarks[10]) < 0.05
        if thumb_touching_middle_base:
            return "K"
    
    # L: Pulgar e índice formando L (vertical)
    if thumb and index and not middle and not ring and not pinky:
        if orientation == 'vertical':
            angle_l = angle_between_points(landmarks[4], landmarks[2], landmarks[8])
            if angle_l > 60:
                return "L"
    
    # M: Tres dedos (índice, medio, anular) doblados sobre el pulgar
    if not index and not middle and not ring and not pinky and thumb_across:
        # Verificar que las puntas de índice, medio y anular estén abajo
        if landmarks[8].y > landmarks[5].y and landmarks[12].y > landmarks[9].y:
            return "M"
    
    # N: Dos dedos (índice, medio) doblados sobre el pulgar
    if not index and not middle and ring_curled and pinky_curled and thumb_across:
        if landmarks[8].y > landmarks[5].y and landmarks[12].y > landmarks[9].y:
            return "N"
    
    # O: Todos los dedos curvados formando un óvalo con el pulgar
    if tips_touching(landmarks, 4, 8, 0.04) and not middle and not ring and not pinky:
        if middle_curled and ring_curled and pinky_curled:
            return "O"
    
    # P: Similar a K pero apuntando hacia abajo
    if thumb and index and middle and not ring and not pinky:
        if landmarks[8].y > landmarks[0].y:  # dedos apuntando abajo
            return "P"
    
    # Q: Similar a G pero apuntando hacia abajo
    if thumb and index and not middle and not ring and not pinky:
        if landmarks[8].y > landmarks[0].y:
            return "Q"
    
    # R: Índice y medio cruzados
    if not thumb and index and middle and not ring and not pinky:
        # Cruzados: el medio está del otro lado del índice
        if landmarks[12].x < landmarks[8].x:
            return "R"
    
    # S: Puño cerrado con pulgar sobre los dedos (frente a A que tiene pulgar al lado)
    if index_curled and middle_curled and ring_curled and pinky_curled:
        if thumb_across:
            # Si el pulgar está sobre los dedos (no al lado)
            thumb_over = landmarks[4].y < landmarks[8].y
            if thumb_over:
                return "S"
    
    # T: Puño con pulgar entre índice y medio
    if index_curled and middle_curled and ring_curled and pinky_curled:
        thumb_between = abs(landmarks[4].x - landmarks[6].x) < 0.03
        if thumb_between:
            return "T"
    
    # U: Índice y medio juntos apuntando arriba
    if not thumb and index and middle and not ring and not pinky:
        if index_middle_dist < 0.03 and orientation == 'vertical':
            return "U"
    
    # V: Índice y medio separados (ya cubierto en número 2, pero sin orientación forzada)
    if not thumb and index and middle and not ring and not pinky:
        if index_middle_dist > 0.04:
            return "V"
    
    # W: Índice, medio y anular extendidos y separados
    if not thumb and index and middle and ring and not pinky:
        return "W"
    
    # X: Índice doblado como gancho
    if not thumb and not middle and not ring and not pinky:
        if index_half:
            return "X"
    
    # Y: Pulgar y meñique extendidos (hang loose)
    if thumb and not index and not middle and not ring and pinky:
        return "Y"
    
    # Z: Índice extendido trazando zigzag (difícil de detectar estáticamente)
    # Lo detectamos como índice solo en diagonal
    if not thumb and index and not middle and not ring and not pinky:
        if orientation == 'diagonal':
            return "Z"
    
    # ═══════════════════════════════════════════════════════════
    # SEÑAS COMUNES PARA PRESENTACIONES
    # ═══════════════════════════════════════════════════════════
    
    # Mano abierta (5 dedos sin separar) = "Por favor" / "Espera"
    if extended_count == 5 and not spread:
        return "Por favor / Espera"
    
    # Puño completamente cerrado (ningún dedo)
    if extended_count == 0:
        return "Puño cerrado"
    
    return None


# ─────────────────────────────────────────────────────────────────
# Variables globales para modelos
# ─────────────────────────────────────────────────────────────────
_global_gesture_recognizer = None
_global_hand_landmarker = None
_models_loaded = False

def load_models():
    global _global_gesture_recognizer, _global_hand_landmarker, _models_loaded
    if _models_loaded:
        return
        
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
            print("[OK] GestureRecognizer cargado correctamente (Global)")
        except Exception as e:
            print(f"[WARN] No se pudo cargar GestureRecognizer: {e}")
    
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
            print("[OK] HandLandmarker cargado correctamente (Global)")
        except Exception as e:
            print(f"[WARN] No se pudo cargar HandLandmarker: {e}")
    
    # Solo marcar como cargado si al menos un modelo se cargó exitosamente
    _models_loaded = (_global_gesture_recognizer is not None or _global_hand_landmarker is not None)
    
    if not _models_loaded:
        print("[ERROR] Ningún modelo se pudo cargar. El intérprete no funcionará.")

class ISLModel:
    def __init__(self):
        load_models()
        self.gesture_recognizer = _global_gesture_recognizer
        self.hand_landmarker = _global_hand_landmarker
        
        # Historial para estabilizar predicciones (evitar parpadeo)
        self.recent_predictions = []
        self.last_stable_prediction = None
        self.stability_threshold = 2  # 2 detecciones iguales seguidas = respuesta rápida
        self.no_detection_count = 0   # Contador de frames sin detección

    def process_frame_base64(self, base64_img):
        """
        Recibe una imagen en base64 desde WebSockets.
        1. Intenta reconocer gestos completos (GestureRecognizer)
        2. Si no detecta gesto, intenta clasificar señas por landmarks
        3. Estabiliza la predicción para evitar parpadeo
        """
        try:
            if not self.gesture_recognizer and not self.hand_landmarker:
                return None
                
            # Decodificar base64 a imagen OpenCV
            encoded_data = base64_img.split(',')[1] if ',' in base64_img else base64_img
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return None

            # Convertir BGR → RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            
            current_prediction = None
            
            # ── Paso 1: Intentar GestureRecognizer ──
            if self.gesture_recognizer:
                result = self.gesture_recognizer.recognize(mp_image)
                
                if result and result.gestures:
                    for hand_gestures in result.gestures:
                        if hand_gestures:
                            gesture = hand_gestures[0]
                            gesture_name = gesture.category_name
                            confidence = gesture.score
                            
                            # Solo aceptamos gestos con confianza > 70%
                            if confidence > 0.7 and gesture_name != "None":
                                isl_text = GESTURE_TO_ISL.get(gesture_name, gesture_name)
                                current_prediction = isl_text
                                break
            
            # ── Paso 2: Si no hubo gesto, clasificar seña por landmarks ──
            if current_prediction is None and self.hand_landmarker:
                hand_result = self.hand_landmarker.detect(mp_image)
                
                if hand_result and hand_result.hand_landmarks:
                    for hand_landmarks in hand_result.hand_landmarks:
                        sign = classify_sign_from_landmarks(hand_landmarks)
                        if sign:
                            current_prediction = sign
                            break
            
            # ── Paso 3: Estabilizar predicción ──
            if current_prediction is None:
                self.no_detection_count += 1
                # Después de 3 frames sin detección, permitir repetir la misma seña
                if self.no_detection_count >= 3:
                    self.last_stable_prediction = None
                    self.recent_predictions = []
                    self.no_detection_count = 0
                elif self.recent_predictions:
                    self.recent_predictions.pop(0)
                return None
            
            # Resetear contador de no-detección
            self.no_detection_count = 0
            
            self.recent_predictions.append(current_prediction)
            # Mantener solo las últimas N predicciones
            self.recent_predictions = self.recent_predictions[-self.stability_threshold:]
            
            # Solo emitir si las últimas N predicciones son IGUALES (estabilidad)
            if len(self.recent_predictions) == self.stability_threshold:
                if all(p == self.recent_predictions[0] for p in self.recent_predictions):
                    stable = self.recent_predictions[0]
                    # Solo emitir si es diferente a la última predicción estable
                    if stable != self.last_stable_prediction:
                        self.last_stable_prediction = stable
                        self.recent_predictions = []  # Reset para próximo gesto
                        return stable
            
            return None

        except Exception as e:
            print(f"Error procesando frame: {e}")
            return None
