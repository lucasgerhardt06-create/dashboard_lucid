"use client";
import {useEffect,useMemo,useState} from "react";
import type {SimulationNodeDatum,SimulationLinkDatum,Simulation} from "d3-force";
import {networkStats,type NetworkData,type NetworkNode} from "@/lib/insights/network";
import {number} from "@/lib/insights";
import {palette} from "./charts";
type Node=NetworkNode&SimulationNodeDatum;
type Link=SimulationLinkDatum<Node>;
export function FriendsGraph({data}:{data:NetworkData}){
 const [loadError,setLoadError]=useState(false);
 const [school,setSchool]=useState(""),[all,setAll]=useState(false),[reset,setReset]=useState(0),[hover,setHover]=useState<NetworkNode|null>(null),[positions,setPositions]=useState<{nodes:Node[];links:Link[]}>({nodes:[],links:[]});
 const filtered=useMemo(()=>{const nodes=data.nodes.filter(n=>!school||n.school===school),keys=new Set(nodes.map(n=>n.key)),links=data.links.filter(l=>keys.has(l.source)&&keys.has(l.target));return {nodes:nodes.map(n=>({...n,degree:links.filter(l=>l.source===n.key||l.target===n.key).length})),links};},[data,school]);
 const stats=useMemo(()=>networkStats(filtered),[filtered]);
 const shown=useMemo(()=>{const limit=!all&&stats.largest>0;const keys=new Set(stats.largestKeys);const nodes=filtered.nodes.filter(n=>!limit||keys.has(n.key));const included=new Set(nodes.map(n=>n.key));return {nodes,links:filtered.links.filter(l=>included.has(l.source)&&included.has(l.target))};},[filtered,all,stats]);
 useEffect(()=>{
  let cancelled=false,frame=0,simulation:Simulation<Node>|undefined;
  import("d3-force").then(({forceCenter,forceCollide,forceLink,forceManyBody,forceSimulation})=>{
   if(cancelled)return;
   const nodes:Node[]=shown.nodes.map(n=>({...n})),links:Link[]=shown.links.map(l=>({...l}));
   simulation=forceSimulation(nodes).force("link",forceLink<Node,Link>(links).id(n=>n.key).distance(48)).force("charge",forceManyBody<Node>().strength(-70)).force("collision",forceCollide<Node>().radius(n=>9+Math.sqrt(n.degree)*3)).force("center",forceCenter<Node>(360,235)).stop();
   frame=requestAnimationFrame(()=>{
    simulation?.tick(180);
    const xs=nodes.map(n=>n.x??0),ys=nodes.map(n=>n.y??0),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const scale=Math.min(640/Math.max(maxX-minX,1),390/Math.max(maxY-minY,1),1.6);
    for(const n of nodes){n.x=360+((n.x??0)-(minX+maxX)/2)*scale;n.y=235+((n.y??0)-(minY+maxY)/2)*scale;}
    if(!cancelled)setPositions({nodes,links});
   });
  }).catch(()=>{if(!cancelled)setLoadError(true);});
  return()=>{cancelled=true;cancelAnimationFrame(frame);simulation?.stop();};
 },[shown,reset]);
 return <div><div className="mb-5 flex flex-wrap items-center gap-3"><label className="text-xs" htmlFor="school-filter">Établissement</label><select id="school-filter" className="max-w-full rounded-xl border border-[#332D3D] bg-[#09060C] p-2 text-sm" value={school} onChange={e=>{setSchool(e.target.value);setHover(null);}}><option value="">Tous les établissements</option>{[...new Set(data.nodes.map(n=>n.school))].sort().map(s=><option key={s}>{s}</option>)}</select><button className="control" onClick={()=>setReset(n=>n+1)}>Recentrer</button><button className="control" aria-pressed={all} onClick={()=>setAll(v=>!v)}>{all?"Le plus grand groupe":"Tout afficher"}</button></div><div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]"><div className="min-w-0 rounded-2xl bg-[#09060C]">{loadError&&<p className="p-4 text-sm text-[#FFA1AC]">Le dessin du réseau n’a pas pu être chargé.</p>}{!positions.nodes.length&&shown.nodes.length>0&&!loadError&&<p className="p-4 text-xs text-[#A8A0B4]">Disposition du réseau en préparation…</p>}<svg viewBox="0 0 720 470" className="w-full" role="img" aria-label={`Réseau d’amitiés : ${shown.nodes.length} élèves affichés sur ${stats.total}. Les liens représentent les amitiés acceptées.`}><title>Liens d’amitié acceptés</title>{positions.links.map((l,i)=>{const a=l.source as Node,b=l.target as Node;return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#A8A0B4" strokeOpacity={0.35}/>;})}{positions.nodes.map(n=><g key={n.key} tabIndex={0} role="button" aria-label={`${n.name}, niveau ${n.level??"inconnu"}, ${n.degree} amis, ${n.school}`} onMouseEnter={()=>setHover(n)} onFocus={()=>setHover(n)} onClick={()=>setHover(n)} onKeyDown={e=>{if(e.key==="Enter")setHover(n);}}><circle cx={n.x} cy={n.y} r={5+Math.sqrt(n.degree)*3} fill={palette[Math.min(7,Math.max(0,(n.level??1)-1))]} stroke={hover?.key===n.key?"#F3F0F9":"#0E0911"} strokeWidth={2}/>{(shown.nodes.length<60||hover?.key===n.key)&&<text x={n.x} y={(n.y??0)+22} textAnchor="middle" fill="#CDC8D6" fontSize={11}>{n.name}</text>}<title>{`${n.name} · Niveau ${n.level??"inconnu"} · ${n.degree} amis · ${n.school}`}</title></g>)}</svg>{!shown.nodes.length&&<p className="p-5 text-sm">Aucun élève dans ce filtre.</p>}<p className="px-4 pb-4 text-xs text-[#A8A0B4]">{shown.nodes.length} / {stats.total} élèves affichés. Taille : nombre d’amis dans le filtre. Couleur : niveau.</p><div className="flex flex-wrap gap-3 px-4 pb-4 text-xs">{palette.map((c,i)=><span key={c}><i className="mr-1 inline-block size-2 rounded-full" style={{background:c}}/>{i===7?"Niveau 8 et plus":`Niveau ${i+1}`}</span>)}</div></div><div><dl className="grid grid-cols-2 gap-3">{[["Avec des amis",stats.connected],["Isolés",stats.isolated],["Degré moyen",number(stats.average,2)],["Groupes",stats.groups],["Plus grand groupe",stats.largest],["Élèves",stats.total]].map(([k,v])=><div className="rounded-2xl bg-[#27212C] p-3" key={k}><dt className="text-xs text-[#CDC8D6]">{k}</dt><dd className="mt-1 font-display text-3xl">{v}</dd></div>)}</dl><p className="mt-4 text-sm leading-relaxed">Sur {stats.total} élèves, {stats.connected} ont au moins un ami ; le plus grand groupe en relie {stats.largest}.</p><p className="mt-2 text-xs text-[#A8A0B4]">Groupes : composantes de 2 élèves ou plus. Les isolés sont comptés séparément. Le filtre ne garde que les liens entre les élèves sélectionnés.</p><div className="mt-4 min-h-24 rounded-2xl border border-[#332D3D] p-4 text-sm" aria-live="polite">{hover?<><strong>{hover.name}</strong><p className="mt-2 text-[#CDC8D6]">Niveau {hover.level??"inconnu"} · {hover.degree} amis</p><p className="mt-1 text-xs text-[#A8A0B4]">{hover.school}</p></>:"Sélectionnez un élève pour lire son profil anonymisé."}</div></div></div></div>;
}
