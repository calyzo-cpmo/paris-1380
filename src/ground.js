// Peinture du sol : rues, cours, jardins, cultures (plan de 1380) et campagne alentour.
import * as THREE from 'three';
import { FRAME, layer, polys, EXTRA_ROAD } from './data.js';
import { LU } from './raster.js';
import { WORLD, RIVERS } from './terrain.js';
import { offsetEx, mulberry32 } from './geom.js';
import { VILLAGES, ROADS, BIEVRE, BLOCK, block, hedged, pathed, landKind, woodBlobs, orchardTrees, villageLanes } from './country.js';

export const NEAR = 3600;   // demi-côté de la campagne proche, peinte finement (m)

const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const STREET = [124, 112, 94];
const rgb3 = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
// Teintes d'un mois de mai : blés d'hiver verts, mars plus clairs ou encore en terre, jachères pâturées, prés, vignes, maraîchers, clos.
const KIND = {
  ble: [[100, 128, 64], [110, 136, 68], [120, 138, 72]],
  mars: [[134, 146, 86], [144, 150, 94], [126, 140, 80]],
  jachere: [[136, 128, 92], [124, 126, 86], [144, 134, 98]],
  pre: [[92, 132, 66], [102, 140, 70], [86, 124, 62]],
  vigne: [[126, 128, 84], [118, 124, 80]],
  marais: [[84, 112, 62], [98, 94, 68], [76, 106, 58], [112, 104, 76]],
  clos: [[106, 128, 70], [130, 124, 88], [94, 120, 64], [140, 134, 96]],
  verger: [[102, 130, 68], [96, 126, 64]],
};

function path(ctx, pts, T) {
  ctx.moveTo(T.x(pts[0][0]), T.y(pts[0][1]));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(T.x(pts[i][0]), T.y(pts[i][1]));
  ctx.closePath();
}
function fillPolys(ctx, list, T, style) {
  ctx.fillStyle = style; ctx.beginPath();
  for (const p of list) path(ctx, p.pts || p, T);
  ctx.fill();
}
function strokeLine(ctx, pts, T, style, width) {
  ctx.strokeStyle = style; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(T.x(pts[0][0]), T.y(pts[0][1])); for (const p of pts) ctx.lineTo(T.x(p[0]), T.y(p[1])); ctx.stroke();
}

// Parcellaire : chaque quartier de culture reçoit sa nature (blé, mars, jachère, pré, vigne, marais, clos, verger) puis ses lanières.
// Le dessin ne dépend que des coordonnées du monde : les textures du plan, de la campagne proche et du lointain se raccordent.
export function paintFields(ctx, T, x0, z0, x1, z1, terrain) {
  const k = T.s, R = BLOCK * 1.25, fine = k > 0.35, furrows = k >= 1;
  const i0 = Math.floor(x0 / BLOCK) - 1, i1 = Math.ceil(x1 / BLOCK) + 1, j0 = Math.floor(z0 / BLOCK) - 1, j1 = Math.ceil(z1 / BLOCK) + 1;
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const q = block(i, j), kind = landKind(terrain, q.cx, q.cz, q.h), pal = KIND[kind], r = mulberry32(q.seed), r2 = mulberry32(q.seed ^ 0x9e3779b9);
    ctx.save(); ctx.beginPath(); path(ctx, q.pts, T); ctx.clip();
    ctx.fillStyle = rgb3(pal[0]); ctx.fill();
    ctx.translate(T.x(q.cx), T.y(q.cz)); ctx.rotate(q.ang);
    if (kind === 'pre') {
      for (let n = 0; n < 5; n++) { ctx.fillStyle = rgb3(pal[(r() * pal.length) | 0], 0.55); ctx.beginPath(); ctx.ellipse((r() - 0.5) * R * k, (r() - 0.5) * R * k, (30 + r() * 55) * k, (20 + r() * 40) * k, r() * 3, 0, 6.3); ctx.fill(); }
    } else {
      const [w0, w1] = kind === 'marais' ? [7, 13] : kind === 'clos' ? [9, 19] : kind === 'vigne' ? [18, 34] : kind === 'verger' ? [45, 90] : [11, 30];
      for (let t = -R; t < R;) {
        const w = w0 + r() * (w1 - w0), c = pal[(r() * pal.length) | 0], v = 0.9 + r() * 0.2, q2 = r();
        let col = [c[0] * v, c[1] * v, c[2] * v];
        if (kind === 'mars' && q2 < 0.24) col = [150 * v, 134 * v, 102 * v];          // lanière encore en terre
        else if (kind === 'ble' && q2 < 0.1) col = [142 * v, 150 * v, 90 * v];
        ctx.fillStyle = rgb3(col); ctx.fillRect(-R * k, t * k, 2 * R * k, w * k + 0.6);
        if (fine) { ctx.fillStyle = 'rgba(36,40,22,0.17)'; ctx.fillRect(-R * k, t * k, 2 * R * k, Math.max(0.8, 0.9 * k)); }
        t += w;
      }
      if (fine && kind === 'vigne') { ctx.fillStyle = 'rgba(54,78,42,0.5)'; for (let t = -R; t < R; t += 4.6) ctx.fillRect(-R * k, t * k, 2 * R * k, Math.max(0.9, 1.7 * k)); }       // rangs de ceps
      if (fine && kind === 'marais') { ctx.fillStyle = 'rgba(150,138,108,0.42)'; for (let t = -R + r2() * 30; t < R; t += 26 + r2() * 22) ctx.fillRect(t * k, -R * k, Math.max(0.9, 1.6 * k), 2 * R * k); }   // sentes entre les planches
      if (furrows && (kind === 'ble' || kind === 'mars' || kind === 'jachere')) { ctx.fillStyle = 'rgba(40,34,20,0.09)'; for (let t = -R; t < R; t += 3.2) ctx.fillRect(-R * k, t * k, 2 * R * k, 1); }
    }
    ctx.restore();
    if (kind === 'verger' && fine) { ctx.fillStyle = 'rgba(52,84,40,0.7)'; ctx.beginPath(); for (const [x, z] of orchardTrees(q)) { ctx.moveTo(T.x(x) + 3.4 * k, T.y(z)); ctx.arc(T.x(x), T.y(z), Math.max(1, 3.4 * k), 0, 6.3); } ctx.fill(); }
  }
  // limites des quartiers : haies vives, sentiers d'exploitation, ou simple trait
  const edge = (a, b, style, wd) => { ctx.strokeStyle = style; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(T.x(a[0]), T.y(a[1])); ctx.lineTo(T.x(b[0]), T.y(b[1])); ctx.stroke(); };
  ctx.lineCap = 'round';
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const q = block(i, j).pts;
    for (const [side, a, b] of [[0, q[0], q[1]], [1, q[0], q[3]]]) {
      if (hedged(i, j, side)) edge(a, b, 'rgba(58,88,44,0.8)', Math.max(1, 4.6 * k));
      else if (pathed(i, j, side)) edge(a, b, 'rgba(160,146,114,0.7)', Math.max(0.8, 2.6 * k));
      else edge(a, b, 'rgba(52,62,34,0.2)', Math.max(0.7, 1.1 * k));
    }
  }
}

function noiseOverlay(ctx, w, h, alpha, seed) {
  const n = document.createElement('canvas'); n.width = n.height = 256;
  const c = n.getContext('2d', { willReadFrequently: true }), im = c.createImageData(256, 256), r = mulberry32(seed);
  for (let i = 0; i < 256 * 256; i++) { const v = 96 + r() * 96; im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v * 0.96; im.data[i * 4 + 3] = 255; }
  c.putImageData(im, 0, 0);
  ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ctx.createPattern(n, 'repeat'); ctx.fillRect(0, 0, w, h); ctx.restore();
}

export function paintCoreGround(maxSize, terrain) {
  const fw = FRAME.x1 - FRAME.x0, fh = FRAME.z1 - FRAME.z0;
  const H = Math.min(4096, maxSize), W = Math.round(H * fw / fh);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const s = H / fh;
  const T = { s, x: (x) => (x - FRAME.x0) * s, y: (z) => (z - FRAME.z0) * s };
  ctx.fillStyle = rgb(STREET); ctx.fillRect(0, 0, W, H);
  // Lit du fleuve et grèves
  const water = polys('Eau');
  fillPolys(ctx, water, T, rgb([78, 84, 62]));
  ctx.strokeStyle = rgb([168, 152, 116], 0.55); ctx.lineWidth = 16 * s; ctx.lineJoin = 'round';
  ctx.beginPath(); for (const p of water) path(ctx, p.pts, T); ctx.stroke();
  // Cultures et prés (non bâti, îles, zones hors plan) : parcellaire dessiné à part puis reporté dans les emprises
  const pc = document.createElement('canvas'); pc.width = W; pc.height = H;
  const pctx = pc.getContext('2d', { willReadFrequently: true });
  paintFields(pctx, T, FRAME.x0, FRAME.z0, FRAME.x1, FRAME.z1, terrain);
  const pat = ctx.createPattern(pc, 'no-repeat');
  for (const group of [polys('NonBati', '#E6E6E6'), polys('Cadre', '#E6E6E6'), polys('Berges', '#E6E6E6')]) for (const p of group) { ctx.fillStyle = pat; ctx.beginPath(); path(ctx, p.pts, T); ctx.fill(); }
  pc.width = pc.height = 1;
  fillPolys(ctx, polys('FondCite'), T, rgb(STREET));
  fillPolys(ctx, polys('Berges', '#F2F2F2'), T, rgb([176, 160, 124]));
  // Enclos religieux
  for (const name of ['StVictor', 'Temple', 'StMartin', 'StGermain', 'Religieux']) {
    fillPolys(ctx, polys(name, ['#FFFFFF', '#F8705F']), T, rgb([132, 134, 92]));
    fillPolys(ctx, polys(name, '#3D575D'), T, rgb([88, 118, 62]));
  }
  // Îlots bâtis : cours en terre battue, cœurs d'îlot en jardins
  const blocks = polys('Bati', '#BFBFBF');
  fillPolys(ctx, blocks, T, rgb([112, 101, 86]));
  ctx.fillStyle = rgb([96, 112, 64], 0.85); ctx.beginPath();
  for (const b of blocks) for (const e of offsetEx([b.pts], -15)) { path(ctx, e.outer, T); }
  ctx.fill();
  // Hôtels, collèges, hôpitaux : cours et jardins
  fillPolys(ctx, [...polys('Hotel', '#704D18'), ...polys('Hopital'), ...polys('Cluny'), ...polys('Colleges', '#91CC21')], T, rgb([138, 126, 104]));
  fillPolys(ctx, [...polys('Hotel', '#D6D5BB'), ...polys('Colleges', '#C8E590'), ...polys('Palais', '#99D36A')], T, rgb([92, 122, 64]));
  fillPolys(ctx, polys('Palais', ['#E6E6E6', '#D9D9D9']), T, rgb([140, 130, 108]));
  fillPolys(ctx, polys('Louvre', '#FFFFFF'), T, rgb([140, 130, 108]));
  // Cimetières
  const cem = [...layer('Cimetieres'), ...layer('CimetieresJuifs')].filter((p) => p.kind === 'poly');
  fillPolys(ctx, cem, T, rgb([110, 122, 82]));
  fillPolys(ctx, polys('Halles'), T, rgb([120, 108, 90]));
  // Égout (ruisseau de Ménilmontant)
  ctx.strokeStyle = rgb([70, 84, 70], 0.9); ctx.lineWidth = 3.5 * s; ctx.lineCap = 'round';
  for (const l of layer('Egout')) if (!l.dash && l.pts.length > 1) { ctx.beginPath(); ctx.moveTo(T.x(l.pts[0][0]), T.y(l.pts[0][1])); for (const p of l.pts) ctx.lineTo(T.x(p[0]), T.y(p[1])); ctx.stroke(); }
  // route du faubourg Saint-Jacques (zone hors plan)
  ctx.strokeStyle = rgb(STREET); ctx.lineWidth = 7 * s; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(T.x(EXTRA_ROAD[0][0]), T.y(EXTRA_ROAD[0][1] - 40)); for (const p of EXTRA_ROAD) ctx.lineTo(T.x(p[0]), T.y(p[1])); ctx.stroke();
  noiseOverlay(ctx, W, H, 0.38, 7);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// Campagne : parcellaire, bois, chemins rayonnant depuis les portes, ruisseau, abords des villages.
function paintCountry(N, half, terrain, near) {
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const s = N / (2 * half);
  const T = { s, x: (x) => (x + half) * s, y: (z) => (z + half) * s };
  ctx.fillStyle = rgb([118, 132, 80]); ctx.fillRect(0, 0, N, N);
  paintFields(ctx, T, -half, -half, half, half, terrain);
  // prés humides le long de la Bièvre, puis son filet d'eau
  strokeLine(ctx, BIEVRE, T, 'rgba(92,134,66,0.45)', Math.max(2, 70 * s));
  strokeLine(ctx, BIEVRE, T, rgb([86, 110, 112], 0.95), Math.max(1, 6 * s));
  // sous-bois
  for (const b of woodBlobs()) {
    if (Math.abs(b.x) > half + 200 || Math.abs(b.z) > half + 200) continue;
    ctx.fillStyle = rgb([58 + b.tone * 14 | 0, 84 + b.tone * 16 | 0, 48 + b.tone * 10 | 0], 0.86);
    ctx.beginPath(); ctx.ellipse(T.x(b.x), T.y(b.z), (b.rx + 14) * s, (b.rz + 14) * s, b.rot, 0, 6.3); ctx.fill();
  }
  // terre battue des villages
  for (const v of VILLAGES) { const g = ctx.createRadialGradient(T.x(v[1]), T.y(v[2]), 0, T.x(v[1]), T.y(v[2]), (v[4] * 5.5 + 40) * s); g.addColorStop(0, 'rgba(146,134,106,0.75)'); g.addColorStop(0.6, 'rgba(140,130,102,0.4)'); g.addColorStop(1, 'rgba(140,130,102,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(T.x(v[1]), T.y(v[2]), (v[4] * 5.5 + 40) * s, 0, 6.3); ctx.fill(); }
  // chemins : traverses des villages, puis grands chemins
  for (const l of villageLanes()) strokeLine(ctx, l, T, rgb([152, 138, 108], 0.85), Math.max(1, 4 * s));
  for (const rd of ROADS) { if (near) strokeLine(ctx, rd, T, 'rgba(96,88,66,0.35)', 11 * s); strokeLine(ctx, rd, T, rgb([158, 144, 112], 0.95), Math.max(1.6, 7 * s)); }
  // grèves de la Seine et de la Marne (la campagne proche seulement : le lointain se répète en miroir)
  if (near) for (const [pts, hw] of RIVERS) { strokeLine(ctx, pts, T, rgb([166, 154, 120], 0.9), (2 * hw + 46) * s); strokeLine(ctx, pts, T, rgb([84, 92, 70]), 2 * hw * s); }
  noiseOverlay(ctx, N, N, near ? 0.34 : 0.3, near ? 23 : 21);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  if (!near) tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
  return tex;
}
export function paintOuterGround(terrain, maxSize = 4096) {
  return { far: paintCountry(2048, WORLD, terrain, false), near: paintCountry(Math.min(4096, maxSize), NEAR, terrain, true) };
}

// Texture de détail carrelable (grain du sol), mêlée dans le shader.
export function makeDetailTexture() {
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const ctx = cv.getContext('2d', { willReadFrequently: true }), im = ctx.createImageData(N, N), r = mulberry32(5);
  const base = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) base[i] = r();
  const at = (x, y) => base[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = at(x, y) * 0.5 + (at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1)) * 0.09 + at(x >> 2 << 2, y >> 2 << 2) * 0.14;
    const g = 150 + (v - 0.5) * 150;
    const k = (y * N + x) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = g; im.data[k + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
  return tex;
}

// Pavés : texture carrelable de pierres irrégulières.
export function makeCobbleTexture() {
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const ctx = cv.getContext('2d', { willReadFrequently: true }), r = mulberry32(17);
  ctx.fillStyle = 'rgb(86,78,66)'; ctx.fillRect(0, 0, N, N);
  const G = 10, cell = N / G;
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const x = i * cell + (j % 2 ? cell / 2 : 0) + (r() - 0.5) * 3, y = j * cell + (r() - 0.5) * 3, w = cell - 3.5 + (r() - 0.5) * 3, h = cell - 3.5 + (r() - 0.5) * 3, v = 150 + r() * 70;
    ctx.fillStyle = `rgb(${v | 0},${(v * 0.96) | 0},${(v * 0.88) | 0})`;
    for (const ox of [0, -N, N]) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x + ox + 1.5, y + 1.5, w, h, 5); else ctx.rect(x + ox + 1.5, y + 1.5, w, h); ctx.fill(); }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8;
  return tex;
}

// Masque des voies (2 m par point) : rues de ville pavées, chemins de campagne en terre.
export function makeStreetMask(lu) {
  const step = 2, w = Math.ceil(lu.w / step), h = Math.ceil(lu.h / step), d = new Uint8Array(w * h);
  const urban = (x, z) => { const c = lu.get(x, z); return c === LU.BATI || c === LU.RES || c === LU.COURT; };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = lu.x0 + (i + 0.5) * step, z = lu.z0 + (h - 1 - j + 0.5) * step, c = lu.get(x, z);
    if (c !== LU.OPEN && c !== LU.BRIDGE) continue;
    d[j * w + i] = urban(x + 14, z) || urban(x - 14, z) || urban(x, z + 14) || urban(x, z - 14) || urban(x + 26, z + 26) || urban(x - 26, z - 26) ? 255 : 70;
  }
  const t = new THREE.DataTexture(d, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.unpackAlignment = 1; t.needsUpdate = true;
  return t;
}

export function makeGroundMaterial(map, detail, street, near) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = { value: detail };
    if (street) { sh.uniforms.uMask = { value: street.mask }; sh.uniforms.uCobble = { value: street.cobble }; }
    if (near) { sh.uniforms.uNear = { value: near }; sh.uniforms.uNearHalf = { value: NEAR }; }
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWxz = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;\nuniform sampler2D uDetail;' + (street ? '\nuniform sampler2D uMask;\nuniform sampler2D uCobble;' : '') + (near ? '\nuniform sampler2D uNear;\nuniform float uNearHalf;' : ''))
      .replace('#include <map_fragment>', '#include <map_fragment>\n'
        + (near ? 'vec3 nearCol = texture2D(uNear, vec2(vWxz.x / (2.0 * uNearHalf) + 0.5, 0.5 - vWxz.y / (2.0 * uNearHalf))).rgb;\ndiffuseColor.rgb = mix(nearCol, diffuseColor.rgb, smoothstep(uNearHalf * 0.84, uNearHalf * 0.98, max(abs(vWxz.x), abs(vWxz.y))));\n' : '')
        + 'float dA = texture2D(uDetail, vWxz * 0.21).r; float dB = texture2D(uDetail, vWxz * 0.023).r;\ndiffuseColor.rgb *= (0.62 + 0.5 * dA) * (0.8 + 0.34 * dB);'
        + (street ? '\nfloat stM = texture2D(uMask, vMapUv).r; vec3 cob = texture2D(uCobble, vWxz * 0.4).rgb;\ndiffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.5 + cob * 1.15), smoothstep(0.1, 0.9, stM) * 0.85);' : ''));
  };
  m.customProgramCacheKey = () => (street ? 'ground-street' : near ? 'ground-near' : 'ground');
  return m;
}
