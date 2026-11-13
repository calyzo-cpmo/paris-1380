// Accès aux données extraites du « Plan restitué de Paris en 1380 » (ALPAGE / CNRS).
import raw from '../data/paris1380.json';

export const META = raw.meta;
export const FRAME = { x0: raw.meta.frame[0], z0: raw.meta.frame[1], x1: raw.meta.frame[2], z1: raw.meta.frame[3] };
export const LABELS = raw.labels;

function unflat(p) { const o = []; for (let i = 0; i < p.length; i += 2) o.push([p[i], p[i + 1]]); return o; }

const cache = new Map();
// Formes d'un calque : {kind:'poly'|'line'|'circle', pts, fill, stroke, dash, opacity, r, width}
export function layer(name) {
  if (cache.has(name)) return cache.get(name);
  const out = (raw.layers[name] || []).map((s, i) => ({
    id: name + ':' + i,
    kind: s.k === 'c' ? 'circle' : s.k === 'g' ? 'poly' : 'line',
    pts: s.k === 'c' ? [[s.p[0], s.p[1]]] : unflat(s.p),
    fill: (s.f || 'none').toUpperCase(),
    stroke: !!s.s, dash: !!s.d, opacity: s.o == null ? 1 : s.o, r: s.r || 0, width: s.w || 0, strokeColor: s.sc || '#000000',
  }));
  cache.set(name, out);
  return out;
}

export const polys = (name, fill) => layer(name).filter((s) => s.kind === 'poly' && s.pts.length >= 3 && (fill == null || (Array.isArray(fill) ? fill.includes(s.fill) : s.fill === fill)));
export const lines = (name) => layer(name).filter((s) => s.kind !== 'circle' && s.fill === 'NONE');
export const circles = (name) => layer(name).filter((s) => s.kind === 'circle');
