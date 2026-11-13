// Construction de la ville : orchestration des générateurs.
import { Interiors } from './interiors.js';
import { Builder } from './builder.js';
import { makeMaterials } from './textures.js';
import { buildHouses } from './houses.js';
import { buildSpecials } from './special.js';
import { buildWalls, buildBastille, buildLouvre } from './walls.js';
import { buildNotreDame, buildPalais, buildFortresses, buildBridges, buildOutskirts } from './monuments.js';
import { buildTrees, buildBoats, buildSmallThings, buildSmoke, buildMillSails, buildCountryside } from './landscape.js';
import { buildMarkets, buildYards, buildChantiers, buildFigurants, buildCountry } from './props.js';
import { People } from './people.js';
import { buildMovingBoats, buildFlags, buildWheels, buildBirds } from './life.js';
import { Certainty } from './certainty.js';

export async function buildCity(app, step) {
  await step('Taille des pierres et pose des colombages…', 0.18);
  const mats = makeMaterials(app.mobile ? 0.5 : 1);
  app.materials = mats;
  // degré de certitude : chaque étape de construction classe les volumes qu'elle pose (2 restitué, 3 emprise attestée, 4 conjectural, 5 hors plan)
  const cert = (app.cert = new Certainty(app));
  for (const k of ['houses', 'stone', 'stonefx', 'roof', 'plain']) cert.certify(mats[k]);
  const B = new Builder();
  app.builder = B;
  app.claimed = new Set(); app.chainBoats = []; app.chimneys = []; app.gates = [];
  app.figurants = []; app.flags = []; app.wheels = []; app.chantiers = []; app.villages = [];
  const M = (app.monuments = {});
  await step('Notre-Dame, le Palais, le Louvre…', 0.28);
  M.notreDame = buildNotreDame(app, B);
  Object.assign(M, buildPalais(app, B));
  Object.assign(M, buildFortresses(app, B));
  M.louvre = buildLouvre(app, B);
  M.bastille = buildBastille(app, B);
  cert.stage(2);
  M.bridges = buildBridges(app, B);
  cert.stage(3);
  await step('Enceintes de Philippe Auguste et de Charles V…', 0.38);
  buildWalls(app, B);
  cert.stage(3);
  await step('Églises, couvents, hôtels et collèges…', 0.46);
  buildSpecials(app, B);
  Object.assign(M, buildOutskirts(app, B));
  cert.stage(3);
  await step('Lotissement des îlots : maisons à pans de bois…', 0.56);
  const n = buildHouses(app, B);
  cert.stage(4);
  app.log(`${n} maisons`);
  await step('Marchés, chantiers, villages des environs…', 0.68);
  buildSmallThings(app, B);
  const nb = buildBoats(app, B);
  const ns = buildMarkets(app, B);
  const yards = buildYards(app, B);
  buildChantiers(app, B);
  cert.stage(0);                                // étals, puits, chantiers : évocation, laissée en couleurs naturelles
  const nv = buildCountry(app, B);
  const cs = buildCountryside(app, B);          // haies, bois, vergers, croix de chemin, bergers et troupeaux
  cert.stage(5);                                // chartreuse et faubourg Saint-Jacques : zone que masque la légende du plan
  buildFigurants(app);
  cert.finish();
  app.log(`${ns} étals, ${yards.wells} puits, ${yards.stacks} meules, ${nv} maisons de village, ${app.figurants.length} figurants, ${cs.hedges} tronçons de haie, ${cs.domes} bosquets, ${cs.orchard} arbres de verger`);
  await step('Assemblage de la maquette…', 0.78);
  app.cityMeshes = B.finish(app.scene, mats);
  app.log(`${Math.round(B.tris)} triangles de bâti, ${nb} bateaux à quai`);
  await step('Vergers, jardins et fumées des cheminées…', 0.86);
  app.trees = buildTrees(app);
  app.log(`${app.treeCount} arbres`);
  const smoke = buildSmoke(app), sails = buildMillSails(app);
  app.smoke = smoke;
  await step('Les Parisiens descendent dans la rue…', 0.93);
  const people = new People(app);
  people.addStatics(app.figurants);
  app.people = people;
  const boats = buildMovingBoats(app, people), flags = buildFlags(app), wheels = buildWheels(app), birds = buildBirds(app);
  app.log(`${people.total} passants possibles, ${boats.count} bateaux en route, ${app.flags.length} bannières`);
  app.interiors = new Interiors(app);
  app.on('frame', (dt) => {
    if (app.inside) return;                      // visite intérieure : la ville est au repos
    smoke.material.uniforms.uTime.value = app.time;
    for (const s of sails) s.rotation.z += dt * 0.55;
    for (const w of wheels) w.rotation.x += dt * 0.9;
    people.update(dt);
    boats.update(dt, app.time);
    if (flags) flags.uniforms.uTime.value = app.time;
    birds.uniforms.uTime.value = app.time;
  });
  app.on('hour', () => {
    const d = app.sky.day;
    mats.houses.emissiveIntensity = (1 - d) * 1.6;
    smoke.material.uniforms.uOpacity.value = 0.12 + 0.2 * d;
    smoke.material.uniforms.uCol.value.setRGB(0.3 + 0.45 * d, 0.3 + 0.45 * d, 0.33 + 0.45 * d);
    if (flags) flags.uniforms.uLight.value = d;
    birds.mesh.visible = d > 0.3;
  });
}
