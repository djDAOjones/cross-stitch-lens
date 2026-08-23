/**
 * Types for `verify-deploy.mjs` — plain JS for the node CLI; the vitest
 * suite gets real types through this declaration (the
 * `bench-auto-lib.d.mts` pattern).
 */

export declare const DEFAULT_URL: string;
export declare const DEFAULT_TARGET: string;
export declare const POLL_SECONDS: number;
export declare const EXIT_CODES: { readonly PASS: 0; readonly FAIL: 1; readonly ERROR: 2 };

export type Outcome =
  | { status: 'PASS' | 'FAIL'; liveId: string; expected: string }
  | { status: 'ERROR'; reason: string };

export interface VerifyOptions {
  url: string;
  wait: number;
  target: string;
  help: boolean;
}

export declare function findEntryScript(html: string, pageUrl: string): string | null;
export declare function findBuildIds(text: string): string[];
export declare function splitBuildId(
  id: string,
): { version: string; date: string; sha: string } | null;
export declare function isSha(text: string): boolean;
export declare function shaMatches(expected: string, live: string): boolean;
export declare function compareBuild(
  liveId: string,
  expectedSha: string,
  expectedLabel: string,
): Outcome;
export declare function verdictLine(outcome: Outcome): string;
export declare function parseArgs(argv: readonly string[]): VerifyOptions;
