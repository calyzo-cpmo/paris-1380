// Données de la page « Paris 1889 » : la ville recomposée par tools/extract_1889.py dans data/paris1889.json — bâti daté
// de l'Atelier parisien d'urbanisme, îlots et rues de la base « Paris 1900 », atlas de Vasserot pour les bâtiments
// disparus, relief de l'IGN. Repère : celui des autres maquettes (mètres, x vers l'est, z vers le sud, origine au
// parvis de Notre-Dame). La page « Paris 1900 » reprend ce module : à l'assemblage, data/paris1900.json remplace
// data/paris1889.json (tools/build.mjs, surcouche) ; ANNEE dit quelle ville est chargée.
import D from '../../data/paris1889.json';
import { decodeLines, decodePolys, decodeInts } from '../vlq.js';
import { decodeRelief } from '../relief.js';

export const META = D.meta, EXPO = D.meta.expo, ANNEE = D.meta.annee;
export const CADRE = { x0: D.meta.cadre[0], z0: D.meta.cadre[1], x1: D.meta.cadre[2], z1: D.meta.cadre[3] };
export const CREDITS = { bati: D.bati.credit, ilots: D.ilots.credit, rues: D.rues.credit, eau: D.eau.credit, parcs: D.parcs.credit, relief: D.relief.credit, fer: D.fer.credit, source: D.meta.source };

const cache = new Map();
const memo = (k, f) => () => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
// Îlots vers 1900 : c = 'B' bâti, 'p' promenade ou place plantée, 'F' enceinte de Thiers.
export const ilots = memo('il', () => decodePolys(D.ilots.g, D.ilots.q).map((rings, i) => ({ rings, c: D.ilots.c[i], nom: D.ilots.noms[i] || '' })));
// Rues vers 1900 : tracé, nom d'alors, largeur (m), franchissement d'un cours d'eau ou d'une voie.
export const rues = memo('ru', () => { const P = new Set(D.rues.ponts); return decodeLines(D.rues.g, D.rues.q).map((pts, i) => ({ pts, nom: D.rues.i[i] >= 0 ? D.rues.noms[D.rues.i[i]] : '', l: D.rues.l[i] || 0, pont: P.has(i) })); });
// Bâti : s = statut (R réel, P probable, V disparu d'après Vasserot, E évoqué sur l'emprise actuelle, G évoqué le long
// des rues), h = hauteur (m), t = toit (1 terrasse, 2 et 3 deux pentes, 4 comble brisé), k = 'e' culte, 'g' gare,
// 'i' industrie, 'r' équipement.
export const bati = memo('ba', () => { const h = decodeInts(D.bati.h); return decodePolys(D.bati.g, D.bati.q).map((rings, i) => ({ rings, s: D.bati.s[i], h: h[i] / 2, t: +D.bati.t[i], k: D.bati.k[i] })); });
export const COMPTE = D.meta.bati;
// Eau : t = 'S' Seine, 'c' canal ou bassin, 'l' lac.
export const eau = memo('eau', () => decodePolys(D.eau.g, D.eau.q).map((rings, i) => ({ rings, t: D.eau.t[i] })));
export const parcs = memo('pa', () => decodePolys(D.parcs.g, D.parcs.q).map((rings, i) => ({ rings, nom: D.parcs.noms[i] })));
export const cimetieres = memo('ci', () => decodePolys(D.cimetieres.g, D.cimetieres.q));
// Voies ferrées de 1889 : s = ce qui justifie le tracé ('a' voie d'aujourd'hui sur une emprise de 1889, 'r' ligne
// déposée restituée dans l'axe de son emprise, 'e' tracé évoqué le long des rues de 1900), h = hauteur de chaque point
// au-dessus du sol (viaducs), ou rien. FER : kilomètres de voie par statut.
export const voies = memo('fer', () => decodeLines(D.fer.g, D.fer.q).map((pts, i) => ({ pts, s: D.fer.s[i], h: D.fer.h[i] ? D.fer.h[i].map((v) => v / 10) : null })));
export const FER = D.meta.fer;
export const lieux = () => D.lieux;                  // [x, z, 'c' culte | 'm' monument | 'g' gare, nom, emprise en m²]
export const relief = () => decodeRelief(D.relief);

// Repère de l'Exposition : origine au centre de la tour, u vers l'École militaire, v vers l'avenue de Suffren.
const U = EXPO.u, O = EXPO.tour;
export const expoUV = (x, z) => [(x - O[0]) * U[0] + (z - O[1]) * U[1], -(x - O[0]) * U[1] + (z - O[1]) * U[0]];
export const expoXZ = (u, v) => [O[0] + u * U[0] - v * U[1], O[1] + u * U[1] + v * U[0]];
export const VC = EXPO.vc || 0;                      // milieu du Champ-de-Mars, entre les deux avenues
export const dansExpo = (x, z) => { const [u, v] = expoUV(x, z); return u > EXPO.u0 && u < EXPO.u1 && v > EXPO.v0 && v < EXPO.v1; };
