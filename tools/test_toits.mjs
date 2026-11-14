// Contrôle géométrique des toits de Paris 1789, sans navigateur : pour chaque emprise de l'atlas, la somme des aires en
// plan des triangles du toit doit égaler l'aire de l'emprise, cours déduites. Un écart signale des pans qui se
// chevauchent, des manques, ou un comble qui recouvre une cour.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { decodePolys } from '../src/vlq.js';
import { skeletonRoof, ccw } from '../src/builder.js';
import { polyArea, difference } from '../src/geom.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = JSON.parse(readFileSync(join(root, 'data/paris1789.json'), 'utf8')), polys = decodePolys(RAW.bati.g, RAW.bati.q);
const lot = () => ({ aire: 0, tri(ax, ay, az, bx, by, bz, cx, cy, cz) { this.aire += Math.abs(((bx - ax) * (cz - az) - (bz - az) * (cx - ax)) / 2); } });
// les deux profils de src/p1789/blocks.js : comble brisé et toit à croupes
const PROFILS = [['brisé', () => ({ brisis: { d: 0.8, h: 2.37 }, pitch: 0.42, step: 2.2, minStep: 0.45, maxH: 5.8, stitch: true })], ['croupes', () => ({ pitch: 1, step: 2, minStep: 0.4, maxH: 6.5, stitch: true })]];
let n = 0, cours = 0; const faux = [];
polys.forEach((rings, i) => {
  if (Math.abs(polyArea(rings[0])) < 45) return;
  for (const ex0 of rings.length > 1 ? difference([rings[0]], rings.slice(1)) : [{ outer: rings[0], holes: [] }]) {
    // comme building() : contour en sens positif, cours en sens inverse
    const ex = { outer: ccw(ex0.outer), holes: ex0.holes.map((h) => ccw(h).slice().reverse()) };
    let A = Math.abs(polyArea(ex.outer)); for (const h of ex.holes) A -= Math.abs(polyArea(h));
    if (A < 45) continue;
    if (ex.holes.length) cours++;
    for (const [nom, opts] of PROFILS) {
      const b = lot(), o = opts(); if (o.brisis) o.brisis.b = b;
      skeletonRoof(b, ex, 0, o); n++;
      const e = Math.abs(b.aire - A) / A; if (e > 0.02) faux.push([+(e * 100).toFixed(1), i, nom, Math.round(A)]);
    }
  }
});
faux.sort((a, b) => b[0] - a[0]);
const ok = n > 30000 && cours > 500 && faux.length <= n * 0.002;      // quelques emprises du plan se recoupent elles-mêmes : tolérance de 2 pour mille
console.log(`${ok ? 'ok   ' : 'ÉCHEC'} toits : l’aire en plan de chaque toit égale celle de son emprise, cours déduites ${JSON.stringify({ toits: n, avecCour: cours, ecarts: faux.length, pires: faux.slice(0, 3) })}`);
console.log(`\n${ok ? 1 : 0} vérification réussie, ${ok ? 0 : 1} échec(s)`);
process.exit(ok ? 0 : 1);
