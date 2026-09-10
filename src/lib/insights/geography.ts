import type { Profile } from "../views";
export const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();
export const isTestSchool=(s:string|null)=>/DEMO|SCIENCE FACTOR/.test(normalize(s??""));
const rules:Record<string,string[]>={
 "Provence-Alpes-Côte d'Azur":["VENCE","VALBONNE","RENOIR","JULES VERNE","NICE","CANNES","ANTIBES","AUGIER","CAGNES","GRASSE","MENTON","TOULON","HYERES","DRAGUIGNAN","FREJUS","MARSEILLE","AIX EN PROVENCE","AVIGNON","ARLES","GAP","DIGNE"],
 "Occitanie":["NIMES","MONTPELLIER","JEAN MONNET","TOULOUSE","ALBI","TARBES","MONTAUBAN","RODEZ","CAHORS","AUCH","FOIX","PERPIGNAN","CARCASSONNE","BEZIERS","MENDE"],
 "Nouvelle-Aquitaine":["SUPERVIELLE","BORDEAUX","PAU","BAYONNE","PERIGUEUX","AGEN","MONT DE MARSAN","LIMOGES","BRIVE","TULLE","GUERET","POITIERS","LA ROCHELLE","NIORT","ANGOULEME"],
 "Martinique":["FANON","MARTINIQUE","TRINITE","FORT DE FRANCE"],"Guadeloupe":["GUADELOUPE","POINTE A PITRE","BASSE TERRE"],"La Réunion":["REUNION","DIMITILE","PARNY"],"Guyane":["GUYANE","CAYENNE","KOUROU"],"Mayotte":["MAYOTTE","MAMOUDZOU"],
 "Île-de-France":["PARIS","VERSAILLES","CRETEIL","MANOUCHIAN","CLAUDEL","NANTERRE","CERGY","EVRY","PONTOISE","BOBIGNY","MELUN","MEAUX","SAINT GERMAIN EN LAYE"],
 "Auvergne-Rhône-Alpes":["LYON","GRENOBLE","ANNECY","CHAMBERY","VALENCE","PRIVAS","SAINT ETIENNE","BOURG EN BRESSE","CLERMONT","AURILLAC","MOULINS","LE PUY"],
 "Hauts-de-France":["LILLE","AMIENS","ROUBAIX","PONTHIEU","ARRAS","DUNKERQUE","CALAIS","BEAUVAIS","LAON","SAINT QUENTIN"],
 "Grand Est":["STRASBOURG","NANCY","METZ","REIMS","TROYES","CHALONS","CHARLEVILLE","CHAUMONT","COLMAR","MULHOUSE","EPINAL","BAR LE DUC"],
 "Bretagne":["RENNES","BREST","QUIMPER","VANNES","LORIENT","SAINT BRIEUC"],"Pays de la Loire":["NANTES","ANGERS","LE MANS","LAVAL","LA ROCHE SUR YON"],
 "Normandie":["ROUEN","CAEN","LE HAVRE","EVREUX","ALENCON","CHERBOURG","SAINT LO"],"Bourgogne-Franche-Comté":["DIJON","BESANCON","BELFORT","AUXERRE","NEVERS","MACON","LONS LE SAUNIER","VESOUL"],
 "Centre-Val de Loire":["ORLEANS","TOURS","BLOIS","BOURGES","CHARTRES","CHATEAUROUX"],"Corse":["CORSE","AJACCIO","BASTIA"],
};
export function locateSchool(s:string|null){if(!s||isTestSchool(s))return null;const text=` ${normalize(s)} `;const matches=Object.entries(rules).filter(([,terms])=>terms.some(term=>text.includes(` ${term} `))).map(([region])=>region);return matches.length===1?matches[0]:null;}
export function geography(profiles:Profile[]){const pupils=profiles.filter(p=>!isTestSchool(p.school_name));const schools=new Map<string,{school:string;region:string|null;count:number}>();for(const p of pupils){const school=p.school_name||"Établissement non renseigné";const item=schools.get(school)??{school,region:locateSchool(p.school_name),count:0};item.count++;schools.set(school,item);}return {total:pupils.length,excluded:profiles.length-pupils.length,schools:[...schools.values()].sort((a,b)=>b.count-a.count),unlocated:pupils.filter(p=>!locateSchool(p.school_name))};}
