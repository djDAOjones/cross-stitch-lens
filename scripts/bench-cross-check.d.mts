/**
 * Types for `bench-cross-check.mjs` — plain JS for the node CLI; the
 * vitest suite gets real types through this declaration.
 */

export interface CrossCheckSide {
  medianMs?: number;
  count?: number;
  updatesPerSec?: number;
  misses?: number;
  missing?: string;
}

export interface CrossCheckResult {
  sameBuild: boolean;
  manualBuild: string;
  automatedBuild: string;
  manualTainted: boolean;
  rows: {
    name: string;
    manual: CrossCheckSide | null;
    automated: CrossCheckSide | null;
    ratio: number | null;
  }[];
}

export declare function compareReports(manual: unknown, automated: unknown): CrossCheckResult;
export declare function formatComparison(result: CrossCheckResult, manualName?: string): string;
