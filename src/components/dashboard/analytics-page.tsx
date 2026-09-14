import { PageHeader, DenseTable } from "./analytics-ui";
import { Bars, TimeChart, Heatmap, Gauge, Donut, type Series, type ChartRow } from "./charts";
import { ChartPanel, Findings, Funnel, PreviewBanner, referenceDate, type SearchProps } from "./story";
import { readView, type ViewName, type AiQuality, type Onboarding, type Retention } from "@/lib/views";
import { group, funnel, inDays, pageInsights, type Dataset } from "@/lib/insights";
/**
 * Un panneau = une vue Supabase + une forme. `bars` compare des grandeurs, `donut` montre une
 * part d'un tout (au plus six parts), `time` suit des jours, `funnel`/`heatmap`/`quality` sont
 * des formes dédiées, sans `kind` c'est un tableau. `filter` restreint les lignes (une famille de
 * v_repartitions), `days` somme les colonnes `series` sur les N derniers jours pour un donut,
 * `top` plafonne les barres (le reste va dans « Autres »), `limit` coupe un tableau, `wide`
 * prend toute la largeur.
 */
type Panel={view:ViewName;title:string;window:string;kind?:"bars"|"time"|"funnel"|"heatmap"|"quality"|"donut";label?:string;value?:string;unit?:string;series?:Series[];caveat?:string;average?:boolean;stacked?:boolean;thresholds?:boolean;top?:number;limit?:number;days?:number;filter?:[string,string];center?:string;wide?:boolean;columns?:[string,string][]};
const p=(view:ViewName,title:string,window:string,rest:Omit<Panel,"view"|"title"|"window">):Panel=>({view,title,window,...rest});
const time=(view:ViewName,title:string,series:[string,string][],rest:Partial<Panel>={}):Panel=>p(view,title,"30 jours",{kind:"time",series:series.map(([key,name])=>({key,name})),...rest});
const bar=(view:ViewName,title:string,window:string,label:string,value:string,rest:Partial<Panel>={}):Panel=>p(view,title,window,{kind:"bars",label,value,...rest});
const donut=(view:ViewName,title:string,window:string,label:string,value:string,rest:Partial<Panel>={}):Panel=>p(view,title,window,{kind:"donut",label,value,...rest});
const part=(famille:string,title:string,rest:Partial<Panel>={}):Panel=>donut("v_repartitions",title,"Vus sur 30 jours, comptes de test exclus","valeur","eleves",{filter:["famille",famille],unit:"élèves",...rest});
const demo="Démo et dev inclus dans cette vue.";
export const pageSpecs:Record<string,{title:string;description:string;panels:Panel[]}>={
 retention:{title:"Rétention et usage",description:"Revenir, explorer, rester. Lire la fidélité à travers les cohortes et les parcours.",panels:[
  p("v_retention","Est-ce qu’ils reviennent ?","Cohortes par jour d’arrivée",{kind:"heatmap"}),
  part("serie","Les séries en cours",{caveat:"Série = jours consécutifs avec un effort validé. Une série à 0 est un élève à reconquérir."}),
  bar("v_ecrans","Les écrans qui comptent","7 jours","ecran","vues",{top:15}),
  bar("v_sorties","Où se termine la visite ?","7 jours","ecran","sorties",{caveat:demo,top:15}),
  time("v_demo","De la découverte au compte",[["demos","Découvertes"],["convertis","Conversions"]],{window:"60 jours"}),
  donut("v_versions","Les versions utilisées","30 jours","app_version","eleves",{unit:"élèves",caveat:"Un élève passé par deux versions est compté dans chacune."}),
  bar("v_demarrage","Démarrer sans attendre","14 jours","appareil","p95_ms",{unit:"ms au 95e percentile",top:12,caveat:"Chaque barre représente un appareil, une version et une plateforme. Les percentiles ne sont pas additionnés."})]},
 entonnoir:{title:"Entonnoir",description:"De la première ouverture au premier compte. Chaque marche représente des installations, pas des élèves.",panels:[
  p("v_onboarding","Le chemin jusqu’au compte","30 jours, jour d’arrivée",{kind:"funnel"}),
  donut("v_onboarding_abandons","La dernière étape avant de partir","30 jours","derniere_etape","installs",{unit:"installations",caveat:"Les comptes ajoutés sont exclus de cette répartition des abandons."}),
  time("v_onboarding","Arrivées et comptes ajoutés",[["arrivees","Installations arrivées"],["compte_ajoute","Comptes ajoutés"]]),
  donut("v_onboarding_echecs","Qui n’arrive pas à se connecter ?","14 jours","service","n",{unit:"échecs",caveat:demo}),
  bar("v_onboarding_echecs","Ce qui empêche la connexion","14 jours","motif","n",{caveat:demo}),
  time("v_activation","Les premières minutes",[["comptes","Comptes"],["ont_vu_leurs_donnees","Données vues"],["ont_touche_ia_j0","IA essayée à J0"],["ont_accepte_notifs","Notifications acceptées"]],{window:"60 jours"})]},
 services:{title:"Services scolaires",description:"Les connecteurs qui tiennent et ceux qui empêchent de commencer.",panels:[
  donut("v_services","Les services des actifs","7 jours","service","actifs_7j",{unit:"élèves"}),
  bar("v_services","Les synchronisations en échec","7 jours","service","echec_pct_7j",{unit:"%",thresholds:true}),
  bar("v_services","Le délai de synchronisation","Fenêtre fournie par la vue","service","sync_mediane_ms",{unit:"ms, médiane"}),
  bar("v_activation","Les premières données par service","60 jours, J0","service","ont_vu_leurs_donnees"),
  p("v_services","Le détail par service","7 jours",{wide:true,columns:[["service","Service"],["actifs_7j","Actifs 7 j"],["actifs_30j","Actifs 30 j"],["syncs_ok_7j","Synchros OK"],["syncs_ko_7j","Synchros KO"],["echec_pct_7j","Échec, %"],["sync_mediane_ms","Médiane, ms"],["motif_principal","Motif principal"]]})]},
 ia:{title:"Moteur IA",description:"Ce qui est servi, ce que cela coûte et ce qui échoue. Les refus attendus restent distincts des pannes.",panels:[
  time("v_ai_pouls","Le rythme du moteur",[["requetes","Requêtes"],["echecs","Pannes"],["refus","Refus attendus"]],{average:true}),
  donut("v_ai_pouls","Ce que le moteur a répondu","7 jours","","",{days:7,unit:"requêtes",series:[{key:"ok",name:"Servies"},{key:"partiels",name:"Servies partiellement"},{key:"echecs",name:"Pannes"},{key:"refus",name:"Refus attendus"}],caveat:"Une réponse partielle est servie avec moins d’éléments que demandé."}),
  donut("v_ai_pouls_routes","D’où viennent les quiz ?","7 jours","","",{days:7,unit:"quiz",series:[{key:"depuis_le_cours",name:"Depuis le cours"},{key:"depuis_le_programme",name:"Depuis le programme"},{key:"depuis_la_banque",name:"Depuis la banque"},{key:"mutualisees",name:"Mutualisés (cache)"}],caveat:"Une part programme durablement haute peut signaler un défaut de collecte des cours."}),
  time("v_ai_pouls","Le coût jour après jour",[["cout_usd_estime","Coût estimé"]],{unit:"USD",average:true}),
  time("v_ai_pouls","Le temps de réponse",[["latence_p50_ms","Médiane"],["latence_p95_ms","95e percentile"]],{unit:"ms"}),
  time("v_ai_pouls_routes","Les routes jour après jour",[["depuis_le_cours","Cours"],["depuis_le_programme","Programme"],["depuis_la_banque","Banque"],["mutualisees","Mutualisées"]],{stacked:true,window:"Fenêtre fournie par la vue"}),
  p("v_ai_quality","La qualité perçue","30 jours",{kind:"quality"}),
  bar("v_ia","Réussite côté élève","14 jours","tache","ok_pct",{unit:"%",caveat:demo}),
  donut("v_ia_locale","Les générations sur l’appareil","30 jours","modele","generations",{unit:"générations",caveat:demo}),
  p("v_ia_entonnoir","Après la génération, l’usage","30 jours",{columns:[["tache","Tâche"],["moteur","Moteur"],["demandes","Demandes"],["reussies","Réussies"],["suivies_d_un_lancement","Lancements"],["suivies_d_une_fin","Terminées"],["taux_d_usage_pct","Usage, %"]]}),
  time("v_ai_options","La forme des réponses",[["generations_mesurees","Générations mesurées (dénominateur)"],["modele_moins_de_4","Moins de 4 options"],["repetitions","Répétitions"]],{caveat:"Le dénominateur est le nombre de générations mesurées, pas le nombre de quiz servis."}),
  bar("v_ai_cache","Les réutilisations du cache","État actuel","task","reutilisations"),
  time("v_ai_rebond","Après un contexte trop mince",[["refus_contexte_mince","Refus"],["rebonds_vers_la_banque","Vers la banque"],["rebonds_vers_generation","Vers la génération"]],{window:"Fenêtre fournie par la vue"})]},
 banque:{title:"Banque de questions",description:"La qualité à entretenir. Les contenus signalés et les alias inconnus ouvrent la file de révision.",panels:[
  donut("v_ai_bank_health","Ce qui est publié","État actuel","published","id",{unit:"contenus",caveat:"Comptage des contenus, publiés ou en attente."}),
  donut("v_ai_bank_health","La banque par matière","État actuel","subject_canon","id",{unit:"contenus"}),
  p("v_ai_quality","Ce que disent les votes","30 jours",{kind:"quality"}),
  bar("v_ai_bank_health","Les contenus les plus servis","État actuel","title","fois_servi",{top:12}),
  bar("v_ai_bank_health","Les contenus à relire","État actuel","title","signalements",{top:12}),
  bar("v_ai_bank_questions","Les questions signalées","État actuel","title","eleves_signalants",{top:12,caveat:"Nombre d’élèves par question, sans addition entre questions."}),
  p("v_ai_themes","Les alias à réviser en priorité","Fenêtre fournie par la vue",{limit:25,columns:[["slug","Alias"],["occurrences","Occurrences"],["connu_en_banque","Connu en banque"],["derniere_fois","Dernière fois"]]}),
  p("v_ai_bank_health","L’inventaire de la banque","État actuel",{wide:true,limit:40,columns:[["title","Contenu"],["subject_canon","Matière"],["level","Classe"],["quality","Qualité sur 5"],["published","Publié"],["fois_servi","Servi"],["signalements","Signalements"]]})]},
 rituel:{title:"Rituel",description:"Les petits efforts qui deviennent une habitude. Observer les journées validées et l’utilité des rappels.",panels:[
  time("v_gamification","Les journées qui tiennent",[["journees_validees","Journées validées"],["eleves_effort","Élèves ayant fait un effort"],["series_rompues","Séries rompues"]],{average:true,caveat:demo}),
  donut("v_efforts","Ce que les élèves travaillent","30 jours","kind","n",{unit:"efforts",caveat:demo}),
  time("v_gamification","Ce que le rituel déclenche",[["jalons","Jalons"],["niveaux","Niveaux gagnés"],["reparations","Réparations de série"],["badges","Badges"]],{caveat:demo}),
  time("v_gamification","Le Cap du jour",[["cap_vus","Caps affichés"],["cap_ouverts","Caps ouverts"]],{caveat:demo}),
  part("serie","Les séries en cours"),
  donut("v_notif_permissions","L’autorisation des notifications","État actuel","statut","personnes",{unit:"élèves"}),
  bar("v_notifs","Les rappels ouverts","30 jours","notif_type","ouvertes",{caveat:demo}),
  p("v_notifs_efficacite","À quelle heure les rappels sont-ils ouverts ?","Fenêtre fournie par la vue",{kind:"bars",label:"heure_prevue",value:"ouverture_pct",unit:"% des notifications planifiées",caveat:"Taux pondérés par les notifications planifiées. Démo et dev inclus. L’horaire n’est pas une preuve de causalité."})]},
 erreurs:{title:"Erreurs",description:"Distinguer les pannes, les arrêts brutaux et les angles morts de l’instrumentation.",panels:[
  donut("v_crashs","Les familles de crashs","14 jours","gravite","n",{unit:"crashs",caveat:demo}),
  time("v_morts_brutales","Les arrêts brutaux",[["n","Arrêts brutaux"]],{window:"14 jours",caveat:"La vue des crashs ne fournit pas de série quotidienne. Cette courbe concerne uniquement les fins brutales."}),
  donut("v_echecs","Les échecs par famille","14 jours","event_name","n",{unit:"échecs"}),
  bar("v_echecs_detail","Les motifs à traiter","7 jours","motif","n",{top:15,caveat:"Libellé : module · motif. Un module qui n’ouvre pas un service ENT (MODULE_UNAVAILABLE) n’est pas compté ici."}),
  donut("v_sante_instrumentation","La santé de la mesure","14 jours","etat","evenement",{unit:"événements catalogués",caveat:"Vivant : au moins 5 occurrences. Jamais vu : rien n’est arrivé en base en 14 jours."}),
  p("v_sante_instrumentation","Les angles morts de la mesure","14 jours",{filter:["etat","jamais vu"],limit:30,columns:[["famille","Famille"],["evenement","Événement"],["description","Description"]]}),
  p("v_crashs","Le contexte des crashs","14 jours",{wide:true,caveat:demo,columns:[["gravite","Gravité"],["erreur","Erreur"],["identifiant_fautif","Identifiant"],["ecran","Écran"],["app_version","Version"],["n","Occurrences"],["personnes","Personnes"],["dernier","Dernier"]]})]},
};
type Row=Record<string,string|number|null|boolean|string[]>;
const labelOf=(v:Row[string])=>v===null||v===undefined?"Non renseigné":typeof v==="boolean"?(v?"Publié":"En attente"):String(v);
function renderPanel(spec:Panel,raw:object[],end:string){let rows=raw as Row[];
 if(spec.filter)rows=rows.filter(r=>String(r[spec.filter![0]])===spec.filter![1]);
 if(spec.view==="v_ai_themes")rows=[...rows].sort((a,b)=>Number(a.connu_en_banque)-Number(b.connu_en_banque)||Number(b.occurrences)-Number(a.occurrences));
 if(!rows.length)return <p className="empty-chart">Aucune donnée disponible pour cette analyse.</p>;
 if(spec.kind==="funnel")return <Funnel steps={funnel(raw as Onboarding[])}/>;
 if(spec.kind==="heatmap")return <Heatmap rows={raw as Retention[]}/>;
 if(spec.kind==="quality")return <div className="grid gap-3 sm:grid-cols-2">{(raw as AiQuality[]).map((r,i)=><Gauge key={i} label={`${r.route} · ${r.model}`} value={r.votes>0?r.pct_likes:null} detail={`${r.likes} avis positifs / ${r.votes} votes · ${r.quiz_servis} quiz servis · ${r.votes_avec_signalement} signalements · prompt ${r.prompt_version}`}/>)}</div>;
 if(spec.kind==="time") {const map=new Map<string,ChartRow>();for(const row of rows){const label=String(row.jour).slice(0,10);const item=map.get(label)??{label};for(const s of spec.series??[])item[s.key]=Number(item[s.key]??0)+Number(row[s.key]??0);map.set(label,item);}return <TimeChart title={spec.title} rows={[...map.values()]} series={spec.series??[]} stacked={spec.stacked} average={spec.average} end={end} unit={spec.unit}/>;}
 if(spec.kind==="donut") {
  let values:{label:string;value:number}[];
  if(spec.days&&spec.series){const window=inDays(rows as {jour:string}[],end,spec.days) as Row[];const total=(key:string)=>window.reduce((n,r)=>n+Number(r[key]??0),0);values=spec.series.map(s=>({label:s.name,value:total(s.key)}));
   // v_ai_pouls : `partiels` est un sous-ensemble de `ok`, on ne le compte pas deux fois.
   if(spec.view==="v_ai_pouls"){const ok=values.find(v=>v.label==="Servies");if(ok)ok.value-=total("partiels");}}
  else if(spec.view==="v_versions")values=rows.map(r=>({label:`${r.app_version} · ${r.platform}`,value:Number(r.eleves)}));
  else if(spec.view==="v_ai_bank_health"||spec.view==="v_sante_instrumentation"){const map=new Map<string,number>();for(const r of rows){const key=labelOf(r[spec.label!]);map.set(key,(map.get(key)??0)+1);}values=[...map].map(([label,value])=>({label,value}));}
  else values=group(rows.map(r=>({...r,[spec.label!]:labelOf(r[spec.label!])} as Row)),spec.label!,spec.value!);
  return <Donut title={spec.title} rows={values} unit={spec.unit} center={spec.center}/>;
 }
 if(spec.kind==="bars") {
  if(spec.view==="v_onboarding_abandons")rows=rows.filter(r=>!String(r.derniere_etape).startsWith("8."));
  let values=group(rows,spec.label!,spec.value!);
  if(spec.view==="v_echecs_detail")values=group(rows.map(r=>({...r,motif:`${r.module} · ${r.motif}`} as Row)),"motif","n");
  if(spec.view==="v_demarrage")values=rows.map(r=>({label:`${r.appareil} · ${r.platform} · ${r.app_version}`,value:Number(r.p95_ms)}));
  if(spec.view==="v_ai_bank_questions")values=rows.map(r=>({label:`${r.title} · ${r.question_id}`,value:Number(r.eleves_signalants)}));
  if(spec.view==="v_ia")values=rows.map(r=>({label:`${r.tache} · ${r.moteur}`,value:Number(r.ok_pct)}));
  if(spec.view==="v_ai_bank_health")values=values.filter(v=>v.value>0);
  if(spec.view==="v_notifs_efficacite") {const map=new Map<string,{sent:number;open:number}>();for(const r of rows){const key=String(r.heure_prevue).split(":")[0].padStart(2,"0")+" h";const item=map.get(key)??{sent:0,open:0};item.sent+=Number(r.planifiees);item.open+=Number(r.ouvertes);map.set(key,item);}values=[...map].filter(([,v])=>v.sent>0).map(([label,v])=>({label:`${label} (${v.open}/${v.sent})`,value:100*v.open/v.sent}));}
  if(spec.top&&values.length>spec.top){const rest=values.slice(spec.top);values=[...values.slice(0,spec.top),{label:`Autres (${rest.length})`,value:rest.reduce((n,v)=>n+v.value,0)}];}
  if(!values.length)return <p className="empty-chart">Rien à signaler pour l’instant.</p>;
  return <Bars title={spec.title} rows={values} unit={spec.unit} thresholds={spec.thresholds}/>;
 }
 const shown=spec.limit?rows.slice(0,spec.limit):rows;
 return <><DenseTable label={spec.title} rows={shown} columns={(spec.columns??[]).map(([key,label])=>({key,label}))}/>{shown.length<rows.length&&<p className="mt-3 text-xs text-[#A8A0B4]">{shown.length} lignes affichées sur {rows.length}.</p>}</>;
}
export async function AnalyticsPage({page,searchParams}:{page:string}&SearchProps){const preview=(await searchParams).apercu==="1",spec=pageSpecs[page];const names=[...new Set([...spec.panels.map(p=>p.view),...(page==="ia"?["v_pouls" as const]:[])])];const results=await Promise.all(names.map(async name=>({name,...await readView(name,{preview})})));const data=Object.fromEntries(results.map(r=>[r.name,r.data])) as Dataset;return <><PreviewBanner preview={preview}/><PageHeader title={spec.title} description={spec.description}/><Findings items={pageInsights(page,data,referenceDate(preview))}/><div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-2">{spec.panels.map((panel,i)=><ChartPanel key={i} title={panel.title} source={panel.view} window={panel.window} caveat={panel.caveat} wide={panel.wide} error={results.find(r=>r.name===panel.view)?.error}>{renderPanel(panel,data[panel.view]??[],referenceDate(preview))}</ChartPanel>)}</div></>;}
