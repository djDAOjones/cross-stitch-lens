# M5-PERF-31 — Fix the WebGPU LUT build and cover it on a real GPU

Working detail. Rationale goes to `decision-log.md` on ship; this file
is deleted when the item closes. Found by the M5B audits — full evidence
in `M5-PERF.md` → "M5B component evidence" and
`docs/browser-measurement.md`.

## The defect

`src/backends/webgpu/wgsl.ts` → `lutBuildShader()` emits
`let target = srgb_to_lab(r, g, b);`. **`target` is a reserved keyword
in WGSL**, so the module fails to compile.

WebGPU reports shader compilation errors *asynchronously* — via
`GPUShaderModule.getCompilationInfo()` and error scopes — so
`createShaderModule()` and `createComputePipeline()` do not throw. The
`try/catch` in `buildLutGpu()` therefore never fires. The compute pass
is a no-op against an invalid pipeline, and the zero-initialised result
buffer is read back as a perfectly well-formed all-zeros `Uint16Array`.

`ensureLut()` is GPU-first and caches whatever it receives, in
preference to the correct TS build. Verified on the real frame path in
Chromium/Metal-3:

```text
ensureLut (GPU-first) → distinct output colours: ["250,250,250"]
getLut   (TS)         → distinct output colours: ["255,180,150",
                          "250,250,250", "210,82,146", "109,26,43"]
```

**User impact.** In any WebGPU-capable browser, full-RGB → palette
reduction with dithering **off** renders a solid single colour (palette
index 0), in the preview and in every export. Dithered output is
unaffected — dither never uses the LUT — which is why the app still
looked plausible in manual use.

## Why every suite missed it

- The real-GPU block in `tests/webgpu-lut.test.ts` is
  `describe.skipIf(!isWebGpuAvailable())`. CI is node, so it has never
  run anywhere.
- The f32 mirror it falls back to (`tests/helpers/lut-f32.ts`) tests the
  *intended* arithmetic, not the emitted shader — it cannot catch a
  shader that does not compile.
- The GPU timing looked like a win (0.3–0.4 ms vs 32–214 ms TS), which
  read as success. An implausibly fast GPU row is a defect signal.

## Fix

1. Rename the WGSL local (`target` → e.g. `probe`), in both the `lab`
   and `rgb` branches of `lutBuildShader`. Check `MAP_SHADER` for
   reserved identifiers at the same time.
2. Make shader creation fail loudly: after `createShaderModule`, await
   `getCompilationInfo()` and treat any `error` message as a failure;
   wrap pipeline creation and dispatch in `pushErrorScope('validation')`
   / `popErrorScope()`. On any diagnostic, log through the structured
   logger and return `null` so the TS fallback takes over — which is the
   behaviour `ensureLut` already expects.
3. Consider whether `ensureLut` should validate a returned LUT at all
   (e.g. reject a LUT with a single distinct index for a multi-entry
   palette). A cheap sanity check is defensible here precisely because
   the failure mode is silent and user-visible.

## Coverage — the part that stops it recurring

The fix is small; the coverage gap is the real work. Options, in
increasing order of cost:

- Promote the existing real-GPU suite to run under a browser test
  runner (`@vitest/browser` + playwright), already on the wish-list from
  M5-WEBGPU. This is the option that actually closes the gap.
- Failing that, add a **static** check on the emitted WGSL against the
  WGSL reserved-word list, which needs no GPU and would have caught
  exactly this defect.

Whichever lands, the assertion must be on **bin agreement with the TS
LUT**, never on timing alone.

## Correctness constraints

The TS LUT remains ground truth and the universal fallback. The D41
near-tie tolerance still applies to a *working* GPU LUT (f32 vs f64
arithmetic): a fixed shader is expected to disagree with TS on a small
number of near-tie bins, not on 96–100% of them. Do not widen the
tolerance to accommodate a broken kernel.

## Fresh-chat starting point

Read D41, `M5-PERF.md` → "M5B component evidence", and
`docs/browser-measurement.md` → "Defect found by this procedure". The
reproduction is a browser console paste; there is no node repro, which
is the whole point of the item.
