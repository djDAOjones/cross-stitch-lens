/**
 * Ambient types for the `stitch-engine-wasm` alias (vite.config.ts):
 * the wasm-pack output `crates/stitch-engine/pkg/stitch_engine.js`, or
 * the stub in `stub.ts` when the pkg has not been built. Typed here so
 * `tsc --noEmit` never needs the generated pkg to exist.
 */

declare module 'stitch-engine-wasm' {
  /** wasm-bindgen init input: bytes, a compiled module, or a fetchable. */
  export type InitInput = BufferSource | WebAssembly.Module | Response | URL | string;

  /**
   * Initialise the wasm module. No argument in a browser/worker (the
   * glue fetches the .wasm next to itself); pass bytes in node.
   */
  export default function init(options?: {
    module_or_path: InitInput | Promise<InitInput>;
  }): Promise<unknown>;

  /**
   * Floyd–Steinberg dither (crates/stitch-engine/src/lib.rs). RGBA in,
   * RGBA out; `pal_lab` may be empty when `use_lab` is false.
   */
  export function dither_floyd_steinberg(
    width: number,
    height: number,
    pixels: Uint8Array,
    pal_rgb: Uint8Array,
    pal_lab: Float32Array,
    use_lab: boolean,
    serpentine: boolean,
  ): Uint8Array;
}
