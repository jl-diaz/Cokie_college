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
# Los mapeamos a sus equivalentes en ISL
# ─────────────────────────────────────────────────────────────────
GESTURE_TO_ISL = {
    "Closed_Fist":  "S (puño cerrado)",
    "Open_Palm":    "Hola / Alto",
    "Pointing_Up":  "Atención / Uno",
    "Thumb_Down":   "No",
    "Thumb_Up":     "Sí",
    "Victory":      "Paz / Victoria / Dos",
    "ILoveYou":     "Te quiero",
}


# ─────────────────────────────────────────────────────────────────
# Clasificador de letras ISL basado en landmarks de mano
# Usando ángulos y distancias entre articulaciones para reconocer
# letras estáticas del alfabeto internacional de señas
# ─────────────────────────────────────────────────────────────────
def is_finger_extended(landmarks, finger_tip, finger_pip, wrist_y):
    """Revisa si un dedo está extendido comparando la punta vs el PIP."""
    return landmarks[finger_tip].y < landmarks[finger_pip].y

def is_thumb_extended(landmarks):
    """Revisa si el pulgar está extendido lateralmente."""
    thumb_tip = landmarks[4]
    thumb_ip = landmarks[3]
    thumb_mcp = landmarks[2]
    index_mcp = landmarks[5]
    # El pulgar está extendido si su punta está lejos del MCP del índice
    dist_tip = abs(thumb_tip.x - index_mcp.x)
    dist_mcp = abs(thumb_mcp.x - index_mcp.x)
    return dist_tip > dist_mcp * 1.2

def classify_letter_from_landmarks(landmarks):
    """
    Clasifica letras estáticas del alfabeto ISL usando la posición
    relativa de los landmarks de la mano.
    Retorna la letra detectada o None si no se reconoce.
    """
    if not landmarks or len(landmarks) < 21:
        return None
    
    wrist_y = landmarks[0].y
    
    # Estado de cada dedo (True = extendido)
    thumb = is_thumb_extended(landmarks)
    index = is_finger_extended(landmarks, 8, 6, wrist_y)
    middle = is_finger_extended(landmarks, 12, 10, wrist_y)
    ring = is_finger_extended(landmarks, 16, 14, wrist_y)
    pinky = is_finger_extended(landmarks, 20, 18, wrist_y)
    
    fingers = [thumb, index, middle, ring, pinky]
    extended_count = sum(fingers)
    
    # ── Letras reconocibles por configuración de dedos ──
    
    # A: Puño cerrado con pulgar al costado (solo pulgar extendido)
    if thumb and not index and not middle and not ring and not pinky:
        return "A"
    
    # B: Cuatro dedos extendidos juntos, pulgar sobre la palma
    if not thumb and index and middle and ring and pinky:
        return "B"
    
    # C: Mano en forma de C (dedos curvados)
    # Detectamos que todos los dedos están semi-doblados (puntas alineadas y curvadas)
    if not thumb and not index and not middle and not ring and not pinky:
        # Distancia entre punta del pulgar y punta de los otros dedos es media
        dist_c = abs(landmarks[4].y - landmarks[8].y)
        if 0.05 < dist_c < 0.15:
            return "C"
            
    # D: Solo índice extendido apuntando arriba
    if not thumb and index and not middle and not ring and not pinky:
        return "D"
        
    # E: Garras retraídas (todos los dedos flexionados pero no en puño cerrado apretado)
    # Se detecta similar al puño pero con pulgar cruzado abajo
    
    # F: OK sign - Pulgar e índice tocándose, resto extendido
    if not index and middle and ring and pinky:
        dist = math.sqrt((landmarks[4].x - landmarks[8].x)**2 + (landmarks[4].y - landmarks[8].y)**2)
        if dist < 0.05:
            return "F"
            
    # G: Índice y pulgar apuntando horizontalmente paralelos
    if thumb and index and not middle and not ring and not pinky:
        # Diferenciar L (vertical) de G (horizontal)
        if abs(landmarks[8].x - landmarks[0].x) > abs(landmarks[8].y - landmarks[0].y):
            return "G"
        else:
            return "L"
            
    # H: Índice y medio extendidos apuntando horizontalmente
    if not thumb and index and middle and not ring and not pinky:
        if abs(landmarks[8].x - landmarks[0].x) > abs(landmarks[8].y - landmarks[0].y):
            return "H"
    
    # I: Solo meñique extendido
    if not thumb and not index and not middle and not ring and pinky:
        return "I"
        
    # K: Índice y medio apuntando arriba en V, pulgar tocando la base del medio
    if thumb and index and middle and not ring and not pinky:
        # Similar a la V pero con el pulgar arriba
        return "K"
        
    # L: Ya cubierta dentro de la lógica de G (dedos verticales)
    
    # M: Índice, medio y anular flexionados sobre el pulgar
    # Muy difícil solo con landmarks simples sin profundidad exacta, mapeamos a 3 dedos abajo
    
    # O: Todos los dedos tocando la punta del pulgar
    dist_o = math.sqrt((landmarks[4].x - landmarks[8].x)**2 + (landmarks[4].y - landmarks[8].y)**2)
    if not index and not middle and not ring and not pinky:
        if dist_o < 0.04:
            return "O"
            
    # R: Índice y medio cruzados
    if not thumb and index and middle and not ring and not pinky:
        # El medio (12) debe estar cruzado sobre el índice (8)
        if landmarks[12].x < landmarks[8].x:
            return "R"
    
    # U: Índice y medio juntos apuntando arriba
    if not thumb and index and middle and not ring and not pinky:
        dist_tips = abs(landmarks[8].x - landmarks[12].x)
        if dist_tips < 0.03:
            return "U"
        else:
            return "V"  # Si están separados, es V
            
    # W: Índice, medio y anular extendidos y separados
    if not thumb and index and middle and ring and not pinky:
        return "W"
        
    # X: Solo índice encorvado como gancho
    if not thumb and not middle and not ring and not pinky:
        # Si el índice no está totalmente extendido sino en gancho
        if not index and landmarks[8].y > landmarks[6].y and landmarks[8].y < landmarks[5].y:
            return "X"
            
    # Y: Pulgar y meñique extendidos (hang loose)
    if thumb and not index and not middle and not ring and pinky:
        return "Y"
    
    # 5 / Mano abierta: Todos los dedos extendidos y separados
    if extended_count == 5:
        return "5 (Mano abierta)"
    
    # Puño cerrado: Ningún dedo extendido (S o A o E)
    if extended_count == 0:
        return "S (Puño)"
    
    return None


class ISLModel:
    def __init__(self):
        model_path = os.path.join(os.path.dirname(__file__) or '.', 'gesture_recognizer.task')
        hand_model_path = os.path.join(os.path.dirname(__file__) or '.', 'hand_landmarker.task')
        
        self.gesture_recognizer = None
        self.hand_landmarker = None
        
        # 1. Intentar cargar el GestureRecognizer (reconoce gestos completos)
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
                self.gesture_recognizer = vision.GestureRecognizer.create_from_options(options)
                print("[OK] GestureRecognizer cargado correctamente")
            except Exception as e:
                print(f"[WARN] No se pudo cargar GestureRecognizer: {e}")
        else:
            print(f"[WARN] Modelo gesture_recognizer.task no encontrado en {model_path}")
        
        # 2. Cargar HandLandmarker como respaldo para letras por landmarks
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
                self.hand_landmarker = vision.HandLandmarker.create_from_options(hand_options)
                print("[OK] HandLandmarker cargado correctamente")
            except Exception as e:
                print(f"[WARN] No se pudo cargar HandLandmarker: {e}")
        else:
            print(f"[WARN] Modelo hand_landmarker.task no encontrado en {hand_model_path}")
        
        # Historial para estabilizar predicciones (evitar parpadeo)
        self.recent_predictions = []
        self.last_stable_prediction = None
        self.stability_threshold = 2  # Necesita solo 2 detecciones iguales seguidas para ser rápido

    def process_frame_base64(self, base64_img):
        """
        Recibe una imagen en base64 desde WebSockets.
        1. Intenta reconocer gestos completos (GestureRecognizer)
        2. Si no detecta gesto, intenta clasificar letras por landmarks
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
            
            # ── Paso 2: Si no hubo gesto, intentar clasificar letra por landmarks ──
            if current_prediction is None and self.hand_landmarker:
                hand_result = self.hand_landmarker.detect(mp_image)
                
                if hand_result and hand_result.hand_landmarks:
                    for hand_landmarks in hand_result.hand_landmarks:
                        letter = classify_letter_from_landmarks(hand_landmarks)
                        if letter:
                            current_prediction = f"Letra: {letter}"
                            break
            
            # ── Paso 3: Estabilizar predicción ──
            if current_prediction is None:
                # No se detectó nada, limpiar historial gradualmente
                if self.recent_predictions:
                    self.recent_predictions.pop(0)
                return None
            
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
