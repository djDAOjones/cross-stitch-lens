/**
 * Capture session — pure half (error mapping + surface labels). The
 * getDisplayMedia session itself needs a browser and is verified in
 * the running app (same split as ui/import.ts).
 */

import { describe, expect, it } from 'vitest';
import { captureErrorMessage, displayLabel } from '../src/capture/session.ts';

function namedError(name: string, message = ''): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe('captureErrorMessage', () => {
  it('treats a declined prompt as a normal outcome with a retry hint', () => {
    const message = captureErrorMessage(namedError('NotAllowedError'));
    expect(message).toContain('declined');
    expect(message).toContain('Start capture again');
  });

  it('names the no-source case', () => {
    expect(captureErrorMessage(namedError('NotFoundError'))).toContain('No screen or window');
  });

  it('names the unsupported-browser case', () => {
    expect(captureErrorMessage(namedError('NotSupportedError'))).toContain('not supported');
  });

  it('surfaces the underlying message for unexpected errors', () => {
    expect(captureErrorMessage(namedError('AbortError', 'hardware glitch'))).toBe(
      'Screen capture failed (hardware glitch).',
    );
  });

  it('stringifies non-Error throwables', () => {
    expect(captureErrorMessage('boom')).toBe('Screen capture failed (boom).');
  });
});

describe('displayLabel', () => {
  it('keeps a human-readable track label', () => {
    expect(displayLabel('Screen 1')).toBe('Screen 1');
  });

  it('falls back for empty labels', () => {
    expect(displayLabel('')).toBe('the shared screen');
    expect(displayLabel('   ')).toBe('the shared screen');
  });

  it('falls back for internal identifier labels', () => {
    expect(displayLabel('web-contents-media-stream://5:3')).toBe('the shared screen');
  });
});
