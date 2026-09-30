"""
Cokie College - Exportador de Modelo de Inferencia Liviano
Convierte los pesos entrenados de cokie_gesture_model.npz a:
1. cokie_model_weights.json (compatible con cualquier runtime JS / Web / Móvil sin dependencias binarias)
2. mobile/src/services/cokie_model_weights.json (para inferencia local directa en Expo/Web)
"""

import os
import json
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODEL_NPZ = os.path.join(DATA_DIR, "cokie_gesture_model.npz")
OUT_JSON = os.path.join(DATA_DIR, "cokie_model_weights.json")
MOBILE_TARGET = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "mobile", "src", "services", "cokie_model_weights.json"))

def export_model_to_json():
    if not os.path.exists(MODEL_NPZ):
        print(f"[ERROR] No se encontró el archivo de modelo: {MODEL_NPZ}")
        return False

    print(f"Cargando {MODEL_NPZ}...")
    data = np.load(MODEL_NPZ, allow_pickle=True)
    
    W1 = data['W1'].astype(np.float32)
    b1 = data['b1'].astype(np.float32)
    W2 = data['W2'].astype(np.float32)
    b2 = data['b2'].astype(np.float32)
    W3 = data['W3'].astype(np.float32)
    b3 = data['b3'].astype(np.float32)
    labels = [str(lbl) for lbl in list(data['labels'])]

    export_dict = {
        "architecture": {
            "type": "MLP",
            "input_dim": int(W1.shape[0]),
            "hidden1": int(W1.shape[1]),
            "hidden2": int(W2.shape[1]),
            "num_classes": int(W3.shape[1])
        },
        "labels": labels,
        "weights": {
            "W1": W1.tolist(),
            "b1": b1.tolist(),
            "W2": W2.tolist(),
            "b2": b2.tolist(),
            "W3": W3.tolist(),
            "b3": b3.tolist()
        }
    }

    # Guardar en data/
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(export_dict, f)
    size_kb = os.path.getsize(OUT_JSON) / 1024
    print(f"[OK] Modelo exportado a {OUT_JSON} ({size_kb:.1f} KB)")

    # Copiar a mobile/src/services si existe el directorio
    mobile_dir = os.path.dirname(MOBILE_TARGET)
    if os.path.exists(mobile_dir):
        with open(MOBILE_TARGET, "w", encoding="utf-8") as f:
            json.dump(export_dict, f)
        print(f"[OK] Modelo copiado a app móvil: {MOBILE_TARGET}")

    return True

if __name__ == "__main__":
    export_model_to_json()
