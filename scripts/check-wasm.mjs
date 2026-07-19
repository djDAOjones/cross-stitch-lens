/**
 * Quality-gate step for the Rust crate: `cargo test` + `wasm-pack
 * build`. Skips with a visible warning when the Rust toolchain is not
 * installed — DEV-INFRASTRUCTURE.md ("Package management") requires
 * `check` to pass without it. CI always installs the toolchain, so a
 * local skip can never green-wash a mainline break: CI is the
 * backstop. In CI (CI=true) a missing toolchain is a hard failure.
 */

import { spawnSync } from 'node:child_process';

const CRATE = 'crates/stitch-engine';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error?.code === 'ENOENT') return 'missing';
  return result.status === 0 ? 'ok' : 'failed';
}

function available(command) {
  const result = spawnSync(command, ['--version'], { stdio: 'ignore' });
  return result.error?.code !== 'ENOENT' && result.status === 0;
}

const haveCargo = available('cargo');
const haveWasmPack = available('wasm-pack');

if (!haveCargo || !haveWasmPack) {
  const missing = [!haveCargo && 'cargo', !haveWasmPack && 'wasm-pack']
    .filter(Boolean)
    .join(', ');
  if (process.env.CI === 'true') {
    console.error(`check-wasm: FAIL — ${missing} not installed (required in CI)`);
    process.exit(1);
  }
  console.warn(
    `check-wasm: SKIPPED — ${missing} not installed. ` +
      'The Rust crate was not tested or built; CI will run it. ' +
      'Install via rustup + `brew install wasm-pack` to run locally.',
  );
  process.exit(0);
}

if (run('cargo', ['test', '--quiet', '--manifest-path', `${CRATE}/Cargo.toml`]) !== 'ok') {
  console.error('check-wasm: FAIL — cargo test failed');
  process.exit(1);
}
if (run('wasm-pack', ['build', CRATE, '--target', 'web']) !== 'ok') {
  console.error('check-wasm: FAIL — wasm-pack build failed');
  process.exit(1);
}
console.log('check-wasm: cargo test + wasm-pack build OK');
