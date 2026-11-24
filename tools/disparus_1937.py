"""Paris 1937 : les grands ensembles disparus depuis, que le bâti d'aujourd'hui ne connaît plus.

Relevés sur la photographie aérienne « Paris 1949 » de l'IGN (tools/releve1949.py redresse la photographie dans le
repère de la maquette et y trace une grille cotée) : à douze ans près, l'état de 1937 (ETUDE-1937.md). Repère de la
maquette : mètres, x vers l'est, z vers le sud, origine au parvis de Notre-Dame.

ZONES : un polygone grossier, qui désigne les îlots de la base de 1900 dont le centre y tombe ; son tracé suit l'enceinte
du site sur la photographie, à une dizaine de mètres près. Dans ces îlots, aucune maison n'est évoquée (statuts E et G) ;
les bâtiments réels ou probables (R, P) restent. Selon le mode :
  rangs  des halles basses le long des côtés de chaque îlot (statut V, « disparu », k = 'i'), comme les maisons évoquées
         le long des rues, mais plus profondes, plus longues et plus serrées : magasins, chais, échaudoirs, ateliers ;
         leur nombre, leur longueur et leur hauteur sont une évocation du parti que montre la photographie ;
  vide   rien d'évoqué : l'édifice est modelé à part dans la page (src/p1937/disparus.js : gazomètres, prison de la
         Petite Roquette, Vélodrome d'Hiver).
EMPRISES : bâtiments relevés un à un sur la photographie (statut V), donnés par leur axe — centre, direction, demi-longueur
et demi-largeur — et leur hauteur, de convention.
"""

ZONES = [
    # Halle aux vins (1811-1845 ; démolie de 1960 à 1970 pour la faculté des sciences de Jussieu) : le losange entre le
    # quai Saint-Bernard, la rue des Fossés-Saint-Bernard, la rue Jussieu et la rue Cuvier ; rangées de magasins
    {'nom': 'Halle aux vins', 'mode': 'rangs', 'poly': [(205, 600), (430, 425), (815, 700), (520, 885)], 'prof': 20, 'h': (8, 10.5), 'dens': 0.95, 'lg': (24, 46), 'toit': 2},
    # Entrepôts de Bercy (rebâtis par Ernest Lheureux ; le parc de Bercy et Bercy Village depuis les années 1990) : entre le quai
    # et la rue de Bercy, du boulevard de Bercy à la limite de Paris ; chais bas le long des rues intérieures
    {'nom': 'Entrepôts de Bercy', 'mode': 'rangs', 'poly': [(1995, 1690), (2245, 1545), (2900, 2310), (2640, 2525)], 'prof': 15, 'h': (5.5, 8), 'dens': 0.92, 'lg': (18, 40), 'toit': 2},
    # Abattoirs de la Villette (1867 ; la Cité des sciences depuis 1986) : entre le canal Saint-Denis, le canal de l'Ourcq
    # et le chemin de fer de Ceinture ; longues rangées d'échaudoirs
    {'nom': 'Abattoirs de la Villette', 'mode': 'rangs', 'poly': [(2560, -4720), (2620, -4890), (2880, -4880), (2950, -4620), (2620, -4390)], 'prof': 16, 'h': (8, 11), 'dens': 0.95, 'lg': (30, 60), 'toit': 2},
    # Marché aux bestiaux (1867) : la grande halle du milieu est encore debout (réelle) ; les halles latérales et les
    # étables, démolies, sont évoquées
    {'nom': 'Marché aux bestiaux de la Villette', 'mode': 'rangs', 'poly': [(2640, -4360), (2900, -4500), (2985, -4420), (2965, -4060), (2760, -4040)], 'prof': 16, 'h': (7, 10), 'dens': 0.9, 'lg': (30, 60), 'toit': 2},
    # Abattoirs de Vaugirard (1894-1898 ; le parc Georges-Brassens depuis 1985, qui garde les halles du marché aux chevaux)
    {'nom': 'Abattoirs de Vaugirard', 'mode': 'rangs', 'poly': [(-3830, 2130), (-3480, 2170), (-3470, 2440), (-3860, 2440)], 'prof': 16, 'h': (8, 11), 'dens': 0.9, 'lg': (30, 60), 'toit': 2},
    # Usines Citroën du quai de Javel (1915-1975 ; le parc André-Citroën depuis 1992) : ateliers à sheds
    {'nom': 'Usines Citroën', 'mode': 'rangs', 'poly': [(-5650, 1150), (-5420, 1060), (-5230, 1480), (-5470, 1665)], 'prof': 30, 'h': (11, 15), 'dens': 0.95, 'lg': (30, 70), 'toit': 1},
    # Usine à gaz de La Villette : ses gazomètres sont modelés à part
    {'nom': 'Usine à gaz de La Villette', 'mode': 'vide', 'poly': [(1150, -4860), (1500, -4860), (1500, -4600), (1160, -4560)]},
    # Prison de la Petite Roquette (1836 ; le square de la Roquette depuis 1977) et Vélodrome d'Hiver (1909-1959)
    {'nom': 'Petite Roquette', 'mode': 'vide', 'poly': [(2395, -850), (2545, -880), (2600, -690), (2440, -660)]},
    {'nom': 'Vélodrome d’Hiver', 'mode': 'vide', 'poly': [(-4545, 15), (-4475, -72), (-4418, -26), (-4488, 58)]},
]

# Gare de marchandises des Gobelins (1903 ; sous les Olympiades depuis les années 1970) : ses deux halles, le long des voies
EMPRISES = [
    ('Gare des Gobelins', 1190, 2985, 0.283, 0.959, 113, 8, 9.0, 2),
    ('Gare des Gobelins', 1060, 2939, 0.243, 0.970, 58, 7, 8.0, 2),
]


def dans(r, x, z):
    c = False; j = len(r) - 1
    for i in range(len(r)):
        a, b = r[i], r[j]
        if (a[1] > z) != (b[1] > z) and x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]: c = not c
        j = i
    return c


def zone_de(x, z):
    """La zone dont le polygone contient le point, ou None."""
    for Z in ZONES:
        if dans(Z['poly'], x, z): return Z
    return None


def emprises():
    """Bâtiments relevés un à un : dicts du bâti de tools/extract_1889.py, statut V."""
    out = []
    for nom, cx, cz, ux, uz, hl, hw, h, toit in EMPRISES:
        nx, nz = -uz, ux
        ring = [(cx + ux * a * hl + nx * b * hw, cz + uz * a * hl + nz * b * hw) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        xs = [p[0] for p in ring]; zs = [p[1] for p in ring]
        out.append({'rings': [ring], 'aire': 4 * hl * hw, 'bb': (min(xs), min(zs), max(xs), max(zs)), 'c': (cx, cz), 'st': 'V', 'h': h, 'toit': toit, 'tissu': 'TI', 'sur': None, 'disparu': nom})
    return out
