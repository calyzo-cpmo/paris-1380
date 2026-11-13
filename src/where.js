// « Où suis-je ? » : rive ou île, nom de la rue (libellés du plan de 1380) et lieu remarquable le plus proche.
import { LABELS, FRAME } from './data.js';
import { LU } from './raster.js';
import { distPolyline } from './geom.js';

// Rues nommées sur le plan : les libellés, écrits en plusieurs morceaux le long des voies, sont ici réunis et développés.
export const STREETS = [
  ['Rue Sainte-Avoie', [[244, -713], [285, -780], [389, -906]]], ['Rue du Temple', [[461, -997], [529, -1102], [596, -1219]]],
  ['Rue Saint-Martin', [[48, -727], [103, -899], [184, -1132]]], ['Grand’Rue Saint-Denis', [[-87, -1016], [-62, -1106], [-34, -1205], [-25, -1287]]],
  ['Rue de la Porte Montmartre', [[-399, -1481]]], ['Rue Montorgueil', [[-259, -1335]]],
  ['Grande rue Saint-Jacques', [[-486, 565], [-441, 441], [-412, 362], [-361, 229]]], ['Rue de la Harpe', [[-552, 299], [-506, 215], [-464, 165], [-424, 114]]],
  ['Rue Saint-Germain', [[-798, -80], [-746, -73]]], ['Rue Saint-Victor', [[-62, 402], [68, 519]]], ['Rue Sainte-Geneviève', [[-152, 601], [-151, 570], [-155, 528]]],
  ['Rue Saint-Honoré', [[-1051, -1135]]], ['Rue de la Verrerie', [[135, -599], [213, -558], [353, -476]]], ['Rue Saint-Antoine', [[868, -161]]],
  ['Place de Grève', [[49, -356]]], ['Rue de Garlande', [[-292, 108], [-263, 155]]], ['Place Maubert', [[-146, 238]]],
  ['Rue du Grand Chantier', [[623, -952]]], ['Rue des Quatre Fils', [[609, -887]]], ['Rue Barbette', [[633, -680]]], ['Rue de Paradis', [[512, -748]]],
  ['Rue Porte du Chaume', [[419, -711], [460, -781], [511, -852]]], ['Rue Sainte-Croix de la Bretonnerie', [[256, -670], [401, -600]]],
  ['Rue des Blancs Manteaux', [[296, -744], [423, -689]]], ['Rue du Plâtre', [[276, -699]]], ['Vieille rue du Temple', [[472, -371], [499, -432], [526, -482], [565, -548]]],
  ['Rue du Roi de Sicile', [[493, -406], [573, -371]]], ['Grand’rue de la Porte Baudeer', [[480, -316], [565, -296], [646, -292]]], ['Rue du Pont Perrin', [[841, -243], [929, -190]]],
  ['Rue des Vieilles Poulies', [[753, -537]]], ['Rue Saint-Paul', [[750, 13], [802, -52], [842, -123]]], ['Rue de Pute-y-Musse', [[904, 110]]],
  ['Rue des Nonnains d’Yerres', [[561, -91]]], ['Rue de Jouy', [[560, -226], [615, -177], [689, -162]]], ['Rue de la Mortellerie', [[178, -277], [297, -200], [358, -154], [399, -137]]],
  ['Rue Frogier l’Asnier', [[421, -158]]], ['Rue de la Tixeranderie', [[87, -513], [128, -505], [167, -490], [261, -411]]],
  ['Rue Saint-Jacques la Boucherie', [[-204, -569], [-159, -551], [-159, -522]]], ['Rue de la Sellerie', [[-229, -571], [-224, -613], [-212, -655]]],
  ['Rue des Lombards', [[-104, -725], [-39, -697]]], ['Rue Saint-Merri', [[-9, -643], [33, -622]]], ['Rue Aubry le Boucher', [[-116, -833]]],
  ['Rue Neuve Saint-Merri', [[67, -781], [122, -752]]], ['Rue Beaubourg', [[180, -828], [220, -899]]], ['Rue Quincampoix', [[8, -821], [49, -950]]],
  ['Rue de la Ferronnerie', [[-261, -800]]], ['Rue du Château Fêtu', [[-547, -908], [-398, -871]]], ['Rue Béthisy', [[-548, -824]]], ['Rue des Bourdonnais', [[-413, -731]]],
  ['Rue Saint-Germain l’Auxerrois', [[-530, -656]]], ['Rue de l’Arbre Sec', [[-584, -742]]], ['Rue des Fossés Saint-Germain', [[-692, -805], [-688, -780]]],
  ['Rue des Poulies', [[-756, -706], [-717, -792], [-693, -873]]], ['Rue d’Autriche', [[-837, -805], [-809, -865]]], ['Rue de la Croix du Trahoir', [[-700, -994], [-665, -962]]],
  ['Rue de Bohême', [[-626, -1015], [-564, -1073], [-533, -1100]]], ['Rue du Séjour', [[-460, -1156]]], ['Rue des Prouvaires', [[-433, -945]]], ['Rue de la Tonnellerie', [[-385, -994]]],
  ['Rue de la Grande Truanderie', [[-272, -1153], [-119, -1097]]], ['Rue Mauconseil', [[-254, -1227]]], ['Rue aux Oues', [[1, -1156], [52, -1139]]], ['Rue de Guernelle', [[-717, -1061]]],
  ['Cour Basile', [[-729, -1150]]], ['Rue Plastrière', [[-512, -1213]]], ['Rue Quiquetonne', [[-350, -1315]]], ['Rue Pavée', [[-231, -1302]]], ['Rue du Lion d’Or', [[-136, -1288]]],
  ['Rue des Deux Portes', [[-126, -1314]]], ['Rue de l’École', [[-716, -666]]], ['Rue de la Monnaie', [[-552, -621], [-506, -727]]], ['Rue des Bons Enfants', [[-857, -1146]]],
  ['Rue des Petits Champs', [[-783, -1129]]], ['Rue Saint-Thomas du Louvre', [[-1049, -919]]], ['Rue Tirechappe', [[-424, -826]]], ['Rue des Arcis', [[-33, -546]]],
  ['Quai de la Grève', [[159, -266]]], ['Quai des Ormes', [[405, -106]]], ['Rue aux Graveliers', [[290, -1270], [384, -1228]]], ['Rue Trousse-Nonnains', [[299, -1069], [339, -1204]]],
  ['Rue Darnestat', [[78, -1346]]], ['Rue Simon le Franc', [[145, -812]]], ['Rue de la Juiverie', [[-218, -139]]], ['Rue de la Lanterne', [[-179, -248]]],
  ['Rue de la Vieille Draperie', [[-262, -242]]], ['Rue des Marmozets', [[-160, -231]]], ['Rue de la Calendre', [[-361, -207], [-324, -173]]], ['Rue de la Huchette', [[-411, -56], [-336, -16]]],
  ['Rue et quai Saint-Bernard', [[-42, 170], [4, 184], [118, 234]]], ['Rue des Bernardins', [[8, 369]]], ['Rue Traversine', [[-61, 563]]], ['Rue des Sept Voies', [[-314, 726]]],
  ['Rue de la Porte Bordelle', [[-97, 842]]], ['Rue des Cordeliers', [[-758, 139], [-714, 188], [-668, 234]]], ['Rue des Boucheries', [[-1030, -16]]], ['Rue des Fossés', [[-1269, -53]]],
  ['Rue Saint-Sauveur', [[-210, -1467]]], ['Rue Pagevin', [[-611, -1404], [-555, -1364]]], ['Rue Coq-Héron', [[-486, -1303]]], ['Rue Neuve Saint-Sulpice', [[-1222, 32]]],
  ['Chemin de la Seine', [[-978, -308]]], ['Chemin de la Petite Seine', [[-1208, -333]]],
];
const ISLES = { 'Ile de Notre-Dame': 'Île Notre-Dame', 'Ile auxV ache s': 'Île aux Vaches', 'Ile des Javiaux': 'Île des Javiaux', 'Ile des Juifs': 'Île des Juifs' };

export function makeLocator(app) {
  // Composantes de terre ferme (4 m par cellule) séparées par l'eau : la Seine isole les rives et les îles, les fossés isolent la ville neuve.
  // Tout ce qui est à moins de 10 m de l'eau compte comme de l'eau : ainsi ni les ponts, ni leurs maisons, ni leurs moulins ne relient deux rives.
  const lu = app.lu, df = app.terrain.df, S = 4, w = Math.ceil(lu.w / S), h = Math.ceil(lu.h / S), comp = new Int16Array(w * h).fill(-1);
  const land = (i, j) => df.at(lu.x0 + (i + 0.5) * S, lu.z0 + (j + 0.5) * S) < -10;
  const cell = (x, z) => { const i = Math.floor((x - lu.x0) / S), j = Math.floor((z - lu.z0) / S); return i < 0 || j < 0 || i >= w || j >= h ? -1 : j * w + i; };
  const stack = new Int32Array(w * h);
  let n = 0;
  const flood = (x, z) => {
    let k = cell(x, z); if (k < 0) return -1;
    if (!land(k % w, (k / w) | 0)) {              // graine tombée dans l'eau : on prend la terre la plus proche
      let f = -1; for (let r = 1; r < 30 && f < 0; r++) for (let a = 0; a < 8 && f < 0; a++) { const q = cell(x + Math.cos(a * 0.785) * r * S, z + Math.sin(a * 0.785) * r * S); if (q >= 0 && land(q % w, (q / w) | 0)) f = q; }
      if (f < 0) return -1; k = f;
    }
    if (comp[k] >= 0) return comp[k];
    const id = n++; let sp = 0; stack[sp++] = k; comp[k] = id;
    while (sp) {
      const c = stack[--sp], i = c % w, j = (c / w) | 0;
      if (i > 0 && comp[c - 1] < 0 && land(i - 1, j)) { comp[c - 1] = id; stack[sp++] = c - 1; }
      if (i < w - 1 && comp[c + 1] < 0 && land(i + 1, j)) { comp[c + 1] = id; stack[sp++] = c + 1; }
      if (j > 0 && comp[c - w] < 0 && land(i, j - 1)) { comp[c - w] = id; stack[sp++] = c - w; }
      if (j < h - 1 && comp[c + w] < 0 && land(i, j + 1)) { comp[c + w] = id; stack[sp++] = c + w; }
    }
    return id;
  };
  const names = new Map();
  const name = (x, z, label) => { const id = flood(x, z); if (id >= 0 && !names.has(id)) names.set(id, label); };
  const byId = new Map((app.places || []).map((p) => [p.id, p]));
  const nd = byId.get('notre-dame');
  if (nd) name(nd.x, nd.z, 'Île de la Cité');
  name(0, -1000, 'Rive droite');
  name(-380, 520, 'Rive gauche');
  for (const l of LABELS.iles || []) name(l.p[0], l.p[1], ISLES[l.t] || l.t);
  const sg = byId.get('saint-germain-des-pres');
  if (sg) name(sg.x, sg.z, 'Bourg Saint-Germain');
  const villages = app.villages || [];

  const around = (x, z, max) => { for (let r = 6; r <= max; r += 6) for (let a = 0; a < 8; a++) { const q = cell(x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r), nm = q >= 0 ? names.get(comp[q]) : null; if (nm) return nm; } return null; };
  const ofPlace = new Map();      // rive d'un lieu bâti sur l'eau ou sur un fossé (Bastille, portes) : la terre nommée la plus proche, cherchée plus loin
  return function where(x, z) {
    const out = { region: '', street: null, near: null };
    let bn = 1e9; for (const p of app.places || []) { const d = Math.hypot(p.x - x, p.z - z) - (p.rad || 30); if (d < bn && d < 70) { bn = d; out.near = p.name; out.place = p; } }
    if (x <= FRAME.x0 || x >= FRAME.x1 || z <= FRAME.z0 || z >= FRAME.z1) {
      out.region = 'Hors les murs';
      if (!out.near) { let bd = 1300; for (const v of villages) { const d = Math.hypot(v.x - x, v.z - z); if (d < bd) { bd = d; out.near = v.name; } } }
    } else {
      const k = cell(x, z), id = k >= 0 ? comp[k] : -1;
      let nm = names.get(id) || around(x, z, 42);      // sur un quai, un pont ou au bord d'un fossé : la terre nommée la plus proche
      if (!nm) for (const l of LABELS.iles || []) if (Math.hypot(l.p[0] - x, l.p[1] - z) < 120) nm = ISLES[l.t] || l.t;
      if (!nm && out.place && bn < 10) { const p = out.place; if (!ofPlace.has(p.id)) ofPlace.set(p.id, names.get(comp[cell(p.x, p.z)]) || around(p.x, p.z, 160)); nm = ofPlace.get(p.id); }
      out.region = nm || (lu.get(x, z) === LU.WATER ? 'La Seine' : 'Hors les murs');
      let bd = 42; for (const [nm2, pts] of STREETS) { const d = pts.length > 1 ? distPolyline(x, z, pts) : Math.hypot(pts[0][0] - x, pts[0][1] - z); if (d < bd) { bd = d; out.street = nm2; } }
    }
    return out;
  };
}
