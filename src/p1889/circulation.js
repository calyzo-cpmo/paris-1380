// Circulation des véhicules : rien de particulier en 1889 ni en 1900, où cavaliers et voitures à cheval vont parmi les
// passants (src/people.js) et où la rue entière est aux piétons. La page « Paris 1937 » remplace ce module par le sien
// (src/p1937/circulation.js, surcouche de tools/build.mjs) : automobiles sur la chaussée, passants sur les trottoirs.
export function preparerCirculation() {}           // (app) : avant les arbres d'alignement, qui lisent la largeur des trottoirs
export const MAILLE = null;                          // maille de la trame des passants, si elle doit être plus fine que 1,5 m
export const trottoirs = null;                       // (app, trame) → trame des passants, quand la chaussée est aux voitures
export const horsTrame = null;                       // (app, jardins) → règle des passants hors du quartier de l'Exposition, quand ce n'est pas la rue entière
export function lancerCirculation() {}
