#!/usr/bin/env python3
"""Extrait les données de la page « Paris 1889 » vers data/paris1889.json.

Aucune base vectorielle ne décrit le bâti de Paris en 1889. La ville est donc recomposée, et chaque bâtiment garde la
trace de ce qui le justifie (champ `s`) :
  R  réel       bâtiment d'aujourd'hui que l'Atelier parisien d'urbanisme (APUR) date de 1889 ou d'avant : son emprise et
                sa hauteur sont celles que l'on mesure aujourd'hui ;
  P  probable   bâtiment d'aujourd'hui daté « 1851-1914 » sans année (ou « 1890 », date arrondie), dans un voisinage
                dont les bâtiments datés sont en majorité antérieurs à 1890 ;
  V  disparu    emprise de l'Atlas de Vasserot (1810-1836) là où le bâtiment actuel est postérieur à 1889 : dans le
                centre, c'est la meilleure trace de ce qui se trouvait là ;
  E  évoqué     hors de l'atlas de Vasserot, là où le bâtiment actuel est postérieur à 1889 mais où le quartier était
                bâti : un immeuble de l'époque est évoqué sur l'emprise actuelle ;
  G  évoqué     ailleurs, le long des rues de 1900 : des maisons de faubourg, d'autant plus serrées que le voisinage
                garde de bâtiments anciens. Sans elles, les arrondissements extérieurs — peuplés autant qu'aujourd'hui
                en 1889, mais presque entièrement rebâtis depuis — paraîtraient vides.
Îlots et rues sont ceux de la base « Paris 1900 » (onze ans plus tard) ; son pourtour dessine l'enceinte de Thiers.

Sources (tools/fetch_1889.py les télécharge) : APUR, données ouvertes, ODbL 1.0 ; base « Paris 1900 — les îlots, les
voies et les adresses », Projets Time Machine, ODbL 1.0, DOI 10.34847/nkl.cbf5ecd0 ; Atlas de Vasserot © ALPAGE, ODbL
1.0 ; RGE ALTI de l'IGN, licence ouverte Etalab 2.0. Même repère et même recalage que tools/extract_epochs.py.
Le fichier produit est une base dérivée, sous ODbL 1.0.
"""
import glob, json, math, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import extract_epochs as X

SRC = os.path.join(HERE, '..', 'data', 'source', '1889')
OUT = os.path.join(HERE, '..', 'data', 'paris1889.json')
P1789 = os.path.join(HERE, '..', 'data', 'paris1789.json')
AN = 1889
PAS = 50           # pas de la grille de relief (m)
MARGE = 500        # marge autour des îlots de 1900 (m)
VOISIN = 130       # rayon du voisinage qui décide des bâtiments sans année (m)

# Jardins, promenades et bois qui existaient en 1889, d'après leur nom actuel dans la base des équipements de l'APUR.
JARDINS = re.compile(r"BUTTES.CHAUMONT|TUILERIES|LUXEMBOURG|JARDIN DES PLANTES|MONTSOURIS|PARC MONCEAU|CHAMPS.ELYS|TROCAD|RANELAGH|"
                     r"ESPLANADE DES INVALIDES|AVENUE FOCH|CARROUSEL|PALAIS.ROYAL|BOIS DE BOULOGNE|BOIS DE VINCENNES|ACCLIMATATION|"
                     r"PR. CATELAN|BAGATELLE|SQUARE DU TEMPLE|BATIGNOLLES$|SQUARE DES BATIGNOLLES|MONTHOLON|TOUR SAINT.JACQUES|LOUVOIS|"
                     r"VIOLET|SQUARE LOUIS XVI|SQUARE DE LA TRINIT|SQUARE SAINTE.CLOTILDE|VERT.GALANT|ARCHEV|JEAN XXIII|SQUARE DES INNOCENTS|"
                     r"PLACE DES VOSGES|SQUARE LOUIS XIII|CHAMP DE MARS|OBSERVATOIRE DE PARIS|AVENUE DE L.OBSERVATOIRE|MARCO POLO|CAVELIER|"
                     r"SAINTE.P.RINE|SQUARE D.ANVERS|SQUARE MONGE|PAUL LANGEVIN|ARTS ET M.TIERS|CHAUTEMPS|BERLIOZ|VINTIMILLE|PARMENTIER|GARDETTE", re.I)


# ---------------------------------------------------------------- géométrie
def aire_signee(r): return sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r))) / 2
def dans(r, x, z):
    c = False; j = len(r) - 1
    for i in range(len(r)):
        a, b = r[i], r[j]
        if (a[1] > z) != (b[1] > z) and x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]: c = not c
        j = i
    return c
def dans_poly(rings, x, z): return dans(rings[0], x, z) and not any(dans(h, x, z) for h in rings[1:])
def boite(r): xs = [p[0] for p in r]; zs = [p[1] for p in r]; return (min(xs), min(zs), max(xs), max(zs))
def mediane(v): v = sorted(v); return v[len(v) // 2] if v else None


class Grille:
    """Rangement d'objets par cases, pour ne comparer que des voisins."""
    def __init__(self, pas): self.pas = pas; self.c = {}
    def _k(self, x, z): return (int(x // self.pas), int(z // self.pas))
    def point(self, x, z, o): self.c.setdefault(self._k(x, z), []).append(o)
    def boite(self, b, o):
        for i in range(int(b[0] // self.pas), int(b[2] // self.pas) + 1):
            for k in range(int(b[1] // self.pas), int(b[3] // self.pas) + 1): self.c.setdefault((i, k), []).append(o)
    def en(self, x, z): return self.c.get(self._k(x, z), ())
    def autour(self, x, z, r):
        for i in range(int((x - r) // self.pas), int((x + r) // self.pas) + 1):
            for k in range(int((z - r) // self.pas), int((z + r) // self.pas) + 1):
                for o in self.c.get((i, k), ()): yield o


def anneaux_esri(geom):
    """Polygones d'une géométrie ArcGIS : contours (sens horaire) et leurs trous."""
    ext, trous = [], []
    for r in (geom or {}).get('rings') or []:
        if len(r) >= 4: (ext if aire_signee(r) < 0 else trous).append(r)
    if not ext: ext, trous = trous, []
    polys = [[e] for e in ext]
    for t in trous:
        for p in polys:
            if dans(p[0], t[0][0], t[0][1]): p.append(t); break
    return polys


def anneaux_geojson(geom):
    if not geom or not geom.get('coordinates'): return []
    return geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]


def decode_polys(s, q):
    """Polygones compacts de data/paris1789.json (voir src/vlq.js)."""
    B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; idx = {c: i for i, c in enumerate(B64)}
    v = []; cur = 0; shift = 0
    for ch in s:
        d = idx[ch]; cur += (d & 31) << shift
        if d & 32: shift += 5
        else: v.append(-(cur >> 1) if cur & 1 else cur >> 1); cur = 0; shift = 0
    out = []; k = 0; x = z = 0; n = v[k]; k += 1
    for _ in range(n):
        rings = []; nr = v[k]; k += 1
        for _ in range(nr):
            ring = []; np_ = v[k]; k += 1
            for _ in range(np_): x += v[k]; z += v[k + 1]; k += 2; ring.append((x / q, z / q))
            rings.append(ring)
        out.append(rings)
    return out


def main():
    T, reg = X.register()
    print('recalage :', reg)
    o, ex, ny = T(0, 0), T(1, 0), T(0, 1); a_, b_ = ex[0] - o[0], -(ex[1] - o[1]); tx, ty = o[0], -o[1]
    def Tinv(x, z):                                        # maquette → Lambert-93
        u, w = x - tx, -z - ty; d = a_ * a_ + b_ * b_
        return (a_ * u + b_ * w) / d, (a_ * w - b_ * u) / d

    def polys_de(polys, tol, aire_min=0.0, trou_min=12.0):
        out = []
        for poly in polys:
            rings = []
            for k, ring in enumerate(poly):
                r = X.simplify_ring([T(p[0], p[1]) for p in ring], tol)
                if not r or len(r) < 3: continue
                a = abs(aire_signee(r))
                if a >= (aire_min if k == 0 else trou_min): rings.append(r)
                elif k == 0: break
            if rings: out.append(rings)
        return out

    data = {'meta': {
        'source': 'Atelier parisien d’urbanisme (APUR), données ouvertes ; base « Paris 1900 — les îlots, les voies et les adresses » (Projets Time Machine, DOI 10.34847/nkl.cbf5ecd0) ; Atlas de Vasserot (SIG ALPAGE) ; RGE ALTI (IGN)',
        'licence': 'Open Database License 1.0 (ODbL) — base dérivée, diffusée sous la même licence',
        'reperes': 'mètres, x vers l’est, z vers le sud, origine au parvis de Notre-Dame (repère commun aux autres maquettes)',
        'recalage': reg, 'annee': AN}}

    # ---------------------------------------------------------------- îlots et rues de 1900
    d = json.load(open(os.path.join(SRC, 'PTM_Paris1900_ilots.geojson'), encoding='utf8'))
    ilots = []                                              # { rings, bati, type, nom, aire }
    for f in d['features']:
        p = f['properties']
        for rings in polys_de(anneaux_geojson(f['geometry']), 0.7, 25.0, 60.0):
            ilots.append({'rings': rings, 'bati': p.get('Bati_nonBati') == 'Bâti', 'type': p.get('c_type_il') or '', 'nom': (p.get('l_ip') or '').strip(), 'aire': abs(aire_signee(rings[0]))})
    xs = [q[0] for i in ilots for q in i['rings'][0]]; zs = [q[1] for i in ilots for q in i['rings'][0]]
    cadre = [math.floor((min(xs) - MARGE) / PAS) * PAS, math.floor((min(zs) - MARGE) / PAS) * PAS, math.ceil((max(xs) + MARGE) / PAS) * PAS, math.ceil((max(zs) + MARGE) / PAS) * PAS]
    data['meta']['cadre'] = cadre
    cx, cz = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
    # Enceinte de Thiers : la base de 1900 la donne comme une couronne d'îlots étroits, au contour bastionné, entre le
    # boulevard militaire et la campagne. Un îlot en fait partie s'il touche le contour de la ville et s'il est mince.
    N = 1440; loin = [0.0] * N
    for i in ilots:
        for q in i['rings'][0]:
            k = int((math.atan2(q[1] - cz, q[0] - cx) + math.pi) / (2 * math.pi) * N) % N; loin[k] = max(loin[k], math.hypot(q[0] - cx, q[1] - cz))
    def au_bord(q, marge):
        k = int((math.atan2(q[1] - cz, q[0] - cx) + math.pi) / (2 * math.pi) * N) % N
        return math.hypot(q[0] - cx, q[1] - cz) > max(loin[(k + j) % N] for j in (-2, -1, 0, 1, 2)) - marge
    for i in ilots:
        r = i['rings'][0]; per = sum(math.hypot(r[(k + 1) % len(r)][0] - r[k][0], r[(k + 1) % len(r)][1] - r[k][1]) for k in range(len(r)))
        bord = sum(1 for q in r if au_bord(q, 30)) / len(r); tous = all(au_bord(q, 330) for q in r)
        i['fortif'] = tous and bord > 0.25 and i['aire'] / per < 75 and i['aire'] > 3000
    gi = Grille(120)
    for i in ilots: gi.boite(boite(i['rings'][0]), i)
    def ilot_en(x, z):
        for i in gi.en(x, z):
            if dans_poly(i['rings'], x, z): return i
        return None
    code = lambda i: 'F' if i['fortif'] else 'B' if i['bati'] else 'p'
    data['ilots'] = {'q': 1, 'g': X.enc_polys([i['rings'] for i in ilots], 1), 'n': len(ilots), 'c': ''.join(code(i) for i in ilots),
                     'noms': {str(k): i['nom'] for k, i in enumerate(ilots) if i['nom']},
                     'credit': 'Îlots vers 1900 — base « Paris 1900 », É. Mermet, P. Rouet et al., Projets Time Machine (DOI 10.34847/nkl.cbf5ecd0)'}
    print('îlots de 1900 :', len(ilots), '; bâtis', sum(i['bati'] for i in ilots), '; enceinte', sum(i['fortif'] for i in ilots), 'îlots,', round(sum(i['aire'] for i in ilots if i['fortif']) / 1e4), 'ha ; cadre', cadre, '(%.1f × %.1f km)' % ((cadre[2] - cadre[0]) / 1000, (cadre[3] - cadre[1]) / 1000))

    d = json.load(open(os.path.join(SRC, 'PTM_Paris1900_rues.geojson'), encoding='utf8'))
    lignes, noms, idx, larg, ponts = [], [], [], [], []
    for f in d['features']:
        p = f['properties']; g = f['geometry']
        if not g or not g.get('coordinates'): continue
        nom = ' '.join(x for x in ((p.get('typvoie') or '').strip(), (p.get('prevoie') or '').strip(), (p.get('nomvoi_min') or '').strip()) if x and x != 'None').replace("' ", "'")
        nom = nom[:1].upper() + nom[1:]
        try: w = float(p.get('largeur') or 0)
        except ValueError: w = 0.0
        for l in (g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]):
            pts = X.dp([T(q[0], q[1]) for q in l], 1.0)
            if len(pts) < 2: continue
            if nom and nom not in noms: noms.append(nom)
            if p.get('franchisst') == 'Pont': ponts.append(len(lignes))
            lignes.append(pts); idx.append(noms.index(nom) if nom else -1); larg.append(round(w))
    data['rues'] = {'q': 1, 'g': X.enc_lines(lignes, 1), 'n': len(lignes), 'noms': noms, 'i': idx, 'l': larg, 'ponts': ponts,
                    'credit': 'Voies vers 1900, avec leur nom d’alors — base « Paris 1900 », Projets Time Machine'}
    print('rues de 1900 :', len(lignes), 'tronçons,', len(noms), 'noms,', len(ponts), 'franchissements')

    # ---------------------------------------------------------------- jardins, cimetières, lieux nommés
    equip = []
    for path in sorted(glob.glob(os.path.join(SRC, 'equipement_emprise_*.json'))): equip += json.load(open(path))['features']
    parcs, noms_parcs, cim, lieux = [], [], [], []
    for f in equip:
        at = f['attributes']; nom = (at.get('l_ee_maj') or '').strip(); n1 = at['c_niv1']
        if n1 == 15 and JARDINS.search(nom):
            for rings in polys_de(anneaux_esri(f.get('geometry')), 2.0, 1500.0, 400.0):
                bb = boite(rings[0])
                if bb[2] > cadre[0] and bb[0] < cadre[2] and bb[3] > cadre[1] and bb[1] < cadre[3]: parcs.append(rings); noms_parcs.append(nom.title())
        elif n1 == 23:
            for rings in polys_de(anneaux_esri(f.get('geometry')), 2.0, 3000.0, 400.0):
                c = rings[0][0]
                if cadre[0] < c[0] < cadre[2] and cadre[1] < c[1] < cadre[3]: cim.append(rings)
        if n1 in (21, 24, 20) and nom and f.get('geometry'):
            for rings in polys_de(anneaux_esri(f.get('geometry')), 3.0, 600.0, 1e9):
                r = rings[0]; c = (sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r))
                if cadre[0] < c[0] < cadre[2] and cadre[1] < c[1] < cadre[3]: lieux.append([round(c[0]), round(c[1]), {21: 'c', 24: 'm', 20: 'g'}[n1], nom.title(), round(abs(aire_signee(r)))])
    data['parcs'] = {'q': 1, 'g': X.enc_polys(parcs, 1), 'n': len(parcs), 'noms': noms_parcs, 'credit': 'Jardins et bois : APUR (emprise actuelle des jardins qui existaient en 1889)'}
    data['cimetieres'] = {'q': 1, 'g': X.enc_polys(cim, 1), 'n': len(cim)}
    data['lieux'] = lieux
    print('jardins', len(parcs), '; cimetières', len(cim), '; lieux nommés', len(lieux))
    gp = Grille(150)
    for rings in parcs + cim: gp.boite(boite(rings[0]), rings)
    def au_jardin(x, z): return any(dans_poly(rings, x, z) for rings in gp.en(x, z))

    # ---------------------------------------------------------------- emprise de l'Exposition : le Champ-de-Mars de 1889
    # Il allait alors de l'avenue de La Bourdonnais à l'avenue de Suffren (ses bords n'ont été lotis qu'après 1900).
    # Repère de l'Exposition : origine au centre de la tour, u vers l'École militaire, v vers l'avenue de Suffren.
    tour = (-4039.4, -604.3); ax = (-3352.9 + 4470.7, 40.0 + 1002.8); na = math.hypot(*ax); U = (ax[0] / na, ax[1] / na); Vv = (-U[1], U[0])
    def uv(x, z): return ((x - tour[0]) * U[0] + (z - tour[1]) * U[1], (x - tour[0]) * Vv[0] + (z - tour[1]) * Vv[1])
    def bord(motif, selon_v):
        vals = []
        for l, k in zip(lignes, idx):
            if k < 0 or not re.search(motif, noms[k], re.I): continue
            for q in l:
                u, v = uv(q[0], q[1])
                if selon_v and -100 < u < 900 and abs(v) < 400: vals.append(v)
                if not selon_v and abs(v) < 180 and 600 < u < 1300: vals.append(u)
        return mediane(vals)
    # l'axe estimé d'après le Trocadéro et l'École militaire est affiné sur la direction des deux avenues qui bordent le champ
    suu = suv = 0.0
    for motif in ('bourdonnais', 'suffren'):
        pts = [uv(q[0], q[1]) for l, k in zip(lignes, idx) if k >= 0 and re.search(motif, noms[k], re.I) for q in l]
        pts = [q for q in pts if -150 < q[0] < 900 and abs(q[1]) < 400]
        if len(pts) < 4: raise SystemExit('Champ-de-Mars : avenues introuvables dans la base de 1900')
        mu = sum(q[0] for q in pts) / len(pts); mv = sum(q[1] for q in pts) / len(pts)
        suu += sum((q[0] - mu) ** 2 for q in pts); suv += sum((q[0] - mu) * (q[1] - mv) for q in pts)
    ang = math.atan(suv / suu); U = (U[0] * math.cos(ang) + Vv[0] * math.sin(ang), U[1] * math.cos(ang) + Vv[1] * math.sin(ang)); Vv = (-U[1], U[0])
    v0, v1, u1 = bord('bourdonnais', True), bord('suffren', True), bord('motte.picquet', False)
    if v0 is None or v1 is None or u1 is None: raise SystemExit('Champ-de-Mars : avenues introuvables dans la base de 1900')
    if v0 > v1: v0, v1 = v1, v0
    expo = {'tour': [tour[0], tour[1]], 'u': [round(U[0], 5), round(U[1], 5)], 'u0': -230, 'u1': round(u1 - 14, 1), 'v0': round(v0 + 13, 1), 'v1': round(v1 - 13, 1), 'vc': round((v0 + v1) / 2, 1)}
    data['meta']['expo'] = expo
    def dans_expo(x, z): u, v = uv(x, z); return expo['u0'] < u < expo['u1'] and expo['v0'] < v < expo['v1']
    print('Champ-de-Mars de 1889 :', expo)
    for motif in ('baltard',):                                          # repérage des pavillons des Halles, pour la suite
        pts = [q for l, k in zip(lignes, idx) if k >= 0 and re.search(motif, noms[k], re.I) for q in l]
        vus = {}
        for q in pts:
            for i in gi.autour(q[0], q[1], 30):
                if id(i) not in vus and min(math.hypot(q[0] - w[0], q[1] - w[1]) for w in i['rings'][0]) < 30: vus[id(i)] = i
        print('  îlots le long de', motif, ':', [(round(i['aire']), [round(v) for v in boite(i['rings'][0])]) for i in vus.values()])

    # ---------------------------------------------------------------- bâti d'aujourd'hui, daté par l'APUR
    B = []
    for path in sorted(glob.glob(os.path.join(SRC, 'emprise_batie_paris_*.json'))):
        for f in json.load(open(path))['features']:
            at = f['attributes']
            for rings in polys_de(anneaux_esri(f.get('geometry')), 0.9, 22.0, 30.0):
                r = rings[0]; a = abs(aire_signee(r)); bb = boite(r)
                if dans_expo((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2): continue          # la tour elle-même, et ce qui a poussé depuis sur le Champ-de-Mars
                h = at.get('h_med') or at.get('h_moy') or 0
                B.append({'rings': rings, 'aire': a, 'bb': bb, 'c': ((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2), 'per': at.get('c_perconst') or 99, 'an': at.get('an_const'),
                          'h': float(h), 'toit': at.get('c_forme_toit') or 0, 'tissu': at.get('c_tissu') or '', 'sur': at.get('an_surelevation')})
    print('bâti actuel :', len(B), 'emprises')
    for b in B:
        per, an = b['per'], b['an']
        b['st'] = 'R' if per in (1, 2) or (per == 3 and an and an <= AN) else 'N' if (5 <= per < 99) or (per == 3 and an and an > AN + 1) else 'A'
    gc = Grille(VOISIN)
    for b in B:
        if b['st'] != 'A': gc.point(b['c'][0], b['c'][1], b)
    def voisinage(b):
        """Part des bâtiments datés d'avant 1890 autour d'un bâtiment (pondérée par l'emprise, plafonnée), hauteur médiane et toit dominant des anciens."""
        for rayon in (VOISIN, 2.5 * VOISIN, 5 * VOISIN):          # un édifice public isolé regarde plus loin
            vieux = neuf = 0.0; hs = []; toits = {}
            for o in gc.autour(b['c'][0], b['c'][1], rayon):
                if o is b or math.hypot(o['c'][0] - b['c'][0], o['c'][1] - b['c'][1]) > rayon: continue
                w = min(o['aire'], 800.0)
                if o['st'] == 'R': vieux += w; hs.append(o['h']); toits[o['toit']] = toits.get(o['toit'], 0) + 1
                else: neuf += w
            if vieux + neuf >= 4000: break
        return (vieux / (vieux + neuf) if vieux + neuf > 0 else None), mediane([h for h in hs if h > 3]), (max(toits, key=toits.get) if toits else 4)
    for b in B:
        if b['st'] == 'R': continue
        part, hmed, toit = voisinage(b); b['part'] = part; b['hv'] = hmed; b['tv'] = toit
        if b['st'] == 'A' and part is not None:
            seuil = 0.4 if b['an'] == AN + 1 else 0.5 if b['per'] == 3 else 0.65
            if part >= seuil: b['st'] = 'P'
    n = {k: sum(1 for b in B if b['st'] == k) for k in 'RPAN'}
    print('  réels', n['R'], '; probables', n['P'], '; écartés faute de date', n['A'], '; postérieurs à 1889', n['N'])

    # ---- bâtiments disparus : l'atlas de Vasserot, là où il n'y a ni bâtiment réel ni probable
    gb = Grille(60); garde = [b for b in B if b['st'] in 'RP']
    for b in garde: gb.boite(b['bb'], b)
    def couvert(x, z):
        return any(o['bb'][0] <= x <= o['bb'][2] and o['bb'][1] <= z <= o['bb'][3] and dans_poly(o['rings'], x, z) for o in gb.en(x, z))
    # Un îlot tenu par un grand édifice public (Louvre, Préfecture, Palais de justice…) n'abritait plus de maisons en 1889.
    for b in garde:
        if b['tissu'] == 'ER' and b['aire'] >= 2500:
            i = ilot_en(b['c'][0], b['c'][1]) or ilot_en(b['rings'][0][0][0], b['rings'][0][0][1])
            if i: i['public'] = i.get('public', 0.0) + b['aire']
    V = []; gv = Grille(45); refondus = 0
    if os.path.exists(P1789):
        d89 = json.load(open(P1789, encoding='utf8')); v89 = d89['bati']; vieux = decode_polys(v89['g'], v89['q']); enclos = set(v89.get('enclos', []))
        # Un îlot de 1900 qui a avalé d'anciennes rues (Louvre, Halles, Hôtel-Dieu, Palais de justice…) a été refondu
        # entre l'atlas et 1889 : les maisons de Vasserot n'y étaient plus. On le reconnaît à la part de sa surface
        # qui tombait hors des îlots de l'atlas.
        g89 = Grille(120)
        for rings in decode_polys(d89['ilots']['g'], d89['ilots']['q']): g89.boite(boite(rings[0]), rings)
        def refondu(i):
            if 'ref' not in i:
                bb = boite(i['rings'][0]); pas = max(5.0, math.sqrt(i['aire']) / 14); n = k = 0; x = bb[0] + pas / 2
                while x < bb[2]:
                    z = bb[1] + pas / 2
                    while z < bb[3]:
                        if dans_poly(i['rings'], x, z): n += 1; k += any(dans_poly(r, x, z) for r in g89.en(x, z))
                        z += pas
                    x += pas
                i['ref'] = n > 0 and k < 0.78 * n
            return i['ref']
        for k, rings in enumerate(vieux):
            r = rings[0]; a = abs(aire_signee(r))
            if k in enclos or a < 14 or a > 6000: continue
            bb = boite(r); c = (sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r))
            gv.point(c[0], c[1], 1)
            ech = [c] + [((p[0] + c[0]) / 2, (p[1] + c[1]) / 2) for p in r[::max(1, len(r) // 8)]]
            if sum(1 for p in ech if couvert(p[0], p[1])) > 0.34 * len(ech): continue           # un bâtiment réel occupe la place
            if sum(1 for p in ech if (lambda i: i and i['bati'] and not i['fortif'])(ilot_en(p[0], p[1]))) < 0.8 * len(ech): continue      # dans une rue de 1900, ou hors d'un îlot bâti
            if au_jardin(c[0], c[1]) or dans_expo(c[0], c[1]): continue
            i0 = ilot_en(c[0], c[1])
            if i0 and (refondu(i0) or i0.get('public', 0.0) > 0.2 * i0['aire']): refondus += 1; continue
            V.append({'rings': rings, 'aire': a, 'bb': bb, 'c': c, 'st': 'V', 'toit': 2 if a < 140 else 4, 'tissu': '', 'sur': None, 'h': 0.0})
        for b in V:
            hs = [o['h'] for o in gc.autour(b['c'][0], b['c'][1], 100) if o['st'] == 'R' and o['h'] > 3 and math.hypot(o['c'][0] - b['c'][0], o['c'][1] - b['c'][1]) < 100]
            b['h'] = min(mediane(hs) or 13.0, 19.0) * (0.75 if b['aire'] < 60 else 1.0)
    print('  disparus, d’après Vasserot :', len(V), 'sur', len(vieux) if os.path.exists(P1789) else 0, '; écartés des îlots refondus ou tenus par un édifice public :', refondus)

    # ---- bâtiments évoqués : hors de l'atlas, là où le bâtiment actuel est postérieur à 1889 dans un quartier déjà bâti
    gV = Grille(60)
    for b in V: gV.boite(b['bb'], b)
    E = []
    for b in B:
        if b['st'] not in 'NA' or b.get('part') is None or b['part'] < 0.6 or b['aire'] > 2500 or b['aire'] < 30 or b['tissu'] in ('IGH', 'TD', 'HBM'): continue
        x, z = b['c']
        if au_jardin(x, z): continue
        if any(True for _ in gv.autour(x, z, 45)): continue                                      # l'atlas couvre l'endroit : c'est lui qui parle
        i = ilot_en(x, z)
        if not i or not i['bati'] or i['fortif']: continue
        E.append({**b, 'st': 'E', 'h': min(b['h'] if b['h'] > 3 else 12.0, (b.get('hv') or 15.0) + 1.5), 'toit': b.get('tv') or 4, 'sur': None})
    print('  évoqués sur emprise actuelle :', len(E))

    # ---- maisons évoquées le long des rues de 1900, là où rien d'autre ne parle
    pose = [b for b in B if b['st'] in 'RP'] + V + E
    go = Grille(40)
    for b in pose: go.boite(b['bb'], b)
    def occupe(x, z): return any(o['bb'][0] <= x <= o['bb'][2] and o['bb'][1] <= z <= o['bb'][3] and dans_poly(o['rings'], x, z) for o in go.en(x, z))
    ga = Grille(160)
    for b in pose: ga.point(b['c'][0], b['c'][1], b)
    gr = Grille(40)                                                      # voies ferrées à l'air libre : on ne bâtit pas dessus
    for path in sorted(glob.glob(os.path.join(SRC, 'voie_ferree_*.json'))):
        for f in json.load(open(path))['features']:
            if f['attributes'].get('B_VISI') != 'O': continue
            for l in (f.get('geometry') or {}).get('paths') or []:
                pts = [T(q[0], q[1]) for q in l]
                for a, b in zip(pts, pts[1:]):
                    n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / 10))
                    for k in range(n + 1): gr.point(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, (a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
    def sur_rails(x, z): return any(math.hypot(q[0] - x, q[1] - z) < 15 for q in gr.autour(x, z, 15))
    def hasard(*v):
        h = 2166136261
        for x in v: h = ((h ^ (int(x) & 0xffffffff)) * 16777619) & 0xffffffff
        h ^= h >> 15; h = (h * 2246822519) & 0xffffffff; h ^= h >> 13
        return (h & 0xffffff) / 0x1000000
    G = []
    for ni, i in enumerate(ilots):
        if not i['bati'] or i['fortif'] or i['aire'] < 500 or i['aire'] > 60000: continue
        r = i['rings'][0]; poses = []; gros = 0.5 if i['aire'] > 30000 else 1.0
        if aire_signee(r) < 0: r = r[::-1]
        for e in range(len(r)):
            a, b = r[e], r[(e + 1) % len(r)]; L = math.hypot(b[0] - a[0], b[1] - a[1])
            if L < 16: continue
            t = ((b[0] - a[0]) / L, (b[1] - a[1]) / L); nrm = (-t[1], t[0])
            if not dans(r, (a[0] + b[0]) / 2 + nrm[0] * 1.5, (a[1] + b[1]) / 2 + nrm[1] * 1.5): nrm = (t[1], -t[0])
            mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            anciens = [o for o in ga.autour(mx, mz, 160) if math.hypot(o['c'][0] - mx, o['c'][1] - mz) < 160]
            dens = min(0.95, 0.28 + len(anciens) / 60) * gros
            hv = mediane([o['h'] for o in anciens if o['h'] > 3]) or 8.0
            prof = 9.0 if hv < 11 else 10.5; s = prof + 1.0
            while s < L - 8:
                lg = min(10 + 16 * hasard(ni, e, s, 1), L - 0.5 - s)
                if hasard(ni, e, s, 2) > dens: s += lg + 3; continue        # terrain vague, jardin, cour
                P = lambda fu, fv: (a[0] + t[0] * (s + lg * fu) + nrm[0] * (0.3 + prof * fv), a[1] + t[1] * (s + lg * fu) + nrm[1] * (0.3 + prof * fv))
                libre = True
                for fu in (0.08, 0.5, 0.92):
                    for fv in (0.08, 0.5, 0.95):
                        x, z = P(fu, fv)
                        if not dans_poly(i['rings'], x, z) or occupe(x, z) or au_jardin(x, z) or dans_expo(x, z) or sur_rails(x, z) or any(dans(q, x, z) for q in poses): libre = False; break
                    if not libre: break
                if not libre: s += 4; continue
                ring = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]; poses.append(ring)
                h = max(5.5, min(18.0, hv * (0.62 + 0.42 * hasard(ni, e, s, 3))))
                bb = boite(ring)
                G.append({'rings': [ring], 'aire': lg * prof, 'bb': bb, 'c': ((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2), 'st': 'G', 'h': h, 'toit': 2 if h < 10.5 else 4, 'tissu': '', 'sur': None})
                s += lg + (0.0 if hasard(ni, e, s, 4) < 0.7 else 2.5)
    print('  évoqués le long des rues de 1900 :', len(G))

    # ---- hauteurs : ce que l'on mesure aujourd'hui, moins un étage quand le bâtiment a été surélevé depuis
    tout = pose + G
    for b in tout:
        h = b['h'] if b['h'] > 2.5 else (b.get('hv') or 9.0)
        if b.get('sur') and b['sur'] > AN: h -= 3.0
        b['h'] = max(3.0, min(h, 75.0))
    # lieux de culte, gares : leur emprise marque les bâtiments qui s'y trouvent
    ge = Grille(150); marques = []
    for f in equip:
        at = f['attributes']
        if at['c_niv1'] not in (20, 21): continue
        for rings in polys_de(anneaux_esri(f.get('geometry')), 1.5, 150.0, 1e9):
            m = {'rings': rings, 'k': 'e' if at['c_niv1'] == 21 else 'g', 'nom': (at.get('l_ee_maj') or '').strip()}; marques.append(m); ge.boite(boite(rings[0]), m)
    for b in tout:
        b['k'] = 'r' if b['tissu'] == 'ER' else 'i' if b['tissu'] == 'TI' else '-'
        for m in ge.en(b['c'][0], b['c'][1]):
            if dans(m['rings'][0], b['c'][0], b['c'][1]) and (m['k'] == 'g' or b['aire'] > 250): b['k'] = m['k']; break
    tout.sort(key=lambda b: (round(b['c'][0] / 440), round(b['c'][1] / 440)))                 # par dalle : des écarts courts, un fichier plus petit
    data['bati'] = {'q': 2, 'g': X.enc_polys([b['rings'] for b in tout], 2), 'n': len(tout), 's': ''.join(b['st'] for b in tout),
                    'h': X.vlq([round(b['h'] * 2) for b in tout]), 't': ''.join(str(b['toit'] if b['toit'] in (1, 2, 3, 4) else 4) for b in tout), 'k': ''.join(b['k'] for b in tout),
                    'credit': 'Emprise, datation et hauteur des bâtiments : Atelier parisien d’urbanisme (APUR), données ouvertes ; bâtiments disparus : Atlas par îlots de Vasserot (1810-1836) — Arch. nat. F31 73-96 – Arch. Paris © ALPAGE : A.-L. Bethe'}
    cpt = {k: sum(1 for b in tout if b['st'] == k) for k in 'RPVEG'}
    data['meta']['bati'] = cpt
    print('bâti de 1889 :', len(tout), cpt, ';', sum(len(r) for b in tout for r in b['rings']), 'sommets ;', len(data['bati']['g']) // 1024, 'Ko ; emprise', round(sum(b['aire'] for b in tout) / 1e4), 'ha')

    # ---------------------------------------------------------------- eau, jardins, cimetières, lieux
    eau, types = [], ''
    for f in json.load(open(os.path.join(SRC, 'plan_eau_000000.json')))['features']:
        at = f['attributes']; t = at.get('c_type')
        if at.get('b_souterrain') != 'N' or t not in (1, 2, 4, 5, 11): continue
        for rings in polys_de(anneaux_esri(f.get('geometry')), 1.2, 4000.0 if t == 2 else 300.0, 300.0):
            r = rings[0]; bb = boite(r)
            if bb[2] < cadre[0] or bb[0] > cadre[2] or bb[3] < cadre[1] or bb[1] > cadre[3]: continue
            eau.append(rings); types += 'S' if t == 1 else 'c' if t in (4, 5, 11) else 'l'
    data['eau'] = {'q': 1, 'g': X.enc_polys(eau, 1), 'n': len(eau), 't': types, 'credit': 'Seine, canaux et lacs : APUR (tracé actuel, peu différent de celui de 1889)'}
    print('eau :', len(eau), 'polygones', {k: types.count(k) for k in 'Scl'})


    # ---------------------------------------------------------------- relief : RGE ALTI, ramené à la grille de la maquette
    rp = os.path.join(SRC, 'relief_ign.json')
    if os.path.exists(rp):
        R = json.load(open(rp)); alt = R['alt']
        def alti(E, N_):
            fx = min(max((E - R['x0']) / R['pas'], 0), R['nx'] - 1.001); fy = min(max((N_ - R['y0']) / R['pas'], 0), R['ny'] - 1.001)
            i, k = int(fx), int(fy); u, v = fx - i, fy - k; q = k * R['nx'] + i
            return (alt[q] * (1 - u) + alt[q + 1] * u) * (1 - v) + (alt[q + R['nx']] * (1 - u) + alt[q + R['nx'] + 1] * u) * v
        # niveau de la Seine : médiane des altitudes lues au milieu du fleuve
        seine = [alti(*Tinv(p[0], p[1])) for rings, t in zip(eau, types) if t == 'S' for p in [(sum(q[0] for q in rings[0]) / len(rings[0]), sum(q[1] for q in rings[0]) / len(rings[0]))] if dans_poly(rings, p[0], p[1])]
        fleuve = []
        for rings, t in zip(eau, types):
            if t != 'S': continue
            bb = boite(rings[0])
            for x in range(int(bb[0]), int(bb[2]), 120):
                for z in range(int(bb[1]), int(bb[3]), 120):
                    if cadre[0] < x < cadre[2] and cadre[1] < z < cadre[3] and dans_poly(rings, x, z): fleuve.append(alti(*Tinv(x, z)))
        niveau = mediane(fleuve) or 26.7
        nx = (cadre[2] - cadre[0]) // PAS + 1; nz = (cadre[3] - cadre[1]) // PAS + 1; vals = []
        for k in range(nz):
            for i in range(nx): vals.append(alti(*Tinv(cadre[0] + i * PAS, cadre[1] + k * PAS)))
        # le terrain de la page pose le point le plus bas 2,4 m au-dessus de l'eau : base = niveau du fleuve + 2,4 m
        base = niveau + 2.4; ints = [max(0, round((v - base) * 10)) for v in vals]
        data['relief'] = {'x0': cadre[0], 'z0': cadre[1], 'pas': PAS, 'nx': nx, 'nz': nz, 'base': round(base, 2), 'h': X.vlq([ints[0]] + [ints[i] - ints[i - 1] for i in range(1, len(ints))]),
                          'credit': 'Relief : RGE ALTI® de l’IGN (relief actuel ; licence ouverte Etalab 2.0)'}
        print('relief', nx, '×', nz, 'nœuds ; Seine à', round(niveau, 1), 'm ; sol de', round(min(vals), 1), 'à', round(max(vals), 1), 'm NGF')
    else: print('relief : data/source/1889/relief_ign.json absent (tools/fetch_1889.py relief)')

    with open(OUT, 'w', encoding='utf8') as f: json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print('écrit', OUT, round(os.path.getsize(OUT) / 1024), 'Ko')


if __name__ == '__main__':
    main()
