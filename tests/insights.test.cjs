/* CommonJS is intentional for the Node 20 test runner and in-memory TypeScript loader. */
/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
// Transpile only the pure modules. No application server, session, database,
// network or additional test dependency is needed.
const cache = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, relative);
  if (cache.has(filename)) return cache.get(filename);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const compiled = {exports:{}};
  const localRequire = name => name.startsWith('.') ? load(path.relative(__dirname,path.resolve(path.dirname(filename),name+'.ts'))) : require(name);
  new Function('module','exports','require',code )(compiled,compiled.exports,localRequire);
  cache.set(filename,compiled.exports);
  return compiled.exports;
}
const {fixtures, FIXTURE_DATE} = load('../src/lib/fixtures/index.ts');
const insights = load('../src/lib/insights/index.ts');
const {geography,locateSchool,isTestSchool} = load('../src/lib/insights/geography.ts');
const {anonymizeNetwork,networkStats} = load('../src/lib/insights/network.ts');

test('Le scénario est déterministe et les populations se recoupent',()=>{
 assert.deepEqual(fixtures.v_onboarding(),fixtures.v_onboarding());
 assert.equal(insights.sum(fixtures.v_onboarding(),'arrivees'),60);
 assert.equal(insights.sum(fixtures.v_onboarding(),'compte_ajoute'),fixtures.profiles().length);
 assert.equal(insights.sum(fixtures.v_onboarding_abandons(),'installs'),20);
 assert.equal(insights.sum(fixtures.v_activation(),'comptes'),40);
 assert.equal(insights.sum(fixtures.v_demo(),'demos'),insights.sum(fixtures.v_onboarding(),'demo'));
 assert.equal(insights.sum(fixtures.v_efforts(),'n'),insights.sum(fixtures.v_gamification(),'efforts'));
 assert.equal(insights.sum(fixtures.v_notifs_efficacite(),'ouvertes'),insights.sum(fixtures.v_notifs(),'ouvertes'));
});
test('L’entonnoir calcule les pertes entre marches, sans compter les comptes ajoutés comme abandons',()=>{
 const rows=fixtures.v_onboarding(),steps=insights.funnel(rows);
 assert.deepEqual(steps.map(s=>s.value),[60,57,53,44,40]);
 assert.equal(steps[3].lost,9);
 const result=insights.onboardingInsights(rows,[...fixtures.v_onboarding_abandons(),{derniere_etape:'8. compte ajouté',service:'Pronote',platform:'ios',installs:40,dernier:FIXTURE_DATE}]);
 assert.match(result[0].text,/20 installations sur 60/);
 assert.match(result[1].text,/9 installations sur 20/);
 assert.deepEqual(rows,fixtures.v_onboarding());
});
test('Les fenêtres sont calendaires et ne remplacent pas les absences par zéro',()=>{
 const rows=[{jour:'2026-09-10',n:1},{jour:'2026-09-04',n:2},{jour:'2026-09-03',n:4},{jour:'2026-09-11',n:8}];
 assert.equal(insights.sum(insights.inDays(rows,FIXTURE_DATE,7),'n'),3);
 assert.equal(insights.sum(insights.inDays(rows,FIXTURE_DATE,7,7),'n'),4);
 assert.equal(insights.percent(0,0),null);
 assert.match(insights.aiInsights([],undefined,FIXTURE_DATE)[0].text,/Pas encore assez/);
});
test('Le coût par actif utilise les actifs uniques sur 7 jours, jamais la somme des élèves quotidiens',()=>{
 const p=fixtures.v_pouls()[0],rows=fixtures.v_ai_pouls();
 const result=insights.aiInsights(rows,p,FIXTURE_DATE);
 const cost=insights.sum(insights.inDays(rows,FIXTURE_DATE,7),'cout_usd_estime');
 assert.match(result[0].text,new RegExp(insights.number(cost/p.actifs_7j,4).replace('.','\\.')));
 assert.match(result[1].text,/0 pannes/);
 assert.match(result[1].text,/refus attendus/);
});
test('Les horaires utilisent des taux pondérés et résistent au dénominateur nul',()=>{
 const rows=fixtures.v_notifs_efficacite();
 assert.match(insights.notificationInsight(rows).text,/18 h.*40 %.*20 %.*8 h/);
 assert.match(insights.notificationInsight(rows.map(r=>({...r,planifiees:0}))).text,/nécessaires/);
});
test('La géographie normalise les accents et garde les noms ambigus non localisés',()=>{
 assert.equal(locateSchool('Lycée de Besançon'),'Bourgogne-Franche-Comté');
 assert.equal(locateSchool('Lycée de Poitiers'),'Nouvelle-Aquitaine');
 assert.equal(locateSchool('Lycée Nice Paris'),null);
 assert.equal(locateSchool('Lycée inconnu'),null);
 assert.equal(locateSchool('Lycée Jules Verne'),"Provence-Alpes-Côte d'Azur");
 assert.equal(locateSchool('Lycée de Mamoudzou'),'Mayotte');
 assert.equal(isTestSchool('DÉMO Nice'),true);
 const rows=fixtures.profiles(),g=geography([...rows,{...rows[0],school_name:'Science Factor'}]);
 assert.equal(g.total,40);assert.equal(g.excluded,1);assert.equal(g.unlocated.length,5);
 assert.equal(g.schools.reduce((s,r)=>s+r.count,0),g.total);
});
test('Le graphe anonymise les identifiants, déduplique et écarte les liens non acceptés',()=>{
 const friends=fixtures.friendships(),first=friends[0];
 const graph=anonymizeNetwork(fixtures.profiles(),fixtures.profiles_public(),[...friends,{...first,user_id:first.friend_id,friend_id:first.user_id},{...first,friend_id:first.user_id},{...first,status:'pending',friend_id:'fixture-39'},{...first,friend_id:'absent'}]);
 assert.equal(graph.links.length,31);
 const stats=networkStats(graph);
 assert.equal(stats.connected,30);assert.equal(stats.isolated,10);assert.equal(stats.groups,2);assert.equal(stats.largest,18);assert.equal(stats.average,1.55);
 assert.equal(JSON.stringify(graph).includes('fixture-'),false);
 assert.equal(JSON.stringify(graph).includes('full_name'),false);
});
test('Un réseau de 500 élèves reste calculable, y compris sans liens',()=>{
 const nodes=Array.from({length:500},(_,key)=>({key,name:'Élève',degree:0,school:'Nice',level:1,streak:0}));
 assert.equal(networkStats({nodes,links:[]}).isolated,500);
 const links=nodes.slice(1).map(n=>({source:n.key-1,target:n.key}));
 assert.equal(networkStats({nodes,links}).largest,500);
});
test('Chaque page analytics produit de deux à cinq constats, même vide',()=>{
 const data=Object.fromEntries(Object.entries(fixtures).map(([key,fn])=>[key,fn()]));
 for(const page of ['retention','entonnoir','services','ia','banque','rituel','erreurs'])for(const d of [data,{}]){
  const result=insights.pageInsights(page,d,FIXTURE_DATE);
  assert.ok(result.length>=2&&result.length<=5);
  assert.ok(result.every(i=>i.source&&i.window&&!/NaN|undefined|Infinity/.test(i.text)));
 }
});
