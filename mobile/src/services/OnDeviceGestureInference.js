/**
 * OnDeviceGestureInference.js
 * Motor de inferencia local en dispositivo (JavaScript puro).
 * Permite clasificar vectores de características de señas con < 1ms de latencia,
 * sin necesidad de dependencias binarias pesadas ni peticiones a servidores remotos.
 */

let modelData = null;

try {
  modelData = require('./cokie_model_weights.json');
} catch (e) {
  // Modelo no pre-empaquetado o cargado dinámicamente
}

function relu(arr) {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    out[i] = arr[i] > 0 ? arr[i] : 0;
  }
  return out;
}

function softmax(arr) {
  let max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i];
  }
  let sum = 0;
  const exp = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    exp[i] = Math.exp(arr[i] - max);
    sum += exp[i];
  }
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    out[i] = exp[i] / sum;
  }
  return out;
}

function matmulAdd(x, W, b, outDim) {
  const inDim = x.length;
  const out = new Float32Array(outDim);
  for (let j = 0; j < outDim; j++) {
    let sum = b[j];
    for (let i = 0; i < inDim; i++) {
      sum += x[i] * W[i][j];
    }
    out[j] = sum;
  }
  return out;
}

export class OnDeviceGestureClassifier {
  constructor(customWeights = null) {
    this.model = customWeights || modelData;
  }

  isReady() {
    return this.model !== null && this.model.weights !== null;
  }

  setWeights(newWeights) {
    this.model = newWeights;
  }

  /**
   * Clasifica un vector de características de 504 dimensiones.
   * @param {number[]|Float32Array} featureVector
   * @param {number} minConfidence - Umbral mínimo (defecto: 0.65)
   * @param {number} minMargin - Margen mínimo sobre la 2da clase (defecto: 0.18)
   * @returns {{ label: string, confidence: number, margin: number } | null}
   */
  predict(featureVector, minConfidence = 0.65, minMargin = 0.18) {
    if (!this.isReady()) return null;
    const { architecture, labels, weights } = this.model;
    if (!weights || !labels || featureVector.length !== architecture.input_dim) {
      return null;
    }

    // Capa 1: input_dim -> hidden1 (128) + ReLU
    const z1 = matmulAdd(featureVector, weights.W1, weights.b1, architecture.hidden1);
    const a1 = relu(z1);

    // Capa 2: hidden1 -> hidden2 (64) + ReLU
    const z2 = matmulAdd(a1, weights.W2, weights.b2, architecture.hidden2);
    const a2 = relu(z2);

    // Capa 3: hidden2 -> num_classes + Softmax
    const z3 = matmulAdd(a2, weights.W3, weights.b3, architecture.num_classes);
    const probs = softmax(z3);

    // Encontrar top 1 y top 2
    let topIdx = 0;
    let topVal = -1;
    let secondVal = -1;

    for (let i = 0; i < probs.length; i++) {
      const p = probs[i];
      if (p > topVal) {
        secondVal = topVal;
        topVal = p;
        topIdx = i;
      } else if (p > secondVal) {
        secondVal = p;
      }
    }

    const margin = topVal - (secondVal > -1 ? secondVal : 0);

    if (topVal >= minConfidence && margin >= minMargin) {
      return {
        label: labels[topIdx],
        confidence: Math.round(topVal * 100) / 100,
        margin: Math.round(margin * 100) / 100
      };
    }

    return null;
  }
}

export default new OnDeviceGestureClassifier();
