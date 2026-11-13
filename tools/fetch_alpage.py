#!/usr/bin/env python3
"""Télécharge dans data/source/alpage/ les couches du SIG ALPAGE dont se servent tools/extract_epochs.py et tools/extract_1789.py.

Source : https://alpage.huma-num.fr/donnees-sig/ — données diffusées sous licence ODbL 1.0 par le consortium ALPAGE.
Seul le fichier GeoPackage de chaque archive est conservé ; les fiches de métadonnées et le texte de la licence
restent consultables sur le site. Ces fichiers ne sont pas versionnés : relancer ce script suffit à les retrouver.
"""
import io, os, sys, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(HERE, '..', 'data', 'source', 'alpage')
BASE = 'https://alpage.huma-num.fr/wp-content/uploads/2026/09/'
LAYERS = ['Enceintes', 'Tours_portes', 'Ilots_1300', 'Ilots_1553', 'Ilots_1652', 'Ilots_1741', 'Ilots_1791', 'Vasserot_2_Ilots_calibres',
          'Rues_Lutece_Vacquer', '1380_antiquites_romaines', 'Hydro_romaine_Vacquer', '1380_emprises_futures', '1380_ilots',
          'Hydro_1791', 'Vasserot_2_Hydro', 'Eglises']
# couches propres à la page « Paris 1789 » (tools/extract_1789.py)
LAYERS += ['Vasserot_1_Bati', 'Rues_1791', 'Relief_Girard_Point']


def main():
    os.makedirs(DEST, exist_ok=True)
    for name in LAYERS:
        out = os.path.join(DEST, name + '.gpkg')
        if os.path.exists(out) and '--force' not in sys.argv:
            print('déjà là  ', name); continue
        req = urllib.request.Request(BASE + name + '.zip', headers={'User-Agent': 'paris-1380 (extraction des couches ALPAGE)'})
        with urllib.request.urlopen(req, timeout=120) as r:
            z = zipfile.ZipFile(io.BytesIO(r.read()))
        member = next((m for m in z.namelist() if m.lower().endswith('.gpkg')), None)
        if not member: sys.exit('aucun GeoPackage dans ' + name + '.zip')
        with open(out, 'wb') as f: f.write(z.read(member))        # on n'écrit que ce fichier, sous un nom que l'on choisit
        print('téléchargé', name, os.path.getsize(out) // 1024, 'Ko')


if __name__ == '__main__':
    main()
