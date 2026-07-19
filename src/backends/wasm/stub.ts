/**
 * Build-time stand-in for the `stitch-engine-wasm` alias when the
 * wasm-pack pkg has not been built (vite.config.ts points the alias
 * here so dev/build/test succeed without the Rust toolchain —
 * DEV-INFRASTRUCTURE.md → "Build system"). Never called at runtime:
 * the adapter checks `__WASM_AVAILABLE__` before importing.
 */

export default function init(): Promise<never> {
  return Promise.reject(
    new Error('stitch-engine wasm pkg not built — run `npm run build:wasm`'),
  );
}

export function dither_floyd_steinberg(): never {
  throw new Error('stitch-engine wasm pkg not built — run `npm run build:wasm`');
}
