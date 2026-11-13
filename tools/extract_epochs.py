#!/usr/bin/env python3
"""Extrait les couches d'époques du SIG ALPAGE vers data/epoques.json (calque temporel de la maquette).

Sources : couches GeoPackage diffusées par le projet ALPAGE (https://alpage.huma-num.fr/donnees-sig/) sous licence
ODbL 1.0 — enceintes, îlots de 1300, 1553, 1652, 1741, 1791 et 1810-1836, rues et monuments de Lutèce, emprises
futures du plan de 1380, établissements ecclésiastiques, hydrographie. `tools/fetch_alpage.py` les télécharge dans
data/source/alpage/. Le fichier produit est une base dérivée, diffusée sous la même licence ODbL 1.0.

Coordonnées de sortie : celles de la maquette (mètres, x vers l'est, z vers le sud, origine au parvis de Notre-Dame).
Les couches ALPAGE sont en Lambert-93 ; le passage de l'un à l'autre est une similitude ajustée sur les îlots de 1380,
présents à la fois dans le SIG et dans le plan déjà utilisé par la maquette (écart médian : 2 à 3 m).

Géométries : entiers (mètres × q), en écarts successifs, écrits en base 64 à longueur variable (comme les « mappings »
des source maps). Polygones : [nb, puis pour chacun : nb d'anneaux, puis pour chaque anneau : nb de points, écarts…].
Lignes : [nb, puis pour chacune : nb de points, écarts…].
"""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gpkg

SRC = os.path.join(HERE, '..', 'data', 'source', 'alpage')
PLAN = os.path.join(HERE, '..', 'data', 'paris1380.json')
OUT = os.path.join(HERE, '..', 'data', 'epoques.json')
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def layer(name):
    return list(gpkg.read(os.path.join(SRC, name + '.gpkg')))


def area_centroid(ring):
    a = cx = cy = 0.0
    for i in range(len(ring)):
        x0, y0 = ring[i]; x1, y1 = ring[(i + 1) % len(ring)]; c = x0 * y1 - x1 * y0
        a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    a *= 0.5
    return (abs(a), (cx / (6 * a), cy / (6 * a))) if abs(a) > 1e-9 else (0.0, ring[0])


# ---------------------------------------------------------------- recalage Lambert-93 → maquette
def register():
    raw = json.load(open(PLAN, encoding='utf8'))
    model = []                                  # (aire, x, n) avec n = −z : repère direct, comme le Lambert
    for s in raw['layers']['Bati']:
        if s['k'] != 'g' or (s.get('f') or '').upper() != '#BFBFBF': continue
        a, c = area_centroid([(s['p'][i], -s['p'][i + 1]) for i in range(0, len(s['p']), 2)])
        if a > 150: model.append((a, c[0], c[1]))
    gis = []
    for d, g in layer('1380_ilots'):
        for poly in gpkg.polygons(g):
            a, c = area_centroid(poly[0])
            if a > 150: gis.append((a, c[0], c[1], d.get('IN_OUT')))
    inside = [g for g in gis if g[3] == 'Dans les murs']
    a, b = 1.0, 0.0
    tx = sum(m[1] for m in model) / len(model) - sum(g[1] for g in inside) / len(inside)
    ty = sum(m[2] for m in model) / len(model) - sum(g[2] for g in inside) / len(inside)
    pairs = []
    for it in range(60):                        # plus proches voisins de même taille, rayon de recherche décroissant
        tol = max(12, 220 * (0.86 ** it)); pairs = []
        for ga, E, N, _ in gis:
            x, n = a * E - b * N + tx, b * E + a * N + ty; best = None; bd = tol
            for ma, px, pn in model:
                d = math.hypot(px - x, pn - n)
                if d < bd and 0.6 < ma / ga < 1.6: bd = d; best = (px, pn)
            if best: pairs.append((E, N, best[0], best[1]))
        k = len(pairs)
        Em = sum(p[0] for p in pairs) / k; Nm = sum(p[1] for p in pairs) / k; xm = sum(p[2] for p in pairs) / k; ym = sum(p[3] for p in pairs) / k
        sxx = sxy = var = 0.0
        for E, N, x, y in pairs:
            de, dn, dx, dy = E - Em, N - Nm, x - xm, y - ym
            sxx += de * dx + dn * dy; sxy += de * dy - dn * dx; var += de * de + dn * dn
        a, b = sxx / var, sxy / var; tx, ty = xm - (a * Em - b * Nm), ym - (b * Em + a * Nm)
    res = sorted(math.hypot(a * E - b * N + tx - x, b * E + a * N + ty - y) for E, N, x, y in pairs)
    info = {'couples': len(pairs), 'echelle': round(math.hypot(a, b), 5), 'rotation_deg': round(math.degrees(math.atan2(b, a)), 3),
            'ecart_median_m': round(res[len(res) // 2], 1), 'ecart_p90_m': round(res[int(len(res) * 0.9)], 1)}
    return (lambda E, N: (a * E - b * N + tx, -(b * E + a * N + ty))), info


# ---------------------------------------------------------------- simplification et écriture compacte
def dp(pts, tol):
    """Douglas-Peucker sur une ligne ouverte."""
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop(); ax, ay = pts[i]; bx, by = pts[j]; dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-9
        best = -1; bd = tol
        for k in range(i + 1, j):
            d = abs((pts[k][0] - ax) * dy - (pts[k][1] - ay) * dx) / L if L > 1e-6 else math.hypot(pts[k][0] - ax, pts[k][1] - ay)
            if d > bd: bd = d; best = k
        if best > 0: keep[best] = True; stack.append((i, best)); stack.append((best, j))
    return [p for p, k in zip(pts, keep) if k]


def simplify_ring(ring, tol):
    if len(ring) > 1 and ring[0] == ring[-1]: ring = ring[:-1]
    if len(ring) < 4: return ring
    far = max(range(len(ring)), key=lambda i: (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2)
    out = dp(ring[:far + 1], tol)[:-1] + dp(ring[far:] + [ring[0]], tol)[:-1]
    return out if len(out) >= 3 else ring[:3]


def vlq(values):
    out = []
    for v in values:
        v = (abs(v) << 1) | (1 if v < 0 else 0)
        while True:
            d = v & 31; v >>= 5
            out.append(B64[d | (32 if v else 0)])
            if not v: break
    return ''.join(out)


class Enc:
    """Suite d'entiers en écarts, à la précision 1/q mètre."""
    def __init__(self, q=1): self.q = q; self.v = []; self.cx = 0; self.cz = 0
    def pt(self, p):
        x, z = round(p[0] * self.q), round(p[1] * self.q); self.v += [x - self.cx, z - self.cz]; self.cx, self.cz = x, z
    def ring(self, ring):
        q = self.q; pts = []
        for p in ring:                                   # points confondus après arrondi : un seul
            k = (round(p[0] * q), round(p[1] * q))
            if not pts or k != pts[-1]: pts.append(k)
        if len(pts) > 1 and pts[0] == pts[-1]: pts.pop()
        self.v.append(len(pts))
        for x, z in pts: self.v += [x - self.cx, z - self.cz]; self.cx, self.cz = x, z


def enc_polys(polys, q=1):
    e = Enc(q); e.v.append(len(polys))
    for rings in polys:
        e.v.append(len(rings))
        for r in rings: e.ring(r)
    return vlq(e.v)


def enc_lines(lines, q=1):
    e = Enc(q); e.v.append(len(lines))
    for l in lines:
        e.v.append(len(l))
        for p in l: e.pt(p)
    return vlq(e.v)


def main():
    T, reg = register()
    print('recalage :', reg)

    def polys_of(g, tol, min_area=0.0):
        out = []
        for poly in gpkg.polygons(g):
            rings = []
            for k, ring in enumerate(poly):
                r = simplify_ring([T(*p) for p in ring], tol)
                a, _ = area_centroid(r)
                if len(r) >= 3 and (a >= min_area if k == 0 else a >= 60): rings.append(r)
                elif k == 0: break
            if rings: out.append(rings)
        return out

    def lines_of(g, tol):
        return [l for l in (dp([T(*p) for p in line], tol) for line in gpkg.lines(g)) if len(l) >= 2]

    data = {'meta': {
        'source': 'SIG ALPAGE (AnaLyse diachronique de l’espace urbain PArisien : approche GEomatique), https://alpage.huma-num.fr/donnees-sig/',
        'licence': 'Open Database License 1.0 (ODbL) — base dérivée, diffusée sous la même licence',
        'reperes': 'mètres, x vers l’est, z vers le sud, origine au parvis de Notre-Dame (repère de la maquette)',
        'recalage': reg}}

    # ---- enceintes : emprise au sol ; « until » : disparition des ouvrages d'après la couche Tours_portes (voir plus bas)
    WALLS = [('romaine', 'romaine', 'Enceinte romaine de la Cité', 'D. Gherdevich', 1200),
             ('carolingienne', 'carolingienne', 'Enceinte carolingienne (tracé hypothétique)', 'H. Noizet', 1215),
             ('philippe-auguste', 'Philippe-Auguste', 'Enceinte de Philippe Auguste', 'A.-L. Bethe, H. Noizet', 1700),
             ('charles-v', 'Charles-V', 'Enceinte de Charles V', 'A.-L. Bethe, N. Faucherre', 1700),
             ('fosses-jaunes', 'Fossés jaunes', 'Enceinte des Fossés jaunes', 'Y. Brault', 1700),
             ('fermiers-generaux', 'Fermiers généraux', 'Mur des Fermiers généraux', 'P. Rouet', 1860)]
    by = {}
    for d, g in layer('Enceintes'): by.setdefault(d['Libelle'], []).append((d, g))
    walls = []
    for wid, lib, name, authors, until in WALLS:
        items = by[lib]; polys = [p for d, g in items for p in polys_of(g, 0.6)]
        d0 = items[0][0]
        # début : la plus tardive des dates de début proposées (existence certaine) ; achevé : la plus tardive des dates de fin de chantier
        walls.append({'id': wid, 'nom': name, 'debut': int(max(d['DD2'] for d, _ in items)), 'acheve': int(max(d['DF2'] for d, _ in items)), 'jusqu': until,
                      'auteurs': authors, 'ref': d0['bibliograp'], 'q': 2, 'g': enc_polys(polys, 2), 'n': len(polys)})
        print('enceinte', wid, walls[-1]['debut'], walls[-1]['acheve'], len(polys), 'polygones', len(walls[-1]['g']), 'car.')
    data['enceintes'] = walls
    # contrôle : dates de disparition des tours et portes, par enceinte (fourchette la plus fréquente)
    seen = {}
    for d, _ in layer('Tours_portes'): seen.setdefault(d['enceinte'], {}).setdefault((d['DF1'], d['DF2']), 0); seen[d['enceinte']][(d['DF1'], d['DF2'])] += 1
    for k, v in seen.items(): print('  ouvrages', k, sorted(v.items(), key=lambda kv: -kv[1])[:2])

    # ---- îlots par époque. t : U urbain, I intermédiaire, R rural (densité lue sur le plan d'époque quand elle existe)
    def typo_1300(d): return 'R' if (d.get('REGION') or '').startswith('île non') else 'I' if (d.get('IN_OUT1300') or '').startswith('hors') else 'U'
    def typo_plan(d): return {'Urbain': 'U', 'Intermediaire': 'I', 'Rural': 'R'}.get(d.get('typologie_'), 'I')
    ILOTS = [('1300', 'Ilots_1300', typo_1300, 'Îlots d’habitation en 1300, restitués d’après les rôles de la taille de 1299 et 1300', '© ALPAGE : IRHT (C. Bourlet), A.-L. Bethe', 'dans'),
             ('1553', 'Ilots_1553', typo_plan, 'Îlots vers 1553, d’après le plan de Truschet et Hoyau, dit plan de Bâle', '© ALPAGE : D. Gherdevich, H. Noizet', 'plan'),
             ('1652', 'Ilots_1652', typo_plan, 'Îlots vers 1652, d’après le plan de Gomboust', '© ALPAGE : D. Gherdevich, H. Noizet', 'plan'),
             ('1741', 'Ilots_1741', typo_plan, 'Îlots vers 1741, d’après le plan de Delagrive', '© ALPAGE : D. Gherdevich, H. Noizet', 'plan'),
             ('1791', 'Ilots_1791', None, 'Îlots du plan de Verniquet (levé de 1782 à 1790)', '© ALPAGE : P. Rouet', 'aire'),
             ('1836', 'Vasserot_2_Ilots_calibres', None, 'Îlots de l’Atlas par îlots de Vasserot (1810-1836)', 'Arch. nat. F31 73-96 – Arch. Paris © ALPAGE : P. Rouet', 'aire')]
    data['ilots'] = {}
    for year, name, typo, title, credit, mode in ILOTS:
        polys = []; t = []; area = {'U': 0.0, 'I': 0.0, 'R': 0.0}
        for d, g in layer(name):
            for rings in polys_of(g, 1.5, 60.0):
                a = area_centroid(rings[0])[0] - sum(area_centroid(r)[0] for r in rings[1:])
                c = typo(d) if typo else ('U' if a < 30000 else 'I' if a < 90000 else 'R')       # sans indication du plan : la taille de l'îlot
                polys.append(rings); t.append(c); area[c] += a
        data['ilots'][year] = {'titre': title, 'credit': credit, 'densite': mode, 'n': len(polys), 'ha': {k: round(v / 1e4) for k, v in area.items()}, 't': ''.join(t), 'q': 1, 'g': enc_polys(polys, 1)}
        print('îlots', year, len(polys), 'polygones', data['ilots'][year]['ha'], len(data['ilots'][year]['g']), 'car.')

    # ---- Lutèce : rues, monuments, rivages (restitution de T. Vacquer ; monuments du plan de 1380)
    rues = [l for d, g in layer('Rues_Lutece_Vacquer') for l in lines_of(g, 1.5)]
    eau = []
    for d, g in layer('Hydro_romaine_Vacquer'):
        for l in lines_of(g, 3.0): eau.append(l)
    mon = [{'nom': d['Nom'].replace('Arenes', 'Arènes'), 'q': 1, 'g': enc_polys(polys_of(g, 1.0), 1)} for d, g in layer('1380_antiquites_romaines')]
    data['lutece'] = {'rues': enc_lines(rues, 1), 'eau': enc_lines(eau, 1), 'monuments': mon,
                      'credit': 'Rues et rivages de Lutèce restitués par T. Vacquer © ALPAGE : M. Fernandez ; monuments © ALPAGE : P. Rouet'}
    print('Lutèce', len(rues), 'rues', len(eau), 'lignes d’eau', [m['nom'] for m in mon])

    # ---- emprises futures : édifices et voies postérieurs à 1380, reportés sur le plan de 1380
    fut = []
    for d, g in layer('1380_emprises_futures'):
        p = polys_of(g, 1.0)
        if not p: continue
        fut.append({'nom': d['TOPONYME'].replace('Hotel', 'Hôtel').replace('Eglise', 'Église').replace('Archevêques', 'archevêques').replace('Zone Batie', 'Zone bâtie'), 'nature': d['NATURE'].replace('Hotel', 'Hôtel').replace('Eglise', 'Église').replace('Zone Batie', 'Zone bâtie'),
                    'date': (d['DATE'] or '').replace('ulterieuremen', 'ultérieurement').replace('ultérieurementt', 'ultérieurement').replace('ulterieurement', 'ultérieurement').replace('Percee', 'Percée').replace('constructio', 'construction').replace('constructionn', 'construction'), 'q': 1, 'g': enc_polys(p, 1)})
    data['futur'] = {'credit': '© ALPAGE : P. Rouet, d’après le plan restitué de 1380 (CNRS Éditions)', 'objets': fut}
    print('emprises futures', len(fut), sorted(set(f['nature'] for f in fut)))

    # ---- établissements ecclésiastiques (816-1790) : [x, z, début 1, début 2, fin 1, fin 2, statut, nom]
    STATUTS = ['Cathédrale', 'Basilique', 'Eglise collégiale', 'Eglise paroissiale', 'Chapelle', 'Couvent', 'Collège', 'Communauté', 'Séminaire', 'Baptistère', 'Autre']
    egl = []
    for d, g in layer('Eglises'):
        if not g or g[0] != 'Point' or not all(math.isfinite(c) for c in g[1]): continue
        try: dates = [int(d[k]) for k in ('DD1', 'DD2', 'DF1', 'DF2')]
        except (TypeError, ValueError): continue
        x, z = T(*g[1])
        egl.append([round(x), round(z)] + dates + [STATUTS.index(d['Statut']) if d['Statut'] in STATUTS else len(STATUTS) - 1, (d['Nom_court'] or d['Titulature'] or '').strip()])
    data['eglises'] = {'statuts': [s.replace('Eglise', 'Église') for s in STATUTS], 'credit': '© ALPAGE : É. Lallau', 'objets': egl}
    print('églises', len(egl))

    # ---- hydrographie : la Seine et ses îles à la fin du XVIIIe siècle et vers 1830
    data['eau'] = {}
    for year, name, credit in [('1791', 'Hydro_1791', '© ALPAGE : P. Rouet, d’après le plan de Verniquet'), ('1836', 'Vasserot_2_Hydro', 'Arch. nat. F31 73-96 – Arch. Paris © ALPAGE : P. Rouet')]:
        polys = [p for d, g in layer(name) for p in polys_of(g, 2.5, 400.0)]
        data['eau'][year] = {'credit': credit, 'q': 1, 'g': enc_polys(polys, 1), 'n': len(polys)}
        print('eau', year, len(polys), 'polygones', len(data['eau'][year]['g']), 'car.')

    json.dump(data, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print('écrit', OUT, round(os.path.getsize(OUT) / 1024), 'Ko')


if __name__ == '__main__':
    main()
