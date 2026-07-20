/**
 * Static WGSL reserved-word scan.
 *
 * WebGPU reports shader compilation errors asynchronously, so a module
 * that uses a reserved word never throws: it simply never runs, and its
 * zero-filled output buffer reads back as valid data. That shipped once
 * (D46 — the LUT-build kernel declared `let target = …`). This scan is
 * the cheap half of the guard: it needs no GPU, so it runs in node CI
 * on every emitted shader source.
 *
 * The list is the WGSL spec's "Reserved Words" section. Predeclared
 * types and built-in functions (`f32`, `pow`, `dot`, …) are NOT
 * reserved and are deliberately absent.
 */

const RESERVED = new Set([
  'NULL', 'Self', 'abstract', 'active', 'alignas', 'alignof', 'as', 'asm',
  'asm_fragment', 'async', 'attribute', 'auto', 'await', 'become',
  'binding_array', 'cast', 'catch', 'class', 'co_await', 'co_return',
  'co_yield', 'coherent', 'column_major', 'common', 'compile',
  'compile_fragment', 'concept', 'const_cast', 'consteval', 'constexpr',
  'constinit', 'crate', 'debugger', 'decltype', 'delete', 'demote',
  'demote_to_helper', 'do', 'dynamic_cast', 'enum', 'explicit', 'export',
  'extends', 'extern', 'external', 'fallthrough', 'filter', 'final',
  'finally', 'friend', 'from', 'fxgroup', 'get', 'goto', 'groupshared',
  'highp', 'impl', 'implements', 'import', 'inline', 'instanceof',
  'interface', 'layout', 'lowp', 'macro', 'macro_rules', 'match', 'mediump',
  'meta', 'mod', 'module', 'move', 'mut', 'mutable', 'namespace', 'new',
  'nil', 'noexcept', 'noinline', 'nointerpolation', 'non_coherent',
  'noncoherent', 'noperspective', 'null', 'nullptr', 'of', 'operator',
  'package', 'packoffset', 'partition', 'pass', 'patch', 'pixelfragment',
  'precise', 'precision', 'premerge', 'priv', 'protected', 'pub', 'public',
  'readonly', 'ref', 'regardless', 'register', 'reinterpret_cast', 'require',
  'resource', 'restrict', 'self', 'set', 'shared', 'sizeof', 'smooth',
  'snorm', 'static', 'static_assert', 'static_cast', 'std', 'subroutine',
  'super', 'target', 'template', 'this', 'thread_local', 'throw', 'trait',
  'try', 'type', 'typedef', 'typeid', 'typename', 'typeof', 'union',
  'unless', 'unorm', 'unsafe', 'unsized', 'use', 'using', 'varying',
  'virtual', 'volatile', 'wgsl', 'where', 'with', 'writeonly', 'yield',
]);

/** Strip line and block comments — prose legitimately contains "as". */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/**
 * Every reserved word used as an identifier token in `code`, in source
 * order, deduplicated. Empty means the source is clean.
 */
export function reservedIdentifiers(code: string): string[] {
  const found = new Set<string>();
  for (const token of stripComments(code).match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) {
    if (RESERVED.has(token)) found.add(token);
  }
  return [...found];
}
