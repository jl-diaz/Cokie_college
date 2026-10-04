import os
import sys
import json
import numpy as np

# Añadir ruta
sys.path.insert(0, os.path.dirname(__file__))
from gesture_trainer import FastGestureNeuralNet, extract_spatiotemporal_features, load_gestures
import isl_model

def audit_dataset():
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    labels_path = os.path.join(data_dir, "labels.json")
    samples_dir = os.path.join(data_dir, "samples")
    model_path = os.path.join(data_dir, "cokie_gesture_model.npz")
    
    with open(labels_path, "r", encoding="utf-8") as f:
        labels_meta = json.load(f)
        labels = labels_meta["labels"]
        
    print(f"==================================================")
    print(f"AUDITORIA 1: ANALISIS DEL CONJUNTO DE DATOS (MUESTRAS)")
    print(f"==================================================")
    print(f"Total clases registradas en el modelo: {len(labels)}")
    
    counts = {}
    for l in labels:
        p = os.path.join(samples_dir, l)
        c = len([f for f in os.listdir(p) if f.endswith('.npy')]) if os.path.exists(p) else 0
        counts[l] = c
        
    sorted_counts = sorted(counts.items(), key=lambda x: x[1])
    print(f"\nDistribucion de muestras por clase (Minimo a Maximo):")
    for l, c in sorted_counts[:15]:
        print(f"  - {l}: {c} muestras")
    print("  ...")
    for l, c in sorted_counts[-10:]:
        print(f"  - {l}: {c} muestras")
        
    total_samples = sum(counts.values())
    avg_samples = total_samples / len(labels)
    print(f"\nTotal muestras en dataset: {total_samples}")
    print(f"Promedio de muestras por clase: {avg_samples:.1f} muestras/clase")
    
    # Evaluar modelo
    print(f"\n==================================================")
    print(f"AUDITORIA 2: RENDIMIENTO Y CONFUSIONES DE LA RED NEURONAL")
    print(f"==================================================")
    model = FastGestureNeuralNet()
    model.load(model_path)
    
    confusions = {}
    total_tested = 0
    total_correct = 0
    
    for l in labels:
        p = os.path.join(samples_dir, l)
        if not os.path.exists(p):
            continue
        files = [os.path.join(p, f) for f in os.listdir(p) if f.endswith('.npy')]
        for fp in files:
            seq = np.load(fp)
            feats = extract_spatiotemporal_features(seq)
            pred, conf, margin = model.predict_with_margin(feats)
            total_tested += 1
            if pred == l:
                total_correct += 1
            else:
                if l not in confusions:
                    confusions[l] = []
                confusions[l].append((pred, float(conf), float(margin)))
                
    print(f"Precision en datos de entrenamiento: {total_correct}/{total_tested} ({(total_correct/total_tested)*100:.2f}%)")
    if confusions:
        print("\nConfusiones detectadas dentro de las muestras:")
        for true_label, preds in confusions.items():
            print(f"  Clase real '{true_label}' clasificada como:")
            for p, c, m in preds:
                print(f"    -> '{p}' (confianza={c:.2f}, margen={m:.2f})")
    else:
        print("La red neuronal tiene 100% de memorizacion sobre sus propias muestras (Sobreajuste / Overfitting severo).")

    print(f"\n==================================================")
    print(f"AUDITORIA 3: CASO ESPECIFICO CASA vs LISTO")
    print(f"==================================================")
    print(f"Muestras de 'casa': {counts.get('casa', 0)}")
    print(f"Muestras de 'listo': {counts.get('listo', 0)}")
    print(f"Muestras de 'listo___terminado': {counts.get('listo___terminado', 0)}")
    
    # Comprobar si listo y listo___terminado son clases duplicadas en conflicto
    print("\n¿Existen clases duplicadas?")
    if "listo" in labels and "listo___terminado" in labels:
        print("  -> ALERTA: Coexisten 'listo' y 'listo___terminado' en las etiquetas!")
        
    print(f"\n==================================================")
    print(f"AUDITORIA 4: ANALISIS DE ENTRADAS VACIAS / EN REPOSO (FALSOS POSITIVOS)")
    print(f"==================================================")
    # Probar que predice el modelo ante secuencias aleatorias, ruido o transiciones de mano
    np.random.seed(42)
    fake_transitions = [
        ("Mano estatica con temblor minimo", np.random.normal(0, 0.005, (30, 126))),
        ("Movimiento arbitrario lento", np.cumsum(np.random.normal(0, 0.02, (30, 126)), axis=0)),
        ("Mano bajando (transicion hacia descanso)", np.tile(np.linspace(0, 0.5, 30)[:, None], (1, 126))),
    ]
    
    for desc, seq in fake_transitions:
        feats = extract_spatiotemporal_features(seq)
        pred, conf, margin = model.predict_with_margin(feats)
        print(f"Simulacion '{desc}':")
        print(f"  -> Predice: '{pred}' con confianza={conf:.3f} y margen={margin:.3f}")
        
    print(f"\n==================================================")
    print(f"AUDITORIA 5: CODIGO HEURISTICO DE 'K' vs 'P'")
    print(f"==================================================")
    print("Analizando codigo de isl_model.py para K y P:")
    print("K exige: orientation == 'vertical' AND landmarks[12].y < landmarks[9].y AND thumb_mid_dist < 0.48")
    print("P evalua inmediatamente despues:")
    print("  landmarks[12].y > landmarks[9].y OR (orientation == 'horizontal' and landmarks[8].y > landmarks[5].y)")
    print("FALLA CRITICA: Si el usuario hace K pero:")
    print(f"\n==================================================")
    print(f"AUDITORIA 6: TIPO DE GESTO EN GESTURES.JSON (STATIC vs MOVEMENT)")
    print(f"==================================================")
    gestures = load_gestures()
    check_ids = ['z', 'perdon', 'adios', 'no', 'k', 'p', 'casa', 'listo', 'listo___terminado', 'mi_nombre_es', 'como_estas', 'bien']
    for g in gestures:
        if g['id'] in check_ids:
            print(f"  {g['id']:20s} | type: {g.get('type', 'N/A'):10s} | samples: {g.get('sample_count', 0)}")


if __name__ == "__main__":
    audit_dataset()
