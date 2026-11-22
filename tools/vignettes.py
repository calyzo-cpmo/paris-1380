#!/usr/bin/env python3
"""Vignettes de l'écran d'accueil (dist/og/vignettes/*.jpg), tirées des images de partage de dist/og/.

L'image de partage (1200 × 630, tools/og.mjs) porte en bas à gauche un bandeau de titre : la vignette n'en garde que le
haut, où se voit la ville, recadré et réduit à 480 × 300 points. Une vignette pèse une quarantaine de kilo-octets ;
l'écran d'accueil en montre cinq.

  python3 tools/vignettes.py        (à relancer après tools/og.mjs)
"""
import glob, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OG = os.path.join(HERE, '..', 'dist', 'og')
OUT = os.path.join(OG, 'vignettes')
L, H = 480, 300                   # taille de la vignette
HAUT = 440                        # hauteur gardée en haut de l'image de partage, au-dessus du bandeau de titre

os.makedirs(OUT, exist_ok=True)
for chemin in sorted(glob.glob(os.path.join(OG, '*.jpg'))):
    im = Image.open(chemin).convert('RGB')
    w, h = im.size
    haut = min(HAUT * h // 630, h)
    k = min(w / L, haut / H)                                      # recadrage au rapport de la vignette, centré en largeur
    cw, ch = round(L * k), round(H * k)
    x0 = (w - cw) // 2
    v = im.crop((x0, 0, x0 + cw, ch)).resize((L, H), Image.LANCZOS)
    dest = os.path.join(OUT, os.path.basename(chemin))
    v.save(dest, 'JPEG', quality=80, optimize=True, progressive=True)
    print('vignette', os.path.basename(chemin), round(os.path.getsize(dest) / 1024), 'Ko')
