/**
 * WebGPU device access: feature detection + one lazily-initialised
 * device shared by the compute kernels. Unavailable or failed init
 * resolves null (logged once) — callers fall back to the TS path,
 * mirroring the wasm backend's never-throw contract.
 */

import { log } from '../../diagnostics/log.ts';

let devicePromise: Promise<GPUDevice | null> | null = null;

/** True when the runtime exposes WebGPU at all. */
export function isWebGpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && navigator.gpu !== undefined;
}

async function initDevice(): Promise<GPUDevice | null> {
  if (!isWebGpuAvailable()) {
    log.info('webgpu', 'not available — colour reduction stays on ts');
    return null;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter === null) {
      log.info('webgpu', 'no adapter — colour reduction stays on ts');
      return null;
    }
    const device = await adapter.requestDevice();
    device.lost
      .then((info) => {
        // A lost device stays lost for this session; next call re-inits.
        devicePromise = null;
        log.warn('webgpu', 'device lost', { reason: info.reason });
      })
      .catch(() => {
        /* lost promise never rejects per spec; belt and braces */
      });
    log.info('webgpu', 'device ready');
    return device;
  } catch (error) {
    log.error('webgpu', 'device init failed — staying on ts', {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** The shared device, or null when WebGPU is unusable here. */
export function getDevice(): Promise<GPUDevice | null> {
  devicePromise ??= initDevice();
  return devicePromise;
}
