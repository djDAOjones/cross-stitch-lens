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
import { lutBuildShader, MAP_SHADER } from './wgsl.ts';

const WORKGROUP = 64;

/** One compute pipeline per device+shader, created on first use. */
const pipelineCache = new WeakMap<GPUDevice, Map<string, GPUComputePipeline>>();

function getPipeline(device: GPUDevice, key: string, code: string): GPUComputePipeline {
  let byKey = pipelineCache.get(device);
  if (byKey === undefined) {
    byKey = new Map();
    pipelineCache.set(device, byKey);
  }
  let pipeline = byKey.get(key);
  if (pipeline === undefined) {
    pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: device.createShaderModule({ code }) },
    });
    byKey.set(key, pipeline);
  }
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

/** Dispatch a 1-D compute pass and read `resultBytes` back from `result`. */
async function dispatchAndRead(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  entries: GPUBindGroupEntry[],
  invocations: number,
  result: GPUBuffer,
  resultBytes: number,
): Promise<ArrayBuffer> {
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
    const palRgb = new Float32Array(paletteRgb(palette));
    const palLab =
      metric === 'lab' ? paletteLab(palette) : new Float32Array(3); // dummy binding
    const pipeline = getPipeline(device, `lut-${metric}`, lutBuildShader(metric));
    const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    const rgbBuf = storageBuffer(device, palRgb, storage);
    const labBuf = storageBuffer(device, palLab, storage);
    const lutBuf = device.createBuffer({
      size: LUT_SIZE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const countBuf = uniformU32(device, palette.entries.length);
    const bytes = await dispatchAndRead(
      device,
      pipeline,
      [
        { binding: 0, resource: { buffer: rgbBuf } },
        { binding: 1, resource: { buffer: labBuf } },
        { binding: 2, resource: { buffer: lutBuf } },
        { binding: 3, resource: { buffer: countBuf } },
      ],
      LUT_SIZE,
      lutBuf,
      LUT_SIZE * 4,
    );
    for (const buffer of [rgbBuf, labBuf, lutBuf, countBuf]) buffer.destroy();
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
    const pipeline = getPipeline(device, 'map', MAP_SHADER);
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
