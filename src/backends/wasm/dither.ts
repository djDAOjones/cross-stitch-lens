/**
 * WASM adapter for the dither stage: wraps the Rust crate's
 * `dither_floyd_steinberg` behind the same `StageFn` contract as the
 * TS reference and registers it as `ditherStage.backends.wasm`.
 *
 * Feature-detected end to end: if the pkg was not built
 * (`__WASM_AVAILABLE__` is false) or init fails, registration is a
 * logged no-op and the pipeline stays on the TS backend — the
 * executor's `?? backends.ts` fallback (AGENTS.md: the TS reference
 * is ground truth and universal fallback). Registration alone routes
 * nothing: frames use wasm only where a stage instance says
 * `backend: 'wasm'` (automatic selection is a separate backlog item).
 */

import { paletteLab, paletteRgb } from '../../core/palette.ts';
import { ditherStage, type DitherParams } from '../../core/pipeline/dither.ts';
import type { PixelBuffer } from '../../core/types.ts';
import { log } from '../../diagnostics/log.ts';
import type { InitInput } from 'stitch-engine-wasm';

type WasmModule = typeof import('stitch-engine-wasm');

/** Build the StageFn over an initialised module. */
function wasmDither(mod: WasmModule) {
  return (input: PixelBuffer, params: DitherParams): PixelBuffer => {
    const palRgb = paletteRgb(params.palette);
    const out = mod.dither_floyd_steinberg(
      input.width,
      input.height,
      new Uint8Array(input.data.buffer, input.data.byteOffset, input.data.byteLength),
      new Uint8Array(palRgb.buffer, palRgb.byteOffset, palRgb.byteLength),
      params.metric === 'lab' ? paletteLab(params.palette) : new Float32Array(0),
      params.metric === 'lab',
      params.serpentine,
    );
    return {
      width: input.width,
      height: input.height,
      data: new Uint8ClampedArray(out.buffer, out.byteOffset, out.length),
    };
  };
}

/**
 * Load + initialise the wasm module and register the dither backend.
 * Resolves true when registered, false when unavailable or failed
 * (both logged; failure never throws — the TS fallback is the
 * behaviour). Pass `bytes` when no fetch is available (node tests);
 * browser and worker callers pass nothing.
 */
export async function registerWasmDither(bytes?: InitInput): Promise<boolean> {
  if (!__WASM_AVAILABLE__) {
    log.info('wasm', 'pkg not built — dither stays on the ts backend');
    return false;
  }
  try {
    const mod = await import('stitch-engine-wasm');
    await (bytes === undefined
      ? mod.default()
      : mod.default({ module_or_path: bytes }));
    ditherStage.backends.wasm = wasmDither(mod);
    log.info('wasm', 'dither backend registered');
    return true;
  } catch (error) {
    log.error('wasm', 'dither backend failed to load — staying on ts', {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
