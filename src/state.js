// État conservé d'une visite à l'autre (carnet de visite, réglages) et lien partageable (fragment d'adresse).

const KEY = 'paris1380:';
export const store = {
  get(k, dflt) { try { const v = localStorage.getItem(KEY + k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; } },
  set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible : la page fonctionne sans */ } },
};

const num = (s) => { const v = Number(s); return Number.isFinite(v) ? v : null; };
const list = (s, n) => { const a = String(s).split(',').map(num); return a.length === n && a.every((v) => v != null) ? a : null; };

// #c=x,z,dist,az,el&h=10.5&p=notre-dame&e=1652   |   #w=x,z,cap&h=…   |   #in=notre-dame      (e : époque du calque temporel)
export function parseHash(hash) {
  const out = {};
  const h = String(hash || '').replace(/^#/, '');
  if (!h || h === 'shot') return out;
  for (const part of h.split('&')) {
    const i = part.indexOf('='); if (i < 1) continue;
    const k = part.slice(0, i); let v = part.slice(i + 1);
    try { v = decodeURIComponent(v); } catch (e) { continue; }
    if (k === 'c') { const a = list(v, 5); if (a) out.c = a; }
    else if (k === 'w') { const a = list(v, 3); if (a) out.w = a; }
    else if (k === 'h') { const a = num(v); if (a != null && a >= 4.5 && a <= 22.5) out.h = a; }
    else if (k === 'p' || k === 'in' || k === 't' || k === 'e') { if (/^[a-z0-9-]{1,40}$/.test(v)) out[k] = v; }
  }
  return out;
}

const f = (v, d = 0) => String(Math.round(v * 10 ** d) / 10 ** d);
export function makeHash(s) {
  const parts = [];
  if (s.in) parts.push('in=' + s.in);
  else if (s.w) parts.push('w=' + [f(s.w[0], 1), f(s.w[1], 1), f(s.w[2], 2)].join(','));
  else if (s.c) parts.push('c=' + [f(s.c[0]), f(s.c[1]), f(s.c[2]), f(s.c[3], 2), f(s.c[4], 2)].join(','));
  if (s.h != null) parts.push('h=' + f(s.h, 2));
  if (s.p && !s.in) parts.push('p=' + s.p);
  if (s.e && !s.in) parts.push('e=' + s.e);
  return '#' + parts.join('&');
}
