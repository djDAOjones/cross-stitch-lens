/**
 * gen-golden-hello.mjs — one-time generator for the M0 hello-world
 * golden fixtures (a deterministic 4×4 RGBA gradient). Committed so
 * the fixtures are reproducible; regenerating them needs owner
 * approval (tests/golden/** are protected files).
 *
 * Usage: node scripts/gen-golden-hello.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'golden');
mkdirSync(outDir, { recursive: true });

const width = 4;
const height = 4;
const data = [];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    data.push(x * 64, y * 64, (x + y) * 32, 255); // R, G, B, A
  }
}

const fixture = JSON.stringify({ width, height, data });
// The identity stage's expected output is its input, but the two
// fixtures are committed separately: tests must never derive expected
// output from input at runtime.
writeFileSync(join(outDir, 'hello-4x4.input.json'), `${fixture}\n`);
writeFileSync(join(outDir, 'hello-4x4.expected.json'), `${fixture}\n`);
console.log(`wrote hello-4x4 fixtures (${String(width)}x${String(height)}) to ${outDir}`);
