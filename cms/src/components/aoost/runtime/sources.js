/*
 * Right-sized pictures for the site's own scripts: the same choice as render/media.ts imageSources.
 * The build makes 480/960/1600 px WebP copies of everything under /art (scripts/build-site.ts) and
 * uploads carry 480–2400 px WebP copies (worker/media.ts), so a phone no longer loads the original.
 * Keep the two in step.
 */
const RASTER=/\.(jpe?g|png|webp|avif)$/i,STATIC=[480,960,1600],UPLOAD=[480,960,1600,2400];
const variant=(src,w)=>src.replace(/\.[a-z]+$/i,`.${w}.webp`);
export function sources(src){
  if(!src)return {src};
  if(src.startsWith('/art/')&&RASTER.test(src)&&!/\.\d+\.webp$/.test(src))return {src:variant(src,960),srcset:STATIC.map(w=>`${variant(src,w)} ${w}w`).join(', ')};
  if(src.startsWith('/media/')&&RASTER.test(src))return {src:`${src}?w=960`,srcset:UPLOAD.map(w=>`${src}?w=${w} ${w}w`).join(', ')};
  return {src};
}
/** Point an <img> at the right size for how wide it's drawn (`sizes`, as in HTML). */
export function setSources(img,src,sizes){const s=sources(src);if(s.srcset){img.sizes=sizes;img.srcset=s.srcset;}img.src=s.src;}
/** The same, as attributes for markup built as text. */
export function sourceAttrs(src,sizes,esc){const s=sources(src);return `src="${esc(s.src)}"`+(s.srcset?` srcset="${esc(s.srcset)}" sizes="${esc(sizes)}"`:'');}
