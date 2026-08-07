/**
 * Types for `bench-auto-lib.mjs` — plain JS for the node launcher;
 * the vitest suite gets real types through this declaration.
 */

export declare function parseIdleSeconds(ioregText: string): number | null;
export declare function formatStamp(date: Date): string;
export declare function reportPaths(
  buildId: string,
  leg: string,
  stamp: string,
): { stamped: string; canonical: string };
export declare function isEnvironmentalFailure(failures: readonly string[]): boolean;
