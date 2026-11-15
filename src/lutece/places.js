// Repères de Lutèce : catégorie et notice. Les positions viennent de la construction (monuments, ponts) ou du plan.
import { centroid } from '../geom.js';
import { COEUR } from './plan.js';

export const CATS = { monument: ['Monuments publics', '#e0a23a'], voie: ['Voies et ponts', '#7ec4ff'], site: ['Fleuve et relief', '#9ccc65'], culte: ['Cultes et morts', '#c7a3f5'] };

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function makePlaces(app) {
  const P = app.plan250, T = app.terrain, M = app.monuments, out = [];
  // nom, catégorie, notice, position { x, z, top } ou [x, z], rang (1 : toujours nommé)
  const lieu = (name, cat, note, pos, rang = 2) => {
    if (!pos) return; const x = pos.x ?? pos[0], z = pos.z ?? pos[1];
    out.push({ id: slug(name), name, cat, catName: CATS[cat][0], color: CATS[cat][1], note, absent: false, x, z, y: pos.top != null ? pos.top : T.height(x, z) + 14, rang });
  };
  lieu('Forum', 'monument', 'Le centre civique de la ville haute, bâti à la fin du Ier siècle sur deux îlots, sous l’actuelle rue Soufflot : une esplanade fermée de boutiques et de portiques, un temple sur son podium à l’ouest, une basilique à l’est, du côté du cardo.', M.Forum, 1);
  lieu('Basilique du forum', 'monument', 'Grande salle à nef et bas-côtés qui ferme le forum à l’est : on y rend la justice et l’on y traite les affaires.', M.Basilique);
  lieu('Thermes du Nord', 'monument', 'Bains publics élevés à la fin du Ier ou au début du IIe siècle. Leur salle froide, voûtée à plus de quatorze mètres, est toujours debout : c’est aujourd’hui une salle du musée de Cluny.', M['Thermes du Nord'], 1);
  lieu('Thermes de l’Est', 'monument', 'Autres grands bains publics, retrouvés sous le Collège de France. L’eau leur vient, comme aux thermes du Nord, de l’aqueduc qui capte des sources à une quinzaine de kilomètres au sud.', M['Thermes de l’Est']);
  lieu('Théâtre', 'monument', 'Un théâtre adossé à la pente, entre le forum et les thermes du Nord. Théodore Vacquer en a relevé les vestiges au XIXe siècle, sous l’actuel lycée Saint-Louis.', M['Théâtre']);
  lieu('Arènes', 'monument', 'Amphithéâtre à scène, bâti à l’écart de la ville à la fin du Ier siècle : on y donne des combats comme des pièces de théâtre. Dégagé à partir de 1869, il est en partie visible rue Monge.', M['Arènes'], 1);
  lieu('Cardo maximus', 'voie', 'L’axe nord-sud de la ville, sur le tracé de l’actuelle rue Saint-Jacques. Il descend la colline, franchit les deux bras du fleuve par l’île et continue au nord vers Senlis.', [P.cardo.reduce((b, p) => (Math.hypot(p[0] - COEUR.x - 90, p[1] - COEUR.z) < Math.hypot(b[0] - COEUR.x - 90, b[1] - COEUR.z) ? p : b))[0], COEUR.z]);
  const ponts = P.ponts.slice().sort((a, b) => b.z - a.z);
  if (ponts[0]) lieu('Petit pont', 'voie', 'Pont de bois sur le petit bras de la Seine, à l’emplacement de l’actuel Petit-Pont. Sa forme est une évocation.', M['pont' + P.ponts.indexOf(ponts[0])]);
  if (ponts[1]) lieu('Grand pont', 'voie', 'Pont de bois sur le grand bras, dans l’axe du cardo, vers l’actuel pont Notre-Dame. Sa forme est une évocation.', M['pont' + P.ponts.indexOf(ponts[1])]);
  { const c = centroid(P.cite); lieu('Île de la Cité', 'site', 'Au IIIe siècle l’île est plus petite qu’aujourd’hui et bordée de grèves. Elle ne deviendra le cœur fortifié de la ville qu’à la fin du siècle, après les premières invasions.', [c[0], c[1]], 1); }
  lieu('Pilier des Nautes', 'culte', 'Monument dédié à Jupiter par les nautes de Lutèce, les bateliers de la Seine, sous l’empereur Tibère. Ses blocs sculptés ont été retrouvés en 1711 sous le chœur de Notre-Dame. Son emplacement d’origine n’est pas connu : il est placé ici par convention.', M.Pilier);
  lieu('Nécropole du sud', 'culte', 'Les morts sont enterrés hors de la ville, le long de la route du sud. Stèles et tombeaux sont une évocation.', M.Necropole);
  { const l = P.ruisseaux.slice().sort((a, b) => b.length - a.length)[0]; if (l) { const p = l[Math.floor(l.length * 0.6)]; lieu('La Bièvre', 'site', 'Petite rivière venue du sud, qui rejoint la Seine en amont de la ville.', p); } }
  { let best = null; for (const l of P.marais) for (const p of l) { if (p[0] < -1200 || p[0] > 1700 || p[1] < -2000 || p[1] > -700) continue; if (!best || Math.abs(p[0] - 700) + Math.abs(p[1] + 1400) < Math.abs(best[0] - 700) + Math.abs(best[1] + 1400)) best = p; }
    lieu('Marais de la rive droite', 'site', 'Au nord, un ancien bras du fleuve dessine une zone basse et marécageuse, noyée à chaque crue. Elle restera longtemps inhabitée : c’est le futur Marais.', best); }
  if (P.tete) lieu('Tête de pont de la rive droite', 'site', 'Sur une butte à l’abri des crues, quelques constructions au départ des routes du nord et de l’est. Leur détail est une évocation.', [P.tete[0] + 20, P.tete[1] - 70]);
  return out;
}
