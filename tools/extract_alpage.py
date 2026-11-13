#!/usr/bin/env python3
"""Extrait la géométrie du « Plan restitué de Paris en 1380 » (ALPAGE / CNRS) vers data/paris1380.json.

Source : Leuridan (J.) et Mallet (J.-A.), Plan restitué de Paris en 1380, CNRS Éditions, 1991/1999 ;
infographie C. Roms, UMR 8589 LAMOP, 2006 — diffusé par le projet ALPAGE sous licence CC-BY-SA 2.0 FR.

Coordonnées de sortie : mètres, x vers l'est, z vers le sud, origine au parvis de Notre-Dame.
"""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import svgx

SRC = os.path.join(HERE, '..', 'data', 'source', 'Paris_1380.svg')
OUT = os.path.join(HERE, '..', 'data', 'paris1380.json')

# Barre d'échelle du plan : 98.466 unités SVG = 500 m
M_PER_UNIT = 500.0 / (361.118 - 262.652)
ORIGIN = (343.0, 452.5)   # parvis Notre-Dame (unités SVG)
FRAME = (65.67, 52.67, 608.32, 740.59)

GEOM_LAYERS = ['Eau', 'Remplissagecité', 'Non_bâti', 'Abbaye_StVictor', 'Le_temple', 'St-Martin', 'L_x0027_abbaye',
               'Bâti', 'Hôtel_de_Cluny', 'Louvre', 'Cimetières_juifs', 'Hôtel', 'Moulins', 'Collèges', 'Halles',
               'Hôpital', 'Bat_royaux_et_mun', 'Cimetières', 'Edifices_religieux', 'En_construction',
               'Limites_parcelles', 'Palais_du_Roi', 'Egout', 'Berges_iles', 'Ponts', 'Voies', 'Fontaines',
               'Enceinte_Ph_Auguste', 'Chaines', 'Enceinte_Charles_V', 'Cadre']
TEXT_LAYERS = ['nom_bât', 'Portes', 'Noms_divers', 'Iles', 'Ponts_1_', 'Rues_secondaires', 'Cours_d_x0027_eau',
               'Rues_Principales', 'L_x0027_abbaye', 'Hôtel_de_Cluny']
NAMES = {'L_x0027_abbaye': 'StGermain', 'Bâti': 'Bati', 'Non_bâti': 'NonBati', 'Hôtel': 'Hotel', 'Collèges': 'Colleges',
         'Hôpital': 'Hopital', 'Cimetières': 'Cimetieres', 'Cimetières_juifs': 'CimetieresJuifs', 'Hôtel_de_Cluny': 'Cluny',
         'Remplissagecité': 'FondCite', 'Edifices_religieux': 'Religieux', 'En_construction': 'EnConstruction',
         'Bat_royaux_et_mun': 'Royal', 'Palais_du_Roi': 'Palais', 'Enceinte_Ph_Auguste': 'EnceintePA',
         'Enceinte_Charles_V': 'EnceinteC5', 'Limites_parcelles': 'Parcelles', 'Berges_iles': 'Berges',
         'Abbaye_StVictor': 'StVictor', 'Le_temple': 'Temple', 'St-Martin': 'StMartin', 'Voies_postérieures': 'VoiesPost',
         'nom_bât': 'batiments', 'Portes': 'portes', 'Noms_divers': 'divers', 'Iles': 'iles', 'Ponts_1_': 'ponts',
         'Rues_secondaires': 'rues2', 'Cours_d_x0027_eau': 'eaux', 'Rues_Principales': 'rues1'}

def W(p):
    return ((p[0] - ORIGIN[0]) * M_PER_UNIT, (p[1] - ORIGIN[1]) * M_PER_UNIT)

def simplify(pts, tol):
    """Douglas-Peucker."""
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        dmax, idx = 0, -1
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy)
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs((px - ax) * dy - (py - ay) * dx) / L if L > 1e-9 else math.hypot(px - ax, py - ay)
            if d > dmax: dmax, idx = d, i
        if dmax > tol:
            keep[idx] = True; stack.append((a, idx)); stack.append((idx, b))
    return [p for p, k in zip(pts, keep) if k]

def clean(pts, closed, tol=0.35):
    out = []
    for p in pts:
        if not out or math.hypot(p[0] - out[-1][0], p[1] - out[-1][1]) > 0.05: out.append(p)
    if closed and len(out) > 1 and math.hypot(out[0][0] - out[-1][0], out[0][1] - out[-1][1]) < 0.05: out.pop()
    if closed and len(out) >= 4:
        # simplification d'un anneau : on coupe au point le plus éloigné du premier
        far = max(range(len(out)), key=lambda i: (out[i][0] - out[0][0]) ** 2 + (out[i][1] - out[0][1]) ** 2)
        a = simplify(out[:far + 1], tol); b = simplify(out[far:] + [out[0]], tol)
        out = a[:-1] + b[:-1]
    elif not closed:
        out = simplify(out, tol)
    return out

def area(pts):
    a = 0
    for i in range(len(pts)):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % len(pts)]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2

def inside(p, poly):
    x, y = p; c = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c

def main():
    root, layers = svgx.load(SRC)
    data = {'meta': {
        'source': 'Leuridan & Mallet, Plan restitué de Paris en 1380, CNRS Éditions 1991/1999 ; infographie C. Roms, LAMOP 2006 ; ALPAGE',
        'licence': 'CC-BY-SA 2.0 FR', 'mPerUnit': M_PER_UNIT, 'origin': ORIGIN,
        'frame': [round(v, 1) for v in (W((FRAME[0], FRAME[1])) + W((FRAME[2], FRAME[3])))]},
        'layers': {}, 'labels': {}}
    for lid in GEOM_LAYERS:
        if lid not in layers: print('absent', lid); continue
        out = []
        for s in svgx.shapes_of(layers[lid], tol=0.03):
            if s['kind'] == 'circle':
                c = W(s['pts'][0])
                out.append({'k': 'c', 'f': s['fill'], 's': s['stroke'] != 'none', 'p': [round(c[0], 1), round(c[1], 1)], 'r': round(s['r'] * M_PER_UNIT, 2)})
                continue
            closed = s['closed'] or (s['fill'] not in ('none',) and s['kind'] != 'line' and len(s['pts']) > 2)
            pts = clean([W(p) for p in s['pts']], closed)
            if len(pts) < 2: continue
            flat = []
            for p in pts: flat += [round(p[0], 1), round(p[1], 1)]
            o = {'k': 'g' if closed else 'l', 'f': s['fill'], 's': s['stroke'] != 'none', 'p': flat}
            if s['dash']: o['d'] = 1
            if s['opacity'] < 1: o['o'] = s['opacity']
            if s['stroke'] != 'none' and s['sw'] != 0.5: o['w'] = round(s['sw'] * M_PER_UNIT, 2)
            if s['stroke'] not in ('none', '#000000'): o['sc'] = s['stroke']
            # sous-chemins d'un même <path> : les anneaux intérieurs deviennent des trous
            if closed and s.get('sub', 0) > 0 and s['fill'] != 'none' and out and out[-1].get('_pid') == s.get('pid') and out[-1]['k'] == 'g':
                host = out[-1]
                if inside(pts[0], host['_pts']) and area(pts) < area(host['_pts']):
                    host.setdefault('h', []).append(flat); continue
            o['_pid'] = s.get('pid'); o['_pts'] = pts
            out.append(o)
        for o in out:
            o.pop('_pid', None); o.pop('_pts', None)
        data['layers'][NAMES.get(lid, lid)] = out
    for lid in TEXT_LAYERS:
        if lid not in layers: continue
        labs = []
        for grp in svgx.texts_of(layers[lid]):
            s = ''; prev = None
            for (t, x, y, ang, fs) in grp:
                t = t.replace('’', "'")
                if prev is not None:
                    px, py, pend = prev
                    same = abs(y - py) < 0.3 * (fs or 5) and abs(ang) < 1
                    if not same or t.strip() == '' or (x - pend) > 0.12 * (fs or 5):
                        if not s.endswith(' ') and not s.endswith('-'): s += ' '
                s += t.strip()
                prev = (x, y, x + len(t.strip()) * 0.46 * (fs or 5))
            s = ' '.join(s.split()).replace('- ', '-') if lid != 'rues' else s
            if not s: continue
            xs = [g[1] for g in grp]; ys = [g[2] for g in grp]
            c = W(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2))
            labs.append({'t': s, 'p': [round(c[0], 1), round(c[1], 1)], 'a': round(grp[0][3], 1)})
        key = NAMES.get(lid, lid)
        data['labels'].setdefault(key if lid not in ('L_x0027_abbaye', 'Hôtel_de_Cluny') else 'batiments', []).extend(labs)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print('ok', OUT, os.path.getsize(OUT), 'octets')
    for k, v in data['layers'].items(): print(f'  {k}: {len(v)}')
    for k, v in data['labels'].items(): print(f'  labels {k}: {len(v)}')

if __name__ == '__main__':
    main()
