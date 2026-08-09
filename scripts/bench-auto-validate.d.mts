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

/** A browser product target: a measured median plus its regression guard. */
export interface BrowserTarget {
  /** Measured median in ms on {@link runtime}. */
  ms: number;
  /** The target trips above `ms × tolerance`. */
  tolerance: number;
  /** Where the figure was taken — never omit. */
  runtime: string;
  /** Build id the figure was taken against. */
  taken: string;
}

export declare const EXPECTED_EDIT_CLASSES: readonly string[];
export declare const EXPECTED_TRACE_WINDOWS: readonly string[];
export declare const BROWSER_TARGETS: ReadonlyMap<string, BrowserTarget>;
export declare const CADENCE_TARGET: { readonly updatesPerSec: number };
export declare function validateCaptureReport(report: unknown): string[];
export declare function validatePickerCaptureReport(report: unknown): string[];
export declare function validateMemReport(report: unknown): string[];
export declare function validateBackendReport(report: unknown): string[];
export declare function validateTraceReport(merged: unknown): string[];
