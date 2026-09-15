"""
Módulo de Entrenamiento y Clasificación de Gestos y Movimientos Espacio-Temporales
para Cokie College (Lentes CokieLens y Cámara Móvil/Web).

Soporta señas estáticas y movimientos dinámicos (brazos, manos y rostro)
usando secuencias de 30 fotogramas y una Red Neuronal optimizada en NumPy.
"""

import os
import json
import time
import math
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
SAMPLES_DIR = os.path.join(DATA_DIR, "samples")
GESTURES_FILE = os.path.join(DATA_DIR, "gestures.json")
MODEL_FILE = os.path.join(DATA_DIR, "cokie_gesture_model.npz")
LABELS_FILE = os.path.join(DATA_DIR, "labels.json")

# Asegurar directorios
os.makedirs(SAMPLES_DIR, exist_ok=True)

# ── CATÁLOGO DE GESTOS PREDEFINIDOS Y PERSONALIZADOS ──────────────────────────
DEFAULT_GESTURES = [
    {
        "id": "hola",
        "name": "Hola / Saludo",
        "name_es": "Hola",
        "name_en": "Hello",
        "type": "movement",
        "description": "Mano abierta a la altura del hombro moviéndose lateralmente",
        "sample_count": 0,
        "is_default": True
    },
    {
        "id": "gracias",
        "name": "Gracias",
        "name_es": "Gracias",
        "name_en": "Thank you",
        "type": "movement",
        "description": "Mano abierta tocando barbilla y extendiéndose hacia adelante",
        "sample_count": 0,
        "is_default": True
    },
    {
        "id": "por_favor",
        "name": "Por favor",
        "name_es": "Por favor",
        "name_en": "Please",
        "type": "movement",
        "description": "Palma abierta en el pecho haciendo movimiento circular",
        "sample_count": 0,
        "is_default": True
    },
    {
        "id": "permiso_bano",
        "name": "Permiso para ir al baño",
        "name_es": "Permiso para ir al baño",
        "name_en": "Bathroom permission",
        "type": "movement",
        "description": "Mano en letra 'B' o sacudiendo suavemente a la altura del pecho",
        "sample_count": 0,
        "is_default": True
    },
    {
        "id": "te_quiero",
        "name": "Te quiero / I Love You",
        "name_es": "Te quiero",
        "name_en": "I love you",
        "type": "static",
        "description": "Pulgar, índice y meñique extendidos",
        "sample_count": 0,
        "is_default": True
    },
    {
        "id": "si",
        "name": "Sí (Afirmación)",
        "name_es": "Sí",
        "name_en": "Yes",
        "type": "movement",
        "description": "Puño vertical asintiendo suavemente o cabeza asintiendo",
        "sample_count": 0,
        "is_default": True
    },
    {
        "id": "no",
        "name": "No (Negación)",
        "name_es": "No",
        "name_en": "No",
        "type": "movement",
        "description": "Índice y medio tocando pulgar o mano negando",
        "sample_count": 0,
        "is_default": True
    }
]

def load_gestures():
    """Carga el catálogo de gestos actual o lo inicializa."""
    if not os.path.exists(GESTURES_FILE):
        save_gestures(DEFAULT_GESTURES)
        return DEFAULT_GESTURES
    try:
        with open(GESTURES_FILE, "r", encoding="utf-8") as f:
            gestures = json.load(f)
            # Actualizar conteo de muestras reales en disco
            for g in gestures:
                g_dir = os.path.join(SAMPLES_DIR, g["id"])
                if os.path.exists(g_dir):
                    g["sample_count"] = len([f for f in os.listdir(g_dir) if f.endswith(".npy")])
                else:
                    g["sample_count"] = 0
            return gestures
    except Exception as e:
        print(f"[WARN] Error cargando gestures.json: {e}")
        return DEFAULT_GESTURES

def save_gestures(gestures):
    """Guarda el catálogo de gestos en JSON."""
    with open(GESTURES_FILE, "w", encoding="utf-8") as f:
        json.dump(gestures, f, ensure_ascii=False, indent=2)

def add_gesture(name, gesture_type="movement", description="", name_en=""):
    """Agrega un nuevo gesto al catálogo del dialecto con nombres en español e inglés."""
    gestures = load_gestures()
    # Generar ID slug seguro
    slug = name.lower().strip()
    for c in [" ", "-", "/", "\\", ".", ",", "á", "é", "í", "ó", "ú", "ñ"]:
        slug = slug.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ñ", "n")
        slug = slug.replace(c, "_")
    slug = "".join([c for c in slug if c.isalnum() or c == "_"]).strip("_")
    if not slug:
        slug = f"gesto_{int(time.time())}"

    en_val = name_en.strip() if name_en and name_en.strip() else name.strip()

    # Verificar si ya existe
    for g in gestures:
        if g["id"] == slug:
            g["name"] = name.strip()
            g["name_es"] = name.strip()
            g["name_en"] = en_val
            save_gestures(gestures)
            return g

    new_gesture = {
        "id": slug,
        "name": name.strip(),
        "name_es": name.strip(),
        "name_en": en_val,
        "type": gesture_type,
        "description": description.strip(),
        "sample_count": 0,
        "is_default": False,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    gestures.append(new_gesture)
    save_gestures(gestures)
    os.makedirs(os.path.join(SAMPLES_DIR, slug), exist_ok=True)
    return new_gesture

def delete_gesture(gesture_id):
    """Elimina un gesto y sus muestras."""
    gestures = load_gestures()
    gestures = [g for g in gestures if g["id"] != gesture_id]
    save_gestures(gestures)

    # Eliminar muestras en disco
    g_dir = os.path.join(SAMPLES_DIR, gesture_id)
    if os.path.exists(g_dir):
        import shutil
        shutil.rmtree(g_dir, ignore_errors=True)

    # Si el gesto estaba en el modelo activo, actualizarlo
    global _active_model
    if os.path.exists(LABELS_FILE):
        try:
            with open(LABELS_FILE, "r", encoding="utf-8") as f:
                labels = json.load(f)
            if gesture_id in labels:
                res = train_dialect_model(epochs=30)
                if not res.get("success"):
                    _active_model = None
                    if os.path.exists(MODEL_FILE):
                        os.remove(MODEL_FILE)
                    if os.path.exists(LABELS_FILE):
                        os.remove(LABELS_FILE)
        except Exception as e:
            print(f"[WARN] Error actualizando modelo tras eliminar {gesture_id}: {e}")
    return True

def get_gesture_display_info(gesture_id):
    """
    Obtiene la información bilingüe del gesto (id, name_es, name_en)
    para resolver automáticamente en español ('Puerta') o inglés ('Door').
    """
    try:
        gestures = load_gestures()
        for g in gestures:
            if g["id"] == gesture_id:
                return {
                    "id": g["id"],
                    "name": g.get("name", g["id"]),
                    "name_es": g.get("name_es", g.get("name", g["id"])),
                    "name_en": g.get("name_en", g.get("name", g["id"]))
                }
    except Exception:
        pass
    clean = gesture_id.replace("sign.", "").replace("_", " ").capitalize()
    return {
        "id": gesture_id,
        "name": clean,
        "name_es": clean,
        "name_en": clean
    }

def get_gesture_display_name(gesture_id):
    """Fallback simple para obtener el nombre legible."""
    info = get_gesture_display_info(gesture_id)
    return info["name_es"]



def save_sample(gesture_id, sequence_30_frames):
    """
    Guarda una secuencia grabada de 30 fotogramas.
    sequence_30_frames: lista o array de 30 frames.
    Cada frame contiene un vector de landmarks normalizados (manos + brazos + rostro).
    """
    g_dir = os.path.join(SAMPLES_DIR, gesture_id)
    os.makedirs(g_dir, exist_ok=True)

    arr = np.array(sequence_30_frames, dtype=np.float32)
    # Validar forma: (30, N_features)
    if len(arr.shape) != 2 or arr.shape[0] < 15:
        raise ValueError(f"Formato de secuencia inválido: {arr.shape}. Se esperan al menos 15-30 frames.")

    # Si tiene menos de 30, re-muestrear o rellenar
    if arr.shape[0] != 30:
        indices = np.linspace(0, arr.shape[0] - 1, 30).astype(int)
        arr = arr[indices]

    filename = f"sample_{int(time.time() * 1000)}.npy"
    filepath = os.path.join(g_dir, filename)
    np.save(filepath, arr)

    # Actualizar contador
    gestures = load_gestures()
    for g in gestures:
        if g["id"] == gesture_id:
            g["sample_count"] = len([f for f in os.listdir(g_dir) if f.endswith(".npy")])
            break
    save_gestures(gestures)
    return filepath

# ── EXTRACCIÓN DE CARACTERÍSTICAS ESPACIO-TEMPORALES ───────────────────────────
def extract_spatiotemporal_features(sequence_30_frames):
    """
    Convierte una secuencia de 30 cuadros en un vector denso de características
    espacio-temporales robusto a variaciones de velocidad y escala.
    """
    seq = np.array(sequence_30_frames, dtype=np.float32)
    if seq.shape[0] != 30:
        indices = np.linspace(0, seq.shape[0] - 1, 30).astype(int)
        seq = seq[indices]

    # 1. Posiciones estáticas en 5 puntos temporales clave (inicio, 1/4, mitad, 3/4, final)
    key_timesteps = [0, 7, 14, 21, 29]
    sample_snapshots = seq[key_timesteps].flatten()

    # 2. Resumen estadístico a lo largo del tiempo
    mean_pos = np.mean(seq, axis=0)
    std_pos = np.std(seq, axis=0)
    min_pos = np.min(seq, axis=0)
    max_pos = np.max(seq, axis=0)

    # 3. Vectores de velocidad y desplazamiento (dinámica del movimiento)
    deltas = np.diff(seq, axis=0)  # Diferencias entre frames consecutivos (29, N)
    mean_velocity = np.mean(deltas, axis=0)
    std_velocity = np.std(deltas, axis=0)
    total_displacement = seq[-1] - seq[0]  # Desplazamiento neto final

    # Concatenar todo en un único vector de características
    features = np.concatenate([
        sample_snapshots,     # 5 x N
        mean_pos,             # N
        std_pos,              # N
        min_pos,              # N
        max_pos,              # N
        mean_velocity,        # N
        std_velocity,         # N
        total_displacement    # N
    ])
    return features

# ── RED NEURONAL TEMPORAL EN NUMPY (ALTA VELOCIDAD, CERO DEPENDENCIAS PESADAS) ─
class FastGestureNeuralNet:
    def __init__(self, input_dim=0, hidden1=128, hidden2=64, num_classes=0):
        self.input_dim = input_dim
        self.hidden1 = hidden1
        self.hidden2 = hidden2
        self.num_classes = num_classes
        self.W1 = None
        self.b1 = None
        self.W2 = None
        self.b2 = None
        self.W3 = None
        self.b3 = None
        self.labels = []

    def initialize_weights(self):
        # Inicialización He (Kaiming) para ReLU
        self.W1 = np.random.randn(self.input_dim, self.hidden1).astype(np.float32) * np.sqrt(2.0 / self.input_dim)
        self.b1 = np.zeros(self.hidden1, dtype=np.float32)
        self.W2 = np.random.randn(self.hidden1, self.hidden2).astype(np.float32) * np.sqrt(2.0 / self.hidden1)
        self.b2 = np.zeros(self.hidden2, dtype=np.float32)
        self.W3 = np.random.randn(self.hidden2, self.num_classes).astype(np.float32) * np.sqrt(2.0 / self.hidden2)
        self.b3 = np.zeros(self.num_classes, dtype=np.float32)

    def relu(self, x):
        return np.maximum(0, x)

    def softmax(self, x):
        e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return e_x / np.sum(e_x, axis=-1, keepdims=True)

    def forward(self, X):
        z1 = np.dot(X, self.W1) + self.b1
        a1 = self.relu(z1)
        z2 = np.dot(a1, self.W2) + self.b2
        a2 = self.relu(z2)
        z3 = np.dot(a2, self.W3) + self.b3
        probs = self.softmax(z3)
        return a1, a2, probs

    def train(self, X, y, epochs=35, lr=0.003, batch_size=16, on_progress=None):
        """
        Entrenamiento con optimizador Adam y Data Augmentation.
        on_progress: callback(epoch, total_epochs, loss, accuracy)
        """
        N = X.shape[0]
        num_classes = self.num_classes

        # One-hot encoding
        y_onehot = np.zeros((N, num_classes), dtype=np.float32)
        y_onehot[np.arange(N), y] = 1.0

        # Estados de Adam
        mW1, vW1 = np.zeros_like(self.W1), np.zeros_like(self.W1)
        mb1, vb1 = np.zeros_like(self.b1), np.zeros_like(self.b1)
        mW2, vW2 = np.zeros_like(self.W2), np.zeros_like(self.W2)
        mb2, vb2 = np.zeros_like(self.b2), np.zeros_like(self.b2)
        mW3, vW3 = np.zeros_like(self.W3), np.zeros_like(self.W3)
        mb3, vb3 = np.zeros_like(self.b3), np.zeros_like(self.b3)

        beta1, beta2, eps = 0.9, 0.999, 1e-8
        t_step = 0

        for epoch in range(1, epochs + 1):
            # Barajar datos y aplicar Data Augmentation ligero (ruido gaussiano 1%)
            indices = np.random.permutation(N)
            X_shuffled = X[indices]
            # Augmentation: pequeña variación de escala o jitter
            noise = np.random.randn(*X_shuffled.shape).astype(np.float32) * 0.005
            X_aug = X_shuffled + noise
            y_shuffled = y_onehot[indices]

            epoch_loss = 0.0
            correct = 0

            for start_idx in range(0, N, batch_size):
                end_idx = min(start_idx + batch_size, N)
                xb = X_aug[start_idx:end_idx]
                yb = y_shuffled[start_idx:end_idx]
                bsize = xb.shape[0]

                t_step += 1

                # Forward
                a1, a2, probs = self.forward(xb)

                # Loss (Cross-Entropy)
                batch_loss = -np.sum(yb * np.log(np.clip(probs, 1e-12, 1.0))) / bsize
                epoch_loss += batch_loss * bsize

                preds = np.argmax(probs, axis=1)
                targets = np.argmax(yb, axis=1)
                correct += np.sum(preds == targets)

                # Backward
                dz3 = (probs - yb) / bsize
                dW3 = np.dot(a2.T, dz3)
                db3 = np.sum(dz3, axis=0)

                da2 = np.dot(dz3, self.W3.T)
                dz2 = da2 * (a2 > 0)
                dW2 = np.dot(a1.T, dz2)
                db2 = np.sum(dz2, axis=0)

                da1 = np.dot(dz2, self.W2.T)
                dz1 = da1 * (a1 > 0)
                dW1 = np.dot(xb.T, dz1)
                db1 = np.sum(dz1, axis=0)

                # Adam updates
                for param, grad, m, v in [
                    (self.W1, dW1, mW1, vW1), (self.b1, db1, mb1, vb1),
                    (self.W2, dW2, mW2, vW2), (self.b2, db2, mb2, vb2),
                    (self.W3, dW3, mW3, vW3), (self.b3, db3, mb3, vb3)
                ]:
                    m[:] = beta1 * m + (1.0 - beta1) * grad
                    v[:] = beta2 * v + (1.0 - beta2) * (grad ** 2)
                    m_hat = m / (1.0 - beta1 ** t_step)
                    v_hat = v / (1.0 - beta2 ** t_step)
                    param -= lr * m_hat / (np.sqrt(v_hat) + eps)

            total_loss = epoch_loss / N
            accuracy = correct / N

            if on_progress:
                on_progress(epoch, epochs, float(total_loss), float(accuracy))

        return accuracy

    def save(self, filepath, labels):
        self.labels = labels
        np.savez_compressed(
            filepath,
            W1=self.W1, b1=self.b1,
            W2=self.W2, b2=self.b2,
            W3=self.W3, b3=self.b3,
            labels=np.array(labels)
        )
        with open(LABELS_FILE, "w", encoding="utf-8") as f:
            json.dump({"labels": labels, "trained_at": time.strftime("%Y-%m-%d %H:%M:%S")}, f, indent=2)

    def load(self, filepath):
        if not os.path.exists(filepath):
            return False
        data = np.load(filepath, allow_pickle=True)
        self.W1 = data['W1']
        self.b1 = data['b1']
        self.W2 = data['W2']
        self.b2 = data['b2']
        self.W3 = data['W3']
        self.b3 = data['b3']
        self.labels = list(data['labels'])
        self.input_dim = self.W1.shape[0]
        self.num_classes = self.W3.shape[1]
        return True

    def predict(self, feature_vector):
        if self.W1 is None:
            return None, 0.0
        X = np.array(feature_vector, dtype=np.float32).reshape(1, -1)
        _, _, probs = self.forward(X)
        class_idx = np.argmax(probs[0])
        confidence = float(probs[0][class_idx])
        label = self.labels[class_idx] if class_idx < len(self.labels) else "unknown"
        return label, confidence

# Instancia global del modelo entrenado
_active_gesture_model = None

def get_active_model():
    """Retorna el modelo activo en memoria, cargándolo si existe."""
    global _active_gesture_model
    if _active_gesture_model is None:
        model = FastGestureNeuralNet()
        if model.load(MODEL_FILE):
            _active_gesture_model = model
            print(f"[OK] Modelo de gestos activo con {len(model.labels)} clases: {model.labels}")
    return _active_gesture_model

def reload_active_model():
    """Fuerza la recarga en caliente del modelo tras un entrenamiento."""
    global _active_gesture_model
    model = FastGestureNeuralNet()
    if model.load(MODEL_FILE):
        _active_gesture_model = model
        print(f"[RELOAD OK] Modelo recargado exitosamente en caliente con clases: {model.labels}")
        return True
    return False

def seed_baseline_samples_if_empty():
    """
    Genera muestras sintéticas iniciales para los gestos predefinidos
    si la carpeta de muestras está vacía o tiene menos de 2 gestos con muestras.
    Esto garantiza que el sistema siempre pueda entrenar inmediatamente
    sin perder las señas preexistentes.
    """
    gestures = load_gestures()
    gestures_with_samples = 0
    for g in gestures:
        g_dir = os.path.join(SAMPLES_DIR, g["id"])
        if os.path.exists(g_dir) and len([f for f in os.listdir(g_dir) if f.endswith(".npy")]) >= 2:
            gestures_with_samples += 1

    if gestures_with_samples >= 2:
        return  # Ya existen suficientes muestras

    t = np.linspace(0, 1, 30)
    for g in DEFAULT_GESTURES:
        g_id = g["id"]
        g_dir = os.path.join(SAMPLES_DIR, g_id)
        os.makedirs(g_dir, exist_ok=True)
        existing = [f for f in os.listdir(g_dir) if f.endswith(".npy")]
        if len(existing) >= 2:
            continue

        for i in range(4):
            seq = np.zeros((30, 126), dtype=np.float32)
            noise = np.random.normal(0, 0.02, (30, 126)).astype(np.float32)
            if g_id == "hola":
                seq[:, 0] = np.sin(2 * np.pi * (2.5 + i * 0.2) * t) * 0.4
                seq[:, 24] = np.sin(2 * np.pi * (2.5 + i * 0.2) * t) * 0.5
            elif g_id == "gracias":
                seq[:, 1] = t * 0.35 + (i * 0.01)
                seq[:, 2] = t * 0.45 + (i * 0.01)
            elif g_id == "por_favor":
                seq[:, 0] = np.cos(2 * np.pi * 1.5 * t) * 0.25
                seq[:, 1] = np.sin(2 * np.pi * 1.5 * t) * 0.25
            elif g_id == "te_quiero":
                seq[:, 12] = 0.6
                seq[:, 24] = 0.8
                seq[:, 60] = 0.75
            elif g_id == "si":
                seq[:, 1] = np.sin(2 * np.pi * 3.0 * t) * 0.3
            elif g_id == "no":
                seq[:, 0] = np.sin(2 * np.pi * 4.0 * t) * 0.35
            else:
                seq[:, 0] = np.sin(2 * np.pi * (1.0 + i) * t) * 0.2

            sample_data = seq + noise
            filepath = os.path.join(g_dir, f"sample_base_{i + 1}.npy")
            np.save(filepath, sample_data)

    load_gestures()


# ── EJECUTOR DE ENTRENAMIENTO COMPLETO ─────────────────────────────────────────
def train_dialect_model(epochs=40, on_progress=None):
    """
    Lee todas las muestras grabadas en disco, extrae características,
    entrena la red neuronal y recarga en caliente el modelo activo.
    """
    gestures = load_gestures()
    labels = []
    X_list = []
    y_list = []

    # Recopilar datos
    for g in gestures:
        g_id = g["id"]
        g_dir = os.path.join(SAMPLES_DIR, g_id)
        if not os.path.exists(g_dir):
            continue

        sample_files = [f for f in os.listdir(g_dir) if f.endswith(".npy")]
        if len(sample_files) < 2:  # Mínimo 2 muestras para entrenar
            continue

        label_idx = len(labels)
        labels.append(g_id)

        for s_file in sample_files:
            try:
                seq = np.load(os.path.join(g_dir, s_file))
                feats = extract_spatiotemporal_features(seq)
                X_list.append(feats)
                y_list.append(label_idx)
            except Exception as e:
                print(f"[WARN] Error cargando muestra {s_file}: {e}")

    if len(labels) < 2:
        return {
            "success": False,
            "error": "Se necesitan al menos 2 gestos con 2 o más muestras grabadas para poder entrenar."
        }

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.int32)

    input_dim = X.shape[1]
    num_classes = len(labels)

    print(f"[ENTRENAMIENTO] Iniciando con {X.shape[0]} muestras, {num_classes} clases y dimensión de entrada {input_dim}")

    model = FastGestureNeuralNet(input_dim=input_dim, hidden1=128, hidden2=64, num_classes=num_classes)
    model.initialize_weights()

    final_accuracy = model.train(X, y, epochs=epochs, lr=0.004, batch_size=8, on_progress=on_progress)

    # Guardar modelo entrenado
    model.save(MODEL_FILE, labels)

    # Recargar en caliente
    reload_active_model()

    return {
        "success": True,
        "classes": labels,
        "num_classes": num_classes,
        "total_samples": X.shape[0],
        "final_accuracy": round(float(final_accuracy) * 100, 2),
        "model_file": MODEL_FILE
    }


if __name__ == "__main__":
    print("=" * 65)
    print("   COKIE COLLEGE - ENTRENADOR LOCAL DE RED NEURONAL IA")
    print("=" * 65)
    print("Cargando dataset de muestras y preparando Red Neuronal...")
    print()

    def cli_progress(current, total, loss, accuracy):
        percent = int((current / total) * 100)
        filled = int(percent / 4)
        bar = "#" * filled + "-" * (25 - filled)
        acc = accuracy * 100
        print(f"\rEpoca [{current:2d}/{total}] [{bar}] {percent}% - Precision: {acc:.1f}% - Perdida: {loss:.4f}", end="", flush=True)

    result = train_dialect_model(epochs=40, on_progress=cli_progress)
    print("\n")
    if result.get("success"):
        print(" [OK] ¡Entrenamiento completado con éxito!")
        print(f"       Clases aprendidas ({result.get('num_classes')}): {', '.join(result.get('classes', []))}")
        print(f"       Total de muestras procesadas: {result.get('total_samples')}")
        print(f"       Precisión final:              {result.get('final_accuracy')}%")
        print(f"       Modelo compilado guardado en: {result.get('model_file')}")
        print()
        print(" [INFO] El modelo fue recargado en memoria automáticamente.")
    else:
        print(f" [ERROR] No se pudo entrenar: {result.get('error')}")

