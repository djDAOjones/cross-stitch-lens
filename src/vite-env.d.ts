/// <reference types="vite/client" />
/// <reference types="@webgpu/types" />

/** Product version, e.g. "v0.1.0" — injected at build (vite.config.ts). */
declare const __APP_VERSION__: string;
/** Build identity, e.g. "v0.1.0+20260717.a1b2c3d" — injected at build. */
declare const __BUILD_ID__: string;
/** True when the wasm-pack pkg existed at config time (vite.config.ts). */
declare const __WASM_AVAILABLE__: boolean;
