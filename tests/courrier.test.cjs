/* CommonJS is intentional for the Node 20 test runner and in-memory TypeScript loader. */
/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
// Le modèle du Courrier est pur : ni base, ni réseau, ni session.
const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/lib/courrier/model.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const model = {exports:{}}; new Function('module','exports','require',code)(model,model.exports,require); const m = model.exports;

const form = (fields) => { const f = new FormData(); for (const [k,v] of Object.entries(fields)) f.set(k, v); return f; };

test('Les options d’un sondage se lisent une par ligne, sans doublon ni puce', () => {
  assert.deepEqual(m.parsePollOptions('- Les révisions\n\n1. L’emploi du temps\nles révisions\n• Les amis'), [
    {id:'o1',label:'Les révisions'},{id:'o2',label:'L’emploi du temps'},{id:'o3',label:'Les amis'},
  ]);
});

test('L’audience du formulaire donne le filtre que la base attend', () => {
  assert.deepEqual(m.audienceFromForm('tous',''), {});
  assert.deepEqual(m.audienceFromForm('classe',' 1ere B '), {class_name:['1ere B']});
  assert.deepEqual(m.audienceFromForm('etablissement','Lycée Jules Verne'), {school_name:['Lycée Jules Verne']});
  assert.deepEqual(m.audienceFromForm('profil','clement.bellet-odent Clément'), {profile_ids:['clement.bellet-odent']});
  assert.deepEqual(m.audienceFromForm('classe',''), {});
  assert.deepEqual(m.audienceFromForm('niveau','terminale,premiere, Terminale ,inconnu'), {grade:['terminale','premiere']});
  assert.deepEqual(m.audienceFromForm('niveau',''), {});
  assert.equal(m.readCompose(form({title:'T', audience_mode:'niveau', audience_value:''})).error, 'Quel niveau ? Choisis-en au moins un.');
  assert.equal(m.describeAudience({grade:['seconde','college']}), 'Seconde, Collège');
  assert.equal(m.describeAudience({}), 'Tous les élèves');
  assert.equal(m.describeAudience({class_name:['TG3'],min_streak:3}), 'classe TG3 · série de 3 jours et plus');
});

test('Le texte de notification par défaut coupe le message à un mot, sans tiret', () => {
  const long = 'Tes messages Pronote se lisent maintenant dans LUCID. Une question, une idée, un bug ? Réponds à ce message : on lit tout, et on répond à chacun dans la semaine, promis juré.';
  const cut = m.excerpt(long);
  assert.ok(cut.length <= 141, cut);
  assert.ok(cut.endsWith('…'));
  assert.ok(!/\s…$/.test(cut));
  assert.equal(m.excerpt('Court.'), 'Court.');
  assert.ok(!/[–—]/.test(cut));
});

test('Le formulaire complet devient un envoi prêt à publier', () => {
  const parsed = m.readCompose(form({title:' Ton avis compte ', body:'Deux lignes.\r\nPour dire pourquoi.', kind:'poll', options:'A\nB\nC', multi_choice:'on', audience_mode:'classe', audience_value:'1ere B', notify:'on', intent:'send', pinned:'on'}));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.input.title, 'Ton avis compte');
  assert.equal(parsed.input.body, 'Deux lignes.\nPour dire pourquoi.');
  assert.equal(parsed.input.kind, 'poll');
  assert.equal(parsed.input.options.length, 3);
  assert.equal(parsed.input.multiChoice, true);
  assert.deepEqual(parsed.input.audience, {class_name:['1ere B']});
  assert.equal(parsed.input.publish, true);
  assert.equal(parsed.input.notify, true);
  assert.equal(parsed.input.pushTitle, null);
  assert.equal(parsed.input.pushBody, 'Deux lignes. Pour dire pourquoi.');
  assert.equal(parsed.input.allowReply, true);
  assert.equal(parsed.input.pinned, true);
});

test('Le formulaire refuse ce que la base refuserait, avec une phrase lisible', () => {
  assert.deepEqual(m.readCompose(form({title:'', body:'x'})), {ok:false, error:'Il manque un titre.'});
  assert.equal(m.readCompose(form({title:'T', kind:'poll', options:'Une seule'})).error, 'Un sondage a besoin de 2 à 8 réponses possibles, une par ligne.');
  assert.equal(m.readCompose(form({title:'T', audience_mode:'classe', audience_value:''})).error, 'Quelle classe ? Le champ est vide.');
  assert.equal(m.readCompose(form({title:'T', cta_label:'Ouvrir'})).error, 'Le bouton a besoin d’un libellé et d’une destination.'.replaceAll('’',"'"));
  assert.equal(m.readCompose(form({title:'T', cta_label:'Ouvrir', cta_url:'javascript:alert(1)'})).ok, false);
  assert.equal(m.readCompose(form({title:'T', cta_label:'Ouvrir', cta_url:'/ai/revisions'})).ok, true);
  const draft = m.readCompose(form({title:'T', intent:'draft', push_custom:'on', push_title:'Titre notif', push_body:'Texte notif', no_reply:'on'}));
  assert.equal(draft.input.publish, false);
  assert.equal(draft.input.notify, false);
  assert.equal(draft.input.pushTitle, 'Titre notif');
  assert.equal(draft.input.pushBody, 'Texte notif');
  assert.equal(draft.input.allowReply, false);
});

test('La phrase de résultat dit qui a reçu quoi', () => {
  assert.equal(m.describeSend(null, null, false), 'Brouillon enregistré. Il n\'est visible de personne pour l\'instant.');
  assert.equal(m.describeSend({eleves:28,joignables:19}, null, true), 'Publié dans la messagerie de 28 élèves, sans notification.');
  assert.equal(m.describeSend({eleves:1,joignables:0}, {targets:0,sent:0,failed:0,disabled:0,errors:[]}, true), 'Publié dans la messagerie de 1 élève. Aucun appareil enregistré à prévenir : personne n\'a reçu de notification.');
  assert.equal(m.describeSend({eleves:28,joignables:19}, {targets:19,sent:17,failed:2,disabled:2,errors:['DeviceNotRegistered ×2']}, true), 'Publié dans la messagerie de 28 élèves. Notification acceptée pour 17 appareils sur 19. 2 en échec (DeviceNotRegistered ×2). 2 appareils désinstallés retirés de la liste.');
  for (const s of [m.describeSend(null,null,false), m.describeSend({eleves:2,joignables:2},{targets:2,sent:2,failed:0,disabled:0,errors:[]},true)]) assert.ok(!/[–—]/.test(s), s);
});
