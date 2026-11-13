// Construction de la ville : orchestration des générateurs.
import { Builder } from './builder.js';
import { makeMaterials } from './textures.js';
import { buildHouses } from './houses.js';
import { buildSpecials } from './special.js';
import { buildWalls, buildBastille, buildLouvre } from './walls.js';
import { buildNotreDame, buildPalais, buildFortresses, buildBridges, buildOutskirts } from './monuments.js';
import { buildTrees, buildBoats, buildSmallThings, buildSmoke, buildMillSails } from './landscape.js';

export async function buildCity(app, step) {
  await step('Taille des pierres et pose des colombages…', 0.2);
  const mats = makeMaterials(app.mobile ? 0.5 : 1);
  app.materials = mats;
  const B = new Builder();
  app.builder = B;
  app.claimed = new Set(); app.chainBoats = []; app.chimneys = []; app.gates = [];
  const M = (app.monuments = {});
  await step('Notre-Dame, le Palais, le Louvre…', 0.3);
  M.notreDame = buildNotreDame(app, B);
  Object.assign(M, buildPalais(app, B));
  Object.assign(M, buildFortresses(app, B));
  M.louvre = buildLouvre(app, B);
  M.bastille = buildBastille(app, B);
  M.bridges = buildBridges(app, B);
  await step('Enceintes de Philippe Auguste et de Charles V…', 0.42);
  buildWalls(app, B);
  await step('Églises, couvents, hôtels et collèges…', 0.5);
  buildSpecials(app, B);
  Object.assign(M, buildOutskirts(app, B));
  await step('Lotissement des îlots : maisons à pans de bois…', 0.62);
  const n = buildHouses(app, B);
  app.log(`${n} maisons`);
  buildSmallThings(app, B);
  const nb = buildBoats(app, B);
  await step('Assemblage de la maquette…', 0.8);
  app.cityMeshes = B.finish(app.scene, mats);
  app.log(`${Math.round(B.tris)} triangles de bâti, ${nb} bateaux`);
  await step('Vergers, jardins et fumées des cheminées…', 0.9);
  app.trees = buildTrees(app);
  app.log(`${app.treeCount} arbres`);
  const smoke = buildSmoke(app), sails = buildMillSails(app);
  app.smoke = smoke;
  app.on('frame', (dt) => { smoke.material.uniforms.uTime.value = app.time; for (const s of sails) s.rotation.z += dt * 0.55; });
  app.on('hour', () => {
    const d = app.sky.day;
    mats.houses.emissiveIntensity = (1 - d) * 1.6;
    smoke.material.uniforms.uOpacity.value = 0.12 + 0.2 * d;
    smoke.material.uniforms.uCol.value.setRGB(0.3 + 0.45 * d, 0.3 + 0.45 * d, 0.33 + 0.45 * d);
  });
}
