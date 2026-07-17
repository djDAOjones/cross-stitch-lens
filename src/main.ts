/**
 * App entry point. M0 ships a minimal shell that proves the toolchain
 * end-to-end (build, version identity, diagnostics); the real UI
 * arrives with M2.
 */

import { installGlobalCapture, log } from './diagnostics/log.ts';

installGlobalCapture(window);
log.info('boot', `Cross Stitch Lens ${__APP_VERSION__} (${__BUILD_ID__})`);

const app = document.getElementById('app');
if (app === null) {
  log.error('boot', 'missing #app mount point');
} else {
  const heading = document.createElement('h1');
  heading.textContent = 'Cross Stitch Lens';

  const version = document.createElement('p');
  version.textContent = `${__APP_VERSION__} · build ${__BUILD_ID__}`;

  const status = document.createElement('p');
  status.textContent =
    'M0 scaffold — engine, preview and capture arrive in later milestones.';

  app.replaceChildren(heading, version, status);
}
