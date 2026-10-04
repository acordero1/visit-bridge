export const MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX';
export const MODEL_REVISION = 'b8a5c0f183b78c55955a5364f610c36668b5e681';
export const MODEL_CACHE = 'visit-bridge-model-smollm2-135m-v1';
export const MODEL_FILES = ['config.json', 'generation_config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/model_q4.onnx'];
export const RUNTIME_FILES = ['/vendor/transformers.min.js', '/vendor/ort-wasm-simd-threaded.jsep.mjs', '/vendor/ort-wasm-simd-threaded.jsep.wasm'];
export const MODEL_SHA256 = 'eb0d67c7e3b7d40f42d681b5f2eff4cef78968afe3f76c954f987dd870327a2a';
export const modelPath = file => `/models/${MODEL_ID}/${file}`;
export const MODEL_KEYS = [...MODEL_FILES.map(modelPath), ...RUNTIME_FILES];
export const MODEL_MARKER = '/models/visit-bridge-install-complete-v1';
export const MODEL_SELECTION_CACHE = 'visit-bridge-model-selection-v1';
export const MODEL_SELECTION_KEY = '/models/visit-bridge-active-pack-v1';
export const MODEL_STAGE_PREFIX = 'visit-bridge-model-pack-v1-';
export async function activeModelCache() {
  const selector=await caches.open(MODEL_SELECTION_CACHE),response=await selector.match(MODEL_SELECTION_KEY);
  const name=response?await response.text():'';
  return /^visit-bridge-model-pack-v1-[a-f0-9-]{36}$/.test(name)?name:MODEL_CACHE;
}
export async function modelInstalled() {
  const cache = await caches.open(await activeModelCache());
  return (await (await cache.match(MODEL_MARKER))?.text()) === MODEL_REVISION && (await Promise.all(MODEL_KEYS.map(key => cache.match(key)))).every(Boolean);
}
