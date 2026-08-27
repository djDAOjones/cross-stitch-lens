/**
 * The profile editor's async-selection guard (UI-NITS-01).
 *
 * House convention: logic in node, DOM behaviour verified in the
 * running app. `selectProfile` is a DOM closure, so what is pinned
 * here is the arithmetic it is built from plus the exact sequence it
 * performs — begin, await a **deferred** adapter, apply only if still
 * newest. Deferred is the whole point: every shipped adapter resolves
 * synchronously today, so the hazard is latent, and a test that
 * resolves immediately would pass against the unguarded code too.
 */

import { describe, expect, it } from 'vitest';

import { latestWins } from '../src/ui/latest-wins.ts';

/** A promise whose settlement the test controls — a deferred adapter. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('latestWins', () => {
  it('holds for a lone attempt', () => {
    const isNewest = latestWins().begin();
    expect(isNewest()).toBe(true);
  });

  it('drops an attempt once a later one begins', () => {
    const gate = latestWins();
    const first = gate.begin();
    const second = gate.begin();
    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });

  it('keeps only the newest of many', () => {
    const gate = latestWins();
    const attempts = [gate.begin(), gate.begin(), gate.begin(), gate.begin()];
    expect(attempts.map((a) => a())).toEqual([false, false, false, true]);
  });

  it('gives each gate its own generation', () => {
    const a = latestWins();
    const b = latestWins();
    const first = a.begin();
    b.begin();
    b.begin();
    expect(first()).toBe(true); // b's traffic must not supersede a's
  });
});

describe('selection against a deferred adapter (the selectProfile sequence)', () => {
  /**
   * The shape of `selectProfile`: take a token, await the adapter,
   * apply only while newest. Nothing DOM-facing — `applied` stands in
   * for the draft, the switcher value and the form.
   */
  function selector(draftOf: (id: string) => Promise<string>) {
    const gate = latestWins();
    const applied: string[] = [];
    async function select(id: string): Promise<void> {
      const isNewest = gate.begin();
      const draft = await draftOf(id);
      if (!isNewest()) return;
      applied.push(draft);
    }
    return { select, applied };
  }

  it('applies the last-requested profile when the slow one settles last', async () => {
    const slow = deferred<string>();
    const fast = deferred<string>();
    const pending = new Map([
      ['slow', slow.promise],
      ['fast', fast.promise],
    ]);
    const { select, applied } = selector((id) => pending.get(id) ?? Promise.resolve(id));

    const first = select('slow');
    const second = select('fast');
    // Out-of-order settlement: the earlier request finishes last.
    fast.resolve('fast-draft');
    slow.resolve('slow-draft');
    await Promise.all([first, second]);

    expect(applied).toEqual(['fast-draft']);
  });

  it('applies the last-requested profile when it also settles last', async () => {
    const slow = deferred<string>();
    const fast = deferred<string>();
    const pending = new Map([
      ['a', fast.promise],
      ['b', slow.promise],
    ]);
    const { select, applied } = selector((id) => pending.get(id) ?? Promise.resolve(id));

    const first = select('a');
    const second = select('b');
    fast.resolve('a-draft');
    slow.resolve('b-draft');
    await Promise.all([first, second]);

    expect(applied).toEqual(['b-draft']);
  });

  it('applies exactly one draft however many selections race', async () => {
    const gates = ['p1', 'p2', 'p3', 'p4'].map(() => deferred<string>());
    let next = 0;
    const { select, applied } = selector(() => gates[next++]?.promise ?? Promise.resolve(''));

    const runs = [select('p1'), select('p2'), select('p3'), select('p4')];
    // Settle in a scrambled order; only the fourth request may land.
    for (const index of [2, 0, 3, 1]) gates[index]?.resolve(`draft-${String(index)}`);
    await Promise.all(runs);

    expect(applied).toEqual(['draft-3']);
  });

  it('applies every draft when selections do not overlap', async () => {
    const { select, applied } = selector((id) => Promise.resolve(`${id}-draft`));
    await select('a');
    await select('b');
    expect(applied).toEqual(['a-draft', 'b-draft']);
  });
});
