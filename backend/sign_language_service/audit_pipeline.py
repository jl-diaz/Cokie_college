import os
import sys
import json
import numpy as np

# Añadir directorio actual al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gesture_trainer

print("=" * 60)
print("AUDITORÍA DE INTEGRIDAD: MODELO, ETIQUETAS Y MUESTRAS")
print("=" * 60)

base_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(base_dir, "data")
model_path = gesture_trainer.MODEL_FILE
labels_path = gesture_trainer.LABELS_FILE
gestures_path = gesture_trainer.GESTURES_FILE
samples_dir = gesture_trainer.SAMPLES_DIR

# 1. Verificar existencia de archivos
for p, desc in [(model_path, "Modelo .npz"), (labels_path, "Labels JSON"), (gestures_path, "Gestures JSON")]:
    if not os.path.exists(p):
        print(f"[FAIL] Falta archivo: {desc} ({p})")
        sys.exit(1)
    print(f"[OK] Archivo presente: {desc}")

# 2. Cargar y verificar modelo .npz
model = gesture_trainer.FastGestureNeuralNet()
if not model.load(model_path):
    print(f"[FAIL] No se pudo cargar el modelo desde {model_path}")
    sys.exit(1)

print(f"[OK] Modelo cargado exitosamente.")
print(f"[OK] Total de clases en modelo: {len(model.labels)}")

# Verificar pesos sin NaN / Inf
for name, arr in [("W1", model.W1), ("b1", model.b1), ("W2", model.W2), ("b2", model.b2), ("W3", model.W3), ("b3", model.b3)]:
    if np.isnan(arr).any():
        print(f"[FAIL] NaN detectado en {name}")
        sys.exit(1)
    if np.isinf(arr).any():
        print(f"[FAIL] Inf detectado en {name}")
        sys.exit(1)
    print(f"  > Matriz {name}: shape={arr.shape}, min={arr.min():.4f}, max={arr.max():.4f}")

# 3. Comparar clases con labels.json y gestures.json
with open(labels_path, "r", encoding="utf-8") as f:
    labels_data = json.load(f)
label_classes = labels_data.get("labels", [])
print(f"[OK] Total de clases en labels.json: {len(label_classes)}")

with open(gestures_path, "r", encoding="utf-8") as f:
    gestures_data = json.load(f)
gesture_ids = [g["id"] for g in gestures_data] if isinstance(gestures_data, list) else [g["id"] for g in gestures_data.get("gestures", [])]
print(f"[OK] Total de gestos en gestures.json: {len(gesture_ids)}")

diff_model_labels = set(model.labels) - set(label_classes)
if diff_model_labels:
    print(f"[WARN] Clases en modelo no presentes en labels.json: {diff_model_labels}")
else:
    print("[OK] Todas las clases del modelo coinciden con labels.json.")

# 4. Inspeccionar muestras en samples/
sample_count = 0
invalid_samples = []
classes_with_samples = set()

for root, dirs, files in os.walk(samples_dir):
    for f in files:
        if f.endswith(".npy"):
            sample_count += 1
            gesture_id = os.path.basename(root)
            classes_with_samples.add(gesture_id)
            sample_path = os.path.join(root, f)
            try:
                sample_arr = np.load(sample_path)
                if sample_arr.shape != (30, 126):
                    invalid_samples.append((sample_path, f"Forma incorrecta: {sample_arr.shape}"))
                elif np.isnan(sample_arr).any():
                    invalid_samples.append((sample_path, "Contiene NaNs"))
            except Exception as e:
                invalid_samples.append((sample_path, str(e)))

print(f"[OK] Total de archivos de muestras .npy: {sample_count}")
print(f"[OK] Clases con muestras físicas grabadas: {len(classes_with_samples)}")
if invalid_samples:
    print(f"[FAIL] Muestras corruptas encontradas: {invalid_samples}")
    sys.exit(1)
else:
    print("[OK] 100% de las muestras grabadas tienen dimensión exacta (30, 126) y son válidas.")

# 5. Probar inferencia matemática con el modelo cargado
print(f"Arquitectura: Entrada={model.input_dim}, Oculta 1={model.W1.shape[1]}, Oculta 2={model.W2.shape[1]}, Salida={model.num_classes}")

# Inferencia de prueba con vector sintético normalizado
synthetic_features = np.random.randn(model.input_dim).astype(np.float32)
pred_label, conf, margin = model.predict_with_margin(synthetic_features)

print(f"[OK] Prueba de inferencia matemática exitosa:")
print(f"  > Predicción sintética: '{pred_label}' (confianza: {conf * 100:.2f}%, margen: {margin:.4f})")
print("=" * 60)
print("AUDITORÍA DE MODELO COMPLETADA AL 100% CON ÉXITO")
print("=" * 60)
