export const MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX';
export const MODEL_REVISION = 'b8a5c0f183b78c55955a5364f610c36668b5e681';
export const MODEL_CACHE = 'visit-bridge-model-smollm2-135m-v1';
export const MODEL_FILES = ['config.json', 'generation_config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/model_q4.onnx'];
export const RUNTIME_FILES = ['/vendor/transformers.min.js', '/vendor/ort-wasm-simd-threaded.jsep.mjs', '/vendor/ort-wasm-simd-threaded.jsep.wasm'];
export const MODEL_SHA256 = 'eb0d67c7e3b7d40f42d681b5f2eff4cef78968afe3f76c954f987dd870327a2a';
export const modelPath = file => `/models/${MODEL_ID}/${file}`;
export const MODEL_KEYS = [...MODEL_FILES.map(modelPath), ...RUNTIME_FILES];
export const MODEL_MARKER = '/models/visit-bridge-install-complete-v1';
export async function modelInstalled() {
  const cache = await caches.open(MODEL_CACHE);
  return Boolean(await cache.match(MODEL_MARKER)) && (await Promise.all(MODEL_KEYS.map(key => cache.match(key)))).every(Boolean);
}
