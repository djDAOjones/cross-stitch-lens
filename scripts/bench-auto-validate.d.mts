/**
 * Types for `bench-auto-validate.mjs` — the module stays plain JS so
 * the node launcher can import it untranspiled; the vitest suite gets
 * real types through this declaration.
 */

/** Minimal structural view of a parsed bv2 report; unknown-safe. */
export interface ReportLike {
  validity?: { tainted?: boolean; findings?: string[] };
  rows?: unknown;
}

export declare const EXPECTED_EDIT_CLASSES: readonly string[];
export declare function validateCaptureReport(report: unknown): string[];
export declare function validatePickerCaptureReport(report: unknown): string[];
export declare function validateMemReport(report: unknown): string[];
