// Campagne hors les murs : données et géométrie partagées par la peinture du sol (ground.js) et par les volumes
// (haies, bois, vergers : landscape.js). Tout est une évocation : champs en lanières, prés au bord de l'eau,
// vignes sur les coteaux, marais maraîchers au nord, clos et vergers autour des villages.
import { hash2, mulberry32, vnoise } from './geom.js';

// Villages des environs (positions actuelles approximatives, rapportées à Notre-Dame) : [nom, x, z, orientation, taille].
export const VILLAGES = [['La Chapelle', 717, -4080, 0.2, 26], ['La Villette', 2420, -4000, 0.5, 22], ['Belleville', 2790, -2110, 1.0, 26], ['Charonne', 3890, -550, 0.3, 18], ['Montmartre', -560, -3640, 1.2, 24], ['Clignancourt', -300, -4420, 0.1, 12],
  ['Ville-l’Évêque', -2040, -2000, 0.4, 16], ['Le Roule', -3290, -2450, 0.3, 14], ['Chaillot', -4240, -1330, 1.3, 20], ['Passy', -5270, -440, 1.1, 16], ['Auteuil', -6070, 560, 0.2, 16], ['Vaugirard', -3655, 1450, 0.5, 20], ['Issy', -5850, 3220, 0.9, 18],
  ['Vanves', -4460, 3560, 0.3, 14], ['Montrouge', -2260, 4000, 0.1, 14], ['Gentilly', -505, 4340, 1.0, 16], ['Ivry', 2570, 4450, 0.4, 18], ['Bercy', 2570, 1890, 0.9, 12], ['Conflans', 4550, 3450, 0.6, 16], ['Saint-Mandé', 4990, 1220, 0.2, 12],
  ['Montreuil', 6820, -1110, 0.5, 22], ['Bagnolet', 4990, -1780, 1.2, 14], ['Pantin', 4250, -4560, 0.3, 16], ['Saint-Ouen', -1160, -6560, 0.2, 16], ['Clichy', -3210, -5670, 0.6, 16], ['Saint-Marcel', 150, 1750, 1.35, 30], ['Saint-Denis', 250, -8300, 0.2, 60]];

// Grands chemins rayonnant depuis les portes.
export const ROADS = [[[-30, -2030], [-150, -3400], [100, -5200], [250, -9000]], [[390, -2030], [900, -3600], [2100, -5600], [3600, -9000]], [[1000, -1560], [2100, -2300], [4200, -3200], [9000, -4600]],
  [[1347, -60], [2600, 150], [5200, 500], [9000, 900]], [[-1408, -1250], [-2700, -1700], [-5200, -2600], [-9000, -3600]], [[-480, -2030], [-520, -3300], [-700, -5200], [-1500, -9000]],
  [[-700, 1463], [-900, 2800], [-1300, 5200], [-1700, 9000]], [[-80, 1463], [150, 2600], [700, 5200], [1300, 9000]], [[-1408, 200], [-2600, 900], [-5200, 2600], [-9000, 4300]], [[600, 1463], [1300, 2700], [2700, 5300], [4300, 9000]],
  [[-1408, -300], [-3000, -350], [-5600, -1100], [-9000, -1500]]];

// La Bièvre en amont du plan : un ruisseau bordé de prés et de saules, de Gentilly à l'abbaye Saint-Victor.
export const BIEVRE = [[440, 1392], [420, 1560], [330, 1820], [300, 2150], [190, 2600], [-40, 3100], [-260, 3700], [-430, 4250], [-700, 4950], [-1100, 5850], [-1500, 6800], [-1800, 8000], [-2000, 9000]];

// Bois : [x, z, rayon, nombre de chapelets de bosquets] (Vincennes à l'est, Rouvray à l'ouest…).
export const WOODS = [[6200, 1700, 1700, 60], [-7400, -1300, 1500, 50], [-5200, 5200, 1700, 50], [3800, -6200, 1300, 36], [-2500, -7200, 1100, 30], [7600, -3500, 1500, 40], [600, 7200, 1500, 40], [-7800, 3200, 1200, 30], [2600, -2600, 500, 16], [-500, -3850, 260, 14]];

const CLEARINGS = [[6280, 1146, 290], ...VILLAGES.map((v) => [v[1], v[2], v[4] * 5.5 + 70])];
let blobs = null, blobGrid = null;
const GC = 500;
export function woodBlobs() {
  if (blobs) return blobs;
  const r = mulberry32(99); blobs = []; blobGrid = new Map();
  for (const [cx, cz, rad, n] of WOODS) for (let c = 0; c < n; c++) {
    let x = cx + (r() - 0.5) * rad * 1.6, z = cz + (r() - 0.5) * rad * 1.6;
    const m = 6 + ((r() * 14) | 0);
    for (let i = 0; i < m; i++) {
      x += (r() - 0.5) * 260; z += (r() - 0.5) * 260;
      const b = { x, z, rx: 50 + r() * 120, rz: 40 + r() * 90, rot: r() * 3.1, tone: r() };
      if (!CLEARINGS.some((c) => Math.hypot(x - c[0], z - c[1]) < c[2] + Math.max(b.rx, b.rz) * 0.85)) blobs.push(b);       // clairières des villages et du château de Vincennes
    }
  }
  blobs.forEach((b, k) => { const R = Math.max(b.rx, b.rz); for (let i = Math.floor((b.x - R) / GC); i <= Math.floor((b.x + R) / GC); i++) for (let j = Math.floor((b.z - R) / GC); j <= Math.floor((b.z + R) / GC); j++) { const key = i + '|' + j; if (!blobGrid.has(key)) blobGrid.set(key, []); blobGrid.get(key).push(k); } });
  return blobs;
}
export function inWood(x, z, margin = 0) {
  woodBlobs();
  const list = blobGrid.get(Math.floor(x / GC) + '|' + Math.floor(z / GC)); if (!list) return false;
  for (const k of list) { const b = blobs[k], c = Math.cos(b.rot), s = Math.sin(b.rot), dx = x - b.x, dz = z - b.z, u = (dx * c + dz * s) / (b.rx + margin), v = (-dx * s + dz * c) / (b.rz + margin); if (u * u + v * v < 1) return true; }
  return false;
}

// Parcellaire : quartiers de culture de 150 m environ, aux angles déplacés au hasard, chacun découpé en lanières parallèles.
export const BLOCK = 150;
export const node = (i, j) => [i * BLOCK + (hash2(i * 3 + 1, j * 7 + 2) - 0.5) * BLOCK * 0.62, j * BLOCK + (hash2(i * 5 + 9, j * 3 + 4) - 0.5) * BLOCK * 0.62];
export function block(i, j) {
  const a = node(i, j), b = node(i + 1, j), c = node(i + 1, j + 1), d = node(i, j + 1);
  return { pts: [a, b, c, d], cx: (a[0] + b[0] + c[0] + d[0]) / 4, cz: (a[1] + b[1] + c[1] + d[1]) / 4, h: hash2(i * 11 + 5, j * 13 + 7), ang: Math.atan2(b[1] - a[1], b[0] - a[0]) + (hash2(i, j) > 0.5 ? Math.PI / 2 : 0), seed: ((i * 73856093) ^ (j * 19349663) ^ 0x5bd1e995) >>> 0 };
}
// Limite plantée d'une haie ? côté 0 : bord a→b du quartier (i, j) ; côté 1 : bord a→d. Chaque limite n'appartient ainsi qu'à un quartier.
export const hedged = (i, j, side) => hash2(i * 17 + side * 31 + 3, j * 23 + 11) < 0.28;
export const pathed = (i, j, side) => hash2(i * 29 + side * 13 + 7, j * 19 + 5) > 0.8;

export function nearRoad(x, z, max) {
  for (const rd of ROADS) for (let k = 0; k < rd.length - 1; k++) {
    const a = rd[k], b = rd[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < max) return true;
  }
  return false;
}

// Nature d'un quartier de culture, d'après sa situation.
export function landKind(T, cx, cz, h) {
  const wd = -T.sdWater(cx, cz);                               // distance à l'eau
  if (wd < 45) return 'pre';
  for (const v of VILLAGES) if (Math.hypot(v[1] - cx, v[2] - cz) < v[4] * 5.5 + 190) return h < 0.42 ? 'verger' : 'clos';
  if (wd < 150 ? h < 0.7 : wd < 320 && h < 0.34) return 'pre';       // prés de fauche, de plus en plus rares en s'éloignant de l'eau
  let db = 1e9; for (let k = 0; k < BIEVRE.length - 1; k++) { const a = BIEVRE[k], b = BIEVRE[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((cx - a[0]) * dx + (cz - a[1]) * dz) / (dx * dx + dz * dz))); db = Math.min(db, Math.hypot(cx - a[0] - dx * t, cz - a[1] - dz * t)); }
  if (db < 130) return 'pre';
  const e = 50, sl = Math.hypot(T.base(cx + e, cz) - T.base(cx - e, cz), T.base(cx, cz + e) - T.base(cx, cz - e)) / (2 * e);
  if (sl > 0.026 && h < 0.78) return 'vigne';                  // coteaux
  if (cz < -1480 && cz > -2800 && Math.abs(cx + 100) < 2150 && h > 0.4) return 'marais';     // maraîchers du nord de la ville
  const s = vnoise(cx * 0.0017 + 5.3, cz * 0.0017 + 9.1) * 0.72 + h * 0.28;                    // soles de l'assolement : de grandes taches
  return s < 0.42 ? 'ble' : s < 0.6 ? 'mars' : 'jachere';
}

// Arbres d'un verger : quinconce de 15 m, aligné sur les lanières du quartier.
export function orchardTrees(q) {
  const out = [], c = Math.cos(q.ang), s = Math.sin(q.ang), p = q.pts;
  const inside = (x, z) => { let ok = true; for (let k = 0; k < 4 && ok; k++) { const a = p[k], b = p[(k + 1) % 4]; if ((b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) < 6 * Math.hypot(b[0] - a[0], b[1] - a[1])) ok = false; } return ok; };
  for (let v = -BLOCK; v <= BLOCK; v += 15) for (let u = -BLOCK + ((Math.round(v / 15) & 1) ? 7.5 : 0); u <= BLOCK; u += 15) { const x = q.cx + u * c - v * s, z = q.cz + u * s + v * c; if (inside(x, z)) out.push([x, z]); }
  return out;
}

// Chemins de traverse reliant chaque village au grand chemin le plus proche.
let lanes = null;
export function villageLanes() {
  if (lanes) return lanes;
  lanes = [];
  for (const v of VILLAGES) {
    let best = null, bd = 2600;
    for (const rd of ROADS) for (let k = 0; k < rd.length - 1; k++) { const a = rd[k], b = rd[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let t = 0; t <= L; t += 60) { const x = a[0] + ((b[0] - a[0]) * t) / L, z = a[1] + ((b[1] - a[1]) * t) / L, d = Math.hypot(x - v[1], z - v[2]); if (d < bd) { bd = d; best = [x, z]; } } }
    if (best && bd > 140) { const mx = (v[1] + best[0]) / 2 + (hash2(v[1], v[2]) - 0.5) * bd * 0.25, mz = (v[2] + best[1]) / 2 + (hash2(v[2], v[1]) - 0.5) * bd * 0.25; lanes.push([[v[1], v[2]], [mx, mz], best]); }
  }
  return lanes;
}
