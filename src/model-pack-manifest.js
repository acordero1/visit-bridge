// Release-pinned descriptors. Imported hashes alone are never trusted.
export const PACK_MANIFEST = {
  "format": 1,
  "model": "onnx-community/SmolLM2-135M-Instruct-ONNX",
  "revision": "b8a5c0f183b78c55955a5364f610c36668b5e681",
  "runtime": "transformers-3.8.1/onnxruntime-1.22.0-dev.20250409-89f8206ba4",
  "files": [
    {
      "path": "models/config.json",
      "size": 976,
      "sha256": "88f5d2bbac13e61d28787184fa1aa13b7f81f7bda7c3869ece8a8930c27cc5ed",
      "mime": "application/json"
    },
    {
      "path": "models/generation_config.json",
      "size": 132,
      "sha256": "3a6555a034b32bf2fc6d35cc16207dc95c8af520b2d45febe48a1ad6cb46ff63",
      "mime": "application/json"
    },
    {
      "path": "models/tokenizer.json",
      "size": 3522656,
      "sha256": "7d27c493c729a66ecefc837280b05d948b1ed50d130eebdbf911b1b36cf38ed7",
      "mime": "application/json"
    },
    {
      "path": "models/tokenizer_config.json",
      "size": 3794,
      "sha256": "7b85619980209ca801effcd87e5df7084a21abc3d8b8d27003a6b4ffcce170ef",
      "mime": "application/json"
    },
    {
      "path": "models/special_tokens_map.json",
      "size": 655,
      "sha256": "2b7379f3ae813529281a5c602bc5a11c1d4e0a99107aaa597fe936c1e813ca52",
      "mime": "application/json"
    },
    {
      "path": "vendor/transformers.min.js",
      "size": 888173,
      "sha256": "aa5002b70e789798da263f5f99c62bd3e8fcd0c119258a493c40c180648365fa",
      "mime": "text/javascript"
    },
    {
      "path": "vendor/ort-wasm-simd-threaded.jsep.mjs",
      "size": 44484,
      "sha256": "08fb86ec433c78bfb032c5d84a68b8e8e5a8d81268fa39e24314179a5767a5b9",
      "mime": "text/javascript"
    },
    {
      "path": "vendor/ort-wasm-simd-threaded.jsep.wasm",
      "size": 21596019,
      "sha256": "c46655e8a94afc45338d4cb2b840475f88e5012d524509916e505079c00bfa39",
      "mime": "application/wasm"
    },
    {
      "path": "models/onnx/model_q4.onnx",
      "size": 180581125,
      "sha256": "eb0d67c7e3b7d40f42d681b5f2eff4cef78968afe3f76c954f987dd870327a2a",
      "mime": "application/octet-stream"
    },
    {
      "path": "licenses/transformers-LICENSE.txt",
      "size": 11358,
      "sha256": "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30",
      "mime": "text/plain"
    },
    {
      "path": "licenses/onnxruntime-LICENSE.txt",
      "size": 1073,
      "sha256": "2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c",
      "mime": "text/plain"
    },
    {
      "path": "licenses/PROVENANCE.json",
      "size": 801,
      "sha256": "de851e6c7580a1045117e817b8abfe62044ed5baf01cb5ece1bf47f6810ae956",
      "mime": "application/json"
    },
    {
      "path": "licenses/model-LICENSE.txt",
      "size": 11358,
      "sha256": "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30",
      "mime": "text/plain"
    },
    {
      "path": "licenses/model-PROVENANCE.json",
      "size": 472,
      "sha256": "16619aa3028ffa0f43d0e0842ffc48e53a7e67ec52e7b3f53055341743264216",
      "mime": "application/json"
    }
  ]
};
export const PACK_BYTES = PACK_MANIFEST.files.reduce((sum,file)=>sum+file.size,0);
