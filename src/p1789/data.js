// Données de la page « Paris 1789 » : couches du SIG ALPAGE extraites par tools/extract_1789.py (licence ODbL 1.0).
// Îlots, rues et Seine viennent du plan de Verniquet (1782-1790) ; l'emprise des bâtiments, de l'Atlas de Vasserot
// (1810-1836) ; le relief, du nivellement de Girard (1805-1807). Repère : celui de la maquette de 1380.
import raw from '../../data/paris1789.json';
import { decodeInts, decodePolys, decodeLines } from '../vlq.js';

export const RAW = raw;
const c = raw.meta.cadre;
export const CADRE = { x0: c[0], z0: c[1], x1: c[2], z1: c[3] };

const cache = new Map();
const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const P = (k) => () => memo(k, () => decodePolys(raw[k].g, raw[k].q));
export const bati = P('bati'), ilots = P('ilots'), eau = P('eau'), mur = P('mur'), jardins = P('jardins');
export const batiNom = (i) => raw.bati.noms[i] || '';
export const batiEnclos = (i) => raw.bati.enclos.includes(i);     // ensemble que l'atlas ne détaille pas : rendu comme des ailes autour de cours
export const ilotDocumente = (i) => raw.ilots.doc[i] === '1';
// Rues : [{ nom, pts }]
export const rues = () => memo('rues', () => decodeLines(raw.rues.g, raw.rues.q).map((pts, k) => ({ pts, nom: raw.rues.i[k] >= 0 ? raw.rues.noms[raw.rues.i[k]] : '' })));
export const eglises = () => raw.eglises.objets.map((o) => ({ x: o[0], z: o[1], statut: o[2], nom: o[3] }));

// Relief : grille d'altitudes (m au-dessus du point le plus bas) ; ok[i] = 0 hors de la zone nivelée.
export function relief() {
  const R = raw.relief, d = decodeInts(R.h), h = new Float32Array(d.length), ok = new Uint8Array(d.length);
  let acc = 0;
  for (let i = 0; i < d.length; i++) { acc += d[i]; if (acc >= 0) { h[i] = acc / 10; ok[i] = 1; } }
  return { x0: R.x0, z0: R.z0, pas: R.pas, nx: R.nx, nz: R.nz, base: R.base, h, ok };
}
