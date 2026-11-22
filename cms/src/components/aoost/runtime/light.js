/*
 * Journals window light: the strip of sunlight drawn directly below the Projects window shadow,
 * at the same scale, lined up from layout so the light lines carry on across the gap.
 *
 * The Projects shadow (.board-shadow, AoostProjects) sizes its picture with
 * background-size:max(var(--sh-s) * 1cqw, 100cqh) and places it at var(--sh-x) var(--sh-y) inside
 * its own box. That box is clipped at its bottom edge, so the picture can run on below it. Each
 * Journals piece repeats that exact geometry: the Projects picture (for any part that runs below
 * the box) and, right under it, the second window's strip. Both pieces are measured against the
 * page, so the gap between the sections can be any size.
 */
const loaded = {};
function ratioOf(src) {
  if (!loaded[src]) loaded[src] = new Promise((res) => { const im = new Image(); im.onload = () => res(im.naturalHeight / im.naturalWidth || 1); im.onerror = () => res(1); im.src = src; });
  return loaded[src];
}
const urlOf = (bg) => (/url\(["']?([^"')]+)["']?\)/.exec(bg || '') || [])[1] || '';

export function initWindowLight() {
  const pieces = [...document.querySelectorAll('.jr-light')];
  if (!pieces.length) return;
  const shadow = document.querySelector('.board-shadow[data-shadow="window"]');
  if (!shadow) return; // only the window preset has a second window to continue
  const pShade = urlOf(shadow.querySelector('.sh-shade')?.style.backgroundImage);
  const pSun = urlOf(shadow.querySelector('.sh-sun')?.style.backgroundImage);
  const sShade = pieces[0].dataset.shade, sSun = pieces[0].dataset.sun, sRatio = +pieces[0].dataset.ratio || 0.55;
  const gap = pieces.find((p) => p.classList.contains('jl-gap')), room = pieces.find((p) => p.classList.contains('jl-room'));
  const block = (gap || room).closest('.ao-b');
  let pRatio = 1;

  function place() {
    const css = getComputedStyle(shadow);
    const sb = shadow.getBoundingClientRect(), y0 = scrollY;
    const s = parseFloat(css.getPropertyValue('--sh-s')) || 110;
    const fx = (parseFloat(css.getPropertyValue('--sh-x')) || 50) / 100, fy = (parseFloat(css.getPropertyValue('--sh-y')) || 40) / 100;
    // the Projects picture, in page pixels (same sums as its CSS)
    const W = Math.max((s / 100) * sb.width, sb.height), Hp = W * pRatio, Hs = W * sRatio;
    const X = sb.left + (sb.width - W) * fx, Y = sb.top + y0 + (sb.height - Hp) * fy;
    const shadowBottom = sb.bottom + y0;
    const bb = block.getBoundingClientRect(), blockTop = bb.top + y0;
    const sec = block.querySelector('.journals'), secTop = sec ? sec.getBoundingClientRect().top + y0 : blockTop;
    const paint = (el, top) => {
      const r = el.getBoundingClientRect(), left = r.left;
      const at = (y) => `${Math.round(X - left)}px ${Math.round(y - top)}px`;
      const size = `${Math.round(W)}px ${Math.round(Hp)}px, ${Math.round(W)}px ${Math.round(Hs)}px`;
      const shade = el.querySelector('.jl-shade'), sun = el.querySelector('.jl-sun');
      shade.style.backgroundImage = `url("${pShade}"), url("${sShade}")`;
      sun.style.backgroundImage = pSun ? `url("${pSun}"), url("${sSun}")` : `none, url("${sSun}")`;
      for (const l of [shade, sun]) { l.style.backgroundSize = size; l.style.backgroundPosition = `${at(Y)}, ${at(Y + Hp)}`; }
      el.classList.add('is-on');
    };
    // gap: from the bottom of the Projects shadow to the top of this section (nothing when they touch)
    if (gap) {
      const h = Math.round(secTop - shadowBottom);
      if (h > 0) {
        gap.style.top = `${Math.round(shadowBottom - blockTop)}px`;
        gap.style.height = `${h}px`;
        // the same strengths as the Projects shadow it continues
        gap.querySelector('.jl-shade').style.opacity = css.getPropertyValue('--sh-k').trim() || '.7';
        gap.querySelector('.jl-sun').style.opacity = css.getPropertyValue('--sh-w').trim() || '.6';
        paint(gap, shadowBottom);
      }
      else gap.classList.remove('is-on');
    }
    if (room && sec) paint(room, secTop);
    // the light now carries on below, so the Projects shadow no longer fades out at its bottom edge
    shadow.classList.add('sh-continued');
  }

  let raf = 0;
  const soon = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
  ratioOf(pShade).then((r) => { pRatio = r; place(); });
  addEventListener('resize', soon, { passive: true });
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(soon); ro.observe(shadow); ro.observe(block); }
  addEventListener('load', soon);
}
