/**
 * Manual symbol override picker (ICE-SYMBOL-UI-01 — M9's v1-optional
 * slice, D170). The model half is pure and tested in node; the modal
 * half rides `runModal` so it inherits the Carbon dialog contract
 * (trap, Escape, focus return) unchanged.
 *
 * The picker offers the **unused** pool only (D160 decision 3): a
 * symbol another thread wears is not listed, so a collision cannot be
 * expressed from the UI any more than from the model. Taking another
 * thread's symbol is an explicit swap — a later verb, not a conflict
 * state here.
 *
 * Glyphs are rendered as inline SVG in `currentColor`: a symbol is
 * monochrome UI content, never a thread colour, so the text token is
 * the right ink in both schemes (UI-STANDARDS → "Colour fidelity"
 * governs swatches, not glyphs).
 */

import type { SymbolAssignmentState } from '../core/symbols/assignment.ts';
import type { SymbolGlyph } from '../core/symbols/glyphs.ts';
import { runModal } from './modal.ts';

/** What the picker can show for one thread. */
export interface SymbolPickerModel {
  /** The glyph the thread wears now (its grant), or null before any grant. */
  current: SymbolGlyph | null;
  /**
   * The standing override, when one is recorded and this build knows
   * the glyph. Dormant overrides on unknown ids stay in the file but
   * cannot be shown.
   */
  chosen: SymbolGlyph | null;
  /** Every unused glyph, in catalogue order — the pool the user may pick from. */
  unused: SymbolGlyph[];
}

/**
 * Build the picker's view of one thread from the assignment state.
 * Catalogue order (not queue order) for the pool: the queue is grant
 * order, which shifts as symbols are released — a picker that
 * reshuffles between openings defeats recognition.
 */
export function symbolPickerModel(
  state: SymbolAssignmentState,
  threadId: string,
  glyphs: readonly SymbolGlyph[],
): SymbolPickerModel {
  const byId = new Map(glyphs.map((g) => [g.id, g]));
  const grant = state.assigned.find((p) => p.threadId === threadId);
  const override = state.overrides.find((p) => p.threadId === threadId);
  const queued = new Set(state.queue);
  return {
    current: grant === undefined ? null : (byId.get(grant.symbolId) ?? null),
    chosen: override === undefined ? null : (byId.get(override.symbolId) ?? null),
    unused: glyphs.filter((g) => queued.has(g.id)),
  };
}

/**
 * The glyph a Colours-used row shows for a thread: its grant when it
 * has one; otherwise a recorded override whose symbol is still free
 * (it will win at grant time, so showing it is honest); otherwise
 * null — "assigned at export".
 */
export function displayGlyph(
  state: SymbolAssignmentState,
  threadId: string,
  glyphs: readonly SymbolGlyph[],
): SymbolGlyph | null {
  const model = symbolPickerModel(state, threadId, glyphs);
  if (model.current !== null) return model.current;
  if (model.chosen !== null && state.queue.includes(model.chosen.id)) return model.chosen;
  return null;
}

/** An inline, decorative rendering of one glyph in the current text colour. */
export function glyphElement(doc: Document, glyph: SymbolGlyph): SVGSVGElement {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'symbol-glyph');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', glyph.path);
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('fill-rule', 'nonzero');
  svg.append(path);
  return svg;
}

/** The user's answer from the picker. */
export type SymbolPick = { kind: 'glyph'; id: string } | { kind: 'auto' };

/** Options for {@link symbolPickerModal}. */
export interface SymbolPickerOptions {
  /** The thread as the row names it, e.g. "DMC 310 Black". */
  label: string;
  model: SymbolPickerModel;
}

/**
 * The picker dialog: the thread's standing, a grid of every unused
 * glyph (name visible under each — the label *is* the accessible
 * name), and "Let the app choose" when an override is recorded.
 * Resolves the pick, or null on cancel / Escape / backdrop.
 */
export function symbolPickerModal(
  doc: Document,
  options: SymbolPickerOptions,
): Promise<SymbolPick | null> {
  const { model } = options;
  return runModal<SymbolPick | null>(
    doc,
    `Symbol for ${options.label}`,
    (body, close) => {
      const note = doc.createElement('p');
      note.className = 'meta';
      note.textContent = standingSentence(model);
      body.append(note);

      const grid = doc.createElement('div');
      grid.className = 'symbol-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Unused symbols');
      let first: HTMLButtonElement | null = null;
      for (const glyph of model.unused) {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'symbol-option';
        const name = doc.createElement('span');
        name.textContent = glyph.name;
        button.append(glyphElement(doc, glyph));
        button.append(name);
        button.addEventListener('click', () => close({ kind: 'glyph', id: glyph.id }));
        grid.append(button);
        first ??= button;
      }
      if (model.unused.length === 0) {
        const empty = doc.createElement('p');
        empty.className = 'meta';
        empty.textContent =
          'Every symbol is in use. Change another colour’s symbol first to free one.';
        grid.append(empty);
      }

      const actions = doc.createElement('div');
      actions.className = 'modal-actions';
      if (model.chosen !== null) {
        const auto = doc.createElement('button');
        auto.type = 'button';
        auto.textContent = 'Let the app choose';
        auto.addEventListener('click', () => close({ kind: 'auto' }));
        actions.append(auto);
      }
      const cancel = doc.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => close(null));
      actions.append(cancel);
      body.append(grid, actions);
      return first ?? cancel;
    },
    null,
  );
}

/** One sentence naming where the thread stands before the user picks. */
export function standingSentence(model: SymbolPickerModel): string {
  const now =
    model.current === null
      ? 'No symbol yet — one is assigned when a symbol chart is exported.'
      : `Now ${model.current.name}.`;
  const kept =
    model.chosen === null
      ? ''
      : ` Kept for this colour: ${model.chosen.name}.`;
  return `${now}${kept} Symbols other colours wear are not offered.`;
}
