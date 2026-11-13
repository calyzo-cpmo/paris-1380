// Peinture du sol : rues, cours, jardins, cultures (plan de 1380) et campagne alentour.
import * as THREE from 'three';
import { FRAME, layer, polys } from './data.js';
import { WORLD } from './terrain.js';
import { hash2, offsetEx, mulberry32 } from './geom.js';

const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const STREET = [124, 112, 94];
const FIELDS = [[176, 160, 104], [112, 134, 74], [94, 120, 66], [134, 116, 84], [190, 176, 120], [102, 122, 70], [150, 142, 92], [120, 128, 80]];
const GARDENS = [[92, 118, 62], [110, 126, 72], [128, 114, 82], [84, 108, 58], [140, 132, 90], [100, 124, 70]];

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

// Parcellaire agricole : grille de pas S dont les nœuds sont décalés aléatoirement.
function drawParcels(ctx, T, x0, z0, x1, z1, S, palette, furrows) {
  const node = (i, j) => [i * S + (hash2(i * 3 + 1, j * 7 + 2) - 0.5) * S * 0.7, j * S + (hash2(i * 5 + 9, j * 3 + 4) - 0.5) * S * 0.7];
  const i0 = Math.floor(x0 / S) - 1, i1 = Math.ceil(x1 / S) + 1, j0 = Math.floor(z0 / S) - 1, j1 = Math.ceil(z1 / S) + 1;
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const a = node(i, j), b = node(i + 1, j), c = node(i + 1, j + 1), d = node(i, j + 1);
    const col = palette[Math.floor(hash2(i * 11 + 5, j * 13 + 7) * palette.length)];
    const k = 0.94 + hash2(i + 77, j + 31) * 0.12, m = 0.58;   // on rapproche chaque parcelle d'un vert moyen
    ctx.fillStyle = rgb([(col[0] * (1 - m) + 124 * m) * k | 0, (col[1] * (1 - m) + 128 * m) * k | 0, (col[2] * (1 - m) + 86 * m) * k | 0]);
    ctx.beginPath(); path(ctx, [a, b, c, d], T); ctx.fill();
    if (furrows) {
      // sillons : hachures parallèles à un côté, découpées sur la parcelle (quadrilatère convexe)
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (hash2(i, j) > 0.5 ? Math.PI / 2 : 0);
      const cx = (a[0] + b[0] + c[0] + d[0]) / 4, cz = (a[1] + b[1] + c[1] + d[1]) / 4, dx = Math.cos(ang), dz = Math.sin(ang);
      const q = [a, b, c, d];
      ctx.strokeStyle = 'rgba(40,34,20,0.16)'; ctx.lineWidth = Math.max(1, T.s * 0.9);
      ctx.beginPath();
      for (let t = -S; t <= S; t += 3.2) {
        const ox = cx - dz * t, oz = cz + dx * t;
        let t0 = -S * 1.5, t1 = S * 1.5, ok = true;
        for (let e = 0; e < 4 && ok; e++) {
          const p = q[e], r = q[(e + 1) % 4];
          const nx = -(r[1] - p[1]), nz = r[0] - p[0];             // normale intérieure (sens horaire écran)
          const den = dx * nx + dz * nz, num = (p[0] - ox) * nx + (p[1] - oz) * nz;
          if (Math.abs(den) < 1e-9) { if (num > 0) ok = false; continue; }
          const tt = num / den;
          if (den > 0) { if (tt > t0) t0 = tt; } else if (tt < t1) t1 = tt;
        }
        if (ok && t1 > t0) { ctx.moveTo(T.x(ox + dx * t0), T.y(oz + dz * t0)); ctx.lineTo(T.x(ox + dx * t1), T.y(oz + dz * t1)); }
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(52,62,34,0.2)'; ctx.lineWidth = Math.max(0.8, T.s * 1.2);
    ctx.beginPath(); path(ctx, [a, b, c, d], T); ctx.stroke();
  }
}

function noiseOverlay(ctx, w, h, alpha, seed) {
  const n = document.createElement('canvas'); n.width = n.height = 256;
  const c = n.getContext('2d', { willReadFrequently: true }), im = c.createImageData(256, 256), r = mulberry32(seed);
  for (let i = 0; i < 256 * 256; i++) { const v = 96 + r() * 96; im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v * 0.96; im.data[i * 4 + 3] = 255; }
  c.putImageData(im, 0, 0);
  ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ctx.createPattern(n, 'repeat'); ctx.fillRect(0, 0, w, h); ctx.restore();
}

export function paintCoreGround(maxSize) {
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
  drawParcels(pctx, T, FRAME.x0, FRAME.z0, FRAME.x1, FRAME.z1, 46, [...FIELDS, ...GARDENS], true);
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
  noiseOverlay(ctx, W, H, 0.38, 7);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// Campagne : parcellaire, bois et chemins rayonnant depuis les portes.
export function paintOuterGround(terrain) {
  const N = 2048, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const s = N / (2 * WORLD);
  const T = { s, x: (x) => (x + WORLD) * s, y: (z) => (z + WORLD) * s };
  ctx.fillStyle = rgb([118, 132, 80]); ctx.fillRect(0, 0, N, N);
  drawParcels(ctx, T, -WORLD, -WORLD, WORLD, WORLD, 120, FIELDS, false);
  // bois
  const woods = [[6200, 1700, 1700, 60], [-7400, -1300, 1500, 50], [-5200, 5200, 1700, 50], [3800, -6200, 1300, 36], [-2500, -7200, 1100, 30], [7600, -3500, 1500, 40], [600, 7200, 1500, 40], [-7800, 3200, 1200, 30], [2600, -2600, 500, 16], [-500, -3850, 260, 14]];
  const r = mulberry32(99);
  for (const [cx, cz, rad, n] of woods) {
    for (let c = 0; c < n; c++) {
      // chaque bois est un chapelet de bosquets
      let x = cx + (r() - 0.5) * rad * 1.6, z = cz + (r() - 0.5) * rad * 1.6;
      const m = 6 + (r() * 14 | 0);
      for (let i = 0; i < m; i++) {
        x += (r() - 0.5) * 260; z += (r() - 0.5) * 260;
        ctx.fillStyle = rgb([58 + r() * 18 | 0, 84 + r() * 20 | 0, 48 + r() * 12 | 0], 0.8);
        ctx.beginPath(); ctx.ellipse(T.x(x), T.y(z), (50 + r() * 120) * s, (40 + r() * 90) * s, r() * 3.1, 0, 6.3); ctx.fill();
      }
    }
  }
  // chemins
  const roads = [[[-30, -2030], [-150, -3400], [100, -5200], [250, -9000]], [[390, -2030], [900, -3600], [2100, -5600], [3600, -9000]], [[1000, -1560], [2100, -2300], [4200, -3200], [9000, -4600]],
    [[1347, -60], [2600, 150], [5200, 500], [9000, 900]], [[-1408, -1250], [-2700, -1700], [-5200, -2600], [-9000, -3600]], [[-480, -2030], [-520, -3300], [-700, -5200], [-1500, -9000]],
    [[-700, 1463], [-900, 2800], [-1300, 5200], [-1700, 9000]], [[-80, 1463], [150, 2600], [700, 5200], [1300, 9000]], [[-1408, 200], [-2600, 900], [-5200, 2600], [-9000, 4300]], [[600, 1463], [1300, 2700], [2700, 5300], [4300, 9000]],
    [[-1408, -300], [-3000, -350], [-5600, -1100], [-9000, -1500]]];
  ctx.strokeStyle = rgb([150, 134, 104], 0.9); ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
  for (const rd of roads) { ctx.beginPath(); ctx.moveTo(T.x(rd[0][0]), T.y(rd[0][1])); for (const p of rd) ctx.lineTo(T.x(p[0]), T.y(p[1])); ctx.stroke(); }
  // lit des rivières
  const im = ctx.getImageData(0, 0, N, N), d = im.data;
  for (let j = 0; j < N; j += 1) for (let i = 0; i < N; i += 1) {
    const x = (i + 0.5) / s - WORLD, z = (j + 0.5) / s - WORLD;
    if (x > FRAME.x0 && x < FRAME.x1 && z > FRAME.z0 && z < FRAME.z1) continue;
    const sd = terrain.sdWater(x, z);
    if (sd > -30) { const k = (j * N + i) * 4, t = Math.min(1, (sd + 30) / 30); d[k] = d[k] * (1 - t) + 150 * t; d[k + 1] = d[k + 1] * (1 - t) + 140 * t; d[k + 2] = d[k + 2] * (1 - t) + 104 * t; }
  }
  ctx.putImageData(im, 0, 0);
  noiseOverlay(ctx, N, N, 0.3, 21);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
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

export function makeGroundMaterial(map, detail) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = { value: detail };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWxz = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;\nuniform sampler2D uDetail;')
      .replace('#include <map_fragment>', '#include <map_fragment>\nfloat dA = texture2D(uDetail, vWxz * 0.21).r; float dB = texture2D(uDetail, vWxz * 0.023).r;\ndiffuseColor.rgb *= (0.62 + 0.5 * dA) * (0.8 + 0.34 * dB);');
  };
  return m;
}
