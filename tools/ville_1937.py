#!/usr/bin/env python3
"""Rues, îlots et noms de Paris en 1937, pour tools/extract_1889.py (python3 tools/extract_1889.py 1937).

Aucune base ne décrit les rues ni les îlots de 1937 (ETUDE-1937.md). Ceux de la base « Paris 1900 » sont corrigés de ce
qui a changé de 1901 à 1937, d'après la date des bâtiments de l'APUR :
  - une voie d'aujourd'hui absente de la base de 1900 est tenue pour ouverte avant 1937 quand les bâtiments qui la
    bordent sont, pour une bonne part, de 1901 à 1937 (lotissements de l'ancienne enceinte, ceinture des HBM, bords du
    Champ-de-Mars…) ; seuls ses tronçons qui s'écartent des rues de 1900 sont ajoutés ;
  - un îlot de 1900 que traverse une telle voie, ou qui appartient à l'enceinte de Thiers (démolie de 1919 à 1929), est
    remplacé par les îlots d'aujourd'hui (APUR) dont le centre y tombe : bâtis s'ils portent des bâtiments de 1937 ou
    d'avant, libres sinon ;
  - les noms sont ceux de 1900, suivis dans la nomenclature de la Ville de Paris jusqu'à la date (arrêtés de
    dénomination antérieurs à 1937) ; une voie ouverte depuis 1900 prend son nom d'aujourd'hui, ramené à celui qu'elle
    portait en 1937 quand elle a été renommée depuis.
Sources (tools/fetch_1889.py 1937) : APUR, données ouvertes, ODbL 1.0 ; Ville de Paris, nomenclature des voies, ODbL 1.0.
"""
import glob, json, math, os, re, unicodedata

ACCEPTE = 0.25      # part du bâti riverain de 1901 à AN qui date une voie nouvelle d'avant AN
REFUSE = 0.6        # part du bâti riverain postérieur à AN qui la date d'après
ECART = 12.0        # une voie d'aujourd'hui à plus de 12 m de toute voie de 1900 est nouvelle (m)
RIVE = 22.0         # rayon du bâti riverain (m)
GLACIS = 350.0      # au-delà des îlots de 1900, les îlots d'aujourd'hui à moins de 350 m de l'enceinte (fossé, glacis, zone)
GRAND = 600000.0    # … sauf les très grands (bois ; la Cité universitaire, 34 ha, est gardée)
# Îlots de 1900 rasés avant 1937 sans être rebâtis à la date : un point de chacun, en Lambert-93, et l'année du dégagement.
DEGAGES = [('Plateau Beaubourg (îlot insalubre n° 1), vide depuis 1935 environ, parking sur la photographie de 1949', 1935,
            [(652430, 6862450), (652480, 6862511), (652477, 6862495)])]


# ---------------------------------------------------------------- noms
def norme(s):
    s = unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower()
    return ' '.join(re.sub(r"[^a-z0-9]+", ' ', s).split())


# Types de voie abrégés des noms de 2021 de la base « Paris 1900 » (« AV DE NEW YORK », « R FALGUIERE »)
ABREGE = {'r': 'rue', 'bd': 'boulevard', 'av': 'avenue', 'pl': 'place', 'pas': 'passage', 'qu': 'quai', 'imp': 'impasse', 'prt': 'port',
          'crs': 'cours', 'sq': 'square', 'all': 'allee', 'al': 'allee', 'voi': 'voie', 'ham': 'hameau', 'rpt': 'rond point', 'pt': 'pont',
          'car': 'carrefour', 'rle': 'ruelle', 'chs': 'chaussee', 'sen': 'sentier', 'rte': 'route', 'gav': 'grande avenue', 'ch': 'chemin',
          'prv': 'parvis', 'gal': 'galerie'}
def norme2021(s):
    m = norme(s).split(' ', 1)
    return ' '.join([ABREGE.get(m[0], m[0])] + m[1:])


CIBLE = re.compile(r"^D[ée]nomm[ée]e?s?\s+(?:partie\s+(?:de\s+la\s+|du\s+|des\s+|de\s+l['’]\s*|de\s+))?(.+?)(?:\s+\([^)]*\))?\s+"
                   r"(?:par|en\s+\d{4}|suivant|selon|lors|à la suite|d['’]après)\b", re.I)


class Noms:
    """Nom d'une voie à une date, d'après les dénominations actuelles et caduques de la Ville de Paris."""
    def __init__(self, src37):
        cad = json.load(open(os.path.join(src37, 'denominations-des-voies-caduques.json'), encoding='utf8'))
        act = json.load(open(os.path.join(src37, 'denominations-emprises-voies-actuelles.json'), encoding='utf8'))
        self.vers, self.depuis, self.actuel = {}, {}, {}
        for r in cad:
            d = (r.get('date_voie_ancienne') or '')[:10]; m = CIBLE.match((r.get('historique') or '').strip())
            if not d or not m or not r.get('typo_min'): continue
            cible = m.group(1).strip().rstrip('.,;')
            if norme(cible).startswith('voie ') or len(cible) < 4: continue
            self.vers.setdefault(norme(r['typo_min']), []).append((d, cible))
            self.depuis.setdefault(norme(cible), []).append((d, r['typo_min']))
        for r in act:
            if r.get('typo_min'): self.actuel[norme(r['typo_min'])] = (r['typo_min'], (r.get('date_arret') or '')[:10])

    def a_la_date(self, nom, an):
        """Un nom, suivi de dénomination en dénomination tant que l'arrêté est de l'année `an` ou d'avant."""
        fin = '%d-12-31' % an; vus = set()
        for _ in range(8):
            k = norme(nom); vus.add(k)
            c = {norme(t): t for d, t in self.vers.get(k, []) if d <= fin}
            if len(c) != 1: break                                         # aucune, ou homonymes : on garde le nom
            t = next(iter(c.values()))
            if norme(t) in vus: break
            nom = t[:1].upper() + t[1:]
        return nom

    def avant(self, nom, an):
        """Un nom d'aujourd'hui, ramené à celui que la voie portait en `an` quand elle a été renommée depuis (None : la voie
        ne portait encore qu'un numéro, ou rien ne permet de le dire)."""
        fin = '%d-12-31' % an; k = norme(nom)
        if k in self.actuel: nom = self.actuel[k][0]
        for _ in range(8):
            k = norme(nom)
            if k in self.actuel and self.actuel[k][1] and self.actuel[k][1] <= fin: break
            c = sorted((d, o) for d, o in self.depuis.get(k, []) if d > fin)
            if not c: break
            nom = c[0][1]
            if norme(nom).startswith('voie '): return None
        return nom[:1].upper() + nom[1:]


# ---------------------------------------------------------------- géométrie
def le_long(pts, pas):
    """Points d'une ligne tous les `pas` mètres environ (extrémités comprises)."""
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1]); n = max(1, int(L / pas))
        out += [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(1, n + 1)]
    return out


def bati_date(SRC, T, an):
    """Bâti d'aujourd'hui réduit à son centre, son aire et sa date : v (1900 ou avant, ou période 1851-1914 sans
    année), r (1901 à an, ou période 1915-1939 sans année), N (après an), A (sans date)."""
    B = []
    for p in sorted(glob.glob(os.path.join(SRC, 'emprise_batie_paris_*.json'))):
        for f in json.load(open(p))['features']:
            at = f['attributes']; rings = (f.get('geometry') or {}).get('rings') or []
            if not rings: continue
            r = max(rings, key=len); xs = [q[0] for q in r]; ys = [q[1] for q in r]
            a = abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r))) / 2)
            per = at.get('c_perconst') or 99; y = at.get('an_const')
            st = ('v' if per in (1, 2) or (per == 3 and not (y and y > 1900)) or (y and y <= 1900 and per != 99) else
                  'r' if (y and y <= an and per != 99) or (per == 5 and not y) else 'A' if per == 99 else 'N')
            B.append((T((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2), a, st))
    return B


def corriger(an, SRC, SRC37, T, X, G, ilots, lignes, idx, noms, larg, n2021, polys_de, anneaux_esri):
    """Rues et îlots de 1900 → rues et îlots de `an`. Modifie `ilots` (liste remplacée), `lignes`, `idx`, `larg` (voies
    ajoutées en fin de liste) et rend la nouvelle liste des noms. `n2021` : nom de 2021 de chaque voie de 1900 (base
    « Paris 1900 »), ou None."""
    dans, dans_poly, boite, aire_signee, Grille = G['dans'], G['dans_poly'], G['boite'], G['aire_signee'], G['Grille']
    nm = Noms(SRC37)
    # ---- noms de 1900 à la date. La nomenclature ne situe pas ses anciens noms : un renommage n'est retenu que si la
    # chaîne des dénominations aboutit au nom que la base de 1900 donne à la voie aujourd'hui, ou, à défaut de ce nom,
    # si l'ancien nom n'est plus porté par aucune voie (sinon c'est peut-être un homonyme d'un autre quartier).
    neufs, place, renommes = list(noms), {n: k for k, n in enumerate(noms)}, 0
    for k in range(len(idx)):
        if idx[k] < 0: continue
        n = noms[idx[k]]; m = nm.a_la_date(n, an)
        if m == n: continue
        fin = nm.a_la_date(n, 9999)
        if (n2021[k] and norme(fin) != norme2021(n2021[k])) or (not n2021[k] and norme(n) in nm.actuel): continue
        if m not in place: place[m] = len(neufs); neufs.append(m)
        idx[k] = place[m]; renommes += 1
    noms = neufs
    print('  tronçons de 1900 dont la voie a été renommée avant la fin de %d : %d' % (an, renommes))

    # ---- bâti daté, voies de 1900
    B = bati_date(SRC, T, an)
    gb = Grille(30)
    for c, a, st in B: gb.point(c[0], c[1], (c, a, st))
    g0 = Grille(25)
    for l in lignes:
        for q in le_long(l, 8): g0.point(q[0], q[1], q)
    def proche(q): return any(math.hypot(o[0] - q[0], o[1] - q[1]) < ECART for o in g0.autour(q[0], q[1], ECART))

    # ---- la ville de 1900 et la bande de son enceinte : hors d'elles (bois), aucune voie n'est ajoutée
    gi0 = Grille(120); gf = Grille(200)
    for i in ilots:
        gi0.boite(boite(i['rings'][0]), i)
        if i['fortif']:
            for q in le_long(i['rings'][0] + [i['rings'][0][0]], 25): gf.point(q[0], q[1], q)
    def pres_enceinte(c): return any(math.hypot(o[0] - c[0], o[1] - c[1]) < GLACIS for o in gf.autour(c[0], c[1], GLACIS))
    def en_ville(q):
        return any(i['rings'][0] and boite(i['rings'][0])[0] - 40 <= q[0] <= boite(i['rings'][0])[2] + 40 and
                   boite(i['rings'][0])[1] - 40 <= q[1] <= boite(i['rings'][0])[3] + 40 for i in gi0.autour(q[0], q[1], 40)) or pres_enceinte(q)

    # ---- voies d'aujourd'hui : celles qui manquent en 1900 et que date leur bâti riverain
    vp = json.load(open(os.path.join(SRC37, 'voies_paris.json')))
    nom_vo = {f['attributes']['n_sq_vo']: f['attributes'].get('l_longmin') or '' for f in vp}
    ajout, km, refus = [], 0.0, {'après': 0.0, 'sans riverains': 0.0}
    for f in json.load(open(os.path.join(SRC37, 'troncons_voie_paris.json'))):
        at = f['attributes']
        if at.get('c_niveau') != 0: continue                               # souterrains, ouvrages
        for l in (f.get('geometry') or {}).get('paths') or []:
            pts = [T(q[0], q[1]) for q in l]
            if len(pts) < 2: continue
            d = le_long(pts, 4); neuf = [not proche(q) and en_ville(q) for q in d]
            if sum(neuf) < 4: continue
            riv = {};
            for q in d[::2]:
                for o in gb.autour(q[0], q[1], RIVE):
                    if math.hypot(o[0][0] - q[0], o[0][1] - q[1]) < RIVE: riv[id(o)] = o
            s = {'v': 0.0, 'r': 0.0, 'N': 0.0, 'A': 0.0}
            for c, a, st in riv.values(): s[st] += a
            t = sum(s.values()); L = 4.0 * sum(neuf)
            if t < 60: refus['sans riverains'] += L; continue
            if s['N'] > REFUSE * t or s['r'] < ACCEPTE * t: refus['après'] += L; continue
            # seuls les morceaux qui s'écartent des rues de 1900, prolongés d'un point pour s'y raccorder
            k = 0
            while k < len(d):
                if not neuf[k]: k += 1; continue
                j = k
                while j < len(d) and neuf[j]: j += 1
                if j - k >= 4:
                    run = d[max(0, k - 1):min(len(d), j + 1)]
                    ajout.append((X.dp(run, 1.0), at.get('n_sq_vo'), at.get('largeur_moyenne_t1') or 10.0)); km += 4.0 * (j - k)
                k = j
    nomme = sans_nom = 0
    for pts, vo, w in ajout:
        n = nm.avant(nom_vo.get(vo) or '', an) if nom_vo.get(vo) else None
        if n and n not in noms: noms.append(n)
        lignes.append(pts); idx.append(noms.index(n) if n else -1); larg.append(round(w))
        nomme += bool(n); sans_nom += not n
    print('  voies ouvertes de 1901 à %d : %d tronçons, %.1f km (%d nommés) ; écartées : %.1f km bordées de bâti postérieur, %.1f km sans riverains'
          % (an, len(ajout), km / 1000, nomme, refus['après'] / 1000, refus['sans riverains'] / 1000))

    # ---- îlots : ceux que traverse une voie nouvelle, et l'enceinte, sont remplacés par les îlots d'aujourd'hui
    gi = Grille(120)
    for i in ilots: gi.boite(boite(i['rings'][0]), i)
    def ilot_en(x, z):
        for i in gi.en(x, z):
            if dans_poly(i['rings'], x, z): return i
        return None
    for nom, annee, pts in DEGAGES:                                       # rasés avant la date, pas encore rebâtis
        if annee > an: continue
        for E, N in pts:
            i = ilot_en(*T(E, N))
            if i: i['bati'] = False; i['degage'] = nom
        print('  dégagé avant %d : %s (%d îlots de 1900)' % (an, nom, sum(1 for i in ilots if i.get('degage') == nom)))
    for pts, _, _ in ajout:
        for q in le_long(pts, 4):
            i = ilot_en(q[0], q[1])
            if i: i['coupe'] = i.get('coupe', 0) + 4.0
    cand = [i for i in ilots if i['fortif'] or i.get('coupe', 0) >= 24]
    for i in cand: i['remplace'] = []
    gc = Grille(120)
    for i in cand: gc.boite(boite(i['rings'][0]), i)
    # l'enceinte démolie : ses îlots de 1900 ne couvrent que le rempart ; les HBM, la Cité universitaire, les stades ont
    # aussi pris le fossé et le glacis. Les îlots d'aujourd'hui qui ne tombent dans aucun îlot de 1900 mais près de
    # l'enceinte sont ajoutés.
    act, glacis = [], []
    for f in json.load(open(os.path.join(SRC37, 'ilots_paris.json'))):
        for rings in polys_de(anneaux_esri(f.get('geometry')), 0.7, 25.0, 60.0):
            r = rings[0]; c = (sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r))
            if not dans_poly(rings, c[0], c[1]):
                bb = boite(r); c = ((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2)
            o = {'rings': rings, 'aire': abs(aire_signee(r)), 'type': f['attributes'].get('c_type_il') or '', 'c': c}
            i = next((i for i in gc.en(c[0], c[1]) if dans_poly(i['rings'], c[0], c[1])), None)
            if i: i['remplace'].append(o); act.append(o); continue
            if o['aire'] < GRAND and not ilot_en(c[0], c[1]) and pres_enceinte(c): glacis.append(o); act.append(o)
    gA = Grille(120)
    for o in act: gA.boite(boite(o['rings'][0]), o)
    for c, a, st in B:                                                   # bâti de an ou d'avant dans chaque îlot d'aujourd'hui
        if st not in 'vr': continue
        for o in gA.en(c[0], c[1]):
            if dans_poly(o['rings'], c[0], c[1]): o['ancien'] = o.get('ancien', 0.0) + a; break
    out, n_rempl, n_garde, n_fortif, n_neufs, gardes = [], 0, 0, 0, 0, []
    for i in ilots:
        if 'remplace' not in i: out.append(i); continue
        couvre = sum(o['aire'] for o in i['remplace']) / i['aire']
        if not i['fortif'] and couvre < 0.5:
            n_garde += 1; i.pop('remplace'); out.append(i); bb = boite(i['rings'][0]); gardes.append((round((bb[0] + bb[2]) / 2), round((bb[1] + bb[3]) / 2), round(i['aire']), round(couvre, 2))); continue
        n_rempl += 1; n_fortif += i['fortif']
        for o in i['remplace']:
            bati = o['type'] == 'N' and o.get('ancien', 0.0) >= max(60.0, 0.08 * o['aire'])   # bâti de an ou d'avant sur 8 % au moins
            out.append({'rings': o['rings'], 'bati': bati, 'type': o['type'], 'nom': '', 'aire': o['aire'], 'fortif': False, 'neuf': True, 'anneau': i['fortif']}); n_neufs += 1
    for o in glacis:
        bati = o['type'] == 'N' and o.get('ancien', 0.0) >= max(60.0, 0.08 * o['aire'])
        out.append({'rings': o['rings'], 'bati': bati, 'type': o['type'], 'nom': '', 'aire': o['aire'], 'fortif': False, 'neuf': True, 'anneau': True})
    print('  îlots d’aujourd’hui ajoutés sur le fossé et le glacis de l’enceinte : %d, dont %d bâtis à la date' % (len(glacis), sum(1 for o in out[-len(glacis):] if o['bati']) if glacis else 0))
    ilots[:] = out
    print('  îlots de 1900 remplacés : %d (dont %d de l’enceinte) par %d îlots d’aujourd’hui ; gardés faute d’îlots d’aujourd’hui pour les couvrir : %d'
          % (n_rempl, n_fortif, n_neufs, n_garde))
    print('    gardés (centre, aire, part couverte) :', gardes)
    return noms
