/**
 * Rattacher un nom d'établissement tel que l'ENT le donne (« LPO LOUIS LACHENAL  »,
 * « LYCEE GENERAL ET TECHNOLOGIQUE DHUODA », « Lycée Notre Dame du Roc ») à l'annuaire
 * officiel de l'Éducation nationale (data.education.gouv.fr, lycées et collèges), pour
 * obtenir sa commune, son département, sa région et ses coordonnées.
 *
 * Méthode : on réduit chaque nom à ses mots porteurs (les génériques « lycée général et
 * technologique », « LPO », « des métiers », « privé »… sont retirés, « Saint » et « St »
 * confondus), puis on cherche dans l'annuaire les établissements dont les mots porteurs
 * couvrent ceux du profil. Un seul candidat : rattaché. Plusieurs (« Marie Curie »,
 * « Jules Verne ») : ambigu, donc non localisé. Le nom d'un établissement reste un indice,
 * pas une géolocalisation : aucune position d'élève n'est collectée.
 */
export type Etablissement={uai:string;nom:string;type:"L"|"C";commune:string;departementCode:string;departement:string;region:string;lat:number|null;lon:number|null};
export type AnnuaireFile={columns:string[];rows:(string|number|null)[][]};
export type Rattachement=Etablissement&{confiance:"exact"|"unique"};
export const normalize=(s:string)=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();
/** Mots qui ne distinguent pas un établissement d'un autre. */
const GENERIQUES=new Set(["LYCEE","LYCEES","COLLEGE","COLLEGES","GENERAL","GENERALE","GEN","TECHNOLOGIQUE","TECHNOL","TECHNO","TECHNOLOGIQ","PROFESSIONNEL","PROFESSIONNELLE","PROF","POLYVALENT","POLYVAL","POL","LPO","LGT","LEGT","LP","LG","LYP","LYC","LT","LEG","CLG","CO","SEP","EREA","CITE","SCOLAIRE","ENSEMBLE","INSTITUTION","INSTITUT","GROUPE","ETABLISSEMENT","REGIONAL","PRIVE","PRIVEE","PUBLIC","CATHOLIQUE","LAIQUE","SOUS","CONTRAT","ENSEIGNEMENT","METIERS","METIER","DES","DE","DU","D","L","LA","LE","LES","ET","A","AU","AUX","EN","SUR","ENS","INTERNATIONAL","INTERNATIONALE","HOTELIER","TOURISME","LYCEE","CAMPUS","PILOTE","INNOVANT","CLIMATIQUE","SPORTIF","IMAGE","SON","ANNEXE","SITE","SECTION"]);
const SYNONYMES:Record<string,string>={ST:"SAINT",STE:"SAINTE",ND:"NOTRE DAME"};
/** Les mots porteurs d'un nom, dans l'ordre. Un sigle d'une lettre suivi d'un point est laissé (« F. Mistral » garde « MISTRAL »). */
export function motsPorteurs(nom:string):string[]{const mots=normalize(nom).split(" ").filter(Boolean).map(m=>SYNONYMES[m]??m).join(" ").split(" ");const porteurs=mots.filter(m=>m.length>1&&!GENERIQUES.has(m)&&!/^\d+$/.test(m));return [...new Set(porteurs)];}
export type Annuaire={etablissements:Etablissement[];parMot:Map<string,number[]>;parUai:Map<string,number>};
/** Une « section d'enseignement professionnel » ou « adapté » est une annexe : même site, on préfère l'établissement principal. */
const estAnnexe=(e:Etablissement)=>/^SECTION /.test(normalize(e.nom));
/** Index en mémoire, construit une fois par processus. */
let cache:Annuaire|null=null;
export function construireAnnuaire(file:AnnuaireFile):Annuaire{if(cache)return cache;const etablissements=file.rows.map(r=>({uai:String(r[0]),nom:String(r[1]),type:r[2] as "L"|"C",commune:String(r[3]),departementCode:String(r[4]),departement:String(r[5]),region:String(r[6]),lat:r[7]===null?null:Number(r[7]),lon:r[8]===null?null:Number(r[8])}));const parMot=new Map<string,number[]>(),parUai=new Map<string,number>();etablissements.forEach((e,i)=>{parUai.set(e.uai,i);for(const m of motsPorteurs(e.nom)){const list=parMot.get(m)??[];list.push(i);parMot.set(m,list);}});cache={etablissements,parMot,parUai};return cache;}
/** Rattachement d'un nom d'établissement : exact (mêmes mots porteurs, un seul), unique (un seul établissement contient tous les mots du profil), sinon null. */
export function rattacher(nom:string|null|undefined,annuaire:Annuaire,uai?:string|null):Rattachement|null{
 if(uai){const i=annuaire.parUai.get(uai.trim().toUpperCase());if(i!==undefined)return {...annuaire.etablissements[i],confiance:"exact"};}
 const mots=motsPorteurs(nom??"");if(!mots.length)return null;
 // Candidats : les établissements qui contiennent le mot porteur le plus rare du profil.
 // Un mot absent de tous les noms (souvent une commune : « CANNES », « FRANQUEVILLE ») ne peut pas servir d'amorce.
 const connus=mots.filter(m=>annuaire.parMot.has(m));if(!connus.length)return null;
 // Amorce : le mot le plus rare, puis les suivants si le premier ne donne rien (« CANNES » existe dans deux noms, mais « Stanislas Cannes » n'en fait pas partie).
 const amorces=[...connus].sort((a,b)=>annuaire.parMot.get(a)!.length-annuaire.parMot.get(b)!.length);
 // La commune compte comme mot porteur du candidat : « STANISLAS CANNES », « GALILEE FRANQUEVILLE ST PIERRE ».
 let candidats:Etablissement[]=[];
 for(const amorce of amorces){candidats=annuaire.parMot.get(amorce)!.map(i=>annuaire.etablissements[i]).filter(e=>{const siens=new Set([...motsPorteurs(e.nom),...motsPorteurs(e.commune)]);return mots.every(m=>siens.has(m));});if(candidats.length)break;}
 if(!candidats.length)return null;
 const texte=normalize(nom??"");
 // Le nom complet, génériques compris, identique à celui de l'annuaire : c'est lui (« Campus Bougainville »).
 const identiques=candidats.filter(e=>normalize(e.nom)===texte);
 if(identiques.length===1)return {...identiques[0],confiance:"exact"};
 const genre=/COLLEGE|CLG|^CO /.test(texte)?"C":/LYC|LPO|LGT|LEGT|LP |LYP/.test(texte)?"L":null;
 const exacts=candidats.filter(e=>motsPorteurs(e.nom).length===mots.length);
 const choisir=(liste:Etablissement[],confiance:"exact"|"unique"):Rattachement|null=>{
  if(!liste.length)return null;
  if(liste.length===1)return {...liste[0],confiance};
  // Plusieurs entrées mais un seul site (le lycée, sa section professionnelle, le collège attenant) : rattaché.
  const sites=new Set(liste.map(e=>`${e.departementCode}|${normalize(e.commune)}`));
  if(sites.size===1){const tri=[...liste].sort((a,b)=>Number(estAnnexe(a))-Number(estAnnexe(b))||(genre?Number(b.type===genre)-Number(a.type===genre):0));return {...tri[0],confiance};}
  // Sinon un seul du bon genre (lycée ou collège) hors annexes, ou un seul site pour ce genre.
  if(genre){const duGenre=liste.filter(e=>e.type===genre&&!estAnnexe(e));if(duGenre.length===1)return {...duGenre[0],confiance};const sitesGenre=new Set(liste.filter(e=>e.type===genre).map(e=>`${e.departementCode}|${normalize(e.commune)}`));if(sitesGenre.size===1&&duGenre.length)return {...duGenre[0],confiance};}
  return null;
 };
 return choisir(exacts,"exact")??(exacts.length?null:choisir(candidats,"unique"));
}
