#!/usr/bin/env python3
"""Voies ferrées de Paris en 1889 et en 1900, pour tools/extract_1889.py.

Aucune base ne donne le tracé des voies de 1889 ni de 1900. Il est recomposé, et chaque voie garde la trace de ce qui la justifie :
  a  actuel     voie d'aujourd'hui (couche VOIE_FERREE de l'APUR) posée sur une emprise du chemin de fer qui existait
                en 1889 : faisceaux des six grandes gares, ligne de Sceaux, Petite Ceinture là où ses rails subsistent,
                embranchement du Champ-de-Mars le long de la Seine. Le métro, le tramway et les lignes ouvertes depuis
                (Invalides, Orsay, Boulainvilliers, Luxembourg) sont écartés. Les faisceaux d'aujourd'hui sont souvent
                plus larges que ceux de 1889 ;
  r  restitué   ligne déposée ou couverte depuis, tracée dans l'axe de son emprise, qui subsiste : Petite Ceinture
                (emprises de l'APUR), ligne d'Auteuil le long du boulevard Pereire (îlots « Promenade Pereire » de la
                base « Paris 1900 ») ; deux voies, à l'entraxe d'alors ;
  e  évoqué     tracé à la main, là où rien ne subsiste, d'après les rues de 1900 que la ligne longeait : ligne
                d'Auteuil de la porte Maillot au viaduc du Point-du-Jour, Petite Ceinture le long des rues Leibniz et
                Belliard, ligne de Vincennes sur son viaduc de l'avenue Daumesnil puis vers Bel-Air, arrivée à
                l'ancienne gare Montparnasse, gare du Champ-de-Mars.
Les souterrains de 1889 (Belleville, Charonne, Montsouris) ne sont pas tracés ; le raccordement de Courcelles non plus.

En 1900, pour l'Exposition, deux lignes nouvelles : la ligne des Invalides, qui prolonge celle des Moulineaux le long
du quai d'Orsay, en contrebas (ses voies d'aujourd'hui sont souterraines : seule sa gare paraît), et le raccordement de
Boulainvilliers au Champ-de-Mars, qui
franchit la Seine sur le pont Rouelle. Leurs emprises et leurs voies sont gardées ; la gare du Champ-de-Mars de 1889,
démontée en 1897, ne l'est plus. Le prolongement de la ligne d'Orléans jusqu'à Orsay, souterrain, n'est pas tracé.
"""
import glob, json, math, os, re

ENTRAXE = 3.6                 # d'axe en axe entre deux voies (m)
# Emprises du chemin de fer d'aujourd'hui (équipements de l'APUR, codes 2011x : réseau ferré national) tenues pour
# celles de la date, sauf celles des lignes ouvertes depuis.
ECARTE = {1889: re.compile(r"VOIES FERR.ES DU (16|5)E ARDT|INVALIDES|REGION DE L.OUEST|PORT-ROYAL|RER LIGNE A|BOULAINVILLIERS|PARKING|PARVIS|PARC DE|ROUTI|CHAMPS DE MARS", re.I),
          1900: re.compile(r"VOIES FERR.ES DU 5E ARDT|PORT-ROYAL|RER LIGNE A|PARKING|PARVIS|PARC DE|ROUTI|CHAMPS DE MARS", re.I)}
# Pont Rouelle (1900) : ses deux travées, de part et d'autre de l'île aux Cygnes. Les voies d'aujourd'hui y franchissent
# la Seine ; partout ailleurs, aucune voie n'est gardée au-dessus du fleuve.
ROUELLE = (-4990.0, -10.0, -4730.0, 100.0)
# Tracés qui n'existent plus à une date : nom → première année où ils ont disparu.
DISPARUS = {'Gare du Champ-de-Mars': 1897}
# La ligne de Sceaux, aujourd'hui RER B, est exploitée par la RATP : ses emprises sont rangées avec le métro.
SCEAUX = re.compile(r"RER B|DENFERT|CIT. UNIVERSITAIRE|GENTILLY|LAPLACE", re.I)
CEINTURE = re.compile(r"PETITE CEINTURE", re.I)

# Souterrains de 1889 : les voies d'aujourd'hui qui y passent ne sont pas gardées (d'une tête à l'autre, à 30 m près).
TUNNELS = [
    ('Montsouris', [(-1000, 3365), (-1420, 3222), (-1860, 3075)]),
]

# Tracés à la main, dans le repère de la maquette. Chaque point est lu dans la base « Paris 1900 » : c'est l'axe d'une
# rue d'alors, décalé du côté où passait la ligne, ou le milieu de deux chaussées qui l'encadraient.
# (nom, statut, nombre de voies, points, hauteur au-dessus du sol au départ, à l'arrivée) ; la hauteur d'arrivée peut
# être remplacée par un profil : une liste de (part du parcours, hauteur).
TRACES = [
    # Ligne d'Auteuil (1854). Le long du boulevard Pereire, elle court entre les deux chaussées : les îlots qui portent
    # aujourd'hui la « promenade Pereire » en donnent l'axe.
    ('Ligne d’Auteuil, boulevard Pereire', 'r', 2, [(-3523, -3710), (-3700, -3597), (-3876, -3477), (-4105, -3306), (-4218, -3193), (-4499, -2961), (-4774, -2737)], 0, 0),
    # De la porte Maillot à l'avenue du Bois (Foch), en tranchée derrière le boulevard Lannes ; puis entre les boulevards
    # Lannes et Flandrin, entre les deux chaussées du boulevard Flandrin, entre les boulevards Émile-Augier et
    # Jules-Sandeau ; gare de Passy à la Muette ; au pied des boulevards de Beauséjour et de Montmorency, côté
    # fortifications ; gare d'Auteuil.
    ('Ligne d’Auteuil, de la porte Maillot à Auteuil', 'e', 2, [(-4774, -2737), (-4804, -2678), (-4827, -2652), (-4895, -2562), (-4984, -2511), (-5103, -2440), (-5155, -2401), (-5262, -2235), (-5367, -2060), (-5405, -1973),
        (-5446, -1893), (-5487, -1811), (-5531, -1730), (-5602, -1596), (-5622, -1498), (-5638, -1430), (-5648, -1348), (-5650, -1250), (-5648, -1210), (-5634, -1113), (-5602, -1022), (-5566, -951), (-5537, -870),
        (-5540, -806), (-5544, -765), (-5556, -708), (-5572, -672), (-5600, -628), (-5640, -594), (-5673, -567), (-5805, -527), (-5864, -509), (-5959, -480), (-6035, -455), (-6096, -427), (-6152, -390), (-6199, -346),
        (-6233, -310), (-6265, -265), (-6302, -194), (-6337, -110), (-6358, -48), (-6371, 5), (-6382, 118), (-6387, 176), (-6403, 244), (-6435, 318), (-6476, 387), (-6499, 438), (-6521, 497), (-6540, 540)], 0, 0),
    # Viaduc d'Auteuil (1865) : au milieu du boulevard Exelmans, puis au-dessus du pont-viaduc du Point-du-Jour, à
    # l'étage ; de l'autre côté de la Seine, la ligne redescend vers la Petite Ceinture de la rive gauche.
    ('Viaduc d’Auteuil, boulevard Exelmans', 'e', 2, [(-6540, 540), (-6572, 561), (-6611, 655), (-6633, 735), (-6638, 790), (-6638, 822), (-6634, 861), (-6625, 905), (-6613, 939), (-6598, 970), (-6578, 1000), (-6551, 1036), (-6526, 1063),
        (-6491, 1090), (-6430, 1133), (-6376, 1170), (-6339, 1196), (-6262, 1249), (-6198, 1294), (-6170, 1312), (-6092, 1366), (-6033, 1406), (-5999, 1432)], 1, 9),
    ('Viaduc d’Auteuil, sur la Seine', 'e', 2, [(-5999, 1432), (-5939, 1478), (-5845, 1544)], 9, 9),
    ('Petite Ceinture, de la Seine à Grenelle', 'e', 2, [(-5845, 1544), (-5760, 1580), (-5650, 1628), (-5550, 1662), (-5452, 1684)], 9, 0),
    # Petite Ceinture, rive droite (1854-1869). Des Batignolles à l'avenue de Clichy : deux emprises qui subsistent.
    ('Petite Ceinture, des Batignolles à l’avenue de Clichy', 'r', 2, [(-2905, -4190), (-2797, -4236), (-2693, -4270), (-2635, -4299), (-2519, -4421), (-2500, -4440)], 0, 0),
    # En tranchée au sud de la rue Leibniz, puis au sud de la rue Belliard : l'axe est celui des emprises qui subsistent.
    ('Petite Ceinture, rues Leibniz et Belliard', 'e', 2, [(-2075, -4698), (-1800, -4697), (-1579, -4697), (-1477, -4697), (-1429, -4699), (-1371, -4712), (-1292, -4727), (-1128, -4758), (-1012, -4781), (-861, -4818),
        (-677, -4851), (-596, -4863), (-562, -4870), (-460, -4895), (-401, -4908), (-218, -4932), (136, -4945), (245, -4948), (359, -4952)], 0, 0),
    # À l'est : pont du cours de Vincennes, puis d'une emprise à l'autre jusqu'à Bercy.
    ('Petite Ceinture, cours de Vincennes', 'e', 2, [(4276, 597), (4255, 780), (4220, 952)], 0, 0),
    ('Petite Ceinture, de Bel-Air à Bercy', 'e', 2, [(3945, 1817), (3833, 1934)], 0, 0),
    ('Petite Ceinture, de Bel-Air à Bercy', 'e', 2, [(3688, 2056), (3527, 2191)], 0, 0),
    ('Petite Ceinture, de Bel-Air à Bercy', 'e', 2, [(3410, 2290), (3290, 2360), (3156, 2418)], 0, 0),
    # Rive gauche : du pont National à la ligne d'Orléans, le long du boulevard Masséna ; de Grenelle à Vaugirard ;
    # aux Buttes-Chaumont, entre deux emprises.
    ('Petite Ceinture, du pont National à Ivry', 'e', 2, [(2526, 2800), (2400, 2890), (2250, 2990), (2100, 3070), (1900, 3150), (1746, 3190)], 0, 0),
    ('Petite Ceinture, de Grenelle à Vaugirard', 'e', 2, [(-4478, 2052), (-4310, 2146), (-4100, 2262), (-3841, 2405)], 0, 0),
    ('Petite Ceinture, Buttes-Chaumont', 'e', 2, [(2513, -3380), (2530, -3330), (2547, -3275)], 0, 0),
    # Ligne de Sceaux (1846) : au-delà des fortifications, vers Gentilly.
    ('Ligne de Sceaux, au-delà des fortifications', 'e', 2, [(-828, 3507), (-800, 3650), (-770, 3830), (-733, 4010)], 0, 0),
    # Ligne de Vincennes (1859) : la gare de la Bastille le long de la rue de Lyon, le viaduc contre l'avenue Daumesnil
    # (côté rue de Charenton), la gare de Reuilly, puis le long de la rue du Sahel jusqu'à Bel-Air et aux fortifications.
    ('Ligne de Vincennes, gare de la Bastille et viaduc', 'e', 2, [(1402, 95), (1432, 117), (1489, 315), (1528, 386), (1572, 424), (1613, 454), (1705, 522), (1776, 573), (1841, 621), (1914, 674), (1970, 715), (2005, 743), (2113, 823),
        (2183, 872), (2264, 932), (2296, 955), (2376, 1014), (2418, 1045), (2511, 1113), (2542, 1136)], 8, 5),
    ('Ligne de Vincennes, de Reuilly à Bel-Air', 'e', 2, [(2542, 1136), (2640, 1195), (2760, 1232), (2900, 1248), (3050, 1254), (3200, 1260), (3400, 1281), (3653, 1310), (3749, 1322), (3923, 1341), (4024, 1352), (4117, 1365), (4150, 1368),
        (4260, 1385), (4330, 1395), (4600, 1425), (4930, 1470)], 5, [(0, 5), (0.3, 0), (1, 0)]),
    # Embranchement du Champ-de-Mars : en 1889 il s'achève à la gare bâtie pour l'Exposition, sur la berge, à l'angle
    # du quai d'Orsay et de l'avenue de Suffren. Les voies d'aujourd'hui s'arrêtent au pont de Passy : trois voies sont
    # prolongées le long du quai, entre la chaussée et le fleuve.
    ('Gare du Champ-de-Mars', 'e', 3, [(-4480, -202), (-4451, -239), (-4436, -264), (-4418, -316), (-4368, -458)], 0, 0),
]

def aire(r): return sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r))) / 2
def dans(r, x, z):
    c = False; j = len(r) - 1
    for i in range(len(r)):
        a, b = r[i], r[j]
        if (a[1] > z) != (b[1] > z) and x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]: c = not c
        j = i
    return c
def dseg(x, z, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]; l2 = dx * dx + dz * dz
    t = 0.0 if l2 < 1e-12 else max(0.0, min(1.0, ((x - a[0]) * dx + (z - a[1]) * dz) / l2))
    return math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)
def longueur(l): return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(l, l[1:]))
def point(l, s):
    for a, b in zip(l, l[1:]):
        d = math.hypot(b[0] - a[0], b[1] - a[1])
        if s <= d and d > 0: return (a[0] + (b[0] - a[0]) * s / d, a[1] + (b[1] - a[1]) * s / d)
        s -= d
    return l[-1]
def pas_a_pas(l, pas):
    """Points régulièrement espacés le long d'une ligne, extrémités comprises."""
    L = longueur(l); n = max(1, int(math.ceil(L / pas)))
    return [point(l, L * k / n) for k in range(n + 1)]
def decale(l, d):
    """Ligne parallèle, à d mètres sur la gauche du sens de parcours (onglets aux angles)."""
    out = []
    for i, p in enumerate(l):
        a = l[max(0, i - 1)]; b = l[min(len(l) - 1, i + 1)]
        t0 = (p[0] - a[0], p[1] - a[1]) if i > 0 else (b[0] - p[0], b[1] - p[1]); t1 = (b[0] - p[0], b[1] - p[1]) if i < len(l) - 1 else t0
        n0 = math.hypot(*t0) or 1.0; n1 = math.hypot(*t1) or 1.0
        ax, az = -t0[1] / n0, t0[0] / n0; bx, bz = -t1[1] / n1, t1[0] / n1; k = 1 + ax * bx + az * bz
        if k < 0.3: out.append((p[0] + ax * d, p[1] + az * d))
        else: out.append((p[0] + (ax + bx) / k * d, p[1] + (az + bz) / k * d))
    return out


class Emprises:
    """Polygones rangés par cases : un point est-il dans l'un d'eux, ou à moins de `marge` de son bord ?"""
    def __init__(self, pas=80): self.pas = pas; self.c = {}; self.n = 0
    def ajoute(self, rings, o=None):
        r = rings[0]; xs = [p[0] for p in r]; zs = [p[1] for p in r]; e = {'rings': rings, 'bb': (min(xs), min(zs), max(xs), max(zs)), 'o': o}; self.n += 1
        for i in range(int((e['bb'][0] - 30) // self.pas), int((e['bb'][2] + 30) // self.pas) + 1):
            for k in range(int((e['bb'][1] - 30) // self.pas), int((e['bb'][3] + 30) // self.pas) + 1): self.c.setdefault((i, k), []).append(e)
        return e
    def en(self, x, z, marge=0.0):
        for e in self.c.get((int(x // self.pas), int(z // self.pas)), ()):
            b = e['bb']
            if x < b[0] - marge or x > b[2] + marge or z < b[1] - marge or z > b[3] + marge: continue
            if dans(e['rings'][0], x, z) and not any(dans(h, x, z) for h in e['rings'][1:]): return e
            if marge > 0:
                for r in e['rings']:
                    for i in range(len(r)):
                        if dseg(x, z, r[i], r[(i + 1) % len(r)]) < marge: return e
        return None


def axe(ring, pas=12.0):
    """Axe d'un polygone allongé (tranchée, viaduc, plate-forme) : ses deux bouts sont les deux sommets les plus
    éloignés l'un de l'autre ; les deux rives qui les relient sont parcourues ensemble et l'axe passe au milieu."""
    r = ring[:-1] if ring[0] == ring[-1] else ring[:]
    n = len(r)
    if n < 4: return None
    i0 = j0 = 0; best = -1.0
    for i in range(n):
        for j in range(i + 1, n):
            d = (r[i][0] - r[j][0]) ** 2 + (r[i][1] - r[j][1]) ** 2
            if d > best: best = d; i0, j0 = i, j
    A = r[i0:j0 + 1]; B = (r[j0:] + r[:i0 + 1])[::-1]
    if len(A) < 2 or len(B) < 2: return None
    L = max(longueur(A), longueur(B)); k = max(2, int(L / pas))
    out = []
    for q in range(k + 1):
        a = point(A, longueur(A) * q / k); b = point(B, longueur(B) * q / k); out.append(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))
    large = sum(math.hypot(point(A, longueur(A) * q / k)[0] - point(B, longueur(B) * q / k)[0], point(A, longueur(A) * q / k)[1] - point(B, longueur(B) * q / k)[1]) for q in range(1, k)) / max(1, k - 1)
    return out, large


def lisse(l, passes=2):
    """Adoucit une ligne brisée (coins coupés, extrémités gardées)."""
    for _ in range(passes):
        out = [l[0]]
        for a, b in zip(l, l[1:]):
            out.append((a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25)); out.append((a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75))
        out.append(l[-1]); l = out
    return l


class Voisinage:
    """Segments de voies rangés par cases : y a-t-il déjà une voie de même direction près d'un point ?"""
    def __init__(self, pas=40): self.pas = pas; self.c = {}
    def ajoute(self, l):
        for a, b in zip(l, l[1:]):
            for i in range(int(min(a[0], b[0]) // self.pas), int(max(a[0], b[0]) // self.pas) + 1):
                for k in range(int(min(a[1], b[1]) // self.pas), int(max(a[1], b[1]) // self.pas) + 1): self.c.setdefault((i, k), []).append((a, b))
    def pres(self, p, t, d):
        for i in range(int((p[0] - d) // self.pas), int((p[0] + d) // self.pas) + 1):
            for k in range(int((p[1] - d) // self.pas), int((p[1] + d) // self.pas) + 1):
                for a, b in self.c.get((i, k), ()):
                    if dseg(p[0], p[1], a, b) < d:
                        l = math.hypot(b[0] - a[0], b[1] - a[1]) or 1.0
                        if t is None or abs(((b[0] - a[0]) * t[0] + (b[1] - a[1]) * t[1]) / l) > 0.8: return True
        return False


def extraire(SRC, T, X, cadre, equip, anneaux_esri, ilots, seine, annee=1889):
    """Rend la liste des voies de l'année (1889 ou 1900), dans le repère de la maquette : { 'pts', 's' (statut a, r ou e), 'h' (hauteur
    de chaque point au-dessus du sol, pour les viaducs, ou rien), 'nom' (tracés à la main) }.
    T : Lambert-93 → maquette ; X : outils de tools/extract_epochs.py ; equip : équipements de l'APUR ; ilots : îlots
    de 1900 ({ rings, c }) ; seine(x, z) : le point est-il sur le fleuve ?"""
    E = Emprises(); PC = []; VETO = Emprises(); ECART = ECARTE[annee]
    for f in equip:
        at = f['attributes']; nom = (at.get('l_ee_maj') or '').strip(); n3 = at.get('c_niv3') or 0
        if at.get('c_niv1') != 20: continue
        sceaux = bool(SCEAUX.search(nom)) and not ECART.search(nom)
        sncf = 20111 <= n3 <= 20120 and not ECART.search(nom)
        for poly in anneaux_esri(f.get('geometry')):
            rings = [[T(p[0], p[1]) for p in r] for r in poly]
            if abs(aire(rings[0])) < 60: continue
            if sncf or (sceaux and rings[0][0][1] >= 2100):                  # la ligne de Sceaux s'arrêtait place Denfert
                e = E.ajoute(rings, {'nom': nom, 'pc': bool(CEINTURE.search(nom)) or n3 == 20117})
                if e['o']['pc']: PC.append(e)
            elif 20111 <= n3 <= 20120 or 20211 <= n3 <= 20218: VETO.ajoute(rings, {'nom': nom})      # lignes ouvertes depuis, métro, tramway, dépôts
    # Hors de ces emprises, une voie d'aujourd'hui est encore gardée si elle court dans un îlot de 1900 : c'est le cas
    # de la Petite Ceinture, dont les emprises ne sont décrites que par endroits. Le métro aérien et le tramway, eux,
    # suivent les boulevards, hors de tout îlot. Aucune voie d'aujourd'hui n'est gardée au-dessus de la Seine : les ponts
    # du chemin de fer de 1889 (pont National, viaduc d'Auteuil) ne portent plus de rails ; le pont Rouelle (1900) est gardé en 1900.
    IL = Emprises(120)
    for i in ilots:
        if i.get('c') == 'B': IL.ajoute(i['rings'])
    print('voies ferrées : %d emprises du chemin de fer retenues, dont %d de la Petite Ceinture ; %d écartées (métro, tramway, lignes ouvertes depuis)' % (E.n, len(PC), VETO.n))
    m = 60; dedans = lambda p: cadre[0] + m < p[0] < cadre[2] - m and cadre[1] + m < p[1] < cadre[3] - m
    tunnel = lambda p: any(dseg(p[0], p[1], a, b) < 30 for _, l in TUNNELS for a, b in zip(l, l[1:]))
    pont = lambda p: annee >= 1900 and ROUELLE[0] < p[0] < ROUELLE[2] and ROUELLE[1] < p[1] < ROUELLE[3]

    # ---- voies d'aujourd'hui posées sur ces emprises
    voies = []; total = 0.0; V = Voisinage()
    def garde(pts, statut, h=None, nom=None):
        voies.append({'pts': pts, 's': statut, 'h': h, 'nom': nom}); V.ajoute(pts)
    for path in sorted(glob.glob(os.path.join(SRC, 'voie_ferree_*.json'))):
        for f in json.load(open(path))['features']:
            for l in (f.get('geometry') or {}).get('paths') or []:
                pts = [T(q[0], q[1]) for q in l]
                if len(pts) < 2 or not any(dedans(p) for p in pts): continue
                total += longueur(pts)
                ech = pas_a_pas(pts, 8.0)
                libre = [dedans(p) and not tunnel(p) and (pont(p) or not seine(p[0], p[1])) and VETO.en(p[0], p[1], 2.0) is None for p in ech]
                ok = [libre[k] and (pont(p) or E.en(p[0], p[1], 9.0) is not None or IL.en(p[0], p[1]) is not None) for k, p in enumerate(ech)]
                # un pont au-dessus d'une rue interrompt l'emprise : les trous de moins de 45 m sont franchis
                i = 0
                while i < len(ok):
                    if ok[i]: i += 1; continue
                    j = i
                    while j < len(ok) and not ok[j]: j += 1
                    if 0 < i and j < len(ok) and (j - i) * 8.0 <= 45 and all(libre[i:j]):
                        for k in range(i, j): ok[k] = True
                    i = j
                i = 0
                while i < len(ok):
                    if not ok[i]: i += 1; continue
                    j = i
                    while j < len(ok) and ok[j]: j += 1
                    run = X.dp(ech[i:j], 0.35)
                    if len(run) >= 2 and longueur(run) >= 30: garde(run, 'a')
                    i = j
    print('  voies d’aujourd’hui : %.0f km dans le cadre, %.0f km gardés (%d tronçons)' % (total / 1000, sum(longueur(v['pts']) for v in voies) / 1000, len(voies)))
    actuelles = len(voies)

    # ---- tracés à la main : plusieurs voies parallèles, là où aucune voie retenue ne court déjà
    def pose(nom, statut, n, axe_, h0, h1, rayon=20.0, adoucir=True):
        l = pas_a_pas(lisse(axe_) if adoucir else axe_, 8.0); L = longueur(l); s = 0.0; ch = [0.0]
        for a, b in zip(l, l[1:]): s += math.hypot(b[0] - a[0], b[1] - a[1]); ch.append(s)
        libre = []
        for k, p in enumerate(l):
            a = l[max(0, k - 1)]; b = l[min(len(l) - 1, k + 1)]; d = math.hypot(b[0] - a[0], b[1] - a[1]) or 1.0
            libre.append(dedans(p) and not V.pres(p, ((b[0] - a[0]) / d, (b[1] - a[1]) / d), rayon))
        runs = []; i = 0
        while i < len(l):
            if not libre[i]: i += 1; continue
            j = i
            while j < len(l) and libre[j]: j += 1
            a, b = max(0, i - 1), min(len(l), j + 1)                       # un pas de plus à chaque bout : la voie rejoint celle qui existe
            if ch[b - 1] - ch[a] >= 25: runs.append((a, b))
            i = j
        km = 0.0; nouvelles = []
        if isinstance(h1, list): profil = h1
        else: profil = [(0, h0), (1, h1)]
        def haut(t):
            for (ta, ha), (tb, hb) in zip(profil, profil[1:]):
                if t <= tb: return ha + (hb - ha) * (t - ta) / ((tb - ta) or 1.0)
            return profil[-1][1]
        for a, b in runs:
            seg = l[a:b]; hs = [haut(ch[k] / (L or 1.0)) for k in range(a, b)]
            # simplification : on garde les points utiles au tracé, et leurs hauteurs avec eux
            garder = set(X.dp(seg, 0.3)); idx = [k for k, p in enumerate(seg) if p in garder]
            base = [seg[k] for k in idx]; hb = [round(hs[k], 1) for k in idx]
            for q in range(n):
                nouvelles.append((decale(base, (q - (n - 1) / 2) * ENTRAXE), statut, hb if any(hb) else None, nom))
            km += longueur(base)
        for v in nouvelles: garde(*v)
        return km
    km = {'r': 0.0, 'e': 0.0}
    for nom, statut, n, axe_, h0, h1 in TRACES:
        if annee < DISPARUS.get(nom, 9999): km[statut] += pose(nom, statut, n, axe_, h0, h1)
    # Ancienne gare Montparnasse (1852) : elle occupait l'îlot compris entre la rue de l'Arrivée et la rue du Départ, face
    # à la place de Rennes, dans l'axe exact du faisceau d'aujourd'hui, qui s'arrête 400 m plus au sud. Six voies sont
    # prolongées jusqu'à elle ; elles montent de plain-pied à l'étage de la gare et franchissent l'avenue du Maine.
    O = (-1937.0, 1006.0); d = (-0.6143, 0.7891)
    km['e'] += pose('Arrivée à l’ancienne gare Montparnasse', 'e', 6, [(O[0] + d[0] * s, O[1] + d[1] * s) for s in (48, 250, 450, 650, 800)], 5.5, [(0, 5.5), (0.27, 5.5), (0.85, 0), (1, 0)], rayon=12.0, adoucir=False)
    print('  tracés à la main : %.1f km restitués dans l’axe d’une emprise, %.1f km évoqués le long des rues de 1900' % (km['r'] / 1000, km['e'] / 1000))

    # ---- Petite Ceinture : là où l'emprise subsiste sans ses rails, deux voies dans son axe
    kmpc = 0.0
    for e in PC:
        r = e['rings'][0]; A = abs(aire(r))
        if A < 400: continue
        res = axe(r)
        if not res: continue
        l, large = res
        if longueur(l) < 60 or large > 70 or A / longueur(l) > 60 or not all(dedans(p) for p in l): continue      # une plate-forme de gare, pas une ligne
        b = X.dp(l, 3.0)
        if any(abs(math.atan2((q[0] - p[0]) * (r2[1] - q[1]) - (q[1] - p[1]) * (r2[0] - q[0]), (q[0] - p[0]) * (r2[0] - q[0]) + (q[1] - p[1]) * (r2[1] - q[1]))) > 0.7 for p, q, r2 in zip(b, b[1:], b[2:])): continue      # axe en zigzag : l'emprise n'est pas un ruban
        kmpc += pose(None, 'r', 2, l, 0, 0, rayon=16.0, adoucir=False)
    print('  Petite Ceinture restituée dans l’axe de ses emprises : %.1f km' % (kmpc / 1000))
    # Une voie d'aujourd'hui qui s'arrête au bord de la Seine menait à un pont : elle n'est gardée que si une voie
    # restituée prend le relais (pont National), ou, à partir de 1900, si elle s'arrête sur le pont Rouelle (sur l'île
    # aux Cygnes, entre ses deux travées). Avant 1900, les amorces du pont Rouelle disparaissent ainsi.
    W = Voisinage()
    for v in voies[actuelles:]: W.ajoute(v['pts'])
    def au_bord(a, b):
        d = math.hypot(b[0] - a[0], b[1] - a[1]) or 1.0
        return any(seine(b[0] + (b[0] - a[0]) / d * k, b[1] + (b[1] - a[1]) / d * k) for k in (6, 14, 22))
    out = []; retirees = 0
    for k, v in enumerate(voies):
        p = v['pts']
        if k < actuelles and ((au_bord(p[1], p[0]) and not pont(p[0]) and not W.pres(p[0], None, 40)) or (au_bord(p[-2], p[-1]) and not pont(p[-1]) and not W.pres(p[-1], None, 40))): retirees += 1; continue
        out.append(v)
    print('  amorces de ponts postérieurs à %d retirées : %d' % (annee, retirees))
    return out
