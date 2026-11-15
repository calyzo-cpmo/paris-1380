// Données de la page « Lutèce » : rues et rivages de la ville antique restitués par Théodore Vacquer, emprises des
// monuments (SIG ALPAGE, licence ODbL 1.0), extraits par tools/extract_epochs.py dans data/epoques.json ; relief du
// nivellement de Girard (1805-1807), le plus ancien dont on dispose. Repère : celui des maquettes de 1380 et de 1789.
// Les imports sont nommés : seules ces deux couches entrent dans la page, pas le reste des deux fichiers.
import { lutece } from '../../data/epoques.json';
import { relief as reliefBrut } from '../../data/paris1789.json';
import { decodeLines, decodePolys } from '../vlq.js';
import { decodeRelief } from '../relief.js';

export const CREDIT = lutece.credit, CREDIT_RELIEF = reliefBrut.credit;

const cache = new Map();
const memo = (k, f) => () => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
// Rues : lignes brisées. Rivages : lignes ouvertes (rives du fleuve, ruisseaux, bras morts) ou fermées (îles).
export const rues = memo('rues', () => decodeLines(lutece.rues));
export const rivages = memo('eau', () => decodeLines(lutece.eau));
// Monuments : [{ nom, ring }] — forum, thermes du Nord et de l'Est, théâtre, arènes.
export const monuments = memo('mon', () => lutece.monuments.map((m) => ({ nom: m.nom, ring: decodePolys(m.g, m.q)[0][0] })));
export const relief = () => decodeRelief(reliefBrut);
