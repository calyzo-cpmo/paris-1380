// Tissu bâti évoqué pour les dates de la frise : sur les îlots qu'une date montre bâtis et qui ne l'étaient pas en 1380,
// des maisons mitoyennes le long des rues — à pans de bois et pignon sur rue jusqu'au XVIe siècle, enduites, à hautes
// fenêtres et combles d'ardoise ou de tuile ensuite ; les édifices postérieurs à 1380 sont bâtis en pierre.
// L'emprise des îlots et des édifices vient des plans ; les maisons et le détail des édifices sont une évocation.
import { placeHouse, PLASTERS, TILES } from './houses.js';
import { building, ENDUITS, ardoise, tuile } from './p1789/blocks.js';
import { church, stoneBuilding, COL } from './stonework.js';
import { mulberry32, dpRing, polyArea, pointInPoly, minAreaRect } from './geom.js';

const NOP = () => {};
// Les bâtisseurs écrivent d'ordinaire dans l'application (emprises, fumées, bannières) : un calque n'y laisse rien.
export const shimApp = (app) => ({ terrain: app.terrain, mobile: app.mobile, foot: { push: NOP }, chimneys: { length: 1e9, push: NOP }, flags: { push: NOP }, solid: { fillPoly: NOP, fillCircle: NOP, fillRect: NOP, strokeLine: NOP } });

// Lotit un îlot et rend le nombre de maisons. o : { pans (à pans de bois), dense, mansardes (part des combles brisés) }.
export function lotirIlot(shim, B, ring0, id, o) {
  let ring = dpRing(ring0, 0.9); if (ring.length < 3) return 0;
  if (polyArea(ring) < 0) ring = ring.slice().reverse();                     // sens positif : l'intérieur est à gauche de chaque pan
  const area = Math.abs(polyArea(ring)); if (area < 40) return 0;
  let per = 0; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; per += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  const r = mulberry32(id * 7919 + 31), depth = Math.min(o.pans ? 9.5 : 10.5, (1.9 * area) / per), large = () => (o.pans ? 5.2 + r() * 2.6 : 10 + r() * 6);
  // une maison : origine sur la rue, (ux, uz) le long de la rue, profondeur vers l'intérieur de l'îlot
  const maison = (ox, oz, ux, uz, w, d, hid) => {
    const floors = (o.dense ? (o.pans ? 3 : 4) : 2) + (r() < 0.35 ? 1 : 0) - (r() < 0.25 ? 1 : 0);
    if (o.pans) placeHouse(shim, B, r, { ox, oz, rx: ux, rz: uz, nx: -uz, nz: ux, w, d, floors: Math.max(1, floors), gableFront: w < 7.4 ? r() < 0.8 : r() < 0.25, style: r() < 0.42 ? 2 : r() < 0.6 ? 3 : 4, gfRow: r() < 0.5 ? 0 : 1, jetty: floors > 1 ? 0.28 + r() * 0.2 : 0, pitch: 1.15 + r() * 0.45, plaster: PLASTERS[(r() * PLASTERS.length) | 0], roofCol: TILES[(r() * TILES.length) | 0], dens: 0.6, plain: true });
    else {
      const mans = w * d > 60 && r() < o.mansardes, q = (s, t) => [ox + ux * s - uz * t, oz + uz * s + ux * t];
      building(shim, B, { outer: [q(0, 0), q(w, 0), q(w, d), q(0, d)], holes: [] }, hid, { kind: 'maison', floors: Math.max(2, floors), col: ENDUITS[(r() * ENDUITS.length) | 0], roof: mans || r() < 0.2 ? ardoise(hid) : tuile(hid), mansard: mans, area: w * d });
    }
  };
  let n = 0;
  if (depth < 4.5 || area < 220) {                                           // îlot étroit : un seul rang de maisons, sur toute sa profondeur
    const R = minAreaRect(ring), cnt = Math.max(1, Math.round((2 * R.hl) / large())), w = (2 * R.hl) / cnt, ox = R.cx - R.ux * R.hl + R.uz * R.hw, oz = R.cz - R.uz * R.hl - R.ux * R.hw;
    for (let k = 0; k < cnt; k++) { maison(ox + R.ux * k * w, oz + R.uz * k * w, R.ux, R.uz, w, 2 * R.hw, id * 131 + k); n++; }
    return n;
  }
  for (let e = 0; e < ring.length; e++) {
    const a = ring[e], b = ring[(e + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < (o.pans ? 4 : 7)) continue;
    const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    if (!pointInPoly((a[0] + b[0]) / 2 - uz * 2, (a[1] + b[1]) / 2 + ux * 2, ring)) continue;
    const cnt = Math.max(1, Math.round(L / large())), w = L / cnt;
    for (let k = 0; k < cnt; k++) {
      if (!o.dense && r() > 0.5) continue;                                   // îlot de densité intermédiaire : bâti clairsemé
      maison(a[0] + ux * k * w, a[1] + uz * k * w, ux, uz, w, depth * (0.8 + r() * 0.2), id * 131 + e * 17 + k); n++;
    }
  }
  return n;
}

// Édifice postérieur à 1380 que le plan restitué situe : église gothique, tour, hôtel ou couvent de pierre.
export function edifice(shim, B, nature, ring, id) {
  if (nature === 'Église') church(shim, B, ring, mulberry32(1380 + id * 13), {});
  else if (nature === 'Tour') stoneBuilding(shim, B, ring, { floors: 10, flat: true, col: COL.stoneWarm });
  else stoneBuilding(shim, B, ring, { floors: nature === 'Hôtel' ? 3 : 2, roofCol: id % 2 ? COL.slate : COL.tileDark });
}

// Monument antique : thermes et forum en corps de pierre couverts de tuile ; arènes et théâtre gardent leur seul volume.
export const antique = (shim, B, ring) => stoneBuilding(shim, B, ring, { floors: 2, gf: 5, uf: 4.5, roofCol: COL.tile, col: COL.stoneWarm, hip: true, pitch: 0.5, maxRoof: 4 });
