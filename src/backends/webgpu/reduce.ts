/**
 * WebGPU colour-reduction kernels behind async functions: LUT build
 * (accelerating the worker cache's expensive rebuild — 32,768 bins ×
 * palette size) and per-pixel palette mapping. Both resolve null when
 * WebGPU is unavailable or fails, so callers keep the TS fallback
 * (AGENTS.md: the TS reference is ground truth and universal
 * fallback).
 *
 * These are async by nature (GPU readback), so they cannot implement
 * the synchronous StageFn contract directly: the LUT build is wired
 * into the worker's cache layer (lut-cache.ts ensureLut), and the
 * mapping kernel is exported for the backend-selection item, which
 * owns any executor asyncification.
 */

import { LUT_SIZE } from '../../core/color/lut.ts';
import type { ColorMetric } from '../../core/color/metrics.ts';
import { paletteLab, paletteRgb } from '../../core/palette.ts';
import type { Palette, PixelBuffer } from '../../core/types.ts';
import { log } from '../../diagnostics/log.ts';
import { getDevice } from './device.ts';
import { LUT_BINDINGS, lutBuildShader, MAP_SHADER } from './wgsl.ts';

const WORKGROUP = 64;

/** One compute pipeline per device+shader, created on first use. */
const pipelineCache = new WeakMap<GPUDevice, Map<string, GPUComputePipeline>>();

/**
 * Shader compilation diagnostics, or null when the module is clean.
 * WebGPU reports compilation errors **asynchronously** — neither
 * `createShaderModule` nor `createComputePipeline` throws — so a broken
 * kernel otherwise dispatches as a no-op and its zero-filled output
 * reads back as valid data (D46). Draining `getCompilationInfo()` is
 * what turns that silence into a fallback.
 */
async function compilationErrors(module: GPUShaderModule): Promise<string | null> {
  if (typeof module.getCompilationInfo !== 'function') return null;
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((message) => message.type === 'error');
  if (errors.length === 0) return null;
  return errors
    .map((m) => `${String(m.lineNum)}:${String(m.linePos)} ${m.message}`)
    .join('; ');
}

/**
 * Get (creating on first use) the compute pipeline for a shader, or
 * null if the shader does not compile or pipeline creation raises a
 * validation error. A null pipeline is the caller's cue to fall back to
 * the TS reference — never to dispatch anyway.
 */
async function getPipeline(
  device: GPUDevice,
  key: string,
  code: string,
): Promise<GPUComputePipeline | null> {
  let byKey = pipelineCache.get(device);
  if (byKey === undefined) {
    byKey = new Map();
    pipelineCache.set(device, byKey);
  }
  const cached = byKey.get(key);
  if (cached !== undefined) return cached;

  device.pushErrorScope('validation');
  const module = device.createShaderModule({ code });
  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module },
  });
  const [compileError, scopeError] = await Promise.all([
    compilationErrors(module),
    device.popErrorScope(),
  ]);
  if (compileError !== null || scopeError !== null) {
    log.error('webgpu', 'shader rejected — falling back to ts', {
      shader: key,
      message: compileError ?? scopeError?.message,
    });
    return null;
  }
  byKey.set(key, pipeline);
  return pipeline;
}

function storageBuffer(device: GPUDevice, data: ArrayBufferView, usage: number): GPUBuffer {
  const buffer = device.createBuffer({
    size: Math.max(16, Math.ceil(data.byteLength / 4) * 4),
    usage,
    mappedAtCreation: true,
  });
  const view = new Uint8Array(buffer.getMappedRange());
  view.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  buffer.unmap();
  return buffer;
}

function uniformU32(device: GPUDevice, value: number): GPUBuffer {
  return storageBuffer(
    device,
    new Uint32Array([value]),
    GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  );
}

/**
 * Dispatch a 1-D compute pass and read `resultBytes` back from
 * `result`. Resolves null if the pass raises a validation error —
 * again asynchronous, so without the error scope an invalid dispatch
 * would return a well-formed buffer of zeros.
 */
async function dispatchAndRead(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  entries: GPUBindGroupEntry[],
  invocations: number,
  result: GPUBuffer,
  resultBytes: number,
): Promise<ArrayBuffer | null> {
  device.pushErrorScope('validation');
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries,
  });
  const staging = device.createBuffer({
    size: resultBytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(Math.ceil(invocations / WORKGROUP));
  pass.end();
  encoder.copyBufferToBuffer(result, 0, staging, 0, resultBytes);
  device.queue.submit([encoder.finish()]);
  await staging.mapAsync(GPUMapMode.READ);
  const bytes = staging.getMappedRange().slice(0);
  staging.unmap();
  staging.destroy();
  const scopeError = await device.popErrorScope();
  if (scopeError !== null) {
    log.error('webgpu', 'compute pass rejected — falling back to ts', {
      message: scopeError.message,
    });
    return null;
  }
  return bytes;
}

/**
 * Build the 15-bit LUT for a palette+metric on the GPU. Resolves the
 * Uint16Array (same shape as the TS buildLut) or null when WebGPU is
 * unavailable/fails — never throws.
 */
export async function buildLutGpu(
  palette: Palette,
  metric: ColorMetric,
): Promise<Uint16Array | null> {
  const device = await getDevice();
  if (device === null) return null;
  try {
    const pipeline = await getPipeline(device, `lut-${metric}`, lutBuildShader(metric));
    if (pipeline === null) return null;
    const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    // Exactly one palette buffer: the kernel declares only the one its
    // metric reads, and binding anything else fails validation.
    const palBuf = storageBuffer(
      device,
      metric === 'lab' ? paletteLab(palette) : new Float32Array(paletteRgb(palette)),
      storage,
    );
    const lutBuf = device.createBuffer({
      size: LUT_SIZE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const countBuf = uniformU32(device, palette.entries.length);
    const bytes = await dispatchAndRead(
      device,
      pipeline,
      [
        { binding: LUT_BINDINGS.palette[metric], resource: { buffer: palBuf } },
        { binding: LUT_BINDINGS.lut, resource: { buffer: lutBuf } },
        { binding: LUT_BINDINGS.count, resource: { buffer: countBuf } },
      ],
      LUT_SIZE,
      lutBuf,
      LUT_SIZE * 4,
    );
    for (const buffer of [palBuf, lutBuf, countBuf]) buffer.destroy();
    if (bytes === null) return null;
    return Uint16Array.from(new Uint32Array(bytes));
  } catch (error) {
    log.error('webgpu', 'LUT build failed — falling back to ts', {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Map a buffer's pixels to palette colours through a prebuilt LUT on
 * the GPU (integer-only: bit-exact vs the TS LUT path given the same
 * LUT). Resolves null when WebGPU is unavailable/fails.
 */
export async function mapPaletteGpu(
  input: PixelBuffer,
  palette: Palette,
  lut: Uint16Array,
): Promise<PixelBuffer | null> {
  const device = await getDevice();
  if (device === null) return null;
  try {
    const pixelCount = input.width * input.height;
    const pixels = new Uint32Array(
      input.data.buffer,
      input.data.byteOffset,
      pixelCount,
    );
    const pipeline = await getPipeline(device, 'map', MAP_SHADER);
    if (pipeline === null) return null;
    const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    const pixelBuf = storageBuffer(device, pixels, storage);
    const lutBuf = storageBuffer(device, Uint32Array.from(lut), storage);
    const rgbBuf = storageBuffer(device, new Float32Array(paletteRgb(palette)), storage);
    const outBuf = device.createBuffer({
      size: pixelCount * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const countBuf = uniformU32(device, pixelCount);
    const bytes = await dispatchAndRead(
      device,
      pipeline,
      [
        { binding: 0, resource: { buffer: pixelBuf } },
        { binding: 1, resource: { buffer: lutBuf } },
        { binding: 2, resource: { buffer: rgbBuf } },
        { binding: 3, resource: { buffer: outBuf } },
        { binding: 4, resource: { buffer: countBuf } },
      ],
      pixelCount,
      outBuf,
      pixelCount * 4,
    );
    for (const buffer of [pixelBuf, lutBuf, rgbBuf, outBuf, countBuf]) buffer.destroy();
    if (bytes === null) return null;
    return {
      width: input.width,
      height: input.height,
      data: new Uint8ClampedArray(bytes),
    };
  } catch (error) {
    log.error('webgpu', 'palette map failed — falling back to ts', {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
