# Conventions

<!-- Fill this in before or during your first implementation task. -->
<!-- Skip at init if you're not sure yet — capture conventions as they emerge. -->
<!-- Hot whole-file read. See pm_skills/memory-policy.md for limits. -->

## Code style

<!-- Language-specific style rules. Formatter or linter config if any. -->

## Naming

<!-- File naming, variable naming, component naming patterns. -->

## Commit messages

<!-- Format, scope, conventions. -->

## Documentation

<!-- Project-specific documentation conventions. The permanent rules
     (JSDoc, explain why not what, no boilerplate) are in AGENTS.md.
     This section captures how they apply to this project as
     conventions emerge. Example:
     - What to document: all exported functions, hooks, db/ methods.
     - Depth: purpose, parameters, return values, side effects.
     - Exceptions: trivial getters don't need JSDoc. -->

## Testing

<!-- Project-specific testing policy. The permanent doctrine (invariants
     over coverage, named categories, fast-and-hermetic, two layers,
     never silently weaken a test) is in AGENTS.md. Capture here: the
     runner and its config — with non-obvious reasons, e.g. sequential
     execution when tests mutate env or reset module singletons — the
     coverage bar if any, and the specific invariants this project must
     protect. Default for JS/Node: Vitest (safety net) + Playwright
     (critical journeys); swap per stack. -->

## Patterns to follow

<!-- Recurring patterns that should be consistent across the codebase. -->

## Patterns to avoid

<!-- Project-specific anti-patterns. The permanent anti-patterns
     (Carbon, accessibility, dependencies) are in AGENTS.md. This
     section captures patterns specific to this project's codebase. -->

## Tooling

<!-- Bundler, test runner, formatter/linter, editor config.
     Example:
     - Bundler: esbuild (via custom build.js)
     - Test runner: Vitest
     - Formatter: .editorconfig (mechanical), no additional formatter yet
     - Linter: none yet
     Recommended defaults by stack (the framework's opinion — adopt,
     swap, or drop per project):
     - JS/TS: Prettier (format) + ESLint with typescript-eslint
       (correctness) + tsc --noEmit (types).
     - Python: ruff format (format) + ruff (correctness) + mypy or
       pyright (types).
     - Go: gofmt (format) + go vet and staticcheck (correctness).
     - Rust: rustfmt (format) + clippy (correctness).
     - Any stack (docs): EditorConfig + the scaffolded markdownlint
       baseline + check-links.mjs.
     Opinionation dial: be strict (error, in `check`) on correctness —
     broken/unused imports, dead code, type errors, broken links,
     accessibility violations. Make formatting invisible (auto-fix on
     save, never a gate failure). Keep taste/complexity rules opt-in and
     off by default — a noisy rule that gets inline-disabled erodes
     trust in the whole gate. Defer spell-check until you have a domain
     dictionary.
     This section captures tool choices. The specific tools the quality
     gate runs are named here; the `check` command that composes them and
     the build/dev/deploy rules live in DEV-INFRASTRUCTURE.md → "Quality
     gate". -->
