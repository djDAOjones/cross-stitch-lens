/**
 * The shared capped search table (M15-UI-03, D117 seam fix 3): the
 * 60-row browse pattern the Colour panel established, extracted as
 * its own module so the profile editor never imports from
 * `palette-panel.ts` — that file is deleted by the M15-UI-01 cutover
 * later in the run order, and a dependency on it would die with it.
 *
 * Callers supply the row model (pure) and the per-row action cells;
 * this module owns the search field, the cap, and the honest count
 * line ("filtered out" vs "nothing here" — UI-STANDARDS empty
 * states).
 */

/** Longest list rendered at once; search narrows past this. */
export const BROWSE_ROW_CAP = 60;

/** One displayable row. */
export interface BrowseRow {
  id: string;
  /** Full display label, e.g. `"DMC 310 Black"` or `"Web-safe #cc0033"`. */
  label: string;
  /** Swatch colour. */
  hex: string;
}

export interface BrowseTableOptions {
  /** Search field id (unique in the document). */
  searchId: string;
  /** Visible search label, e.g. `"Find a colour"`. */
  searchLabel: string;
  /** Row model for a query. Pure; called on every refresh. */
  rowsFor(query: string): { rows: BrowseRow[]; total: number };
  /** Action cells appended to one row (pin toggles, Own boxes…). */
  rowActions(row: BrowseRow): HTMLElement[];
  /** Sentence for a truly empty universe (no query). */
  emptyText: string;
}

/** The built table. */
export interface BrowseTable {
  element: HTMLElement;
  /** Re-run the row model (after a pin/library change). */
  refresh(): void;
  /** Current query, e.g. to resolve "add as custom" offers. */
  query(): string;
}

/** Build a capped, searchable colour list. */
export function createBrowseTable(doc: Document, options: BrowseTableOptions): BrowseTable {
  const element = doc.createElement('div');
  element.className = 'browse-table';

  const search = doc.createElement('input');
  search.type = 'search';
  search.id = options.searchId;
  const searchLabel = doc.createElement('label');
  searchLabel.htmlFor = search.id;
  searchLabel.textContent = options.searchLabel;
  const searchField = doc.createElement('div');
  searchField.className = 'field';
  searchField.append(searchLabel, search);

  const count = doc.createElement('p');
  count.className = 'meta';
  const list = doc.createElement('div');
  list.className = 'browse-rows';
  element.append(searchField, count, list);

  function refresh(): void {
    const query = search.value;
    const { rows, total } = options.rowsFor(query);
    list.replaceChildren();
    for (const row of rows) {
      const item = doc.createElement('div');
      item.className = 'browse-row';
      const swatch = doc.createElement('span');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = row.hex;
      swatch.setAttribute('aria-hidden', 'true');
      const name = doc.createElement('span');
      name.className = 'thread-name';
      name.textContent = row.label;
      name.title = row.hex;
      item.append(swatch, name, ...options.rowActions(row));
      list.append(item);
    }
    if (total === 0) {
      count.textContent =
        query.trim() !== ''
          ? `Nothing matches "${query.trim()}" — clear the search to see everything.`
          : options.emptyText;
    } else {
      count.textContent =
        total > rows.length
          ? `Showing ${String(rows.length)} of ${String(total)} — search to narrow.`
          : `${String(total)} colour${total === 1 ? '' : 's'}.`;
    }
  }

  search.addEventListener('input', refresh);
  refresh();

  return { element, refresh, query: () => search.value };
}
