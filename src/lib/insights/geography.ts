import type { Profile } from "../views";
import { rattacher, motsPorteurs, normalize, type Annuaire, type Rattachement } from "./annuaire";
export { normalize };
export const isTestSchool=(s:string|null)=>/DEMO|SCIENCE FACTOR/.test(normalize(s??""));
/**
 * Dernier recours quand l'annuaire ne tranche pas : une ville ou un nom propre
 * régional dans le libellé. Donne une région, jamais un point.
 */
const rules:Record<string,string[]>={
 "Provence-Alpes-Côte d'Azur":["VENCE","VALBONNE","NICE","CANNES","ANTIBES","CAGNES","GRASSE","MENTON","TOULON","HYERES","DRAGUIGNAN","FREJUS","MARSEILLE","AIX EN PROVENCE","AVIGNON","ARLES","GAP","DIGNE"],
 "Occitanie":["NIMES","MONTPELLIER","TOULOUSE","ALBI","TARBES","MONTAUBAN","RODEZ","CAHORS","AUCH","FOIX","PERPIGNAN","CARCASSONNE","BEZIERS","MENDE"],
 "Nouvelle-Aquitaine":["BORDEAUX","PAU","BAYONNE","PERIGUEUX","AGEN","MONT DE MARSAN","LIMOGES","BRIVE","TULLE","GUERET","POITIERS","LA ROCHELLE","NIORT","ANGOULEME"],
 "Martinique":["MARTINIQUE","TRINITE","FORT DE FRANCE"],"Guadeloupe":["GUADELOUPE","POINTE A PITRE","BASSE TERRE"],"La Réunion":["REUNION"],"Guyane":["GUYANE","CAYENNE","KOUROU"],"Mayotte":["MAYOTTE","MAMOUDZOU"],
 "Île-de-France":["PARIS","VERSAILLES","CRETEIL","NANTERRE","CERGY","EVRY","PONTOISE","BOBIGNY","MELUN","MEAUX","SAINT GERMAIN EN LAYE"],
 "Auvergne-Rhône-Alpes":["LYON","GRENOBLE","ANNECY","CHAMBERY","VALENCE","PRIVAS","SAINT ETIENNE","BOURG EN BRESSE","CLERMONT","AURILLAC","MOULINS","LE PUY"],
 "Hauts-de-France":["LILLE","AMIENS","ROUBAIX","ARRAS","DUNKERQUE","CALAIS","BEAUVAIS","LAON","SAINT QUENTIN"],
 "Grand Est":["STRASBOURG","NANCY","METZ","REIMS","TROYES","CHALONS","CHARLEVILLE","CHAUMONT","COLMAR","MULHOUSE","EPINAL","BAR LE DUC"],
 "Bretagne":["RENNES","BREST","QUIMPER","VANNES","LORIENT","SAINT BRIEUC"],"Pays de la Loire":["NANTES","ANGERS","LE MANS","LAVAL","LA ROCHE SUR YON"],
 "Normandie":["ROUEN","CAEN","LE HAVRE","EVREUX","ALENCON","CHERBOURG","SAINT LO"],"Bourgogne-Franche-Comté":["DIJON","BESANCON","BELFORT","AUXERRE","NEVERS","MACON","LONS LE SAUNIER","VESOUL"],
 "Centre-Val de Loire":["ORLEANS","TOURS","BLOIS","BOURGES","CHARTRES","CHATEAUROUX"],"Corse":["CORSE","AJACCIO","BASTIA"],
};
export function locateSchool(s:string|null){if(!s||isTestSchool(s))return null;const text=` ${normalize(s)} `;const matches=Object.entries(rules).filter(([,terms])=>terms.some(term=>text.includes(` ${term} `))).map(([region])=>region);return matches.length===1?matches[0]:null;}
export type Confiance="exact"|"unique"|"estime"|null;
export type Raison="non renseigné"|"ambigu"|"absent"|null;
export type School={key:string;school:string;region:string|null;count:number;commune:string|null;departement:string|null;departementCode:string|null;uai:string|null;lat:number|null;lon:number|null;confiance:Confiance;raison:Raison;nomOfficiel:string|null};
/** Rattachements posés à la main pour les noms que l'annuaire ne tranche pas (nom tel qu'il arrive de l'ENT → UAI). */
export type Manuels=Record<string,string>;
/** Clé d'un établissement : son UAI quand l'app l'a remonté, sinon son nom. Deux « Marie Curie » d'UAI différents restent deux établissements. */
export const schoolKey=(p:Pick<Profile,"school_name"|"school_uai">)=>p.school_uai||p.school_name||"Établissement non renseigné";
export function resolveSchool(name:string|null,annuaire:Annuaire|null,manuels:Manuels={},uai:string|null=null):Omit<School,"key"|"school"|"count">{
 if(uai&&annuaire){const r=rattacher(null,annuaire,uai);if(r)return {region:r.region,commune:r.commune,departement:r.departement,departementCode:r.departementCode,uai:r.uai,lat:r.lat,lon:r.lon,confiance:"exact",raison:null,nomOfficiel:r.nom};}
 if(!name)return {region:null,commune:null,departement:null,departementCode:null,uai:null,lat:null,lon:null,confiance:null,raison:"non renseigné",nomOfficiel:null};
 const manuel=Object.entries(manuels).find(([k])=>normalize(k)===normalize(name))?.[1];
 const r:Rattachement|null=annuaire?rattacher(name,annuaire,manuel):null;
 if(r)return {region:r.region,commune:r.commune,departement:r.departement,departementCode:r.departementCode,uai:r.uai,lat:r.lat,lon:r.lon,confiance:r.confiance,raison:null,nomOfficiel:r.nom};
 const region=locateSchool(name);
 const mots=motsPorteurs(name);
 const raison:Raison=!mots.length||!mots.some(m=>annuaire?.parMot.has(m))?"absent":"ambigu";
 return {region,commune:null,departement:null,departementCode:null,uai:null,lat:null,lon:null,confiance:region?"estime":null,raison,nomOfficiel:null};
}
export function geography(profiles:Profile[],annuaire:Annuaire|null=null,manuels:Manuels={}){
 const pupils=profiles.filter(p=>!isTestSchool(p.school_name));
 const schools=new Map<string,School>();
 for(const p of pupils){const key=schoolKey(p);const item=schools.get(key)??{key,school:p.school_name||"Établissement non renseigné",count:0,...resolveSchool(p.school_name,annuaire,manuels,p.school_uai??null)};item.count++;schools.set(key,item);}
 const list=[...schools.values()].sort((a,b)=>b.count-a.count);
 const located=(s:School)=>s.region!==null;
 return {total:pupils.length,excluded:profiles.length-pupils.length,schools:list,unlocated:pupils.filter(p=>!located(schools.get(schoolKey(p))!)),
  pointed:list.filter(s=>s.lat!==null).reduce((n,s)=>n+s.count,0),precise:list.filter(s=>s.confiance==="exact"||s.confiance==="unique").reduce((n,s)=>n+s.count,0)};
}
