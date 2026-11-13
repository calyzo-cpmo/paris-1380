#!/usr/bin/env python3
"""Extrait du SIG ALPAGE les données de la page « Paris 1789 » vers data/paris1789.json.

Ce que la ville de la fin du XVIIIe siècle doit à chaque couche (toutes sous licence ODbL 1.0) :
  - îlots et Seine : plan de Verniquet, levé de 1782 à 1790 (Ilots_1791, Hydro_1791) ;
  - rues nommées : même plan (Rues_1791) ;
  - bâti : espaces bâtis de l'Atlas par îlots de Vasserot, dressé de 1810 à 1836 (Vasserot_1_Bati). C'est la source
    la plus proche de 1789 qui donne l'emprise de chaque bâtiment ; elle est postérieure d'une génération ;
  - mur des Fermiers généraux (Enceintes), établissements religieux en activité en 1789 (Eglises) ;
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
    bati, noms, jardins = [], {}, []
    for d, g in X.layer('Vasserot_1_Bati'):
        code = int(d.get('BATI') or 0); nom = (d.get('NOM_code2') or '').strip(); note = (d.get('Nom_Bati') or '').strip()
        if code == 1:
            for rings in polys_of(g, 0.5, 9.0):
                if nom and not nom.lower().startswith(('redecouper', 'revoir')): noms[len(bati)] = nom
                bati.append(rings)
        elif code == 2 and note.lower().startswith('parc ou jardin'):
            jardins += polys_of(g, 1.0, 200.0, 200.0)
    data['bati'] = {'q': 2, 'g': X.enc_polys(bati, 2), 'n': len(bati), 'noms': {str(k): v for k, v in noms.items()},
                    'credit': 'Espaces bâtis de l’Atlas par îlots de Vasserot (1810-1836) — Arch. nat. F31 73-96 – Arch. Paris © ALPAGE : A.-L. Bethe'}
    data['jardins'] = {'q': 1, 'g': X.enc_polys(jardins, 1), 'n': len(jardins)}
    print('bâti', len(bati), 'corps de bâtiment,', sum(len(r) for rings in bati for r in rings), 'sommets,', len(noms), 'nommés,', len(data['bati']['g']) // 1024, 'Ko ; jardins', len(jardins))

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
