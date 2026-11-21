/* Glass in front of the dot board (the "Glass block" and "Liquid glass" looks): the board draws as
   usual onto a light layer, and this paints that light onto the canvas through a bar of square glass
   with WebGL 2. Each square bends what's behind it (towards its rim, so the words stay readable),
   the light glows through and spills into its neighbours, and a shimmer sweeps across.
   Clarity lays a crisp copy of the light over the bent one. Returns null without WebGL 2, so the
   board falls back to the flat look. */

const VS = `#version 300 es
in vec2 p; out vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0, 1); }`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D S; uniform vec2 R; uniform float T, CELL, REF, RIB, SHIM, MODE, LOD, CL;
in vec2 v; out vec4 o;
vec3 src(vec2 uv, float lod){ return textureLod(S, clamp(uv, vec2(0.), vec2(1.)), lod).rgb; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 px = v * R;
  vec2 cid = floor(px / CELL), l = fract(px / CELL) - .5, cc = (cid + .5) * CELL;
  float edge = max(abs(l.x), abs(l.y));
  // the shimmer: a soft diagonal band sweeping across
  float pos = mod(T * .16 * SHIM, 1.7) - .35;
  float d = (v.x + (v.y - .5) * .18) - pos, sh = SHIM > 0. ? exp(-d * d / .0035) : 0.;
  // clarity: squares bend only towards their rims, and a crisp copy of the light goes over the bent one
  float lens = mix(1., smoothstep(.18, .5, edge), CL);
  vec3 sharp = src(v, 0.), glow = src(cc / R, LOD), halo = src(v, LOD + 2.);
  vec3 col;
  if (MODE < .5) {
    // glass block: magnified, ribbed squares; bevels catch the light; a touch of colour split
    vec2 rib = vec2(sin(l.x * 6.2832 * RIB), sin(l.y * 6.2832 * RIB)) * .07 * CELL;
    vec2 s = mix(px, cc + l * CELL * (1. - REF) + rib * (.6 + sh * 1.2), lens);
    vec2 ca = l * CELL * .06 / R;
    vec3 c = vec3(src(s / R + ca, 0.).r, src(s / R, 0.).g, src(s / R - ca, 0.).b);
    float rim = smoothstep(.36, .5, edge), seam = smoothstep(.465, .5, edge);
    col = c * .85 + glow * 1.6 * .45 + halo * .9 * .35;
    col += rim * (glow * 1.6 * .9 + .025) * (.6 + .4 * sin((l.x - l.y) * 3.));
    col *= 1. - seam * .7;
    col += sh * (.06 + .25 * rim) + .018;
    col = mix(col, max(col, sharp * (1.05 - .25 * rim) + glow * .25), CL);
    col *= vec3(.86, .93, 1.06);
  } else {
    // liquid glass: soft rounded squares; the light swims and catches caustic edges; cool aqua
    vec2 w = vec2(sin(l.y * 7. + T * .7 + cid.x * 1.7 + hash(cid) * 6.), cos(l.x * 6. - T * .55 + cid.y * 2.1));
    vec2 s = mix(px, cc + l * CELL * (1. - REF) + w * CELL * .045 * RIB * (1. + sh), lens);
    vec3 c = src(s / R, 0.);
    float box = length(max(abs(l) - .3, 0.)) - .14;
    float body = 1. - smoothstep(-.01, .03, box);
    float caustic = pow(max(0., sin((l.x * l.y) * 26. + T * .9 + hash(cid) * 9.)), 10.) * .5;
    float lip = smoothstep(-.06, 0., box) * body;
    col = (c * .9 + glow * 1.3 * .4) * body + halo * .7 * .4;
    col += (caustic + lip * .6) * (glow * 1.3 + .05);
    col += sh * .22 * body;
    col = mix(col, max(col, sharp * (.95 + .1 * body) + glow * .16), CL);
    col *= vec3(.55, .95, 1.02);
    col += vec3(0., .02, .025) * body;
  }
  o = vec4(col, 1.);
}`;

/** The look's settings, with the defaults chosen in the studies (22 Nov 2026). */
export const LENS_DEFAULTS = { clarity: 0.65, cell: 18, refract: 0.3, wobble: 1.5, ribs: 3, shimmer: 0.7 };

/**
 * Set up glass on a canvas (before anything else takes the canvas's context). mode: "glassblock" or
 * "liquid". Returns { resize(w, h), render(source, seconds, opts, dpr) } or null.
 */
export function createLens(canvas, mode) {
  let gl = null;
  try { gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true }); } catch { gl = null; }
  if (!gl) return null;
  const shader = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const u = Object.fromEntries(['S', 'R', 'T', 'CELL', 'REF', 'RIB', 'SHIM', 'MODE', 'LOD', 'CL'].map((n) => [n, gl.getUniformLocation(pr, n)]));
  const liquid = mode === 'liquid';
  return {
    resize(w, h) { gl.viewport(0, 0, w, h); },
    render(source, t, o, dpr = 1) {
      const cell = Math.max(4, (o.cell ?? LENS_DEFAULTS.cell) * dpr);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.uniform1i(u.S, 0); gl.uniform2f(u.R, canvas.width, canvas.height); gl.uniform1f(u.T, t);
      gl.uniform1f(u.CELL, cell); gl.uniform1f(u.REF, o.refract ?? LENS_DEFAULTS.refract);
      gl.uniform1f(u.RIB, liquid ? (o.wobble ?? LENS_DEFAULTS.wobble) : (o.ribs ?? LENS_DEFAULTS.ribs));
      gl.uniform1f(u.SHIM, o.shimmer ?? LENS_DEFAULTS.shimmer); gl.uniform1f(u.MODE, liquid ? 1 : 0);
      gl.uniform1f(u.LOD, Math.log2(cell) - 0.3); gl.uniform1f(u.CL, o.clarity ?? LENS_DEFAULTS.clarity);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
