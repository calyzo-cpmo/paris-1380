#!/usr/bin/env python3
"""Étude des données de Paris 1975 : ce que le bâti daté de l'APUR, les voies et les îlots d'aujourd'hui disent de la ville
de l'été 1975.

  python3 tools/etude_1975.py          mesures de ETUDE-1975.md → data/source/1975/etude_1975.json

N'écrit rien d'autre. Lit les sources déjà téléchargées pour 1889 et 1937 (data/source/1889/, data/source/1937/ :
python3 tools/fetch_1889.py, puis python3 tools/fetch_1889.py 1937). Tout est mesuré en Lambert-93.

Le bâti d'aujourd'hui est classé à la date de 1975. La période 1968-1975 de l'APUR s'arrête à la date : plus de bâti
« probable » à deviner.
  R  réel        périodes de l'APUR jusqu'à 1968-1975, ou année de construction 1975 ou avant ;
                 dont « ancien » (1937 ou avant) et « 1938-1975 » ;
  N  postérieur  après 1975 : ce qui se trouvait là en 1975 est à recomposer ;
  A  sans date   période inconnue.
Puis : où sont les zones refaites depuis 1975, les tours de 1975, quelles voies d'aujourd'hui ont été ouvertes après 1975
(d'après la date des bâtiments qui les bordent), quelles voies de 1900 ont disparu avant ou après 1975 (d'après la date des
bâtiments qui les recouvrent), quels noms de voie ont changé depuis 1975, et la date que l'APUR donne aux grands édifices
de la période.
"""
import collections, glob, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from etude_1937 import Grille, aire, apur, boite, dans, latlon, le_long, zones_refaites   # noqa: E402
from ville_1937 import Noms, norme                                                          # noqa: E402

SRC = os.path.join(HERE, '..', 'data', 'source', '1889')
SRC37 = os.path.join(HERE, '..', 'data', 'source', '1937')
OUT = os.path.join(HERE, '..', 'data', 'source', '1975')
AN = 1975
ANCIEN = 1937       # le bâti de 1937 ou d'avant (déjà dans la maquette de 1937)
# Classes de période de construction de l'APUR (c_perconst), vérifiées sur les années (an_const) de chaque classe.
PERIODES = {1: 'avant 1800', 2: '1801-1850', 3: '1851-1914', 5: '1915-1939', 6: '1940-1967', 7: '1968-1975', 8: '1976-1981',
            9: '1982-1989', 10: '1990-1999', 11: '2000-2007', 12: 'après 2007', 99: 'inconnue'}
# Grands édifices et ensembles de la période, et ce qui les a remplacés depuis : un point de chacun (latitude, longitude).
REPERES = [('Tour Montparnasse', 48.84213, 2.32196), ('Gare Montparnasse (1969)', 48.84063, 2.31930),
           ('Tour Zamansky (Jussieu)', 48.84657, 2.35530), ('Maison de la Radio', 48.85265, 2.27885),
           ('UNESCO', 48.84968, 2.30594), ('Palais des congrès', 48.87880, 2.28290),
           ('Front de Seine (tour Totem)', 48.84920, 2.28340), ('Olympiades (tour Mandarine)', 48.82667, 2.36630),
           ('Tour Super-Italie', 48.82855, 2.35628), ('Centre Pompidou', 48.86060, 2.35225),
           ('Forum des Halles (Canopée)', 48.86217, 2.34660), ('Quartier de l’Horloge', 48.86188, 2.35420),
           ('Opéra Bastille', 48.85215, 2.36985), ('Institut du monde arabe', 48.84893, 2.35733),
           ('Cité des sciences (salle des ventes des abattoirs)', 48.89560, 2.38780), ('Grande Halle de la Villette', 48.89060, 2.39060),
           ('Palais omnisports de Bercy', 48.83860, 2.37860), ('Bibliothèque nationale de France', 48.83370, 2.37580),
           ('Musée d’Orsay (gare d’Orsay)', 48.85995, 2.32655), ('Parc André-Citroën (usines de Javel)', 48.84190, 2.27450),
           ('Parc Georges-Brassens (abattoirs de Vaugirard)', 48.83250, 2.30020), ('Square de la Roquette (Petite Roquette)', 48.85940, 2.38320)]


def lambert93(lat, lon):
    """Point Lambert-93 d'un point géographique (degrés)."""
    e = 0.0818191910428158; n = 0.7256077650532670; C = 11754255.426096; xs = 700000.0; ys = 12655612.049876
    p = math.radians(lat); s = math.sin(p)
    L = 0.5 * math.log((1 + s) / (1 - s)) - e / 2 * math.log((1 + e * s) / (1 - e * s))
    R = C * math.exp(-n * L); g = n * math.radians(lon - 3.0)
    return xs + R * math.sin(g), ys - R * math.cos(g)


def statut(per, an):
    if per == 99: return 'A'
    if an and an <= AN: return 'R'
    if not an and per <= 7: return 'R'
    return 'N'


def age(b):
    """Le bâti réel, partagé entre l'ancien (1937 ou avant) et celui de 1938 à 1975."""
    if b['st'] != 'R': return b['st']
    if b['an']: return 'v' if b['an'] <= ANCIEN else 'm'
    return 'v' if b['per'] <= 5 else 'm'


def main():
    os.makedirs(OUT, exist_ok=True)
    if not glob.glob(os.path.join(SRC, 'emprise_batie_paris_*.json')): raise SystemExit('sources absentes : python3 tools/fetch_1889.py')
    if not os.path.exists(os.path.join(SRC37, 'denominations-des-voies-caduques.json')): raise SystemExit('sources absentes : python3 tools/fetch_1889.py 1937')
    R = {'annee': AN}

    # ---------------------------------------------------------------- arrondissements
    arr = []
    for f in apur('OPENDATA/ARRONDISSEMENT', 0, 'C_AR', 'arrondissements'):
        rings = (f.get('geometry') or {}).get('rings') or []
        if rings: arr.append((f['attributes'].get('C_AR'), rings, boite(max(rings, key=aire))))
    def arrdt(x, y):
        for num, rings, b in arr:
            if b[0] <= x <= b[2] and b[1] <= y <= b[3] and sum(dans(r, x, y) for r in rings) % 2: return num
        return None

    # ---------------------------------------------------------------- bâti d'aujourd'hui, classé à la date de AN
    B = []
    for p in sorted(glob.glob(os.path.join(SRC, 'emprise_batie_paris_*.json'))):
        for f in json.load(open(p))['features']:
            at = f['attributes']; rings = (f.get('geometry') or {}).get('rings') or []
            if not rings: continue
            r = max(rings, key=aire); bb = boite(r); per = at.get('c_perconst') or 99; an = at.get('an_const')
            b = {'c': ((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2), 'a': aire(r), 'r': r, 'bb': bb, 'per': per, 'an': an,
                 'h': at.get('h_max') or 0, 'st': statut(per, an)}
            b['age'] = age(b); B.append(b)
    tot = sum(b['a'] for b in B)
    cl = collections.defaultdict(lambda: [0, 0.0, None, None])
    for b in B:
        c = cl[b['per']]; c[0] += 1; c[1] += b['a']
        if b['an']: c[2] = min(c[2] or 9999, b['an']); c[3] = max(c[3] or 0, b['an'])
    R['classes_apur'] = {'%s (%s)' % (k, PERIODES.get(k, '?')): {'n': v[0], 'ha': round(v[1] / 1e4), 'annees': [v[2], v[3]]} for k, v in sorted(cl.items())}
    print('classes de période de l’APUR (bâtiments, ha, années extrêmes) :')
    for k, v in R['classes_apur'].items(): print('   ', k, v)
    n = collections.Counter(b['age'] for b in B); a = collections.Counter()
    for b in B: a[b['age']] += b['a']
    R['bati'] = {k: {'n': n[k], 'ha': round(a[k] / 1e4), 'part': round(a[k] / tot, 3)} for k in 'vmNA'}
    contr = [b for b in B if b['per'] in (8, 9, 10, 11, 12) and b['an'] and b['an'] <= AN]
    R['classe_posterieure_annee_anterieure'] = {'n': len(contr), 'ha': round(sum(b['a'] for b in contr) / 1e4, 1)}
    print('bâti d’aujourd’hui à la date de %d (v : 1937 ou avant ; m : 1938-1975 ; N : postérieur ; A : sans date) :' % AN, R['bati'])
    print('   classe postérieure à 1975 mais année de 1975 ou avant (tenus pour réels) :', R['classe_posterieure_annee_anterieure'])
    par = collections.defaultdict(collections.Counter)
    for b in B: par[arrdt(*b['c'])][b['age']] += b['a']
    R['part_par_arrondissement'] = {str(k): {'posterieur': round(v['N'] / sum(v.values()), 2), '1938_1975': round(v['m'] / sum(v.values()), 2)}
                                    for k, v in sorted(par.items(), key=lambda kv: kv[0] or 99) if k}
    print('part du bâti postérieur à %d et de 1938-1975, par arrondissement :' % AN, R['part_par_arrondissement'])

    # ---------------------------------------------------------------- tours : le bâti haut, réel ou postérieur
    hauts = collections.defaultdict(lambda: [0, 0])
    for b in B:
        if b['h'] >= 50:
            k = 'plus de 100 m' if b['h'] >= 100 else '50 à 100 m'
            hauts[k][0 if b['st'] == 'R' else 1] += 1
    R['bati_haut'] = {k: {'reel_1975': v[0], 'posterieur': v[1]} for k, v in hauts.items()}
    gh = Grille(300); tours = []
    for b in sorted((b for b in B if b['h'] >= 60 and b['st'] == 'R' and b['a'] >= 200), key=lambda b: -b['h']):   # pas les cheminées
        if any(math.hypot(o['c'][0] - b['c'][0], o['c'][1] - b['c'][1]) < 150 for o in gh.autour(b['c'][0], b['c'][1], 150)): continue
        gh.point(b['c'][0], b['c'][1], b); tours.append({'h': round(b['h']), 'an': b['an'], 'per': b['per'], 'latlon': latlon(*b['c'])})
    R['tours_1975'] = tours
    R['cheminees_1975'] = [{'h': round(b['h']), 'an': b['an'], 'latlon': latlon(*b['c'])} for b in B if b['h'] >= 60 and b['st'] == 'R' and b['a'] < 200]
    print('bâti de 50 m et plus :', R['bati_haut'], '; tours réelles de 60 m et plus (une par 150 m, 200 m² d’emprise au moins) :', len(tours), '; emprises plus petites (cheminées…) :', R['cheminees_1975'])
    for t in tours[:12]: print('   ', t)

    # ---------------------------------------------------------------- repères : la date des grands édifices de la période
    gb = Grille(40)
    for b in B: gb.boite(b['bb'], b)
    def sous(x, y):
        for b in gb.en(x, y):
            if b['bb'][0] <= x <= b['bb'][2] and b['bb'][1] <= y <= b['bb'][3] and dans(b['r'], x, y): return b
        return None
    R['reperes'] = []                                                   # le plus haut bâtiment à moins de 80 m, et l'âge du bâti autour
    for nom, la, lo in REPERES:
        x, y = lambert93(la, lo)
        autour = [b for b in {id(o): o for o in gb.autour(x, y, 120)}.values() if math.hypot(b['c'][0] - x, b['c'][1] - y) < 120]
        pres = [b for b in autour if math.hypot(b['c'][0] - x, b['c'][1] - y) < 80]
        b = max(pres, key=lambda o: o['h']) if pres else None
        ages = collections.Counter()
        for o in autour: ages[o['age']] += o['a']
        t = sum(ages.values()) or 1
        R['reperes'].append({'nom': nom, 'plus_haut': b and {'an': b['an'], 'periode': PERIODES.get(b['per']), 'h': round(b['h']), 'statut': b['st']},
                             'bati_120m': {k: round(v / t, 2) for k, v in ages.items()}, 'emprise_120m_ha': round(t / 1e4, 2)})
    print('repères :')
    for r in R['reperes']: print('   ', r)

    # ---------------------------------------------------------------- zones refaites d'un bloc depuis AN
    R['zones'] = zones_refaites(B, 150, 0.6, 4000)
    print(len(R['zones']), 'zones refaites après %d (cellules de 150 m) : %d ha de bâti postérieur sur %d' % (AN, sum(z['ha'] for z in R['zones']), R['bati']['N']['ha']))
    for z in R['zones'][:30]: print('   ', z)

    # ---------------------------------------------------------------- rues d'aujourd'hui et rues de 1900
    I = []
    for f in json.load(open(os.path.join(SRC, 'PTM_Paris1900_ilots.geojson'), encoding='utf8'))['features']:
        g = f['geometry']
        if not g: continue
        for poly in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]):
            if len(poly[0]) >= 4: I.append({'bb': boite(poly[0])})
    gi = Grille(150)
    for i in I: gi.boite(i['bb'], i)
    def en_ville(q):                                                    # à moins de 30 m d'un îlot de 1900 (les bois n'en ont pas)
        return any(i['bb'][0] - 30 <= q[0] <= i['bb'][2] + 30 and i['bb'][1] - 30 <= q[1] <= i['bb'][3] + 30 for i in gi.autour(q[0], q[1], 30))
    tr = apur('OPENDATA/TRONCON_VOIE_PARIS', 0, 'OBJECTID', 'troncons_voie_paris')
    niveau = collections.Counter()
    for f in tr:
        for l in (f.get('geometry') or {}).get('paths') or []:
            niveau[f['attributes'].get('c_niveau')] += sum(L for _, L in le_long(l, 8))
    R['troncons_km_par_niveau'] = {str(k): round(v / 1000) for k, v in niveau.items()}
    act = [l for f in tr if f['attributes'].get('c_niveau') == 0 for l in (f.get('geometry') or {}).get('paths') or []]
    r1900 = []
    for f in json.load(open(os.path.join(SRC, 'PTM_Paris1900_rues.geojson'), encoding='utf8'))['features']:
        g = f['geometry']
        if g: r1900 += g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
    ga, g0 = Grille(25), Grille(25)
    for f in tr:
        for l in (f.get('geometry') or {}).get('paths') or []:
            for q, _ in le_long(l, 8): ga.point(q[0], q[1], q)
    for l in r1900:
        for q, _ in le_long(l, 8): g0.point(q[0], q[1], q)
    def proche(g, q, d): return any(math.hypot(o[0] - q[0], o[1] - q[1]) < d for o in g.autour(q[0], q[1], d))
    def riverains(q, d=22):
        c = collections.Counter()
        for b in {id(o): o for o in gb.autour(q[0], q[1], d)}.values():           # un grand bâtiment est rangé dans plusieurs cases
            if abs(b['c'][0] - q[0]) < d + 15 and abs(b['c'][1] - q[1]) < d + 15: c[b['age']] += b['a']
        return c
    nv, lieux = collections.Counter(), collections.defaultdict(collections.Counter)
    for l in act:                                                       # voies d'aujourd'hui (au sol) à plus de 12 m d'une voie de 1900
        for q, L in le_long(l, 8):
            if proche(g0, q, 12): nv['sur un tracé de 1900'] += L; continue
            if not en_ville(q): nv['hors de la ville de 1900 (bois, périphérique, ancienne zone)'] += L; continue
            rv = riverains(q); t = sum(rv.values())
            if t < 30: k = 'sans riverains'
            elif rv['N'] > 0.6 * t: k = 'bordées de bâti postérieur à %d' % AN
            elif rv['m'] > 0.25 * t: k = 'bordées de bâti de 1938 à %d' % AN
            else: k = 'bordées de bâti de 1937 ou d’avant'
            nv[k] += L; lieux[k][(int(q[0] // 400), int(q[1] // 400))] += L
    R['voies_actuelles_km'] = {k: round(v / 1000, 1) for k, v in nv.items()}
    R['voies_ouvertes_apres_%d_lieux' % AN] = [[latlon((k[0] + 0.5) * 400, (k[1] + 0.5) * 400), round(L)] for k, L in lieux['bordées de bâti postérieur à %d' % AN].most_common(20)]
    R['voies_ouvertes_1938_%d_lieux' % AN] = [[latlon((k[0] + 0.5) * 400, (k[1] + 0.5) * 400), round(L)] for k, L in lieux['bordées de bâti de 1938 à %d' % AN].most_common(20)]
    print('tronçons de voie d’aujourd’hui, par niveau (km) :', R['troncons_km_par_niveau'])
    print('voies d’aujourd’hui, au sol (km) :', R['voies_actuelles_km'])
    ds, ld = collections.Counter(), collections.Counter()
    for l in r1900:                                                     # voies de 1900 à plus de 12 m d'une voie d'aujourd'hui
        for q, L in le_long(l, 8):
            if proche(ga, q, 12): continue
            b = sous(*q)
            if b is None: k = 'sous un espace libre'
            elif b['age'] == 'N': k = 'sous un bâtiment postérieur à %d' % AN; ld[('N',) + (int(q[0] // 400), int(q[1] // 400))] += L
            elif b['age'] == 'm': k = 'sous un bâtiment de 1938 à %d' % AN; ld[('m',) + (int(q[0] // 400), int(q[1] // 400))] += L
            elif b['age'] == 'A': k = 'sous un bâtiment sans date'
            else: k = 'sous un bâtiment de 1937 ou d’avant'
            ds[k] += L
    R['voies_1900_disparues_km'] = {k: round(v / 1000, 1) for k, v in ds.items()}
    R['voies_supprimees_apres_%d_lieux' % AN] = [[latlon((k[1] + 0.5) * 400, (k[2] + 0.5) * 400), round(L)] for k, L in ld.most_common() if k[0] == 'N'][:20]
    R['voies_supprimees_1938_%d_lieux' % AN] = [[latlon((k[1] + 0.5) * 400, (k[2] + 0.5) * 400), round(L)] for k, L in ld.most_common() if k[0] == 'm'][:20]
    print('voies de 1900 sans voie d’aujourd’hui à moins de 12 m (km) :', R['voies_1900_disparues_km'])
    for k in ('voies_ouvertes_apres_%d_lieux' % AN, 'voies_ouvertes_1938_%d_lieux' % AN, 'voies_supprimees_apres_%d_lieux' % AN,
              'voies_supprimees_1938_%d_lieux' % AN): print('   ', k, R[k][:10])

    # ---------------------------------------------------------------- noms : les voies renommées ou nommées depuis AN
    noms = Noms(SRC37); fin = '%d-12-31' % AN
    renommees, nouvelles = [], []
    for k, (nom, d) in noms.actuel.items():
        if not d or d <= fin: continue
        av = noms.avant(nom, AN)
        if av is None or norme(av) == k: nouvelles.append(nom)
        else: renommees.append([nom, av, d[:4]])
    R['noms'] = {'denommees_apres_%d' % AN: len(renommees) + len(nouvelles), 'renommees': len(renommees), 'sans_nom_anterieur_connu': len(nouvelles),
                 'exemples_renommees': sorted(renommees, key=lambda r: r[2])[:25]}
    print('voies d’aujourd’hui dénommées après %d :' % AN, len(renommees) + len(nouvelles), '; renommées (nom de 1975 connu) :', len(renommees))
    for r in R['noms']['exemples_renommees'][:12]: print('   ', r)

    p = os.path.join(OUT, 'etude_1975.json')
    with open(p, 'w', encoding='utf8') as f: json.dump(R, f, ensure_ascii=False, indent=1)
    print('écrit', os.path.relpath(p))


if __name__ == '__main__':
    main()
