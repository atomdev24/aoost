/* The hero's opening: the screen tunes in. A blank screen in the screen's dark tone; one dot
   lights; the clover builds itself out of dots (lit by the metal fixture's own shading, like the
   dot board); it squashes into one row of dots that fuses into a bright line; the line runs out
   to both edges and opens up and down onto the artwork, a little overexposed, then settles
   (a CRT switching on). Drawn on a canvas inside .hr-intro, under the matte screen, so the glass
   is over it too. Returns a promise that resolves when the artwork is showing (the reel waits). */

const CLOVER = '/art/aoost_clover_symbol_shaded_360.png';
const SEEN = 'aoost.intro.seen';
/** Seconds: when each part starts. */
export const T = { dot: 0.55, clover: 1.3, hold: 2.35, collapse: 2.85, lines: 3.75, art: 4.55, settle: 5.4, end: 6.2 };

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ph = (t, a, b) => clamp((t - a) / (b - a));
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eout = (x) => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, t) => a + (b - a) * t;

/** Should it play now? Not with reduced motion; "session" only once per visit. Marks it seen. */
export function shouldPlay(mode, win = window) {
  if (!mode || mode === 'off') return false;
  if (win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (mode === 'session') {
    try {
      if (win.sessionStorage.getItem(SEEN) === '1') return false;
      win.sessionStorage.setItem(SEEN, '1');
    } catch { /* storage blocked: play */ }
  }
  return true;
}

export function startIntro(header) {
  const cover = header && header.querySelector('.hr-intro');
  if (!cover) return null;
  const finish = () => { header.classList.remove('is-intro'); cover.remove(); };
  if (!shouldPlay(header.dataset.intro)) { finish(); return null; }

  const tone = getComputedStyle(header).getPropertyValue('--sc-tone').trim() || '#000';
  cover.classList.add('is-playing');
  const cv = document.createElement('canvas');
  cover.appendChild(cv);
  const ctx = cv.getContext('2d');
  const [glow, gctx] = (() => { const c = document.createElement('canvas'); return [c, c.getContext('2d')]; })();
  const [grid, grctx] = (() => { const c = document.createElement('canvas'); return [c, c.getContext('2d')]; })();
  let W = 0, H = 0, dpr = 1, P = 7, S = 300, cols = 0, rows = 0, mask = [];
  const img = new Image();
  img.decoding = 'async';
  img.src = CLOVER;

  function measure() {
    const r = header.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    glow.width = Math.max(1, Math.round(W / 4)); glow.height = Math.max(1, Math.round(H / 4));
    S = Math.min(H * 0.72, W * 0.8);
    P = Math.max(4, Math.round(S / 46));
    cols = Math.ceil(W / P); rows = Math.ceil(H / P);
    // the faint dot grid, like the ticker's board
    grid.width = cv.width; grid.height = cv.height;
    grctx.setTransform(dpr, 0, 0, dpr, 0, 0); grctx.clearRect(0, 0, W, H);
    grctx.fillStyle = 'rgba(242,241,234,.055)';
    const ox = (W - cols * P) / 2, oy = (H - rows * P) / 2;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) grctx.fillRect(ox + x * P + P / 2 - 1, oy + y * P + P / 2 - 1, 2, 2);
    buildMask();
  }
  /** The clover as cells: how strongly each is covered, and how bright the metal is there. */
  function buildMask() {
    mask = [];
    if (!img.complete || !img.naturalWidth) return;
    const n = Math.max(8, Math.round(S / P)), c = document.createElement('canvas');
    c.width = c.height = n;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, n, n);
    const d = x.getImageData(0, 0, n, n).data;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = (j * n + i) * 4, a = d[k + 3] / 255;
      if (a > 0.08) mask.push({ x: i - (n - 1) / 2, y: j - (n - 1) / 2, a, l: d[k] / 255 });
    }
  }

  function bar(half, alpha) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(210,200,255,.9)'; ctx.shadowBlur = 24; ctx.fillStyle = '#fff';
    ctx.fillRect(W / 2 - half, H / 2 - 1.5, half * 2, 3);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const barHalf0 = S * 0.45;
    if (t < T.art) {
      ctx.fillStyle = tone; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(grid, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // one dot
    if (t < T.clover) {
      const e = eout(ph(t, T.dot, T.dot + 0.45)), fl = 0.85 + 0.15 * Math.sin(t * 70);
      if (e > 0) {
        const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 34 * e + 1);
        g.addColorStop(0, `rgba(225,215,255,${0.5 * e * fl})`); g.addColorStop(1, 'rgba(225,215,255,0)');
        ctx.fillStyle = g; ctx.fillRect(W / 2 - 50, H / 2 - 50, 100, 100);
        const s = P * 0.8 * e; ctx.fillStyle = `rgba(245,242,255,${e * fl})`; ctx.fillRect(W / 2 - s / 2, H / 2 - s / 2, s, s);
      }
    }
    // the clover in dots, squashing into one row
    if (t >= T.clover && t < T.lines) {
      const squash = eio(ph(t, T.collapse, T.lines - 0.15));
      ctx.globalCompositeOperation = 'lighter';
      for (const c of mask) {
        const dist = Math.hypot(c.x, c.y);
        const arrive = eout(ph(t, T.clover + dist * 0.016, T.clover + dist * 0.016 + 0.35));
        if (arrive <= 0) continue;
        const breathe = t > T.hold && t < T.collapse ? 1 + 0.06 * Math.sin((t - T.hold) * 9 + dist * 0.4) : 1;
        const px = W / 2 + c.x * P * (1 + squash * 0.45), py = H / 2 + c.y * P * (1 - squash);
        const lum = (0.18 + 0.82 * c.l * c.l) * c.a * (1 + squash * 1.6);
        const s = P * (0.5 + 0.3 * c.l) * arrive * breathe * (1 - squash * 0.45);
        ctx.globalAlpha = clamp(lum * arrive);
        ctx.fillStyle = `rgb(${lerp(225, 255, c.l) | 0},${lerp(220, 250, c.l) | 0},255)`;
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // a soft bloom on the light, like the glass board (blurred at a quarter size)
      gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.clearRect(0, 0, glow.width, glow.height);
      gctx.filter = 'blur(3px)'; gctx.drawImage(cv, 0, 0, glow.width, glow.height); gctx.filter = 'none';
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22; ctx.drawImage(glow, 0, 0, W, H);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (t >= T.collapse + 0.35) bar(barHalf0, eio(ph(t, T.collapse + 0.35, T.lines)));
    }
    // the line runs out to both edges
    if (t >= T.lines && t < T.art) bar(lerp(barHalf0, W / 2 + 30, eio(ph(t, T.lines, T.art))), 1);
    // it opens up and down onto the artwork, overexposed, then settles
    if (t >= T.art) {
      const o = eio(ph(t, T.art, T.settle)), bh = Math.max(3, H * o), top = H / 2 - bh / 2;
      ctx.clearRect(0, 0, W, H);
      if (o < 1) { ctx.fillStyle = tone; ctx.fillRect(0, 0, W, top); ctx.fillRect(0, top + bh, W, H - top - bh); }
      const over = 1 - eout(ph(t, T.art, T.settle + 0.6));
      if (over > 0) { ctx.globalAlpha = over * 0.45; ctx.fillStyle = '#c9c2ff'; ctx.fillRect(0, top, W, bh); ctx.globalAlpha = 1; }
      if (o < 1) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - o; ctx.fillStyle = '#fff'; ctx.shadowColor = '#d8d0ff'; ctx.shadowBlur = 20;
        ctx.fillRect(0, top - 1, W, 2); ctx.fillRect(0, top + bh - 1, W, 2);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      const sl = 1 - ph(t, T.settle, T.end);
      if (sl > 0) { ctx.globalAlpha = 0.2 * sl; ctx.fillStyle = '#000'; for (let y = top; y < top + bh; y += 3) ctx.fillRect(0, y, W, 1); ctx.globalAlpha = 1; }
    }
  }

  return new Promise((resolve) => {
    let t0 = -1, raf = 0, shown = false, ended = false;
    const end = () => {
      if (ended) return; ended = true;
      cancelAnimationFrame(raf); window.removeEventListener('resize', measure); finish(); resolve();
    };
    const step = (now) => {
      if (t0 < 0) t0 = now;
      // a hidden tab: jump to the end rather than play to nobody
      if (document.hidden) return end();
      const t = (now - t0) / 1000;
      draw(t);
      if (!shown && t >= T.settle - 0.3) { shown = true; header.classList.remove('is-intro'); }
      if (t >= T.end) return end();
      raf = requestAnimationFrame(step);
    };
    const go = () => { measure(); raf = requestAnimationFrame(step); };
    window.addEventListener('resize', measure);
    // wait for the clover (it's small), but never long: without it the dot goes straight to the line
    if (img.complete && img.naturalWidth) go();
    else { let started = false; const once = () => { if (!started) { started = true; go(); } }; img.onload = once; img.onerror = once; setTimeout(once, 700); }
  });
}
