/* The dot board: an alternative to the scrolling ticker. Each line is drawn in square dots on the
   dark strip; the dots breathe in out of a faint grid (a soft sweep, a slight overshoot), hold with
   a gentle breathe, then shrink back before the next line comes in. Long lines are split at word
   breaks into frames that fit. Used by the site (hero.js) and the editor's frames (AoostHero.tsx),
   so it only touches the canvas's own document and window. More animations plug into EFFECTS. */

const INK = '#F2F1EA';

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
 * Start a dot board on a canvas that fills its strip. Options: lines (strings), seconds per frame,
 * grid (the faint dot grid behind), effect (a key of EFFECTS). Returns { setLines, stop }.
 */
export function startDotBoard(canvas, { lines = [], seconds = 4, grid = true, effect = 'breathe' } = {}) {
  const doc = canvas.ownerDocument, win = doc.defaultView;
  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = EFFECTS[effect] || EFFECTS.breathe;
  const ctx = canvas.getContext('2d');
  const scratch = doc.createElement('canvas').getContext('2d', { willReadFrequently: true });
  let W = 0, H = 0, dpr = 1, pitch = 6, cols = 0, rows = 0, gridLayer = null;
  let items = lines.slice(), frames = [], at = 0, t0 = 0, raf = 0, visible = true, stopped = false;
  const family = () => (win.getComputedStyle(canvas).getPropertyValue('--display') || '').trim() || 'ui-sans-serif, system-ui, sans-serif';
  const fontAt = (fs) => `600 ${fs}px ${family()}`;

  function measure() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, win.devicePixelRatio || 1);
    pitch = W < 600 ? 4.5 : W < 1100 ? 5.5 : 6;
    cols = Math.floor(W / pitch); rows = Math.floor(H / pitch);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gridLayer = null;
  }

  /** One frame of text as lit cells: drawn at one pixel per cell, then read back. */
  function rasterize(text, seed) {
    const glyph = Math.max(7, Math.round(rows * 0.72));
    scratch.canvas.width = cols; scratch.canvas.height = rows;
    let fs = glyph;
    scratch.font = fontAt(fs);
    const room = cols * 0.88;
    while (fs > Math.max(6, glyph * 0.6) && scratch.measureText(text).width > room) { fs -= 1; scratch.font = fontAt(fs); }
    scratch.clearRect(0, 0, cols, rows);
    scratch.fillStyle = '#000'; scratch.textAlign = 'center'; scratch.textBaseline = 'middle';
    scratch.fillText(text, cols / 2, rows / 2 + fs * 0.06);
    const data = scratch.getImageData(0, 0, cols, rows).data;
    const cells = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (data[(y * cols + x) * 4 + 3] > 105) cells.push({ x, y });
    return fx.delays(cells, cols, rng(seed));
  }

  function build() {
    if (!cols || !rows) return;
    scratch.font = fontAt(Math.max(7, Math.round(rows * 0.72)));
    const room = cols * 0.88;
    frames = items.flatMap((line) => balanceLine(String(line).split(/\s+/).filter(Boolean), (s) => scratch.measureText(s).width, room))
      .map((text) => ({ text, cells: rasterize(text, hash(text)) }));
    if (at >= frames.length) at = 0;
  }

  function timing() {
    const total = Math.max(2.4, seconds);
    return { total, inEnd: 1.2, outStart: total - 0.85 };
  }

  function drawGrid() {
    if (!grid) return;
    if (!gridLayer) {
      gridLayer = doc.createElement('canvas');
      gridLayer.width = canvas.width; gridLayer.height = canvas.height;
      const g = gridLayer.getContext('2d');
      g.scale(dpr, dpr); g.fillStyle = INK; g.globalAlpha = 0.16;
      const d = 1.1, ox = (W - cols * pitch) / 2, oy = (H - rows * pitch) / 2;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) g.fillRect(ox + x * pitch + pitch / 2 - d / 2, oy + y * pitch + pitch / 2 - d / 2, d, d);
    }
    ctx.drawImage(gridLayer, 0, 0);
  }

  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    const f = frames[at];
    if (!f) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = INK;
    const T = timing(), full = pitch * 0.74, dot = 1.1, ox = (W - cols * pitch) / 2, oy = (H - rows * pitch) / 2;
    for (const c of f.cells) {
      const k = reduce ? 1 : fx.size(c, t, T);
      if (k <= 0.01) continue;
      const s = dot + (full - dot) * Math.min(1.12, k);
      ctx.globalAlpha = Math.min(1, 0.16 + 0.84 * Math.min(1, k));
      ctx.fillRect(ox + c.x * pitch + pitch / 2 - s / 2, oy + c.y * pitch + pitch / 2 - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    raf = 0;
    if (stopped) return;
    const T = timing();
    let t = (now - t0) / 1000;
    if (t >= T.total + 0.25) { at = frames.length ? (at + 1) % frames.length : 0; t0 = now; t = 0; }
    draw(Math.min(t, T.total));
    if (visible && !doc.hidden) raf = win.requestAnimationFrame(loop);
  }
  const wake = () => { if (!raf && !stopped && visible && !doc.hidden) { t0 = win.performance.now() - (reduce ? 0 : 0); raf = win.requestAnimationFrame(loop); } };

  // Reduced motion: each frame shows whole, and they change in place.
  let still = 0;
  function startStill() { win.clearInterval(still); draw(0); still = win.setInterval(() => { at = frames.length ? (at + 1) % frames.length : 0; draw(0); }, Math.max(2400, seconds * 1000)); }

  measure(); build();
  const ro = new win.ResizeObserver(() => { const w = W, h = H; measure(); if (Math.abs(W - w) > 1 || Math.abs(H - h) > 1) { build(); if (reduce) draw(0); } });
  ro.observe(canvas);
  let io = null;
  if ('IntersectionObserver' in win) { io = new win.IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible && !reduce) wake(); }); io.observe(canvas); }
  const onVis = () => { if (!doc.hidden && !reduce) wake(); };
  doc.addEventListener('visibilitychange', onVis);
  // The display font may still be loading: draw again once it's there.
  doc.fonts?.ready.then(() => { if (!stopped) { build(); if (reduce) draw(0); } });
  if (reduce) startStill(); else wake();

  return {
    setLines(next) {
      const sig = next.join('|');
      if (sig === items.join('|')) return;
      items = next.slice(); build();
      if (reduce) draw(0);
    },
    stop() { stopped = true; if (raf) win.cancelAnimationFrame(raf); win.clearInterval(still); ro.disconnect(); io?.disconnect(); doc.removeEventListener('visibilitychange', onVis); },
  };
}
