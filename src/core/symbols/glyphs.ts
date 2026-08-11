/**
 * The app-owned symbol glyph catalogue (M9, scope signed at D160).
 *
 * Sixty-four vector glyphs — matching the colour slider's ceiling —
 * drafted in four batches of sixteen, ordered so the first batch is the
 * most mutually distinct (most designs reduce to ≤ 16 colours). The
 * order is **canonical and append-only**: assignment persistence keys
 * on glyph ids and "next unused" walks this order, so reordering or
 * renaming an id would silently re-symbol every saved project. New
 * glyphs append; nothing moves. `tests/symbols-glyphs.test.ts` pins the
 * id list as the tripwire.
 *
 * Status: **draft pending owner signature.** The set is signed in
 * batches on printed evidence (the D139/D146 gallery process — see
 * `npm run symbols:evidence`); an unsigned glyph may still be redrawn
 * in place, but its id and position never change once a project could
 * have persisted it.
 *
 * Geometry contract — one model for every renderer (D160 decision 1):
 *
 * - Each glyph is a single SVG path string in a fixed 0–100 unit box,
 *   visual centre (50, 50), rendered by uniform scale to the target
 *   cell. Consumers: canvas `Path2D` (chart raster) and pdf-lib
 *   `drawSvgPath` (vector key, M10 vector pages later).
 * - **Fill-only, nonzero winding.** Outlined shapes carry their "stroke"
 *   as geometry — an inner contour wound the opposite way — so there is
 *   no stroke-width setting to disagree between renderers, and line
 *   weight survives any raster scale the same way the shape does.
 * - Commands are limited to M/L/C/Z (curves as cubic Béziers, circles
 *   via the κ ≈ 0.5523 approximation): the subset both `Path2D` and
 *   pdf-lib's SVG parser handle identically. No arcs, no relative
 *   commands, no evenodd.
 *
 * Pure data + pure helpers: no DOM, no imports (engine purity — the
 * renderers live in export/, not here).
 */

/** One drawable symbol: a stable id, a short human name, fill path. */
export interface SymbolGlyph {
  /** Stable identifier — persisted in project files; never reused. */
  id: string;
  /** Short display name for the key, override UI, and evidence sheet. */
  name: string;
  /** Fill-only SVG path (M/L/C/Z, nonzero winding) in the 0–100 box. */
  path: string;
}

/** Glyphs are drafted and signed in batches of this size (D160). */
export const SYMBOL_BATCH_SIZE = 16;

/** Cubic-Bézier circle constant. */
const K = 0.5522847498;

/** Format a coordinate: ≤ 2 decimals, no trailing zeros, no "-0". */
function n(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

type Point = readonly [number, number];

/** Closed polygon through `points`, in the order given. */
function poly(points: readonly Point[]): string {
  const [first, ...rest] = points;
  if (first === undefined) return '';
  const head = `M${n(first[0])},${n(first[1])}`;
  const tail = rest.map((p) => `L${n(p[0])},${n(p[1])}`).join(' ');
  return `${head} ${tail} Z`;
}

/** The same polygon wound the other way (a hole under nonzero). */
function polyRev(points: readonly Point[]): string {
  return poly([...points].reverse());
}

/** Full circle at (cx, cy); `ccw` reverses the winding for holes. */
function circle(cx: number, cy: number, r: number, ccw = false): string {
  const k = K * r;
  const cw =
    `M${n(cx)},${n(cy - r)} ` +
    `C${n(cx + k)},${n(cy - r)} ${n(cx + r)},${n(cy - k)} ${n(cx + r)},${n(cy)} ` +
    `C${n(cx + r)},${n(cy + k)} ${n(cx + k)},${n(cy + r)} ${n(cx)},${n(cy + r)} ` +
    `C${n(cx - k)},${n(cy + r)} ${n(cx - r)},${n(cy + k)} ${n(cx - r)},${n(cy)} ` +
    `C${n(cx - r)},${n(cy - k)} ${n(cx - k)},${n(cy - r)} ${n(cx)},${n(cy - r)} Z`;
  if (!ccw) return cw;
  return (
    `M${n(cx)},${n(cy - r)} ` +
    `C${n(cx - k)},${n(cy - r)} ${n(cx - r)},${n(cy - k)} ${n(cx - r)},${n(cy)} ` +
    `C${n(cx - r)},${n(cy + k)} ${n(cx - k)},${n(cy + r)} ${n(cx)},${n(cy + r)} ` +
    `C${n(cx + k)},${n(cy + r)} ${n(cx + r)},${n(cy + k)} ${n(cx + r)},${n(cy)} ` +
    `C${n(cx + r)},${n(cy - k)} ${n(cx + k)},${n(cy - r)} ${n(cx)},${n(cy - r)} Z`
  );
}

/** Annulus: the standard "outlined circle" (outer − inner). */
function ring(rOuter: number, rInner: number): string {
  return `${circle(50, 50, rOuter)} ${circle(50, 50, rInner, true)}`;
}

/** Half-disc with a vertical flat edge at x = cx. */
function halfDisc(cx: number, cy: number, r: number, side: 'left' | 'right'): string {
  const k = K * r;
  const s = side === 'left' ? -1 : 1;
  return (
    `M${n(cx)},${n(cy - r)} ` +
    `C${n(cx + s * k)},${n(cy - r)} ${n(cx + s * r)},${n(cy - k)} ${n(cx + s * r)},${n(cy)} ` +
    `C${n(cx + s * r)},${n(cy + k)} ${n(cx + s * k)},${n(cy + r)} ${n(cx)},${n(cy + r)} Z`
  );
}

/** Half-disc with a horizontal flat edge at y = cy (the dark half below). */
function halfDiscDown(cx: number, cy: number, r: number): string {
  const k = K * r;
  return (
    `M${n(cx + r)},${n(cy)} ` +
    `C${n(cx + r)},${n(cy + k)} ${n(cx + k)},${n(cy + r)} ${n(cx)},${n(cy + r)} ` +
    `C${n(cx - k)},${n(cy + r)} ${n(cx - r)},${n(cy + k)} ${n(cx - r)},${n(cy)} Z`
  );
}

/** Axis-aligned rectangle as a clockwise polygon. */
function rect(x: number, y: number, w: number, h: number): string {
  return poly([
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]);
}

/** Rectangle centred on (50, 50), rotated by `deg`. */
function rotRect(w: number, h: number, deg: number): string {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const corners: Point[] = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ];
  return poly(corners.map(([x, y]) => [50 + x * c - y * s, 50 + x * s + y * c] as const));
}

/**
 * Outline of a convex polygon: the shape minus a copy scaled toward
 * its centroid so every edge pulls in by `weight` units. Scaling by
 * (apothem − weight) / apothem keeps the visual line weight equal on
 * every edge of a regular shape.
 */
function outline(points: readonly Point[], weight: number): string {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of points) {
    cx += x / points.length;
    cy += y / points.length;
  }
  let apothem = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i++) {
    const a = points[i] as Point;
    const b = points[(i + 1) % points.length] as Point;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    if (len === 0) continue;
    const d = Math.abs(ex * (cy - a[1]) - ey * (cx - a[0])) / len;
    apothem = Math.min(apothem, d);
  }
  const f = Math.max(0, (apothem - weight) / apothem);
  const inner = points.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f] as const);
  return `${poly(points)} ${polyRev(inner)}`;
}

/** Regular polygon, `sides` vertices, first vertex pointing up. */
function regular(sides: number, r: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
    pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
  }
  return pts;
}

const SQUARE: Point[] = [
  [18, 18],
  [82, 18],
  [82, 82],
  [18, 82],
];
const DIAMOND: Point[] = [
  [50, 6],
  [94, 50],
  [50, 94],
  [6, 50],
];
const TRI_UP: Point[] = [
  [50, 12],
  [89, 80],
  [11, 80],
];
const TRI_DOWN: Point[] = [
  [50, 88],
  [11, 20],
  [89, 20],
];

/**
 * The catalogue, in canonical order. Append-only — see module JSDoc.
 */
export const SYMBOL_GLYPHS: readonly SymbolGlyph[] = [
  // ---- Batch 1 (1–16): the high-distinction core. ----
  { id: 'dot', name: 'Filled circle', path: circle(50, 50, 32) },
  { id: 'circle', name: 'Circle', path: ring(36, 24) },
  { id: 'square-fill', name: 'Filled square', path: rect(19, 19, 62, 62) },
  { id: 'square', name: 'Square', path: outline(SQUARE, 12) },
  { id: 'diamond-fill', name: 'Filled diamond', path: poly(DIAMOND) },
  { id: 'diamond', name: 'Diamond', path: outline(DIAMOND, 12) },
  { id: 'triangle-fill', name: 'Filled triangle', path: poly(TRI_UP) },
  { id: 'triangle', name: 'Triangle', path: outline(TRI_UP, 12) },
  { id: 'plus', name: 'Plus', path: `${rect(41, 14, 18, 72)} ${rect(14, 41, 72, 18)}` },
  { id: 'cross', name: 'Cross', path: `${rotRect(16, 68, 45)} ${rotRect(16, 68, -45)}` },
  {
    id: 'star4-fill',
    name: 'Filled star',
    path: poly([
      [50, 4],
      [60, 40],
      [96, 50],
      [60, 60],
      [50, 96],
      [40, 60],
      [4, 50],
      [40, 40],
    ]),
  },
  { id: 'bar-h', name: 'Horizontal bar', path: rect(14, 41, 72, 18) },
  { id: 'bar-v', name: 'Vertical bar', path: rect(41, 14, 18, 72) },
  {
    id: 'heart-fill',
    name: 'Filled heart',
    path:
      'M50,86 C22,64 10,46 10,32 C10,18 22,10 32,10 C41,10 47,15 50,24 ' +
      'C53,15 59,10 68,10 C78,10 90,18 90,32 C90,46 78,64 50,86 Z',
  },
  { id: 'circle-dot', name: 'Circle and dot', path: `${ring(36, 26)} ${circle(50, 50, 11)}` },
  { id: 'tri-down-fill', name: 'Filled triangle, down', path: poly(TRI_DOWN) },

  // ---- Batch 2 (17–32): rotations, halves, and pairings. ----
  {
    id: 'tri-left-fill',
    name: 'Filled triangle, left',
    path: poly([
      [12, 50],
      [80, 11],
      [80, 89],
    ]),
  },
  {
    id: 'tri-right-fill',
    name: 'Filled triangle, right',
    path: poly([
      [88, 50],
      [20, 89],
      [20, 11],
    ]),
  },
  { id: 'tri-down', name: 'Triangle, down', path: outline(TRI_DOWN, 12) },
  {
    id: 'square-dot',
    name: 'Square and dot',
    path: `${outline(SQUARE, 10)} ${circle(50, 50, 10)}`,
  },
  {
    id: 'diamond-dot',
    name: 'Diamond and dot',
    path: `${outline(DIAMOND, 10)} ${circle(50, 50, 9)}`,
  },
  {
    id: 'circle-plus',
    name: 'Circle and plus',
    path: `${ring(36, 27)} ${rect(45.5, 32, 9, 36)} ${rect(32, 45.5, 36, 9)}`,
  },
  {
    id: 'square-nw',
    name: 'Square, dark corner',
    path: `${outline(SQUARE, 10)} ${poly([
      [28, 28],
      [72, 28],
      [28, 72],
    ])}`,
  },
  {
    id: 'circle-half-left',
    name: 'Half-dark circle',
    path: `${ring(36, 28)} ${halfDisc(50, 50, 28, 'left')}`,
  },
  {
    id: 'circle-half-right',
    name: 'Half-dark circle, right',
    path: `${ring(36, 28)} ${halfDisc(50, 50, 28, 'right')}`,
  },
  {
    id: 'circle-half-bottom',
    name: 'Half-dark circle, down',
    path: `${ring(36, 28)} ${halfDiscDown(50, 50, 28)}`,
  },
  { id: 'slash', name: 'Slash', path: rotRect(16, 68, 45) },
  { id: 'backslash', name: 'Backslash', path: rotRect(16, 68, -45) },
  { id: 'equals', name: 'Equals', path: `${rect(18, 32, 64, 14)} ${rect(18, 54, 64, 14)}` },
  { id: 'pipes', name: 'Double bar', path: `${rect(32, 18, 14, 64)} ${rect(54, 18, 14, 64)}` },
  {
    id: 'chevron-up',
    name: 'Chevron, up',
    path: poly([
      [14, 66],
      [50, 30],
      [86, 66],
      [74, 78],
      [50, 54],
      [26, 78],
    ]),
  },
  {
    id: 'chevron-down',
    name: 'Chevron, down',
    path: poly([
      [14, 34],
      [26, 22],
      [50, 46],
      [74, 22],
      [86, 34],
      [50, 70],
    ]),
  },

  // ---- Batch 3 (33–48): marks, dot groups, and compounds. ----
  {
    id: 'chevron-left',
    name: 'Chevron, left',
    path: poly([
      [66, 14],
      [78, 26],
      [54, 50],
      [78, 74],
      [66, 86],
      [30, 50],
    ]),
  },
  {
    id: 'chevron-right',
    name: 'Chevron, right',
    path: poly([
      [34, 14],
      [70, 50],
      [34, 86],
      [22, 74],
      [46, 50],
      [22, 26],
    ]),
  },
  { id: 'dots-2-h', name: 'Two dots', path: `${circle(31, 50, 15)} ${circle(69, 50, 15)}` },
  {
    id: 'dots-2-v',
    name: 'Two dots, stacked',
    path: `${circle(50, 31, 15)} ${circle(50, 69, 15)}`,
  },
  {
    id: 'dots-3',
    name: 'Three dots',
    path: `${circle(50, 26, 14)} ${circle(28, 66, 14)} ${circle(72, 66, 14)}`,
  },
  {
    id: 'dots-4',
    name: 'Four dots',
    path:
      `${circle(30, 30, 13)} ${circle(70, 30, 13)} ` +
      `${circle(30, 70, 13)} ${circle(70, 70, 13)}`,
  },
  {
    id: 'hourglass',
    name: 'Hourglass',
    path: `${poly([
      [14, 14],
      [86, 14],
      [50, 50],
    ])} ${poly([
      [50, 50],
      [86, 86],
      [14, 86],
    ])}`,
  },
  {
    id: 'bowtie',
    name: 'Bow tie',
    path: `${poly([
      [14, 14],
      [50, 50],
      [14, 86],
    ])} ${poly([
      [86, 14],
      [86, 86],
      [50, 50],
    ])}`,
  },
  {
    id: 'square-x',
    name: 'Square and cross',
    path: `${outline(SQUARE, 9)} ${rotRect(9, 40, 45)} ${rotRect(9, 40, -45)}`,
  },
  {
    id: 'circle-x',
    name: 'Circle and cross',
    path: `${ring(36, 27)} ${rotRect(8.5, 34, 45)} ${rotRect(8.5, 34, -45)}`,
  },
  {
    id: 'asterisk',
    name: 'Asterisk',
    path: `${rotRect(13, 68, 0)} ${rotRect(13, 68, 60)} ${rotRect(13, 68, -60)}`,
  },
  {
    id: 'corner-nw',
    name: 'Dark corner',
    path: poly([
      [14, 14],
      [86, 14],
      [14, 86],
    ]),
  },
  {
    id: 'corner-se',
    name: 'Dark corner, lower',
    path: poly([
      [86, 14],
      [86, 86],
      [14, 86],
    ]),
  },
  {
    id: 't-shape',
    name: 'Letter T',
    path: poly([
      [16, 14],
      [84, 14],
      [84, 30],
      [58, 30],
      [58, 86],
      [42, 86],
      [42, 30],
      [16, 30],
    ]),
  },
  {
    id: 'h-shape',
    name: 'Letter H',
    path: poly([
      [18, 14],
      [34, 14],
      [34, 42],
      [66, 42],
      [66, 14],
      [82, 14],
      [82, 86],
      [66, 86],
      [66, 58],
      [34, 58],
      [34, 86],
      [18, 86],
    ]),
  },
  {
    id: 'u-shape',
    name: 'Letter U',
    path: poly([
      [18, 14],
      [34, 14],
      [34, 70],
      [66, 70],
      [66, 14],
      [82, 14],
      [82, 86],
      [18, 86],
    ]),
  },

  // ---- Batch 4 (49–64): letters and rarer silhouettes. ----
  {
    id: 'l-shape',
    name: 'Letter L',
    path: poly([
      [22, 14],
      [38, 14],
      [38, 70],
      [80, 70],
      [80, 86],
      [22, 86],
    ]),
  },
  {
    id: 'z-shape',
    name: 'Letter Z',
    path: poly([
      [18, 14],
      [82, 14],
      [82, 28],
      [40, 72],
      [82, 72],
      [82, 86],
      [18, 86],
      [18, 72],
      [60, 28],
      [18, 28],
    ]),
  },
  {
    id: 'n-shape',
    name: 'Letter N',
    path: poly([
      [18, 86],
      [18, 14],
      [34, 14],
      [66, 58],
      [66, 14],
      [82, 14],
      [82, 86],
      [66, 86],
      [34, 42],
      [34, 86],
    ]),
  },
  {
    id: 'e-shape',
    name: 'Letter E',
    path: poly([
      [20, 14],
      [80, 14],
      [80, 28],
      [36, 28],
      [36, 42],
      [72, 42],
      [72, 56],
      [36, 56],
      [36, 72],
      [80, 72],
      [80, 86],
      [20, 86],
    ]),
  },
  {
    id: 'y-shape',
    name: 'Letter Y',
    path: poly([
      [14, 14],
      [32, 14],
      [50, 40],
      [68, 14],
      [86, 14],
      [58, 54],
      [58, 86],
      [42, 86],
      [42, 54],
    ]),
  },
  { id: 'pentagon-fill', name: 'Filled pentagon', path: poly(regular(5, 38)) },
  { id: 'hexagon', name: 'Hexagon', path: outline(regular(6, 38), 11) },
  {
    id: 'arrow-up-fill',
    name: 'Filled arrow, up',
    path: poly([
      [50, 10],
      [82, 46],
      [62, 46],
      [62, 88],
      [38, 88],
      [38, 46],
      [18, 46],
    ]),
  },
  {
    id: 'arrow-down-fill',
    name: 'Filled arrow, down',
    path: poly([
      [50, 90],
      [18, 54],
      [38, 54],
      [38, 12],
      [62, 12],
      [62, 54],
      [82, 54],
    ]),
  },
  {
    id: 'diamond-bar',
    name: 'Diamond and bar',
    path: `${outline(DIAMOND, 10)} ${rect(36, 45, 28, 10)}`,
  },
  {
    id: 'circle-bar',
    name: 'Circle and bar',
    path: `${ring(36, 27)} ${rect(36, 45.5, 28, 9)}`,
  },
  {
    id: 'square-bar',
    name: 'Square and bar',
    path: `${outline(SQUARE, 10)} ${rect(32, 45.5, 36, 9)}`,
  },
  {
    id: 'steps',
    name: 'Steps',
    path: poly([
      [18, 86],
      [18, 58],
      [40, 58],
      [40, 36],
      [62, 36],
      [62, 14],
      [82, 14],
      [82, 86],
    ]),
  },
  {
    id: 'bolt',
    name: 'Bolt',
    path: poly([
      [30, 10],
      [58, 10],
      [44, 42],
      [66, 42],
      [34, 90],
      [44, 54],
      [24, 54],
    ]),
  },
  {
    id: 'crescent',
    name: 'Crescent',
    path:
      'M60,10 C36,10 18,28 18,50 C18,72 36,90 60,90 ' +
      'C46,80 38,66 38,50 C38,34 46,20 60,10 Z',
  },
  {
    id: 'flag',
    name: 'Flag',
    path: `${rect(18, 12, 10, 76)} ${poly([
      [28, 14],
      [86, 33],
      [28, 52],
    ])}`,
  },
];

/** Canonical glyph ids, in catalogue order. */
export const SYMBOL_IDS: readonly string[] = SYMBOL_GLYPHS.map((g) => g.id);

const BY_ID = new Map(SYMBOL_GLYPHS.map((g) => [g.id, g]));

/** Look up a glyph by id; undefined for ids this build does not know. */
export function glyphById(id: string): SymbolGlyph | undefined {
  return BY_ID.get(id);
}
