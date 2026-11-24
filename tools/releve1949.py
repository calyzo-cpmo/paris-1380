#!/usr/bin/env python3
"""Planche de relevé : la photographie aérienne de Paris en 1949, redressée dans le repère de la maquette, sous une grille
cotée — pour lire les emprises des édifices disparus depuis 1937 (src/p1937/disparus.js).

  python3 tools/releve1949.py SORTIE.png X Z [CÔTÉ] [PAS] [ZOOM] [aujourdhui]

X, Z : centre de la planche dans le repère de la maquette (mètres, x vers l'est, z vers le sud, origine au parvis de
Notre-Dame) ; CÔTÉ : côté de la planche en mètres (400 par défaut) ; PAS : pas de la grille (50 m) ; ZOOM : niveau
des tuiles (18 par défaut, 0,39 m par pixel à Paris). Le nord est en haut. Les îlots de 1937 (data/paris1937.json)
sont tracés en rouge fin, pour se repérer. Avec « aujourdhui », la photographie d'aujourd'hui est mise à côté.

La photographie est la couche « Photographie - Paris 1949 » de l'IGN (tools/photo1949.py) ; les tuiles sont gardées dans
data/source/1937/tuiles/ (non versionné). Le recalage est celui des autres maquettes (tools/extract_epochs.py).
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import extract_epochs as X                                              # noqa: E402
from photo1949 import tuile, COUCHES                                    # noqa: E402

CACHE = os.path.join(HERE, '..', 'data', 'source', '1937', 'recalage.json')


def recalage():
    """Coefficients de la similitude Lambert-93 → maquette, calculés une fois (tools/extract_epochs.py) puis gardés."""
    if os.path.exists(CACHE): return json.load(open(CACHE))
    T, _ = X.register()
    o, ex = T(0, 0), T(1, 0)
    r = {'a': ex[0] - o[0], 'b': -(ex[1] - o[1]), 'tx': o[0], 'ty': -o[1]}
    json.dump(r, open(CACHE, 'w')); return r


def latlon(E, N):
    """Lambert-93 → degrés (tableaux numpy), comme tools/fetch_1889.py, lambert93_inverse."""
    e = 0.0818191910428158; n = 0.7256077650532670; C = 11754255.426096; xs = 700000.0; ys = 12655612.049876
    R = np.hypot(E - xs, N - ys); g = np.arctan((E - xs) / (ys - N))
    lon = np.degrees(g / n) + 3.0; L = -np.log(R / C) / n
    phi = 2 * np.arctan(np.exp(L)) - math.pi / 2
    for _ in range(8): phi = 2 * np.arctan(((1 + e * np.sin(phi)) / (1 - e * np.sin(phi))) ** (e / 2) * np.exp(L)) - math.pi / 2
    return np.degrees(phi), lon


def redresser(couche, fmt, x0, z0, cote, res, zoom):
    """Image de `cote` mètres de côté, `res` mètres par pixel, coin nord-ouest (x0, z0), prise dans la couche."""
    R = recalage(); a, b, tx, ty = R['a'], R['b'], R['tx'], R['ty']
    n = int(round(cote / res))
    xs = x0 + (np.arange(n) + 0.5) * res; zs = z0 + (np.arange(n) + 0.5) * res
    X_, Z_ = np.meshgrid(xs, zs)
    u, w = X_ - tx, -Z_ - ty; d = a * a + b * b
    E, N = (a * u + b * w) / d, (a * w - b * u) / d                     # maquette → Lambert-93
    lat, lon = latlon(E, N)
    m = 2 ** zoom
    px = (lon + 180) / 360 * m * 256
    py = (1 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2 * m * 256
    c0, c1 = int(px.min() // 256), int(px.max() // 256); r0, r1 = int(py.min() // 256), int(py.max() // 256)
    mos = np.zeros(((r1 - r0 + 1) * 256, (c1 - c0 + 1) * 256, 3), np.uint8)
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1): mos[(r - r0) * 256:(r - r0 + 1) * 256, (c - c0) * 256:(c - c0 + 1) * 256] = np.asarray(tuile(couche, fmt, zoom, r, c))
    ix = np.clip((px - c0 * 256).astype(int), 0, mos.shape[1] - 1); iy = np.clip((py - r0 * 256).astype(int), 0, mos.shape[0] - 1)
    return Image.fromarray(mos[iy, ix])


def ilots(x0, z0, cote):
    """Îlots de 1937 qui touchent la planche (anneaux extérieurs, repère de la maquette)."""
    d = json.load(open(os.path.join(HERE, '..', 'data', 'paris1937.json'), encoding='utf8'))['ilots']
    sys.path.insert(0, HERE); from extract_1889 import decode_polys
    out = []
    for rings in decode_polys(d['g'], d['q']):
        r = rings[0]
        if max(p[0] for p in r) < x0 or min(p[0] for p in r) > x0 + cote or max(p[1] for p in r) < z0 or min(p[1] for p in r) > z0 + cote: continue
        out.append(r)
    return out


def main():
    if len(sys.argv) < 4: raise SystemExit(__doc__)
    out, cx, cz = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
    cote = float(sys.argv[4]) if len(sys.argv) > 4 else 400.0
    pas = float(sys.argv[5]) if len(sys.argv) > 5 else 50.0
    zoom = int(sys.argv[6]) if len(sys.argv) > 6 else 18
    auj = len(sys.argv) > 7 and sys.argv[7] == 'aujourdhui'
    res = max(0.25, cote / 1000.0)
    x0, z0 = cx - cote / 2, cz - cote / 2
    planches = []
    for k, (couche, fmt, titre) in enumerate(COUCHES[:2 if auj else 1]):
        im = redresser(couche, fmt, x0, z0, cote, res, zoom if k == 0 else min(zoom, 19)).convert('RGB')
        dr = ImageDraw.Draw(im); S = lambda x, z: ((x - x0) / res, (z - z0) / res)
        for r in ilots(x0, z0, cote): dr.line([S(*p) for p in r + [r[0]]], fill=(220, 40, 40), width=1)
        g = math.ceil(x0 / pas) * pas
        while g < x0 + cote: dr.line([S(g, z0), S(g, z0 + cote)], fill=(255, 230, 0), width=1); dr.text((S(g, z0)[0] + 2, 2), '%d' % g, fill=(255, 255, 0)); g += pas
        g = math.ceil(z0 / pas) * pas
        while g < z0 + cote: dr.line([S(x0, g), S(x0 + cote, g)], fill=(0, 230, 255), width=1); dr.text((2, S(x0, g)[1] + 2), '%d' % g, fill=(0, 255, 255)); g += pas
        dr.text((4, im.height - 14), titre + ' — x en jaune, z en cyan (m)', fill=(255, 255, 255))
        planches.append(im)
    W = sum(i.width for i in planches) + 8 * (len(planches) - 1)
    pl = Image.new('RGB', (W, planches[0].height), (255, 255, 255)); x = 0
    for i in planches: pl.paste(i, (x, 0)); x += i.width + 8
    pl.save(out)
    print(out, pl.size, '%.2f m par pixel' % res)


if __name__ == '__main__':
    main()
