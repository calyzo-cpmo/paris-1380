#!/usr/bin/env python3
"""Télécharge les sources de la page « Paris 1889 » dans data/source/1889/ (non versionné).

  - Atelier parisien d'urbanisme (APUR), données ouvertes sous ODbL 1.0, service ArcGIS carto2.apur.org :
      EMPRISE_BATIE_PARIS  emprise de chaque bâtiment actuel, année et période de construction, hauteur, toit ;
      PLAN_EAU             Seine, canaux, bassins ;
      VOIE_FERREE          voies ferrées ;
      EQUIPEMENT_EMPRISE   espaces verts, cimetières, lieux de culte, monuments, gares (avec leur nom).
  - Base de données « Paris 1900 — les îlots, les voies et les adresses » (Mermet, Rouet et al., Projets Time Machine),
    ODbL 1.0, entrepôt Nakala, DOI 10.34847/nkl.cbf5ecd0 : îlots et tronçons de voie vers 1900.
  - Relief : RGE ALTI de l'IGN (licence ouverte Etalab 2.0), par le service d'altimétrie de la Géoplateforme.

  python3 tools/fetch_1889.py 1937    sources propres à Paris 1937, dans data/source/1937/ (non versionné) :
      APUR (ODbL 1.0) : tronçons de voie, voies (leurs noms), îlots et arrondissements de Paris d'aujourd'hui, enceinte
      de Thiers ; Ville de Paris (ODbL 1.0) : nomenclature des voies, dénominations actuelles et caduques (dates des
      arrêtés de dénomination et des suppressions).

Chaque fichier déjà présent est conservé : relancer le script reprend là où il s'est arrêté.
"""
import json, math, os, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'source', '1889')
APUR = 'https://carto2.apur.org/apur/rest/services/OPENDATA/%s/MapServer/0/query'
NAKALA = 'https://api.nakala.fr'
DOI = '10.34847/nkl.cbf5ecd0'
ALTI = 'https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json'
OUT37 = os.path.join(HERE, '..', 'data', 'source', '1937')
APUR37 = 'https://carto2.apur.org/apur/rest/services/%s/MapServer/%d/query'
PARIS_OD = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/%s/exports/json'
# Emprise de travail en Lambert-93 : Paris et ses fortifications, avec une marge.
BBOX = (641500, 6856000, 662500, 6868500)
UA = {'User-Agent': 'paris-a-travers-le-temps/1889 (extraction de donnees ouvertes)'}


def get(url, data=None, tries=5):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=UA if data is None else {**UA, 'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=180) as r: return r.read()
        except Exception as e:                                   # réseau : on réessaie, de plus en plus tard
            if k == tries - 1: raise
            print('   nouvel essai après :', str(e)[:80]); time.sleep(3 * (k + 1))


def apur(layer, fields, where='1=1', bbox=None, page=2000):
    """Toutes les entités d'une couche, par pages, en Lambert-93 ; un fichier par page."""
    base = {'where': where, 'outFields': fields, 'outSR': 2154, 'geometryPrecision': 2, 'orderByFields': 'OBJECTID', 'f': 'json'}
    if bbox: base.update({'geometry': ','.join(map(str, bbox)), 'geometryType': 'esriGeometryEnvelope', 'inSR': 2154, 'spatialRel': 'esriSpatialRelIntersects'})
    n = json.loads(get(APUR % layer + '?' + urllib.parse.urlencode({**{k: v for k, v in base.items() if k not in ('outFields', 'orderByFields', 'geometryPrecision', 'outSR')}, 'returnCountOnly': 'true'})))['count']
    print(layer, ':', n, 'entités')
    for off in range(0, n, page):
        path = os.path.join(OUT, '%s_%06d.json' % (layer.lower(), off))
        if os.path.exists(path) and os.path.getsize(path) > 200: continue
        raw = get(APUR % layer + '?' + urllib.parse.urlencode({**base, 'resultOffset': off, 'resultRecordCount': page}))
        d = json.loads(raw)
        if 'features' not in d: raise SystemExit('réponse inattendue : ' + raw[:300].decode('utf8', 'replace'))
        with open(path, 'wb') as f: f.write(raw)
        print('  ', os.path.basename(path), len(d['features']))


def nakala():
    meta = json.loads(get('%s/datas/%s' % (NAKALA, DOI)))
    with open(os.path.join(OUT, 'paris1900_notice.json'), 'w', encoding='utf8') as f: json.dump(meta, f, ensure_ascii=False)
    for want in ('PTM_Paris1900_ilots.geojson', 'PTM_Paris1900_rues.geojson'):
        path = os.path.join(OUT, want)
        if os.path.exists(path) and os.path.getsize(path) > 1e6: continue
        fi = next(x for x in meta['files'] if x['name'] == want)
        raw = get('%s/data/%s/%s' % (NAKALA, DOI, fi['sha1']))
        with open(path, 'wb') as f: f.write(raw)
        print('  ', want, round(len(raw) / 1e6, 1), 'Mo')


def lambert93_inverse(E, N):
    """Coordonnées géographiques (degrés) d'un point Lambert-93."""
    e = 0.0818191910428158; n = 0.7256077650532670; C = 11754255.426096; xs = 700000.0; ys = 12655612.049876
    R = math.hypot(E - xs, N - ys); g = math.atan((E - xs) / (ys - N))
    lon = math.degrees(g / n) + 3.0; L = -math.log(R / C) / n
    phi = 2 * math.atan(math.exp(L)) - math.pi / 2
    for _ in range(8): phi = 2 * math.atan(((1 + e * math.sin(phi)) / (1 - e * math.sin(phi))) ** (e / 2) * math.exp(L)) - math.pi / 2
    return math.degrees(phi), lon


def relief(pas=50):
    """Grille d'altitudes au pas de 50 m sur l'emprise, lue par paquets auprès du service d'altimétrie de l'IGN."""
    path = os.path.join(OUT, 'relief_ign.json')
    if os.path.exists(path): return
    x0, y0, x1, y1 = BBOX; nx = int((x1 - x0) / pas) + 1; ny = int((y1 - y0) / pas) + 1
    pts = [(x0 + i * pas, y0 + k * pas) for k in range(ny) for i in range(nx)]; alt = []
    for a in range(0, len(pts), 4000):
        ll = [lambert93_inverse(*p) for p in pts[a:a + 4000]]
        body = json.dumps({'lon': '|'.join('%.6f' % q[1] for q in ll), 'lat': '|'.join('%.6f' % q[0] for q in ll), 'resource': 'ign_rge_alti_wld', 'delimiter': '|', 'zonly': 'true'}).encode()
        z = json.loads(get(ALTI, data=body))['elevations']
        if len(z) != len(ll): raise SystemExit('altimétrie : %d valeurs pour %d points' % (len(z), len(ll)))
        alt += z; print('   relief', len(alt), '/', len(pts))
    with open(path, 'w') as f: json.dump({'x0': x0, 'y0': y0, 'pas': pas, 'nx': nx, 'ny': ny, 'alt': alt}, f)


def apur_liste(service, couche, champs, nom, where='1=1', page=2000):
    """Toutes les entités d'une couche de l'APUR, en Lambert-93, dans un seul fichier data/source/1937/nom.json (liste)."""
    p = os.path.join(OUT37, nom + '.json')
    if os.path.exists(p) and os.path.getsize(p) > 200: return
    n = json.loads(get(APUR37 % (service, couche) + '?' + urllib.parse.urlencode({'where': where, 'returnCountOnly': 'true', 'f': 'json'})))['count']
    feats = []
    for off in range(0, n, page):
        q = {'where': where, 'outFields': champs, 'outSR': 2154, 'geometryPrecision': 1, 'orderByFields': 'OBJECTID', 'resultOffset': off, 'resultRecordCount': page, 'f': 'json'}
        d = json.loads(get(APUR37 % (service, couche) + '?' + urllib.parse.urlencode(q)))
        if 'features' not in d: raise SystemExit('réponse inattendue : ' + json.dumps(d)[:300])
        feats += d['features']
    with open(p, 'w') as f: json.dump(feats, f)
    print('  ', nom, ':', len(feats), 'entités')


def sources_1937():
    os.makedirs(OUT37, exist_ok=True)
    apur_liste('OPENDATA/TRONCON_VOIE_PARIS', 0, 'OBJECTID,n_sq_vo,c_niveau,largeur_moyenne_t1', 'troncons_voie_paris')
    apur_liste('OPENDATA/VOIE', 0, 'OBJECTID,n_sq_vo,l_longmin', 'voies_paris', where='c_coinsee=75056')
    apur_liste('OPENDATA/ILOT_PHYSIQUE', 0, 'OBJECTID,c_type_il,n_sq_ip', 'ilots_paris', where='c_dep=75')
    apur_liste('OPENDATA/ARRONDISSEMENT', 0, 'C_AR', 'arrondissements')
    apur_liste('PLANS_HISTORIQUES/enceintes_paris', 0, 'OBJECTID', 'fortifications_thiers')
    for ds in ('denominations-emprises-voies-actuelles', 'denominations-des-voies-caduques'):
        p = os.path.join(OUT37, ds + '.json')
        if os.path.exists(p) and os.path.getsize(p) > 1e5: continue
        raw = get(PARIS_OD % ds)
        with open(p, 'wb') as f: f.write(raw)
        print('  ', ds, ':', len(json.loads(raw)), 'voies')


def main():
    os.makedirs(OUT, exist_ok=True)
    quoi = sys.argv[1:] or ['bati', 'eau', 'fer', 'equip', 'paris1900', 'relief']
    if '1937' in quoi: sources_1937()
    if 'bati' in quoi: apur('EMPRISE_BATIE_PARIS', 'OBJECTID,an_const,c_perconst,h_moy,h_med,h_max,c_forme_toit,c_toiture_mat,c_tissu,c_morpho,al_med_mnt,b_dalle,an_rehab,an_surelevation')
    if 'eau' in quoi: apur('PLAN_EAU', 'OBJECTID,l_eau,c_type,b_souterrain', bbox=BBOX)
    if 'fer' in quoi: apur('VOIE_FERREE', 'OBJECTID,C_TYPE,B_VISI', bbox=BBOX)
    if 'equip' in quoi: apur('EQUIPEMENT_EMPRISE', 'OBJECTID,c_niv1,c_niv2,c_niv3,l_ee_maj,l_ee_min', where='c_niv1 IN (15,20,21,23,24)', bbox=BBOX)
    if 'paris1900' in quoi: nakala()
    if 'relief' in quoi: relief()


if __name__ == '__main__':
    main()
