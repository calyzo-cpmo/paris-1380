#!/usr/bin/env python3
"""Planche de comparaison pour Paris 1975 : la photographie aérienne de 1965, la carte de 1979 et la photographie
d'aujourd'hui, côte à côte.

  python3 tools/photo1975.py SORTIE.jpg LAT LON [ZOOM] [TUILES]

Aucune photographie orthorectifiée de Paris en 1975 n'est servie par la Géoplateforme de l'IGN (ETUDE-1975.md) : la
couche « Photographies aériennes 1965-1980 » (ORTHOIMAGERY.ORTHOPHOTOS.1965-1980) montre Paris en 1965 (tableau des dates
de prise de vue de l'IGN), la couche « Cartographie 1979 » d'Édugéo (GEOGRAPHICALGRIDSYSTEMS.EDUGEO.PARIS1979) la carte
topographique de 1979. Elles encadrent la date : ce qui est sur les deux était là en 1975. ZOOM 16 (par défaut) : 1,6 m
par pixel à Paris (la carte de 1979 ne va pas au-delà) ; TUILES (par défaut 4) : la planche couvre TUILES × 256 pixels de
côté par image. Les tuiles sont gardées dans data/source/1975/tuiles/ (non versionné).
"""
import io, math, os, sys, time, urllib.request
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '..', 'data', 'source', '1975', 'tuiles')
WMTS = ('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=%s&STYLE=%s'
        '&TILEMATRIXSET=PM&TILEMATRIX=%d&TILEROW=%d&TILECOL=%d&FORMAT=%s')
COUCHES = [('ORTHOIMAGERY.ORTHOPHOTOS.1965-1980', 'BDORTHOHISTORIQUE', 'image/png', 'Paris en 1965 (IGN)'),
           ('GEOGRAPHICALGRIDSYSTEMS.EDUGEO.PARIS1979', 'normal', 'image/png', 'Carte de 1979 (IGN)'),
           ('ORTHOIMAGERY.ORTHOPHOTOS', 'normal', 'image/jpeg', 'Aujourd’hui (IGN)')]
UA = {'User-Agent': 'paris-a-travers-le-temps/1975 (etude de donnees ouvertes)'}


def tuile(couche, style, fmt, z, row, col):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, '%s_%d_%d_%d' % (couche, z, row, col))
    if not os.path.exists(p):
        raw = b''
        for k in range(4):
            try:
                raw = urllib.request.urlopen(urllib.request.Request(WMTS % (couche, style, z, row, col, fmt), headers=UA), timeout=60).read(); break
            except Exception as e:                                       # réseau : on réessaie, de plus en plus tard
                if k == 3: print('   tuile manquante', couche, z, row, col, ':', str(e)[:80])
                else: time.sleep(2 * (k + 1))
        if raw:
            with open(p, 'wb') as f: f.write(raw)
    try:
        with open(p, 'rb') as f: im = Image.open(io.BytesIO(f.read()))
        if im.mode == 'P': im = im.convert('RGBA')
        return im.convert('RGB')
    except Exception: return Image.new('RGB', (256, 256), (200, 200, 200))


def mosaique(couche, style, fmt, lat, lon, z, n):
    m = 2 ** z; x = (lon + 180) / 360 * m; y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * m
    c0, r0 = int(x) - n // 2, int(y) - n // 2
    im = Image.new('RGB', (256 * n, 256 * n))
    for i in range(n):
        for k in range(n): im.paste(tuile(couche, style, fmt, z, r0 + k, c0 + i), (256 * i, 256 * k))
    return im


def main():
    if len(sys.argv) < 4: raise SystemExit(__doc__)
    out, lat, lon = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
    z = int(sys.argv[4]) if len(sys.argv) > 4 else 16
    n = int(sys.argv[5]) if len(sys.argv) > 5 else 4
    ims = [(titre, mosaique(c, s, fmt, lat, lon, z, n)) for c, s, fmt, titre in COUCHES]
    W = sum(i.width for _, i in ims) + 8 * (len(ims) - 1)
    planche = Image.new('RGB', (W, ims[0][1].height + 22), (255, 255, 255)); d = ImageDraw.Draw(planche); x0 = 0
    for titre, i in ims:
        planche.paste(i, (x0, 22)); d.text((x0 + 4, 5), titre, fill=(0, 0, 0)); x0 += i.width + 8
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    planche.save(out, quality=85)
    print(out, '%d × %d px ; %.2f m par pixel ; %.0f m de côté' % (planche.width, planche.height, 156543.03 * math.cos(math.radians(lat)) / 2 ** z,
                                                                 256 * n * 156543.03 * math.cos(math.radians(lat)) / 2 ** z))


if __name__ == '__main__':
    main()
