// Décodage d'une grille de relief compacte (deltas en décimètres, VLQ ; valeur négative : hors de la zone nivelée).
// Sans dépendance aux données d'une ville.
import { decodeInts } from './vlq.js';

// R : { x0, z0, pas, nx, nz, base, h } → altitudes en mètres au-dessus du point le plus bas ; ok[i] = 0 hors nivellement.
export function decodeRelief(R) {
  const d = decodeInts(R.h), h = new Float32Array(d.length), ok = new Uint8Array(d.length);
  let acc = 0;
  for (let i = 0; i < d.length; i++) { acc += d[i]; if (acc >= 0) { h[i] = acc / 10; ok[i] = 1; } }
  return { x0: R.x0, z0: R.z0, pas: R.pas, nx: R.nx, nz: R.nz, base: R.base, h, ok };
}
