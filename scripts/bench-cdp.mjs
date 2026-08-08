/**
 * Minimal Chrome DevTools Protocol client for the trace leg
 * (M13-MEAS-04) — raw CDP over Node's **built-in** WebSocket
 * (engines pin Node ≥ 22.18), so the D132 dependency approval stays
 * held in reserve: zero new packages. Browser-endpoint only; thread
 * attribution happens during parsing (`bench-trace-lib.mjs`), so no
 * per-target session plumbing is needed. I/O-thin by design — the
 * decisions live in the tested lib, this file just moves bytes.
 */

import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parseDevToolsActivePort, TRACE_CATEGORIES } from './bench-trace-lib.mjs';

/**
 * Wait for Chrome to write `DevToolsActivePort` into its profile dir
 * (it appears within ~a second of launch, before navigation settles)
 * and return the browser-target WebSocket URL.
 */
export async function readDevToolsEndpoint(profileDir, timeoutMs = 15_000) {
  const file = join(profileDir, 'DevToolsActivePort');
  const startedAt = Date.now();
  for (;;) {
    try {
      const parsed = parseDevToolsActivePort(await readFile(file, 'utf8'));
      if (parsed !== null) return `ws://127.0.0.1:${String(parsed.port)}${parsed.path}`;
    } catch {
      /* not written yet */
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(
        `DevToolsActivePort did not appear in ${profileDir} within ${String(timeoutMs)} ms`,
      );
    }
    await delay(200);
  }
}

/**
 * Connect to a CDP endpoint. Returns `{ send, on, close }`: `send`
 * resolves with the command result or rejects with the protocol
 * error; `on` registers one handler per event method (all the leg
 * needs). A transport failure rejects every in-flight command, so a
 * dying Chrome fails the leg loudly instead of hanging it.
 */
export function connectCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const pending = new Map();
    const handlers = new Map();
    let nextId = 1;
    const failAll = (why) => {
      for (const { reject: rejectCommand } of pending.values()) {
        rejectCommand(new Error(why));
      }
      pending.clear();
    };
    socket.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          return new Promise((resolveCommand, rejectCommand) => {
            pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        on(method, handler) {
          handlers.set(method, handler);
        },
        close() {
          try {
            socket.close();
          } catch {
            /* already closed */
          }
        },
      });
    });
    socket.addEventListener('error', () => {
      failAll(`CDP socket error (${wsUrl})`);
      reject(new Error(`could not connect to ${wsUrl}`));
    });
    socket.addEventListener('close', () => failAll('CDP socket closed mid-command'));
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== undefined) {
        const waiter = pending.get(message.id);
        pending.delete(message.id);
        if (waiter === undefined) return;
        if (message.error !== undefined) waiter.reject(new Error(message.error.message));
        else waiter.resolve(message.result);
      } else {
        handlers.get(message.method)?.(message.params);
      }
    });
  });
}

/**
 * Start a browser-level trace with the leg's category set, returned
 * as a stream so multi-minute traces never ride a single giant
 * WebSocket frame. `stop()` ends tracing, drains the stream and
 * returns `{ events, dataLoss }` — `dataLoss: true` means Chrome's
 * trace buffer overflowed and the validator must refuse the run.
 */
export async function startTracing(client, categories = TRACE_CATEGORIES) {
  const complete = new Promise((resolve) => {
    client.on('Tracing.tracingComplete', resolve);
  });
  await client.send('Tracing.start', {
    transferMode: 'ReturnAsStream',
    streamFormat: 'json',
    traceConfig: { recordMode: 'recordUntilFull', includedCategories: [...categories] },
  });
  return {
    async stop() {
      await client.send('Tracing.end');
      const done = await complete;
      let text = '';
      for (;;) {
        const chunk = await client.send('IO.read', { handle: done.stream, size: 1 << 20 });
        text += chunk.base64Encoded
          ? Buffer.from(chunk.data, 'base64').toString('utf8')
          : chunk.data;
        if (chunk.eof) break;
      }
      await client.send('IO.close', { handle: done.stream });
      const parsed = JSON.parse(text);
      return {
        events: parsed.traceEvents ?? parsed,
        dataLoss: done.dataLossOccurred === true,
      };
    },
  };
}
