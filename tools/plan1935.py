#!/usr/bin/env python3
"""Le plan directeur de l'Exposition de 1937 (août 1935, à l'échelle de 0,0005 par mètre), calé sur la maquette.

  python3 tools/plan1935.py caler                      refait le calage et dit ses écarts
  python3 tools/plan1935.py SORTIE.png X Z [CÔTÉ] [PAS] [EMPRISES.json]
                                                       planche de relevé, dans le repère de la maquette
  python3 tools/plan1935.py SORTIE.png axe U V [CÔTÉ] [PAS] [EMPRISES.json]
                                                       la même, dans le repère de l'Exposition (expo37.js, AXE)

Le plan — « Exposition internationale des arts et des techniques appliqués à la vie moderne, Paris 1937, plan
directeur », Services d'architecture et des promenades de l'Exposition (R. Martzloff, Ch. Letrosne, J. Gréber,
É. Crevel), daté d'août 1935 — est au musée Carnavalet, sous licence CC0 (Paris Musées, œuvre n° 635774) ; son image
de 3 418 × 2 160 px (un peu plus d'un mètre par pixel) est prise à Paris Musées et gardée dans data/source/1937/ (non
versionné).

C'est un vrai plan : une similitude le pose sur la maquette. Elle est trouvée par cases de 300 px : dans chacune, les
bords des îlots de 1937 (data/paris1937.json) glissent sur les traits du plan jusqu'à tomber sur l'alignement des
façades — un trait, avec la bordure du trottoir quelques pixels dehors et du blanc dedans, ce qui écarte la rue d'à
côté et l'autre trottoir. Les cases sûres donnent la similitude ; on recommence de plus en plus fin. Les coefficients
retenus sont dans CALAGE, plus bas ; « caler » les recalcule et dit les écarts (2 m en médiane sur les cases sûres).
La feuille, pliée, a joué : par endroits (Esplanade des Invalides), le plan s'écarte d'une dizaine de mètres. Les
îlots de la maquette, tracés en rouge sur chaque planche, disent l'écart local.

La planche montre le plan redressé (x vers l'est, z vers le sud, comme les planches de tools/releve1949.py), les îlots
de la maquette en rouge, la Seine en bleu, une grille cotée, et, si on les donne, des emprises en bleu foncé (un
fichier JSON : une liste d'anneaux [[x, z], …] ou de { nom, ring }, par exemple les emprises des pavillons de la page,
écrites par tools/emprises1937.mjs).

Attention à la date : août 1935, deux ans avant l'ouverture. Le plan fixe les terrains, les centres et les grands
partis (palais, quais bâtis, île aux Cygnes) ; les pavillons étrangers, attribués en 1936, n'y sont que des silhouettes
d'attente.
"""
import json, math, os, sys, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SRC = os.path.join(HERE, '..', 'data', 'source', '1937', 'plan_directeur_1935.jpg')
URL = 'https://apicollections.parismusees.paris.fr/sites/default/files/styles/4k/collections/atoms/images/CAR/aze_cargtop030107_001.jpg?itok=457yMRBv'
DATA = os.path.join(HERE, '..', 'data', 'paris1937.json')

# Maquette → plan : [X, Y] = [a b ; c d] · [x, z] + [e, f] (pixels de l'image de 3 418 × 2 160). Rempli par « caler ».
CALAGE = [[0.678038, -0.698512, 3882.677855], [0.698512, 0.678038, 4220.731995]]


def image():
    if not os.path.exists(SRC):
        os.makedirs(os.path.dirname(SRC), exist_ok=True)
        rq = urllib.request.Request(URL, headers={'User-Agent': 'plan1935'})
        with urllib.request.urlopen(rq, timeout=120) as r, open(SRC, 'wb') as f: f.write(r.read())
    return Image.open(SRC).convert('RGB')


def ilots():
    from extract_1889 import decode_polys
    d = json.load(open(DATA, encoding='utf8'))
    return [r for rings in decode_polys(d['ilots']['g'], d['ilots']['q']) for r in rings], d['meta']['expo']


def matrice(par, expo):
    """Paramètres → matrice maquette → plan. par = (tx, ty, k, rot) : la tour en (tx, ty), k pixels par mètre, l'axe
    Trocadéro - École militaire tourné de rot degrés par rapport à la verticale de la feuille ; ou six coefficients."""
    if len(par) == 6: return np.array(par, float).reshape(2, 3)
    tx, ty, k, rot = par; ux, uz = expo['u']; ox, oz = expo['tour']; c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    # sans rotation : X = −v, Y = u, avec u = (x−ox)·ux + (z−oz)·uz et v = −(x−ox)·uz + (z−oz)·ux
    a, b = uz, -ux                                                      # X par mètre de x, de z
    cc, d = ux, uz                                                      # Y par mètre de x, de z
    A = np.array([[c * a - s * cc, c * b - s * d], [s * a + c * cc, s * b + c * d]]) * k
    t = np.array([tx, ty]) - A @ np.array([ox, oz])
    return np.hstack([A, t[:, None]])


def lire(F, X, Y):
    """Valeur de F (h × w) aux points (X, Y), bilinéaire ; 0 hors de la feuille."""
    h, w = F.shape; ok = (X >= 0) & (X < w - 1) & (Y >= 0) & (Y < h - 1)
    x = np.clip(X, 0, w - 2); y = np.clip(Y, 0, h - 2); i = x.astype(int); j = y.astype(int); fx = x - i; fy = y - j
    v = F[j, i] * (1 - fx) * (1 - fy) + F[j, i + 1] * fx * (1 - fy) + F[j + 1, i] * (1 - fx) * fy + F[j + 1, i + 1] * fx * fy
    return np.where(ok, v, 0.0)


def traits(im):
    """Les traits fins du plan (0 à 1, adoucis) : le sombre, moins les aplats (palais en noir, titres épais)."""
    g = np.asarray(im.convert('L'), float); m = Image.fromarray(((g < 125) * 255).astype(np.uint8))
    gros = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(11))
    fins = Image.fromarray((np.asarray(m) * (np.asarray(gros) == 0)).astype(np.uint8))
    return np.asarray(fins.filter(ImageFilter.GaussianBlur(1.3)), float) / 255.0


def bords(R, M, w, h):
    """Points des bords d'îlots (pixels du plan), leur normale sortante et leur place dans la maquette."""
    PT, NO, XZ = [], [], []
    for r in R:
        a = np.array(r, float); q = a @ M[:, :2].T + M[:, 2]
        if q[:, 0].max() < 40 or q[:, 0].min() > w - 40 or q[:, 1].max() < 40 or q[:, 1].min() > h - 40: continue
        s = 0.5 * np.sum(q[:, 0] * np.roll(q[:, 1], -1) - np.roll(q[:, 0], -1) * q[:, 1]); qq = np.vstack([q, q[:1]]); aa = np.vstack([a, a[:1]])
        for i in range(len(q)):
            p0, p1 = qq[i], qq[i + 1]; L = float(np.hypot(*(p1 - p0)))
            if L < 6: continue
            d = (p1 - p0) / L; n = np.array([d[1], -d[0]]) if s > 0 else np.array([-d[1], d[0]])
            t = np.arange(1.0, L - 1.0, 1.5); PT.append(p0 + d * t[:, None]); NO.append(np.tile(n, (len(t), 1))); XZ.append(aa[i] + (aa[i + 1] - aa[i]) * (t / L)[:, None])
    return np.vstack(PT), np.vstack(NO), np.vstack(XZ)


def note(F, X, Y, NX, NY, dx, dy, tr=3.5):
    """Un bord d'îlot bien posé : un trait dessous, la bordure du trottoir à `tr` pixels dehors, du blanc dedans."""
    x = X + dx; y = Y + dy
    return float((lire(F, x, y) + 0.6 * lire(F, x + tr * NX, y + tr * NY) - 0.8 * lire(F, x - tr * NX, y - tr * NY) - 0.5 * lire(F, x - 2 * tr * NX, y - 2 * tr * NY)).mean())


def apparier(F, R, M, w, h, cote, pas_c, rayon, pas=2, nmin=400):
    """Par case : le décalage qui pose le mieux ses bords d'îlots, sa note, sa netteté (écarts types au-dessus de la
    médiane) et sa marge sur le meilleur décalage voisin."""
    PT, NO, XZ = bords(R, M, w, h); out = []
    for cy in range(cote // 2, h, pas_c):
        for cx in range(cote // 2, w, pas_c):
            m = (abs(PT[:, 0] - cx) < cote / 2) & (abs(PT[:, 1] - cy) < cote / 2)
            if m.sum() < nmin: continue
            X, Y, NX, NY = PT[m, 0], PT[m, 1], NO[m, 0], NO[m, 1]
            D = list(range(-rayon, rayon + 1, pas)); sc = np.array([[note(F, X, Y, NX, NY, dx, dy) for dx in D] for dy in D])
            j, i = np.unravel_index(sc.argmax(), sc.shape); best = (-9, 0, 0)
            for dy in np.arange(D[j] - pas, D[j] + pas + 0.01, 0.5):
                for dx in np.arange(D[i] - pas, D[i] + pas + 0.01, 0.5):
                    v = note(F, X, Y, NX, NY, dx, dy)
                    if v > best[0]: best = (v, dx, dy)
            sc2 = sc.copy(); jj, ii = np.ogrid[:sc.shape[0], :sc.shape[1]]; k = max(1, int(round(6 / pas))); sc2[(abs(jj - j) <= k) & (abs(ii - i) <= k)] = -9
            out.append((X.mean(), Y.mean(), best[1], best[2], best[0], (best[0] - np.median(sc)) / (sc.std() + 1e-9), best[0] - sc2.max(), XZ[m, 0].mean(), XZ[m, 1].mean()))
    return np.array(out)


def similitude(src, dst):
    n = len(src); A = np.zeros((2 * n, 4)); B = np.zeros(2 * n)
    A[0::2] = np.c_[src[:, 0], -src[:, 1], np.ones(n), np.zeros(n)]; B[0::2] = dst[:, 0]
    A[1::2] = np.c_[src[:, 1], src[:, 0], np.zeros(n), np.ones(n)]; B[1::2] = dst[:, 1]
    a, b, e, f = np.linalg.lstsq(A, B, rcond=None)[0]; return np.array([[a, -b, e], [b, a, f]])


# Passes du calage : côté des cases, pas, rayon de recherche, pas de recherche, netteté et marge exigées.
PASSES = [(300, 150, 26, 2, 3.3, 0.018), (300, 150, 12, 1, 3.0, 0.012), (260, 130, 10, 1, 2.8, 0.008)]


def caler(verbeux=True):
    im = image(); w, h = im.size; R, expo = ilots(); F = traits(im)
    M = matrice([1560.0, 994.0, 0.9586, 0.0], expo)                     # départ : la tour lue sur le plan, l'échelle graphique (500 m = 472 px)
    for it, (cote, pas_c, rayon, pas, zmin, mmin) in enumerate(PASSES):
        O = apparier(F, R, M, w, h, cote, pas_c, rayon, pas)
        ok = (O[:, 5] > zmin) & (O[:, 6] > mmin) & (np.abs(O[:, 2]) < rayon - 1) & (np.abs(O[:, 3]) < rayon - 1)
        src = O[ok][:, 7:9]; dst = O[ok][:, 0:2] + O[ok][:, 2:4]; keep = np.ones(len(src), bool)
        for _ in range(5):
            S = similitude(src[keep], dst[keep]); r = np.hypot(*((src @ S[:, :2].T + S[:, 2]) - dst).T); keep = r < max(2.5 * 1.4826 * np.median(r[keep]), 1.5)
        k = math.sqrt(abs(np.linalg.det(S[:, :2]))); t = S @ np.array([expo['tour'][0], expo['tour'][1], 1])
        if verbeux: print('passe %d : %d cases, %d sûres, %d gardées ; %.5f px par unité de la maquette, tour en (%.1f, %.1f) ; écart médian %.1f px, 90 %% sous %.1f px' % (it + 1, len(O), ok.sum(), keep.sum(), k, t[0], t[1], np.median(r[keep]), np.percentile(r[keep], 90)))
        M = S
    return M, src[keep], dst[keep]


def planche(out, c1, c2, cote=400.0, pas=50.0, emprises=None, M=None, axe=False):
    """Planche centrée en (x, z) de la maquette, le nord en haut ; ou, avec axe, en (u, v) du repère de l'Exposition
    (src/p1937/expo37.js, AXE : u de la tour vers l'École militaire, v vers Grenelle), u vers le bas et v vers la
    gauche, comme la feuille du plan."""
    M = np.array(M if M is not None else CALAGE, float).reshape(2, 3); im = image(); R, expo = ilots()
    from extract_1889 import decode_polys
    d = json.load(open(DATA, encoding='utf8'))['eau']; eau = [r for rings in decode_polys(d['g'], d['q']) for r in rings]
    res = max(0.5, cote / 1500.0); n = int(round(cote / res))
    if axe:
        (ux, uz), (ox, oz) = expo['u'], expo['tour']; e1 = (uz, -ux); e2 = (ux, uz)                    # −v, puis u
        C = (ox + c1 * ux - c2 * uz, oz + c1 * uz + c2 * ux)
    else: e1 = (1.0, 0.0); e2 = (0.0, 1.0); C = (c1, c2)
    t = (np.arange(n) + 0.5) * res - cote / 2; A, B = np.meshgrid(t, t)
    Xm = C[0] + A * e1[0] + B * e2[0]; Zm = C[1] + A * e1[1] + B * e2[1]
    PX = M[0, 0] * Xm + M[0, 1] * Zm + M[0, 2]; PY = M[1, 0] * Xm + M[1, 1] * Zm + M[1, 2]
    a = np.asarray(im, float); o = np.stack([lire(a[:, :, k], PX, PY) for k in range(3)], -1)
    o[(PX < 0) | (PX >= im.width - 1) | (PY < 0) | (PY >= im.height - 1)] = 90
    pl = Image.fromarray(o.astype(np.uint8)); dr = ImageDraw.Draw(pl)
    S = lambda x, z: ((((x - C[0]) * e1[0] + (z - C[1]) * e1[1]) + cote / 2) / res, (((x - C[0]) * e2[0] + (z - C[1]) * e2[1]) + cote / 2) / res)
    def trace(r, **k):
        q = [S(*p) for p in list(r) + [r[0]]]
        if max(p[0] for p in q) < 0 or min(p[0] for p in q) > n or max(p[1] for p in q) < 0 or min(p[1] for p in q) > n: return None
        dr.line(q, **k); return q
    for r in eau: trace(r, fill=(0, 120, 255), width=2)
    for r in R: trace(r, fill=(225, 40, 40), width=1)
    for e in emprises or []:
        r = e['ring'] if isinstance(e, dict) else e; q = trace(r, fill=(20, 40, 200), width=2)
        if q and isinstance(e, dict) and e.get('nom'): dr.text((sum(p[0] for p in q[:-1]) / (len(q) - 1) - 3 * len(e['nom']), sum(p[1] for p in q[:-1]) / (len(q) - 1) - 5), e['nom'], fill=(120, 0, 160))
    # grille : x et z de la maquette, ou v (en haut, croissant vers la gauche) et u (à gauche, croissant vers le bas)
    h0 = (-c2 if axe else c1) - cote / 2; v0 = (c1 if axe else c2) - cote / 2
    g = math.ceil(h0 / pas) * pas
    while g < h0 + cote: X = (g - h0) / res; dr.line([(X, 0), (X, 8)], fill=(150, 90, 0), width=1); dr.text((X + 2, 2), '%d' % (-g if axe else g), fill=(150, 90, 0)); g += pas
    g = math.ceil(v0 / pas) * pas
    while g < v0 + cote: Y = (g - v0) / res; dr.line([(0, Y), (8, Y)], fill=(0, 100, 150), width=1); dr.text((10, Y - 5), '%d' % g, fill=(0, 100, 150)); g += pas
    pl.save(out); print(out, pl.size, '%.2f unité de la maquette par pixel' % res, '— repère de l’Exposition (v en haut, u à gauche)' if axe else '— x en haut, z à gauche')


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == 'caler':
        M, src, dst = caler(); k = math.sqrt(abs(np.linalg.det(M[:, :2]))); r = np.hypot(*((src @ M[:, :2].T + M[:, 2]) - dst).T) / k
        print('CALAGE =', json.dumps([[round(v, 6) for v in l] for l in M.tolist()]))
        print('%.4f unité de la maquette par pixel ; écarts sur %d cases sûres : médiane %.1f, 90 %% sous %.1f, pire %.1f (unités de la maquette, ≈ mètres)' % (1 / k, len(r), np.median(r), np.percentile(r, 90), r.max()))
        return
    arg = sys.argv[1:]; axe = len(arg) > 1 and arg[1] == 'axe'
    if axe: arg = arg[:1] + arg[2:]
    if len(arg) < 3: raise SystemExit(__doc__)
    emp = json.load(open(arg[5], encoding='utf8')) if len(arg) > 5 else None
    planche(arg[0], float(arg[1]), float(arg[2]), float(arg[3]) if len(arg) > 3 else 400.0, float(arg[4]) if len(arg) > 4 else 50.0, emp, axe=axe)


if __name__ == '__main__':
    main()
