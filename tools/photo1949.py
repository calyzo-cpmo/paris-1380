#!/usr/bin/env python3
"""Planche de comparaison : la photographie aérienne de Paris en 1949 et celle d'aujourd'hui, côte à côte.

  python3 tools/photo1949.py SORTIE.jpg LAT LON [ZOOM] [TUILES]

La couche « Photographie - Paris 1949 » de l'IGN (ORTHOIMAGERY.EDUGEO.PARIS1949, service WMTS de la Géoplateforme) montre
la ville avant les grandes opérations d'après-guerre : c'est la source de contrôle de Paris 1937 pour les quartiers
démolis depuis (ETUDE-1937.md). ZOOM 17 (par défaut) : 0,79 m par pixel à Paris ; TUILES (par défaut 5) : la planche
couvre TUILES × 256 pixels de côté par image. Les tuiles sont gardées dans data/source/1937/tuiles/ (non versionné).
"""
import io, math, os, sys, time, urllib.request
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '..', 'data', 'source', '1937', 'tuiles')
WMTS = ('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=%s&STYLE=normal'
        '&TILEMATRIXSET=PM&TILEMATRIX=%d&TILEROW=%d&TILECOL=%d&FORMAT=%s')
COUCHES = [('ORTHOIMAGERY.EDUGEO.PARIS1949', 'image/png', 'Paris en 1949 (IGN)'),
           ('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg', 'Aujourd’hui (IGN)')]
UA = {'User-Agent': 'paris-a-travers-le-temps/1937 (etude de donnees ouvertes)'}


def tuile(couche, fmt, z, row, col):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, '%s_%d_%d_%d' % (couche, z, row, col))
    if not os.path.exists(p):
        raw = b''
        for k in range(4):
            try:
                raw = urllib.request.urlopen(urllib.request.Request(WMTS % (couche, z, row, col, fmt), headers=UA), timeout=60).read(); break
            except Exception as e:                                       # réseau : on réessaie, de plus en plus tard
                if k == 3: print('   tuile manquante', couche, z, row, col, ':', str(e)[:80])
                else: time.sleep(2 * (k + 1))
        if raw:
            with open(p, 'wb') as f: f.write(raw)
    try:
        with open(p, 'rb') as f: return Image.open(io.BytesIO(f.read())).convert('RGB')
    except Exception: return Image.new('RGB', (256, 256), (200, 200, 200))


def mosaique(couche, fmt, lat, lon, z, n):
    m = 2 ** z; x = (lon + 180) / 360 * m; y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * m
    c0, r0 = int(x) - n // 2, int(y) - n // 2
    im = Image.new('RGB', (256 * n, 256 * n))
    for i in range(n):
        for k in range(n): im.paste(tuile(couche, fmt, z, r0 + k, c0 + i), (256 * i, 256 * k))
    return im


def main():
    if len(sys.argv) < 4: raise SystemExit(__doc__)
    out, lat, lon = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
    z = int(sys.argv[4]) if len(sys.argv) > 4 else 17
    n = int(sys.argv[5]) if len(sys.argv) > 5 else 5
    ims = [(titre, mosaique(c, fmt, lat, lon, z, n)) for c, fmt, titre in COUCHES]
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
