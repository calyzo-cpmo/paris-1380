#!/usr/bin/env python3
"""Étude des données de Paris 1937 : ce que le bâti daté de l'APUR et la base « Paris 1900 » disent de la ville de 1937.

  python3 tools/etude_1937.py          mesures de ETUDE-1937.md → data/source/1937/etude_1937.json

N'écrit rien d'autre. Lit les sources de Paris 1889 déjà téléchargées (data/source/1889/, tools/fetch_1889.py) ; demande
en plus à l'APUR (données ouvertes, ODbL 1.0) les arrondissements, l'enceinte de Thiers et les tronçons de voie actuels,
gardés dans data/source/1937/ (non versionné). Tout est mesuré en Lambert-93.

Le bâti d'aujourd'hui est classé à la date de 1937, comme pour 1889 et 1900 (tools/extract_1889.py) :
  R  réel        périodes de l'APUR jusqu'à 1851-1914, ou année de construction 1937 ou avant ;
  P  probable    période 1915-1939 sans année (98,5 % des bâtiments datés de cette période le sont de 1937 ou d'avant) ;
  N  postérieur  après 1937 : ce qui se trouvait là en 1937 est à recomposer ;
  A  sans date   période inconnue.
Puis : où est le bâti postérieur (îlots de 1900 bâtis ou non, zones refaites d'un bloc), ce qu'est devenue l'enceinte,
quelles voies ont été ouvertes ou supprimées de 1901 à 1937 et après (d'après la date des bâtiments qui les bordent ou
qui les recouvrent).
"""
import collections, glob, json, math, os, sys, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fetch_1889 import get, lambert93_inverse                                      # noqa: E402

SRC = os.path.join(HERE, '..', 'data', 'source', '1889')
OUT = os.path.join(HERE, '..', 'data', 'source', '1937')
AN = 1937
APUR = 'https://carto2.apur.org/apur/rest/services/%s/MapServer/%d/query'


def apur(service, couche, champs, nom, page=2000):
    """Une couche de l'APUR, en Lambert-93, gardée dans data/source/1937/nom.json."""
    p = os.path.join(OUT, nom + '.json')
    if os.path.exists(p): return json.load(open(p))
    n = json.loads(get(APUR % (service, couche) + '?' + urllib.parse.urlencode({'where': '1=1', 'returnCountOnly': 'true', 'f': 'json'})))['count']
    feats = []
    for off in range(0, n, page):
        q = {'where': '1=1', 'outFields': champs, 'outSR': 2154, 'geometryPrecision': 1, 'orderByFields': 'OBJECTID', 'resultOffset': off, 'resultRecordCount': page, 'f': 'json'}
        d = json.loads(get(APUR % (service, couche) + '?' + urllib.parse.urlencode(q)))
        if 'features' not in d: raise SystemExit('APUR, %s : réponse inattendue %s' % (nom, str(d)[:200]))
        feats += d['features']
    print('  ', nom, ':', len(feats), 'entités')
    with open(p, 'w') as f: json.dump(feats, f)
    return feats


# ---------------------------------------------------------------- géométrie
def aire(r): return abs(sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r))) / 2)
def boite(r): xs = [p[0] for p in r]; ys = [p[1] for p in r]; return min(xs), min(ys), max(xs), max(ys)
def dans(r, x, y):
    c = False; j = len(r) - 1
    for i in range(len(r)):
        a, b = r[i], r[j]
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]: c = not c
        j = i
    return c
def le_long(pts, pas):
    """Points d'une ligne tous les `pas` mètres environ, avec la longueur que chacun représente."""
    for a, b in zip(pts, pts[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1]); n = max(1, int(L / pas))
        for k in range(n): yield (a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n), L / n
def latlon(x, y): la, lo = lambert93_inverse(x, y); return [round(la, 5), round(lo, 5)]


class Grille:
    """Rangement par cases, pour ne comparer que des voisins."""
    def __init__(self, pas): self.pas = pas; self.c = collections.defaultdict(list)
    def point(self, x, y, o): self.c[(int(x // self.pas), int(y // self.pas))].append(o)
    def boite(self, b, o):
        for i in range(int(b[0] // self.pas), int(b[2] // self.pas) + 1):
            for j in range(int(b[1] // self.pas), int(b[3] // self.pas) + 1): self.c[(i, j)].append(o)
    def en(self, x, y): return self.c.get((int(x // self.pas), int(y // self.pas)), ())
    def autour(self, x, y, r):
        for i in range(int((x - r) // self.pas), int((x + r) // self.pas) + 1):
            for j in range(int((y - r) // self.pas), int((y + r) // self.pas) + 1): yield from self.c.get((i, j), ())


def statut(per, an):
    if per in (1, 2, 3) or (an and an <= AN and per != 99): return 'R'
    if per == 5 and not an: return 'P'
    if per == 99: return 'A'
    return 'N'


def zones_refaites(B, pas, part, aire_min):
    """Cellules de `pas` mètres où le bâti postérieur à AN dépasse `part` de l'emprise bâtie, reliées par leurs côtés."""
    cel = collections.defaultdict(collections.Counter)
    for b in B: cel[(int(b['c'][0] // pas), int(b['c'][1] // pas))][b['st']] += b['a']
    fortes = {k for k, v in cel.items() if v['N'] > part * sum(v.values()) and v['N'] > aire_min}
    zones, vus = [], set()
    for k in sorted(fortes):
        if k in vus: continue
        pile, z = [k], []; vus.add(k)
        while pile:
            c = pile.pop(); z.append(c)
            for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (c[0] + d[0], c[1] + d[1])
                if n in fortes and n not in vus: vus.add(n); pile.append(n)
        zs = set(z); aN = sum(cel[c]['N'] for c in z)
        x = sum((c[0] + 0.5) * pas * cel[c]['N'] for c in z) / aN; y = sum((c[1] + 0.5) * pas * cel[c]['N'] for c in z) / aN
        ans = sorted(b['an'] for b in B if b['st'] == 'N' and b['an'] and (int(b['c'][0] // pas), int(b['c'][1] // pas)) in zs)
        xs = [c[0] for c in z]; ys = [c[1] for c in z]
        zones.append({'ha': round(aN / 1e4, 1), 'km': [round((max(xs) - min(xs) + 1) * pas / 1000, 2), round((max(ys) - min(ys) + 1) * pas / 1000, 2)],
                      'latlon': latlon(x, y), 'annees': [ans[len(ans) // 4], ans[len(ans) // 2], ans[3 * len(ans) // 4]] if ans else None})
    return sorted(zones, key=lambda z: -z['ha'])


def main():
    os.makedirs(OUT, exist_ok=True)
    if not glob.glob(os.path.join(SRC, 'emprise_batie_paris_*.json')): raise SystemExit('sources absentes : python3 tools/fetch_1889.py')
    R = {'annee': AN}

    # ---------------------------------------------------------------- arrondissements, enceinte de Thiers
    arr = []
    for f in apur('OPENDATA/ARRONDISSEMENT', 0, 'C_AR', 'arrondissements'):
        rings = (f.get('geometry') or {}).get('rings') or []
        if rings: arr.append((f['attributes'].get('C_AR'), rings, boite(max(rings, key=aire))))
    def arrdt(x, y):
        for num, rings, b in arr:
            if b[0] <= x <= b[2] and b[1] <= y <= b[3] and sum(dans(r, x, y) for r in rings) % 2: return num
        return None
    gf = Grille(400)
    for f in apur('PLANS_HISTORIQUES/enceintes_paris', 0, '*', 'fortifications_thiers'):
        for r in (f.get('geometry') or {}).get('rings') or []: gf.boite(boite(r), r)
    def en_fortif(x, y): return sum(dans(r, x, y) for r in gf.en(x, y)) % 2 == 1

    # ---------------------------------------------------------------- bâti d'aujourd'hui, classé à la date de AN
    B = []
    for p in sorted(glob.glob(os.path.join(SRC, 'emprise_batie_paris_*.json'))):
        for f in json.load(open(p))['features']:
            at = f['attributes']; rings = (f.get('geometry') or {}).get('rings') or []
            if not rings: continue
            r = max(rings, key=aire); bb = boite(r); per = at.get('c_perconst') or 99; an = at.get('an_const')
            B.append({'c': ((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2), 'a': aire(r), 'r': r, 'bb': bb, 'st': statut(per, an), 'an': an, 'tissu': at.get('c_tissu') or ''})
    tot = sum(b['a'] for b in B); n = collections.Counter(b['st'] for b in B); a = collections.Counter()
    for b in B: a[b['st']] += b['a']
    R['bati'] = {k: {'n': n[k], 'ha': round(a[k] / 1e4), 'part': round(a[k] / tot, 3)} for k in 'RPNA'}
    neufs = [b for b in B if b['an'] and 1900 < b['an'] <= AN]
    R['bati_1901_%d' % AN] = {'n': len(neufs), 'ha': round(sum(b['a'] for b in neufs) / 1e4)}
    print('bâti d’aujourd’hui à la date de %d :' % AN, R['bati'], '; dont bâti de 1901 à %d :' % AN, R['bati_1901_%d' % AN])
    par = collections.defaultdict(collections.Counter)
    for b in B: par[arrdt(*b['c'])][b['st']] += b['a']
    R['part_posterieure_par_arrondissement'] = {str(k): round(v['N'] / sum(v.values()), 2) for k, v in sorted(par.items(), key=lambda kv: kv[0] or 99) if k}
    print('part du bâti postérieur à %d, par arrondissement :' % AN, R['part_posterieure_par_arrondissement'])
    hbm = collections.Counter(b['st'] for b in B if b['tissu'] == 'HBM'); fo = collections.Counter()
    for b in B:
        if en_fortif(*b['c']): fo[b['st']] += b['a']
    R['tissu_HBM'] = dict(hbm); R['enceinte_ha'] = {k: round(v / 1e4, 1) for k, v in fo.items()}
    print('tissu « HBM » de l’APUR, par statut :', R['tissu_HBM'], '; bâti sur l’emprise de l’enceinte (ha) :', R['enceinte_ha'])

    # ---------------------------------------------------------------- îlots de 1900
    I = []
    for f in json.load(open(os.path.join(SRC, 'PTM_Paris1900_ilots.geojson'), encoding='utf8'))['features']:
        g = f['geometry']
        if not g: continue
        for poly in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]):
            if len(poly[0]) >= 4: I.append({'r': poly[0], 'trous': poly[1:], 'bb': boite(poly[0]), 'p': f['properties'], 'b': collections.Counter()})
    gi = Grille(150)
    for i in I: gi.boite(i['bb'], i)
    def ilot(x, y):
        for i in gi.en(x, y):
            if i['bb'][0] <= x <= i['bb'][2] and i['bb'][1] <= y <= i['bb'][3] and dans(i['r'], x, y) and not any(dans(t, x, y) for t in i['trous']): return i
        return None
    ou = collections.Counter()
    for b in B:
        i = ilot(*b['c'])
        if b['st'] == 'N': ou['îlot bâti de 1900' if i and i['p'].get('Bati_nonBati') == 'Bâti' else 'îlot non bâti de 1900' if i else 'hors des îlots de 1900'] += b['a']
        if i: i['b']['v' if b['st'] == 'R' and not (b['an'] and b['an'] > 1900) else 'r' if b['st'] in 'RP' else b['st']] += b['a']
    R['posterieur_ha_selon_ilot_1900'] = {k: round(v / 1e4) for k, v in ou.items()}
    print('bâti postérieur à %d (ha), selon l’îlot de 1900 :' % AN, R['posterieur_ha_selon_ilot_1900'])
    tab = collections.defaultdict(collections.Counter)
    for i in I:
        s = i['b']; t = sum(s.values())
        q = 'peu bâti aujourd’hui' if t < 50 else 'refait après %d' % AN if s['N'] > 0.5 * t else 'rebâti en partie de 1901 à %d' % AN if s['r'] > 0.3 * t else 'ancien'
        tab[i['p'].get('modif_ilot') or '?'][q] += 1
    R['ilots_1900'] = {k: dict(v) for k, v in tab.items()}
    print('îlots de 1900, selon leur changement depuis 1900 (base PTM) et la date de leur bâti actuel :')
    for k, v in R['ilots_1900'].items(): print('   ', k, v)

    # ---------------------------------------------------------------- zones refaites d'un bloc
    R['zones'] = zones_refaites(B, 150, 0.6, 4000)
    print(len(R['zones']), 'zones refaites après %d (cellules de 150 m) : %d ha de bâti postérieur sur %d' % (AN, sum(z['ha'] for z in R['zones']), R['bati']['N']['ha']))
    for z in R['zones'][:25]: print('   ', z)

    # ---------------------------------------------------------------- rues : 1900 contre aujourd'hui
    act = [l for f in apur('OPENDATA/TRONCON_VOIE_PARIS', 0, 'OBJECTID', 'troncons_voie_paris') for l in (f.get('geometry') or {}).get('paths') or []]
    r1900 = []
    for f in json.load(open(os.path.join(SRC, 'PTM_Paris1900_rues.geojson'), encoding='utf8'))['features']:
        g = f['geometry']
        if g: r1900 += g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
    ga, g0, gb = Grille(25), Grille(25), Grille(40)
    for l in act:
        for q, _ in le_long(l, 8): ga.point(q[0], q[1], q)
    for l in r1900:
        for q, _ in le_long(l, 8): g0.point(q[0], q[1], q)
    for b in B: gb.boite(b['bb'], b)
    def proche(g, q, d): return any(math.hypot(o[0] - q[0], o[1] - q[1]) < d for o in g.autour(q[0], q[1], d))
    def en_ville(q):                                                    # à moins de 30 m d'un îlot de 1900 (les bois n'en ont pas)
        return any(i['bb'][0] - 30 <= q[0] <= i['bb'][2] + 30 and i['bb'][1] - 30 <= q[1] <= i['bb'][3] + 30 for i in gi.autour(q[0], q[1], 30))
    def sous(q):
        for b in gb.en(q[0], q[1]):
            if b['bb'][0] <= q[0] <= b['bb'][2] and b['bb'][1] <= q[1] <= b['bb'][3] and dans(b['r'], q[0], q[1]): return b
        return None
    def riverains(q, d=22):
        c = collections.Counter()
        for b in gb.autour(q[0], q[1], d):
            if abs(b['c'][0] - q[0]) < d + 15 and abs(b['c'][1] - q[1]) < d + 15:
                c['v' if b['st'] == 'R' and not (b['an'] and b['an'] > 1900) else 'r' if b['st'] in 'RP' else b['st']] += b['a']
        return c
    nv, lieux = collections.Counter(), collections.Counter()
    for l in act:                                                       # voies d'aujourd'hui à plus de 12 m d'une voie de 1900
        for q, L in le_long(l, 8):
            if proche(g0, q, 12): continue
            if not en_ville(q): nv['hors de la ville de 1900 (bois, périphérique)'] += L; continue
            if en_fortif(*q): nv['sur l’enceinte'] += L; continue
            rv = riverains(q); t = sum(rv.values())
            if t < 30: k = 'sans riverains'
            elif rv['N'] > 0.6 * t: k = 'bordées de bâti postérieur à %d' % AN
            elif rv['r'] > 0.25 * t: k = 'bordées de bâti de 1901 à %d' % AN; lieux[(int(q[0] // 400), int(q[1] // 400))] += L
            else: k = 'bordées de bâti antérieur à 1900'
            nv[k] += L
    R['voies_absentes_en_1900_km'] = {k: round(v / 1000, 1) for k, v in nv.items()}
    R['voies_ouvertes_1901_%d_lieux' % AN] = [[latlon((k[0] + 0.5) * 400, (k[1] + 0.5) * 400), round(L)] for k, L in lieux.most_common(20)]
    print('voies d’aujourd’hui absentes de la base de 1900 (km) :', R['voies_absentes_en_1900_km'])
    ds, ld = collections.Counter(), collections.Counter()
    for l in r1900:                                                     # voies de 1900 à plus de 12 m d'une voie d'aujourd'hui
        for q, L in le_long(l, 8):
            if proche(ga, q, 12): continue
            b = sous(q)
            if b is None: k = 'sous un espace libre'
            elif b['st'] == 'N': k = 'sous un bâtiment postérieur à %d' % AN; ld[('N',) + (int(q[0] // 400), int(q[1] // 400))] += L
            elif b['st'] in 'RP' and b['an'] and b['an'] > 1900: k = 'sous un bâtiment de 1901 à %d' % AN; ld[('r',) + (int(q[0] // 400), int(q[1] // 400))] += L
            elif b['st'] == 'A': k = 'sous un bâtiment sans date'
            else: k = 'sous un bâtiment antérieur à 1900 (écart de tracé)'
            ds[k] += L
    R['voies_1900_disparues_km'] = {k: round(v / 1000, 1) for k, v in ds.items()}
    R['voies_supprimees_apres_%d_lieux' % AN] = [[latlon((k[1] + 0.5) * 400, (k[2] + 0.5) * 400), round(L)] for k, L in ld.most_common() if k[0] == 'N'][:20]
    R['voies_supprimees_1901_%d_lieux' % AN] = [[latlon((k[1] + 0.5) * 400, (k[2] + 0.5) * 400), round(L)] for k, L in ld.most_common() if k[0] == 'r'][:10]
    print('voies de 1900 sans voie d’aujourd’hui à moins de 12 m (km) :', R['voies_1900_disparues_km'])
    for k in ('voies_ouvertes_1901_%d_lieux' % AN, 'voies_supprimees_apres_%d_lieux' % AN, 'voies_supprimees_1901_%d_lieux' % AN): print('   ', k, R[k][:10])
    p = os.path.join(OUT, 'etude_1937.json')
    with open(p, 'w', encoding='utf8') as f: json.dump(R, f, ensure_ascii=False, indent=1)
    print('écrit', os.path.relpath(p))


if __name__ == '__main__':
    main()
