/* The dot board: an alternative to the scrolling ticker. Each line is drawn in square dots on the
   dark strip; the dots breathe in out of a faint grid (a soft sweep, a slight overshoot), hold with
   a gentle breathe, then shrink back before the next line comes in. Long lines are split at word
   breaks into frames that fit. Used by the site (hero.js) and the editor's frames (AoostHero.tsx),
   so it only touches the canvas's own document and window. More animations plug into EFFECTS. */

const INK = '#F2F1EA';
/** Sub-pixels per cell side when text is drawn: a cell's share of ink sets how big its dot is, so edges come out smooth. */
const SS = 4;
/** The first time a board shows, a wave of dots runs across the empty grid before the first line. */
const INTRO = 1.5;

/** "welcome to the site" → "Welcome to the site" (the rest is left as written). */
export const sentenceCase = (s) => String(s).replace(/^(\s*)(\S)/, (_, sp, c) => sp + c.toUpperCase());

/** Split a line into frames that fit, at word breaks (greedy). */
export function wrapLine(words, fits) {
  const frames = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (!cur || fits(next)) cur = next;
    else { frames.push(cur); cur = w; }
  }
  if (cur) frames.push(cur);
  return frames;
}

/**
 * Split a line into as few frames as fit, with the words shared out evenly between them
 * ("beat the game, top" / "score 9749 by J WARELEY", not one long frame and a short one).
 */
export function balanceLine(words, width, room) {
  const greedy = wrapLine(words, (s) => width(s) <= room);
  if (greedy.length < 2) return greedy;
  let lo = 0, hi = room, best = greedy;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    const tryIt = wrapLine(words, (s) => width(s) <= mid);
    if (tryIt.length <= greedy.length && tryIt.every((f) => width(f) <= room)) { best = tryIt; hi = mid; } else lo = mid;
  }
  return best;
}

/** Small seeded random numbers, so a frame's dots arrive the same way each time it shows. */
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; }
const hash = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return h >>> 0; };
const easeOutBack = (x) => { const c = 1.35; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const easeIn = (x) => x * x;

/**
 * Animations: each says, for a lit cell, how big (0 = a grid dot, 1 = a full square) it is at time
 * t (seconds into the frame), given the frame's timing. "breathe" is the first; add more here.
 */
export const EFFECTS = {
  /**
   * Resolve: the board works the line out. A rough ghost of its shape flickers up in small dots,
   * then a wave sweeps across: dots swell into big overlapping circles (they cut each other where
   * they overlap) and settle into the solid letters, while the ghost around them falls away.
   */
  resolve: {
    ghost: 2,
    timing(total) { return { inEnd: 2.75, outStart: Math.max(2.85, total - 0.85) }; },
    delays(cells, cols, r) { return cells.map((c) => ({ ...c, j: r(), dout: 0.25 * (c.x / cols) + 0.3 * r() })); },
    draw(g, f, t, T) {
      const { ctx, pitch, cols, dot, full, at } = g;
      const WS = 0.95, WD = 1.6, band = 0.22;
      const front = ((t - WS) / WD) * (1 + band * 2) - band;
      const small = Math.max(dot * 1.1, pitch * 0.28), shape = pitch * 0.5, big = pitch * 2.1;
      const circle = (x, y, d) => { ctx.beginPath(); ctx.arc(x, y, d / 2, 0, Math.PI * 2); ctx.fill(); };
      ctx.globalCompositeOperation = 'xor';
      const one = (c, text) => {
        const [cx, cy] = at(c);
        if (t >= T.outStart) {
          if (!text) return;
          const k = (t - T.outStart - c.dout) / 0.4, s = full * (c.w ?? 1) * (k <= 0 ? 1 : k >= 1 ? 0 : 1 - k * k);
          ctx.globalAlpha = g.b(c);
          if (s > 0.3) ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
          ctx.globalAlpha = 1;
          return;
        }
        if (t < 0.7 * c.j) return; // the ghost assembles
        const p = (front - c.x / cols) / band;
        if (p < 0) {
          // working it out: small dots that flicker
          if (Math.sin(t * 8 + c.j * 50) < -0.55) return;
          // the letters show through the ghost as slightly bigger dots
          ctx.globalAlpha = text ? 0.8 : 0.4 + 0.25 * c.j;
          circle(cx, cy, text ? shape : small);
          ctx.globalAlpha = 1;
        } else if (p < 1) {
          const swell = Math.sin(Math.PI * p);
          if (text) { ctx.globalAlpha = g.b(c); circle(cx, cy, p < 0.5 ? shape + (big - shape) * swell : full + (big - full) * swell); ctx.globalAlpha = 1; }
          else if (p < 0.6) circle(cx, cy, small + (pitch * 1.25 - small) * swell * (1 - p / 0.6));
        } else if (text) {
          const s = full * (c.w ?? 1);
          ctx.globalAlpha = g.b(c);
          ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
          ctx.globalAlpha = 1;
        }
      };
      for (const c of f.ghost) one(c, false);
      for (const c of f.cells) one(c, true);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  breathe: {
    /** when each dot starts: a left-to-right sweep with some scatter */
    delays(cells, cols, r) { return cells.map((c) => ({ ...c, din: 0.55 * (c.x / cols) + 0.35 * r(), dout: 0.25 * (c.x / cols) + 0.3 * r() })); },
    size(cell, t, T) {
      const grow = 0.5, shrink = 0.4;
      if (t < T.inEnd) { const k = (t - cell.din) / grow; return k <= 0 ? 0 : k >= 1 ? 1 : Math.max(0, easeOutBack(k)); }
      if (t < T.outStart) return 1 + 0.035 * Math.sin((t - T.inEnd) * 2.6 + cell.x * 0.08); // the hold breathes
      const k = (t - T.outStart - cell.dout) / shrink;
      return k <= 0 ? 1 : k >= 1 ? 0 : 1 - easeIn(k);
    },
  },
};

/**
 * Idle animations: what the board does once every line has shown (instead of repeating them).
 * Each gives, for a cell at time t (seconds, already scaled by the speed setting), a level from
 * 0 (a faint grid dot) to 1 (a full lit square). Add more here, and to the editor's options.
 */
const fract = (v) => v - Math.floor(v);
const noise = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
export const IDLE = {
  /** A soft band of light rolling across the board, like a breeze through the dots. */
  wave: {
    level(x, y, t, cols, rows) {
      const u = x / cols, v = y / rows;
      const a = Math.sin(u * 9 - t * 1.1 + Math.sin(v * 3 + t * 0.6) * 1.4);
      const b = Math.sin(u * 4.3 + v * 2.2 + t * 0.7);
      const k = Math.max(0, (a * 0.65 + b * 0.35));
      return k * k * 0.85;
    },
  },
  /** Blocks of dots that glow up and fade at their own pace, scattered across the board. */
  twinkle: {
    level(x, y, t) {
      const bx = Math.floor(x / 7), by = Math.floor(y / 5);
      const seed = noise(bx, by), rate = 0.35 + seed * 0.5;
      const glow = Math.max(0, Math.sin(t * rate * 2 + seed * 40));
      const g = glow * glow * glow * glow;
      return noise(x, y) < 0.88 ? g * (0.6 + 0.4 * noise(x + 9, y)) : g * 0.15;
    },
  },
};

/**
 * Start a dot board on a canvas that fills its strip. Options: lines (strings), seconds per frame,
 * grid (the faint dot grid behind), effect (a key of EFFECTS). Returns { setLines, stop }.
 */
export function startDotBoard(canvas, { lines = [], seconds = 4, grid = true, effect = 'breathe', after = 'loop', idleSpeed = 0.5, textSize = 70, look = 'flat' } = {}) {
  // Glass: black board, letters brightest along the middle of each stroke, a halo of dim blocks
  // around them, and a cool bloom over it all, like light coming through frosted glass.
  const glass = look === 'glass';
  const idleFx = after !== 'loop' ? IDLE[after] || IDLE.wave : null;
  const glyphOf = (rows) => Math.max(7, Math.round(rows * Math.min(0.95, Math.max(0.3, textSize / 100))));
  // With an idle animation, each frame shows once; then the board idles (new lines still get their turn).
  const shown = new Set();
  let idle = false, idleT0 = -1;
  const doc = canvas.ownerDocument, win = doc.defaultView;
  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = EFFECTS[effect] || EFFECTS.breathe;
  const main = canvas.getContext('2d');
  let ctx = main;
  // Glass draws the board as usual onto a light layer, then lights the canvas from it (see present).
  const layer = () => { const c = doc.createElement('canvas'); return [c, c.getContext('2d')]; };
  const [light, lightCtx] = glass ? layer() : [null, null];
  const [glowA, glowACtx] = glass ? layer() : [null, null];
  const [glowB, glowBCtx] = glass ? layer() : [null, null];
  let grain = null;
  const scratch = doc.createElement('canvas').getContext('2d', { willReadFrequently: true });
  let W = 0, H = 0, dpr = 1, pitch = 4, cols = 0, rows = 0, gridLayer = null;
  // The intro waits for the display font, so the board stays black until it can play through.
  let intro = !reduce, introT0 = -1, fontReady = !doc.fonts;
  let items = lines.map(sentenceCase), frames = [], at = 0, t0 = 0, raf = 0, visible = true, stopped = false;
  const family = () => (win.getComputedStyle(canvas).getPropertyValue('--display') || '').trim() || 'ui-sans-serif, system-ui, sans-serif';
  const fontAt = (fs) => `600 ${fs}px ${family()}`;

  function measure() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, win.devicePixelRatio || 1);
    pitch = W < 600 ? 3 : W < 1100 ? 3.4 : 3.8;
    cols = Math.floor(W / pitch); rows = Math.floor(H / pitch);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gridLayer = null;
    if (glass) {
      light.width = canvas.width; light.height = canvas.height;
      glowA.width = Math.max(1, Math.round(canvas.width / 5)); glowA.height = Math.max(1, Math.round(canvas.height / 5));
      glowB.width = Math.max(1, Math.round(canvas.width / 14)); glowB.height = Math.max(1, Math.round(canvas.height / 14));
      grain = null;
    }
  }

  /**
   * One frame of text as lit cells. The text is drawn at SS×SS sub-pixels per cell and each cell
   * keeps its share of ink (w): full inside the letters, smaller dots along their edges.
   */
  function rasterize(text, seed) {
    const glyph = glyphOf(rows);
    const cw = cols * SS, ch = rows * SS;
    scratch.canvas.width = cw; scratch.canvas.height = ch;
    let fs = glyph;
    scratch.font = fontAt(fs);
    const room = cols * 0.88;
    while (fs > Math.max(6, glyph * 0.6) && scratch.measureText(text).width > room) { fs -= 0.5; scratch.font = fontAt(fs); }
    scratch.setTransform(SS, 0, 0, SS, 0, 0);
    scratch.clearRect(0, 0, cols, rows);
    scratch.fillStyle = '#000'; scratch.textAlign = 'center'; scratch.textBaseline = 'middle';
    scratch.fillText(text, cols / 2, rows / 2 + fs * 0.06);
    scratch.setTransform(1, 0, 0, 1, 0, 0);
    const data = scratch.getImageData(0, 0, cw, ch).data;
    const cells = [], n = SS * SS * 255;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let sum = 0;
      for (let sy = 0; sy < SS; sy++) { let i = ((y * SS + sy) * cw + x * SS) * 4 + 3; for (let sx = 0; sx < SS; sx++, i += 4) sum += data[i]; }
      const cov = sum / n;
      if (cov > 0.14) cells.push({ x, y, w: Math.min(1, 0.45 + (cov - 0.14) * 1.4) });
    }
    const r = rng(seed), out = fx.delays(cells, cols, r);
    if (glass) shade(out, r);
    if (fx.ghost) {
      // The rough shape around the letters: every cell within a couple of cells of ink.
      const ink = new Uint8Array(cols * rows), near = new Uint8Array(cols * rows), G = fx.ghost;
      for (const c of cells) ink[c.y * cols + c.x] = 1;
      for (const c of cells) for (let dy = -G; dy <= G; dy++) for (let dx = -G; dx <= G; dx++) {
        const x = c.x + dx, y = c.y + dy;
        if (x >= 0 && y >= 0 && x < cols && y < rows && !ink[y * cols + x]) near[y * cols + x] = 1;
      }
      const ghost = [];
      for (let i = 0; i < near.length; i++) if (near[i] && r() < 0.7) ghost.push({ x: i % cols, y: Math.floor(i / cols) });
      out.ghost = fx.delays(ghost, cols, r);
    }
    return out;
  }

  /**
   * Glass shading: each lit cell gets a brightness from how deep it sits inside its stroke (b), and
   * cells just outside the letters become a dim halo (frame.halo), timed like their nearest lit cell.
   */
  function shade(cells, r) {
    const N = cols * rows, idx = new Int32Array(N).fill(-1), dist = new Int16Array(N).fill(-1);
    cells.forEach((c, i) => { idx[c.y * cols + c.x] = i; });
    const q = [], nb = [1, -1, cols, -cols];
    const okStep = (i, j) => j >= 0 && j < N && !(Math.abs((j % cols) - (i % cols)) > 1);
    // inside: distance to the edge of the stroke
    for (const c of cells) { const i = c.y * cols + c.x; if (nb.some((d) => !okStep(i, i + d) || idx[i + d] < 0)) { dist[i] = 1; q.push(i); } }
    for (let h = 0; h < q.length; h++) { const i = q[h]; for (const d of nb) { const j = i + d; if (okStep(i, j) && idx[j] >= 0 && dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); } } }
    let dmax = 1; for (const c of cells) dmax = Math.max(dmax, dist[c.y * cols + c.x]);
    const span = Math.max(1, (dmax - 1) * 0.75);
    for (const c of cells) c.b = 0.36 + 0.64 * Math.min(1, (dist[c.y * cols + c.x] - 1) / span);
    // outside: two cells of halo, fading out
    const owner = new Int32Array(N).fill(-1), out = new Int16Array(N).fill(0), ring = [];
    for (const c of cells) { const i = c.y * cols + c.x; owner[i] = idx[i]; ring.push(i); }
    const halo = [];
    for (let step = 1; step <= 2; step++) {
      const next = [];
      for (const i of ring) for (const d of [...nb, cols + 1, cols - 1, -cols + 1, -cols - 1]) {
        const j = i + d;
        if (j < 0 || j >= N || Math.abs((j % cols) - (i % cols)) > 1 || owner[j] >= 0) continue;
        owner[j] = owner[i]; out[j] = step; next.push(j);
        const src = cells[owner[i]];
        halo.push({ x: j % cols, y: Math.floor(j / cols), h: [0.2, 0.08][step - 1] * (0.8 + 0.4 * r()), din: src.din, dout: src.dout, j: src.j });
      }
      ring.length = 0; ring.push(...next);
    }
    cells.halo = halo;
  }

  function build() {
    if (!cols || !rows) return;
    scratch.setTransform(1, 0, 0, 1, 0, 0);
    scratch.font = fontAt(glyphOf(rows));
    const room = cols * 0.88;
    frames = items.flatMap((line) => balanceLine(String(line).split(/\s+/).filter(Boolean), (s) => scratch.measureText(s).width, room))
      .map((text) => { const cells = rasterize(text, hash(text)); return { text, cells, ghost: cells.ghost || [], halo: cells.halo || [] }; });
    if (at >= frames.length) at = 0;
  }

  function timing() {
    const total = Math.max(fx.timing ? 3.6 : 2.4, seconds);
    return fx.timing ? { total, ...fx.timing(total) } : { total, inEnd: 1.2, outStart: total - 0.85 };
  }

  function drawGrid() {
    if (!grid) return;
    if (!gridLayer) {
      gridLayer = doc.createElement('canvas');
      gridLayer.width = canvas.width; gridLayer.height = canvas.height;
      const g = gridLayer.getContext('2d');
      g.scale(dpr, dpr); g.fillStyle = INK; g.globalAlpha = glass ? 0.06 : 0.14;
      const d = Math.max(0.8, pitch * 0.24), ox = (W - cols * pitch) / 2, oy = (H - rows * pitch) / 2;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) g.fillRect(ox + x * pitch + pitch / 2 - d / 2, oy + y * pitch + pitch / 2 - d / 2, d, d);
    }
    ctx.drawImage(gridLayer, 0, 0);
  }

  /** The opening: the grid fades up behind a soft diagonal wave of brighter dots. */
  function drawIntroFrame(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (grid) { ctx.globalAlpha = Math.min(1, t / (INTRO * 0.6)); drawGrid(); ctx.globalAlpha = 1; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = INK;
    const full = pitch * 0.8, dot = Math.max(0.8, pitch * 0.24), ox = (W - cols * pitch) / 2, oy = (H - rows * pitch) / 2;
    const span = INTRO - 0.45;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const front = span * (0.85 * (x / cols) + 0.15 * (y / rows));
      const k = (t - front) / 0.45;
      if (k <= 0 || k >= 1) continue;
      const b = Math.sin(Math.PI * k) * (0.55 + 0.45 * ((x * 7 + y * 13) % 5) / 4);
      const s = dot + (full - dot) * b * 0.8;
      ctx.globalAlpha = 0.14 + 0.6 * b;
      ctx.fillRect(ox + x * pitch + pitch / 2 - s / 2, oy + y * pitch + pitch / 2 - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function drawFrame(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    const f = frames[at];
    if (!f) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = INK;
    const T = timing(), full = pitch * 0.8, dot = Math.max(0.8, pitch * 0.24), ox = (W - cols * pitch) / 2, oy = (H - rows * pitch) / 2;
    if (fx.draw && !reduce) {
      // Effects that draw for themselves go over a clear canvas, with the grid put behind afterwards.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fx.draw({ ctx, pitch, cols, rows, dot, full, b: (c) => (glass ? c.b ?? 1 : 1), at: (c) => [ox + c.x * pitch + pitch / 2, oy + c.y * pitch + pitch / 2] }, f, t, T);
      if (grid && gridLayer) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'destination-over'; ctx.drawImage(gridLayer, 0, 0); ctx.globalCompositeOperation = 'source-over'; }
      return;
    }
    for (const c of f.cells) {
      const k = reduce ? 1 : fx.size(c, t, T);
      if (k <= 0.01) continue;
      const s = dot + (full - dot) * Math.min(1.12, k) * (c.w ?? 1);
      ctx.globalAlpha = Math.min(1, 0.16 + 0.84 * Math.min(1, k)) * (glass ? c.b ?? 1 : 1);
      cell(ox + c.x * pitch + pitch / 2, oy + c.y * pitch + pitch / 2, s);
    }
    if (glass) for (const c of f.halo) {
      const k = reduce ? 1 : fx.size ? fx.size(c, t, T) : 1;
      if (k <= 0.05) continue;
      const s = full * Math.min(1, k);
      ctx.globalAlpha = c.h * Math.min(1, k);
      cell(ox + c.x * pitch + pitch / 2, oy + c.y * pitch + pitch / 2, s);
    }
    ctx.globalAlpha = 1;
  }

  /** The idle animation, fading up over a second. */
  function drawIdleFrame(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = INK;
    const fade = Math.min(1, t / 1.2), ts = t * idleSpeed;
    const full = pitch * 0.8, dot = Math.max(0.8, pitch * 0.24), ox = (W - cols * pitch) / 2, oy = (H - rows * pitch) / 2;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = idleFx.level(x, y, ts, cols, rows) * fade;
      if (k <= 0.03) continue;
      const s = dot + (full - dot) * k;
      ctx.globalAlpha = 0.14 + 0.8 * k;
      ctx.fillRect(ox + x * pitch + pitch / 2 - s / 2, oy + y * pitch + pitch / 2 - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  /** A lit cell: a square, with softened corners on the glass look. */
  function cell(cx, cy, s) {
    if (glass && s > 2.2 && ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx - s / 2, cy - s / 2, s, s, s * 0.22); ctx.fill(); }
    else ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
  }

  /** Light the canvas from the light layer: a wide cool bloom, a tighter glow, the cells, and grain. */
  function present() {
    const w = canvas.width, h = canvas.height;
    lightCtx.setTransform(1, 0, 0, 1, 0, 0);
    // a faint cool cast on the cells themselves (the brightest stay near white)
    lightCtx.globalCompositeOperation = 'source-atop'; lightCtx.globalAlpha = 0.28; lightCtx.fillStyle = '#9DB8FF'; lightCtx.fillRect(0, 0, w, h);
    lightCtx.globalCompositeOperation = 'source-over'; lightCtx.globalAlpha = 1;
    for (const [c, g] of [[glowA, glowACtx], [glowB, glowBCtx]]) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
      g.imageSmoothingEnabled = true; g.drawImage(light, 0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.65; g.fillStyle = '#4F7DFF'; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
    main.setTransform(1, 0, 0, 1, 0, 0);
    main.clearRect(0, 0, w, h);
    main.imageSmoothingEnabled = true;
    main.globalCompositeOperation = 'lighter';
    main.globalAlpha = 0.85; main.drawImage(glowB, 0, 0, w, h);
    main.globalAlpha = 0.7; main.drawImage(glowA, 0, 0, w, h);
    main.globalAlpha = 1; main.drawImage(light, 0, 0);
    if (!grain) {
      grain = doc.createElement('canvas'); grain.width = Math.max(1, Math.round(w / 2)); grain.height = Math.max(1, Math.round(h / 2));
      const g = grain.getContext('2d'), img = g.createImageData(grain.width, grain.height), rr = rng(7);
      for (let i = 0; i < img.data.length; i += 4) { const v = rr() * 255; img.data[i] = v * 0.8; img.data[i + 1] = v * 0.88; img.data[i + 2] = v; img.data[i + 3] = 255; }
      g.putImageData(img, 0, 0);
    }
    main.globalAlpha = 0.045; main.drawImage(grain, 0, 0, w, h);
    main.globalAlpha = 1; main.globalCompositeOperation = 'source-over';
  }

  /** Every drawing goes through here: straight onto the canvas, or onto the light layer for glass. */
  function paint(fn) {
    if (!glass) return fn();
    ctx = lightCtx; fn(); ctx = main; present();
  }
  const draw = (t) => paint(() => drawFrame(t));
  const drawIntro = (t) => paint(() => drawIntroFrame(t));
  const drawIdle = (t) => paint(() => drawIdleFrame(t));

  /** The next frame to show, or -1 to idle. */
  function nextFrame() {
    if (!frames.length) return idleFx ? -1 : 0;
    if (!idleFx) return (at + 1) % frames.length;
    for (let i = 1; i <= frames.length; i++) { const j = (at + i) % frames.length; if (!shown.has(frames[j].text)) return j; }
    return -1;
  }

  function loop(now) {
    raf = 0;
    if (stopped) return;
    if (intro) {
      if (!fontReady) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); if (visible && !doc.hidden) raf = win.requestAnimationFrame(loop); return; }
      if (introT0 < 0) introT0 = now;
      const it = (now - introT0) / 1000;
      if (it < INTRO) { drawIntro(it); if (visible && !doc.hidden) raf = win.requestAnimationFrame(loop); return; }
      intro = false; t0 = now;
    }
    if (idle) {
      if (idleT0 < 0) idleT0 = now;
      drawIdle((now - idleT0) / 1000);
      if (visible && !doc.hidden) raf = win.requestAnimationFrame(loop);
      return;
    }
    const T = timing();
    let t = (now - t0) / 1000;
    if (frames[at]) shown.add(frames[at].text);
    if (t >= T.total + 0.25) {
      const n = nextFrame();
      if (n < 0) { idle = true; idleT0 = now; drawIdle(0); if (visible && !doc.hidden) raf = win.requestAnimationFrame(loop); return; }
      at = n; t0 = now; t = 0;
    }
    draw(Math.min(t, T.total));
    if (visible && !doc.hidden) raf = win.requestAnimationFrame(loop);
  }
  const wake = () => { if (!raf && !stopped && visible && !doc.hidden) { t0 = win.performance.now() - (reduce ? 0 : 0); raf = win.requestAnimationFrame(loop); } };

  // Reduced motion: each frame shows whole, and they change in place.
  let still = 0;
  function startStill() { win.clearInterval(still); draw(0); still = win.setInterval(() => {
    if (frames[at]) shown.add(frames[at].text);
    const n = nextFrame();
    if (n < 0) { win.clearInterval(still); paint(() => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); drawGrid(); }); return; }
    at = n; draw(0);
  }, Math.max(2400, seconds * 1000)); }

  measure(); build();
  const ro = new win.ResizeObserver(() => { const w = W, h = H; measure(); if (Math.abs(W - w) > 1 || Math.abs(H - h) > 1) { build(); if (reduce) draw(0); } });
  ro.observe(canvas);
  let io = null;
  if ('IntersectionObserver' in win) { io = new win.IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible && !reduce) wake(); }); io.observe(canvas); }
  const onVis = () => { if (!doc.hidden && !reduce) wake(); };
  doc.addEventListener('visibilitychange', onVis);
  // The display font may still be loading: draw again once it's there.
  doc.fonts?.ready.then(() => { fontReady = true; if (!stopped) { build(); if (reduce) draw(0); } });
  if (reduce) startStill(); else wake();

  return {
    setLines(next) {
      const sig = next.map(sentenceCase).join('|');
      if (sig === items.join('|')) return;
      items = next.map(sentenceCase); build();
      // Lines that haven't shown yet (the visitor number arrives late) get their turn, then it idles again.
      if (idle) { const j = frames.findIndex((f) => !shown.has(f.text)); if (j >= 0) { idle = false; at = j; t0 = win.performance.now(); } }
      if (reduce) draw(0);
    },
    stop() { stopped = true; if (raf) win.cancelAnimationFrame(raf); win.clearInterval(still); ro.disconnect(); io?.disconnect(); doc.removeEventListener('visibilitychange', onVis); },
  };
}
