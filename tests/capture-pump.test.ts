/**
 * Frame-pump gate — pure latest-wins policy for capture grabs. The
 * requestVideoFrameCallback subscription is browser-only and verified
 * in the running app.
 */

import { describe, expect, it } from 'vitest';
import { PumpGate } from '../src/capture/pump.ts';

describe('PumpGate', () => {
  it('starts a grab immediately when idle', () => {
    const gate = new PumpGate();
    expect(gate.frameArrived()).toBe(true);
    expect(gate.isBusy).toBe(true);
  });

  it('coalesces frames that arrive while busy', () => {
    const gate = new PumpGate();
    gate.frameArrived();
    expect(gate.frameArrived()).toBe(false);
    expect(gate.frameArrived()).toBe(false);
    expect(gate.droppedCount).toBe(1);
  });

  it('grabs again after completion when a frame waited', () => {
    const gate = new PumpGate();
    gate.frameArrived();
    gate.frameArrived();
    expect(gate.grabDone()).toBe(true);
    expect(gate.isBusy).toBe(true);
    expect(gate.grabDone()).toBe(false);
    expect(gate.isBusy).toBe(false);
  });

  it('goes idle after completion with nothing waiting', () => {
    const gate = new PumpGate();
    gate.frameArrived();
    expect(gate.grabDone()).toBe(false);
    expect(gate.frameArrived()).toBe(true);
  });

  it('grabDone on an idle gate is harmless', () => {
    const gate = new PumpGate();
    expect(gate.grabDone()).toBe(false);
    expect(gate.isBusy).toBe(false);
  });

  it('reset abandons pending work', () => {
    const gate = new PumpGate();
    gate.frameArrived();
    gate.frameArrived();
    gate.reset();
    expect(gate.isBusy).toBe(false);
    expect(gate.grabDone()).toBe(false);
    expect(gate.frameArrived()).toBe(true);
  });
});
