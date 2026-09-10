/* CommonJS is intentional for the Node 20 test runner and in-memory TypeScript loader. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ts=require('typescript');
const {renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..'),cache=new Map();
let cookie,realReads=0;
const esm=new Map();
process.env.DASHBOARD_SECRET='local-static-test-secret-only';
function load(filename){
 filename=path.resolve(filename);
 if(!path.extname(filename)){filename=fs.existsSync(filename+'.ts')?filename+'.ts':fs.existsSync(filename+'.tsx')?filename+'.tsx':path.join(filename,'index.ts');}
 if(cache.has(filename))return cache.get(filename).exports;
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const compiled={exports:{}};cache.set(filename,compiled);
 const localRequire=name=>{
  if(esm.has(name))return esm.get(name);
  if(name==='next/headers')return {cookies:async()=>({get:()=>cookie?{value:cookie}:undefined})};
  if(name==='@/lib/supabase-admin')return {supabaseAdmin:{from:()=>{realReads++;throw Error('Aucune lecture réelle autorisée dans ce test');}}};
  if(name==='next/cache')return {revalidatePath:()=>{}};
  if(name.startsWith('@/'))return load(path.join(root,'src',name.slice(2)));
  if(name.startsWith('.'))return load(path.resolve(path.dirname(filename),name));
  return require(name);
 };
 new Function('module','exports','require',code )(compiled,compiled.exports,localRequire);
 return compiled.exports;
}
(async()=>{
 esm.set("d3-geo",await import("d3-geo"));
 const auth=load(path.join(root,'src/lib/auth.ts'));
 const views=load(path.join(root,'src/lib/views.ts'));
 await assert.rejects(()=>views.readView('v_pouls',{preview:true}),/Session/);
 cookie=auth.createSessionToken();
 const output=path.join(root,'docs/verification-apercu');fs.mkdirSync(output,{recursive:true});
 const summaries=[];
 for(const page of ['', 'retention','entonnoir','services','ia','banque','rituel','amis','eleves','courrier','support','erreurs','configuration','eleves/[id]']){
  const component=load(path.join(root,'src/app/dashboard',page,'page.tsx')).default;
  let tree=await component({searchParams:Promise.resolve({apercu:'1'}),params:Promise.resolve({id:'fixture-0'})});
  // Resolve the async shared Server Component in the seven thin route pages.
  if(typeof tree.type==='function'&&tree.type.constructor.name==='AsyncFunction')tree=await tree.type(tree.props);
  const html=renderToStaticMarkup(tree);
  assert.ok(html.includes('Aperçu avec des données fictives'),page);
  assert.ok(!html.includes('NaN')&&!html.includes('Infinity'),page);
  assert.ok(html.includes('Ce que disent les données'),page);
  assert.ok(!/[\u2013\u2014]/.test(html),page);
  const filename=(page||'matin').replaceAll('/','-').replaceAll('[','').replaceAll(']','')+'.html';
  fs.writeFileSync(path.join(output,filename),'<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aperçu LUCID</title><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="fonts.css"><body style="padding:28px;max-width:1400px;margin:auto"><a href="index.html" style="display:block;margin-bottom:20px;color:#CDA1F9">Retour aux rendus statiques</a>'+html+'</body></html>');
  summaries.push({page:'/dashboard'+(page?'/'+page:''),svg:(html.match(/<svg/g)||[]).length,bytes:Buffer.byteLength(html),status:'Rendu serveur validé'});
 }
 assert.equal(realReads,0);
 const all=await views.readView('profiles',{preview:true});assert.equal(all.data.length,40);
 const own=await views.readView('profile_detail',{preview:true,profileId:'fixture-0'});assert.equal(own.data.length,1);
 fs.writeFileSync(path.join(output,'resultats.json'),JSON.stringify({pages:summaries,realReads,authentication:'Aperçu refusé sans session, accepté avec un cookie HMAC de test',limits:'Rendu serveur uniquement. La simulation d3-force et les interactions client ne sont pas exécutées.'},null,2));
 const postcss=require('postcss'),tailwind=require('@tailwindcss/postcss');
 const css=await postcss([tailwind()]).process(fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8'),{from:path.join(root,'src/app/globals.css')});
 fs.writeFileSync(path.join(output,'style.css'),css.css+'\n:root{--font-quicksand:Quicksand,Arial,sans-serif;--font-baloo:"Baloo 2",Arial,sans-serif;--font-geist-mono:"Geist Mono",monospace}');
 fs.writeFileSync(path.join(output,'index.html'),'<!doctype html><html lang="fr"><meta charset="utf-8"><title>Vérification LUCID</title><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="fonts.css"><body style="max-width:900px;margin:auto;padding:40px"><h1 style="font-size:32px">Rendus statiques de l’aperçu</h1><p style="margin:20px 0">Données fictives uniquement. Ces fichiers vérifient le rendu serveur des courbes, de la carte et des textes. Les interactions, la disposition du réseau et les formulaires ne fonctionnent pas dans ces fichiers.</p><ul>'+summaries.map(r=>{const name=r.page.replace('/dashboard','').replace(/^\//,'')||'matin';return '<li style="margin:12px 0"><a style="color:#CDA1F9;text-decoration:underline" href="'+name.replaceAll('/','-').replaceAll('[','').replaceAll(']','')+'.html">'+r.page+'</a></li>';}).join('')+'</ul></body></html>');
 console.log(JSON.stringify(summaries,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
