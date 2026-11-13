#!/usr/bin/env python3
"""Extrait du SIG ALPAGE les données de la page « Paris 1789 » vers data/paris1789.json.

Ce que la ville de la fin du XVIIIe siècle doit à chaque couche (toutes sous licence ODbL 1.0) :
  - îlots et Seine : plan de Verniquet, levé de 1782 à 1790 (Ilots_1791, Hydro_1791) ;
  - rues nommées : même plan (Rues_1791) ;
  - bâti : espaces bâtis de l'Atlas par îlots de Vasserot, dressé de 1810 à 1836 (Vasserot_1_Bati). C'est la source
    la plus proche de 1789 qui donne l'emprise de chaque bâtiment ; elle est postérieure d'une génération. Les espaces
    non bâtis de plus de 1 200 m², sans nom d'édifice et situés dans un îlot, y sont retenus comme jardins ;
  - mur des Fermiers généraux (Enceintes), établissements religieux en activité en 1789 (Eglises) ;
  - enclos nommés par l'atlas de Vasserot (Vasserot_1_Parcelles) : places, jardins, hôpitaux, palais ; emprise de la
    Bastille (Bastille) ;
  - relief : nivellement de P.-S. Girard, 1805-1807 (Relief_Girard_Point), ramené à une grille ; hors de la zone
    nivelée, les nœuds valent −1 et la page raccorde le relief à celui de la maquette.

Même repère et même recalage que tools/extract_epochs.py : mètres, x vers l'est, z vers le sud, origine au parvis de
Notre-Dame. `tools/fetch_alpage.py` télécharge les couches. Le fichier produit est une base dérivée, sous ODbL 1.0.
"""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gpkg
import extract_epochs as X

OUT = os.path.join(HERE, '..', 'data', 'paris1789.json')
PAS = 50          # pas de la grille de relief (m)
MARGE = 700       # marge autour du mur des Fermiers généraux (m)
PORTEE = 280      # au-delà de cette distance de toute cote, le relief n'est pas renseigné (m)


# Repères de 1789 situés par leurs coordonnées géographiques (WGS 84) : édifices et lieux que les couches ne nomment pas.
# Les notices correspondantes sont dans src/p1789/places.js.
REPERES = [
    ('Notre-Dame', 48.8530, 2.3499), ('Palais de la Cité', 48.8556, 2.3453), ('Hôtel-Dieu', 48.8527, 2.3478), ('Pont Neuf', 48.8571, 2.3413),
    ('Pont au Change', 48.8567, 2.3466), ('Pont Notre-Dame', 48.8559, 2.3489), ('Louvre', 48.8606, 2.3385), ('Tuileries', 48.8617, 2.3325),
    ('Palais-Royal', 48.8637, 2.3371), ('Place Louis XV', 48.8656, 2.3212), ('Place Vendôme', 48.8675, 2.3294), ('Place des Victoires', 48.8657, 2.3412),
    ('Place Royale', 48.8556, 2.3655), ('Bastille', 48.8533, 2.3682), ('Hôtel de Ville', 48.8566, 2.3522), ('Grand Châtelet', 48.8576, 2.3470),
    ('Halle au blé', 48.8628, 2.3427), ('Saint-Eustache', 48.8634, 2.3451), ('Marché des Innocents', 48.8606, 2.3480), ('Temple', 48.8645, 2.3620),
    ('Porte Saint-Denis', 48.8694, 2.3526), ('Porte Saint-Martin', 48.8691, 2.3557), ('Hôpital Saint-Louis', 48.8743, 2.3690), ('Saint-Lazare', 48.8765, 2.3540),
    ('Invalides', 48.8566, 2.3125), ('École militaire', 48.8525, 2.3040), ('Champ-de-Mars', 48.8556, 2.2986), ('Palais-Bourbon', 48.8617, 2.3187),
    ('Saint-Germain-des-Prés', 48.8540, 2.3338), ('Saint-Sulpice', 48.8510, 2.3348), ('Luxembourg', 48.8483, 2.3372), ('Théâtre-Français', 48.8494, 2.3388),
    ('Sorbonne', 48.8487, 2.3433), ('Sainte-Geneviève', 48.8462, 2.3464), ('Val-de-Grâce', 48.8405, 2.3418), ('Observatoire', 48.8364, 2.3365),
    ('Jardin du Roi', 48.8440, 2.3596), ('Salpêtrière', 48.8375, 2.3650), ('Gobelins', 48.8343, 2.3530), ('Arsenal', 48.8510, 2.3655),
    ('Hôtel des Monnaies', 48.8566, 2.3390), ('Collège des Quatre-Nations', 48.8573, 2.3370), ('Pont Royal', 48.8603, 2.3300), ('Pont Louis XVI', 48.8634, 2.3193),
    ('La Madeleine', 48.8700, 2.3245), ('Saint-Roch', 48.8652, 2.3327), ('Saint-Paul-Saint-Louis', 48.8546, 2.3614), ('Île Saint-Louis', 48.8518, 2.3565),
    ('Folie de Chartres', 48.8796, 2.3089), ('Barrière du Trône', 48.8483, 2.3975), ('Barrière de l’Étoile', 48.8738, 2.2950), ('Rotonde de la Villette', 48.8836, 2.3697),
    ('Barrière d’Enfer', 48.8339, 2.3324),
]


def lambert93(lat, lon):
    """Projection Lambert-93 (RGF93, ellipsoïde GRS 80) d'un point donné en degrés."""
    e = 0.0818191910428158; n = 0.7256077650532670; C = 11754255.426096; xs = 700000.0; ys = 12655612.049876
    phi = math.radians(lat); lam = math.radians(lon - 3.0)
    L = math.atanh(math.sin(phi)) - e * math.atanh(e * math.sin(phi))
    R = C * math.exp(-n * L)
    return xs + R * math.sin(n * lam), ys - R * math.cos(n * lam)


def in_ring(ring, x, z):
    inside = False; j = len(ring) - 1
    for i in range(len(ring)):
        a, b = ring[i], ring[j]
        if (a[1] > z) != (b[1] > z) and x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]: inside = not inside
        j = i
    return inside


def main():
    T, reg = X.register()
    print('recalage :', reg)

    def polys_of(g, tol, min_area=0.0, min_hole=12.0):
        out = []
        for poly in gpkg.polygons(g):
            rings = []
            for k, ring in enumerate(poly):
                r = X.simplify_ring([T(*p) for p in ring], tol)
                a, _ = X.area_centroid(r) if r and len(r) >= 3 else (0, None)
                if r and len(r) >= 3 and (a >= min_area if k == 0 else a >= min_hole): rings.append(r)
                elif k == 0: break
            if rings: out.append(rings)
        return out

    data = {'meta': {
        'source': 'SIG ALPAGE (AnaLyse diachronique de l’espace urbain PArisien : approche GEomatique), https://alpage.huma-num.fr/donnees-sig/',
        'licence': 'Open Database License 1.0 (ODbL) — base dérivée, diffusée sous la même licence',
        'reperes': 'mètres, x vers l’est, z vers le sud, origine au parvis de Notre-Dame (repère commun avec la maquette de 1380)',
        'recalage': reg}}

    # ---- mur des Fermiers généraux : il fixe le cadre de la page
    mur = [p for d, g in X.layer('Enceintes') if d['Libelle'] == 'Fermiers généraux' for p in polys_of(g, 1.0, 4.0)]
    xs = [p[0] for rings in mur for p in rings[0]]; zs = [p[1] for rings in mur for p in rings[0]]
    cadre = [math.floor((min(xs) - MARGE) / PAS) * PAS, math.floor((min(zs) - MARGE) / PAS) * PAS, math.ceil((max(xs) + MARGE) / PAS) * PAS, math.ceil((max(zs) + MARGE) / PAS) * PAS]
    data['meta']['cadre'] = cadre
    data['mur'] = {'q': 1, 'g': X.enc_polys(mur, 1), 'n': len(mur), 'credit': '© ALPAGE : P. Rouet, d’après le plan de Verniquet'}
    print('mur des Fermiers généraux', len(mur), 'polygones ; cadre', cadre, '(%.1f × %.1f km)' % ((cadre[2] - cadre[0]) / 1000, (cadre[3] - cadre[1]) / 1000))

    # ---- îlots de Verniquet
    ilots = [p for d, g in X.layer('Ilots_1791') for p in polys_of(g, 0.8, 60.0, 80.0)]

    # ---- bâti de Vasserot : un polygone par corps de bâtiment ; noms des édifices repérés par l'atlas
    bati, noms, jardins, enclos = [], {}, [], []
    for d, g in X.layer('Vasserot_1_Bati'):
        code = int(d.get('BATI') or 0); nom = (d.get('NOM_code2') or '').strip(); note = (d.get('Nom_Bati') or '').strip()
        if code == 1:
            for rings in polys_of(g, 0.5, 9.0):
                if nom and not nom.lower().startswith(('redecouper', 'revoir')): noms[len(bati)] = nom
                bati.append(rings)
        elif code == 3 and nom and not nom.lower().startswith(('redecouper', 'revoir', 'place', 'marché')):
            for rings in polys_of(g, 0.5, 1500.0):          # code 3 : ensemble non détaillé par l'atlas (le Palais de la Cité)
                noms[len(bati)] = nom; enclos.append(len(bati)); bati.append(rings)
        elif code == 2 and (not nom or nom.lower().startswith(('jardin', 'parc'))):
            jardins += polys_of(g, 1.0, 1200.0, 200.0)    # grands espaces non bâtis : jardins, s'ils sont dans un îlot (tri plus bas)
    data['bati'] = {'q': 2, 'g': X.enc_polys(bati, 2), 'n': len(bati), 'noms': {str(k): v for k, v in noms.items()}, 'enclos': enclos,
                    'credit': 'Espaces bâtis de l’Atlas par îlots de Vasserot (1810-1836) — Arch. nat. F31 73-96 – Arch. Paris © ALPAGE : A.-L. Bethe'}
    data['jardins'] = {'q': 1, 'g': X.enc_polys(jardins, 1), 'n': len(jardins)}
    print('bâti', len(bati), 'corps de bâtiment,', sum(len(r) for rings in bati for r in rings), 'sommets,', len(noms), 'nommés,', len(data['bati']['g']) // 1024, 'Ko ; jardins', len(jardins))

    # un espace non bâti hors de tout îlot est une place ou une rue, pas un jardin
    boxes = [(min(p[0] for p in r[0]), min(p[1] for p in r[0]), max(p[0] for p in r[0]), max(p[1] for p in r[0]), r[0]) for r in ilots]
    def dans_un_ilot(x, z): return any(b[0] <= x <= b[2] and b[1] <= z <= b[3] and in_ring(b[4], x, z) for b in boxes)
    avant = len(jardins); jardins = [j for j in jardins if dans_un_ilot(*X.area_centroid(j[0])[1])]
    data['jardins'] = {'q': 1, 'g': X.enc_polys(jardins, 1), 'n': len(jardins)}
    print('jardins', len(jardins), 'sur', avant, 'grands espaces non bâtis (les autres sont des places ou des rues)')

    # un îlot est « documenté » si l'atlas de Vasserot y place au moins un bâtiment : ailleurs, le bâti sera évoqué
    cell = 80; grid = {}
    for rings in bati:
        a, c = X.area_centroid(rings[0]); grid.setdefault((int(c[0] // cell), int(c[1] // cell)), []).append(c)
    flags = []
    for rings in ilots:
        r = rings[0]; x0 = min(p[0] for p in r); x1 = max(p[0] for p in r); z0 = min(p[1] for p in r); z1 = max(p[1] for p in r); hit = 0
        for i in range(int(x0 // cell), int(x1 // cell) + 1):
            for k in range(int(z0 // cell), int(z1 // cell) + 1):
                for c in grid.get((i, k), ()):
                    if in_ring(r, c[0], c[1]): hit += 1
        flags.append('1' if hit else '0')
    data['ilots'] = {'q': 1, 'g': X.enc_polys(ilots, 1), 'n': len(ilots), 'doc': ''.join(flags), 'credit': 'Îlots du plan de Verniquet (levé de 1782 à 1790) — © ALPAGE : P. Rouet'}
    print('îlots', len(ilots), 'dont', flags.count('1'), 'documentés par Vasserot ;', len(data['ilots']['g']) // 1024, 'Ko')

    # ---- rues nommées du plan de Verniquet
    noms_rues, idx, lignes = [], [], []
    for d, g in X.layer('Rues_1791'):
        t = (d.get('type_voie') or '').strip(); p = (d.get('particule') or '').strip(); n = (d.get('nom_voie') or '').strip()
        nom = ' '.join(s for s in (t.capitalize() if t else '', p, n) if s).replace("' ", "'") if n else ''
        for l in gpkg.lines(g):
            l = X.dp([T(*q) for q in l], 0.8)
            if len(l) < 2: continue
            if nom and nom not in noms_rues: noms_rues.append(nom)
            idx.append(noms_rues.index(nom) if nom else -1); lignes.append(l)
    data['rues'] = {'q': 1, 'g': X.enc_lines(lignes, 1), 'n': len(lignes), 'noms': noms_rues, 'i': idx, 'credit': 'Rues du plan de Verniquet — © ALPAGE : L. Hermenault'}
    print('rues', len(lignes), 'tronçons,', len(noms_rues), 'noms')

    # ---- la Seine et ses îles
    eau = [p for d, g in X.layer('Hydro_1791') for p in polys_of(g, 1.0, 300.0, 300.0)]
    data['eau'] = {'q': 1, 'g': X.enc_polys(eau, 1), 'n': len(eau), 'credit': '© ALPAGE : P. Rouet, d’après le plan de Verniquet'}
    print('eau', len(eau), 'polygones')

    # ---- établissements religieux en activité en 1789
    egl = []
    for d, g in X.layer('Eglises'):
        if not g or g[0] != 'Point' or not all(math.isfinite(c) for c in g[1]): continue
        try: dd, df = int(d['DD2']), int(d['DF1'])
        except (TypeError, ValueError): continue
        if not (dd <= 1789 < df): continue
        x, z = T(*g[1]); egl.append([round(x), round(z), (d['Statut'] or '').replace('Eglise', 'Église'), (d['Nom_court'] or d['Titulature'] or '').strip()])
    data['eglises'] = {'objets': egl, 'credit': '© ALPAGE : É. Lallau'}
    print('établissements religieux en 1789', len(egl))

    # ---- enclos nommés par l'atlas de Vasserot (parcelles) : places, jardins, hôpitaux, palais — ils situent les
    # grands édifices que la couche du bâti ne couvre pas, et donnent leur orientation
    enclos, noms_enclos = [], []
    for d, g in X.layer('Vasserot_1_Parcelles'):
        nom = (d.get('NOM_CODE2') or '').strip()
        if not nom: continue
        for rings in polys_of(g, 1.5, 5000.0, 400.0):
            enclos.append(rings); noms_enclos.append(nom)
    data['enclos'] = {'q': 1, 'g': X.enc_polys(enclos, 1), 'n': len(enclos), 'noms': noms_enclos,
                      'credit': 'Parcelles de l’Atlas par îlots de Vasserot (1810-1836) — Arch. nat. F31 73-96 – Arch. Paris © ALPAGE : A.-L. Bethe'}
    print('enclos nommés', len(enclos), sorted(set(noms_enclos))[:8], '…')

    # ---- la Bastille : emprise restituée de la forteresse (tours et courtines)
    bast = [p for d, g in X.layer('Bastille') for p in polys_of(g, 0.3, 4.0, 4.0)]
    data['bastille'] = {'q': 2, 'g': X.enc_polys(bast, 2), 'n': len(bast), 'credit': '© ALPAGE : N. Faucherre'}
    print('Bastille', len(bast), 'polygones,', [round(X.area_centroid(p[0])[0]) for p in bast], 'm²')

    # ---- repères situés par leurs coordonnées géographiques
    rep = []
    for nom, lat, lon in REPERES:
        x, z = T(*lambert93(lat, lon)); rep.append([round(x), round(z), nom])
    data['reperes'] = rep
    nd = next(r for r in rep if r[2] == 'Notre-Dame')
    print('repères', len(rep), '; Notre-Dame en', nd[:2], '(la maquette de 1380 la place vers −36, −14)')

    # ---- relief : nivellement de Girard, ramené à une grille par moyenne pondérée des plus proches cotes
    pts = []
    for d, g in X.layer('Relief_Girard_Point'):
        if not g or g[0] != 'Point' or d.get('NGF') is None: continue
        x, z = T(*g[1]); pts.append((x, z, float(d['NGF'])))
    cg = 150; hg = {}
    for p in pts: hg.setdefault((int(p[0] // cg), int(p[1] // cg)), []).append(p)
    nx = (cadre[2] - cadre[0]) // PAS + 1; nz = (cadre[3] - cadre[1]) // PAS + 1; vals = []
    for k in range(nz):
        for i in range(nx):
            x = cadre[0] + i * PAS; z = cadre[1] + k * PAS; near = []; r = 1
            while len(near) < 6 and r < 14:
                near = [p for a in range(int(x // cg) - r, int(x // cg) + r + 1) for b in range(int(z // cg) - r, int(z // cg) + r + 1) for p in hg.get((a, b), ())]; r += 1
            if not near: vals.append(None); continue
            near.sort(key=lambda p: (p[0] - x) ** 2 + (p[1] - z) ** 2); sw = sh = 0.0
            if (near[0][0] - x) ** 2 + (near[0][1] - z) ** 2 > PORTEE ** 2: vals.append(None); continue      # trop loin de toute cote : hors du nivellement
            for p in near[:8]:
                w = 1.0 / ((p[0] - x) ** 2 + (p[1] - z) ** 2 + 400.0) ** 1.5; sw += w; sh += w * p[2]
            vals.append(sh / sw)
    known = [v for v in vals if v is not None]; lo = min(known)
    ints = [round((v - lo) * 10) if v is not None else -1 for v in vals]                # décimètres au-dessus du point le plus bas ; −1 : hors du nivellement
    data['relief'] = {'x0': cadre[0], 'z0': cadre[1], 'pas': PAS, 'nx': nx, 'nz': nz, 'base': round(lo, 2), 'h': X.vlq([ints[0]] + [ints[i] - ints[i - 1] for i in range(1, len(ints))]),
                      'credit': 'Nivellement de P.-S. Girard (1805-1807) — © ALPAGE : M. Fernandez'}
    print('relief', len(pts), 'cotes →', nx, '×', nz, 'nœuds ; NGF', round(lo, 1), 'à', round(max(known), 1), 'm ;', vals.count(None), 'nœuds hors du nivellement')

    with open(OUT, 'w', encoding='utf8') as f: json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print('écrit', OUT, round(os.path.getsize(OUT) / 1024), 'Ko')


if __name__ == '__main__':
    main()
