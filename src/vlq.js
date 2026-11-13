// Décodage des géométries compactes de data/epoques.json : entiers en écarts successifs, écrits en base 64 à
// longueur variable (voir tools/extract_epochs.py). Les coordonnées rendues sont en mètres, dans le repère de la maquette.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const IDX = new Int8Array(128).fill(-1);
for (let i = 0; i < 64; i++) IDX[B64.charCodeAt(i)] = i;

export function decodeInts(s) {
  const out = [];
  let v = 0, shift = 0;
  for (let i = 0; i < s.length; i++) {
    const d = IDX[s.charCodeAt(i)];
    v += (d & 31) * 2 ** shift;                  // puissances plutôt que décalages : pas de limite à 32 bits
    if (d & 32) shift += 5;
    else { out.push(v % 2 ? -(v - 1) / 2 : v / 2); v = 0; shift = 0; }
  }
  return out;
}

// Polygones : [[anneau extérieur, trous…], …], chaque anneau étant une liste de [x, z].
export function decodePolys(s, q = 1) {
  const v = decodeInts(s), out = [];
  let k = 0, x = 0, z = 0;
  const n = v[k++];
  for (let p = 0; p < n; p++) {
    const rings = [], nr = v[k++];
    for (let r = 0; r < nr; r++) {
      const ring = [], np = v[k++];
      for (let i = 0; i < np; i++) { x += v[k++]; z += v[k++]; ring.push([x / q, z / q]); }
      rings.push(ring);
    }
    out.push(rings);
  }
  return out;
}

// Lignes : [[[x, z], …], …].
export function decodeLines(s, q = 1) {
  const v = decodeInts(s), out = [];
  let k = 0, x = 0, z = 0;
  const n = v[k++];
  for (let l = 0; l < n; l++) {
    const line = [], np = v[k++];
    for (let i = 0; i < np; i++) { x += v[k++]; z += v[k++]; line.push([x / q, z / q]); }
    out.push(line);
  }
  return out;
}
