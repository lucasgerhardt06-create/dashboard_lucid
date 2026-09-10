import type { ViewMap } from "../views";

// Fixed reference date: screenshots and tests do not change with the clock.
export const FIXTURE_DATE = "2026-09-10";
export const days = Array.from({length:30},(_,i)=>new Date(Date.UTC(2026,7,12+i)).toISOString().slice(0,10));
const last = `${FIXTURE_DATE}T18:00:00Z`;
const pct = (n:number,d:number)=>d?100*n/d:0;
const schools = ["Lycée Henri Matisse Vence", "Lycée international Valbonne", "Lycée Renoir Cagnes-sur-Mer", "Lycée Masséna Nice", "Lycée Jules Verne", "Lycée de Bordeaux", "Lycée Frantz Fanon Martinique", "Établissement non renseigné"];
const profiles = ():ViewMap["profiles"][]=>Array.from({length:40},(_,i)=>({id:`fixture-${i}`,level:1+i%9,xp:120+i*37,streak:i%12,school_name:schools[Math.floor(i/5)],class_name:["Seconde","Première","Terminale"][i%3],last_seen:last,platform:i%3?"ios":"android"}));
const onboarding = ():ViewMap["v_onboarding"][]=>days.map((jour,i)=>({jour,arrivees:2,confidentialite:i<27?2:1,service_choisi:i<23?2:1,demo:i<12?1:0,connexion_envoyee:i<14?2:1,au_moins_un_echec:i%7===0?1:0,compte_ajoute:i<10?2:1,conversion_pct:i<10?100:50,demo_puis_ent_pct:i<12?50:0}));
const ai = ():ViewMap["v_ai_pouls"][]=>days.map((jour,i)=>{const requetes=12+i%9;const refus=i%3===0?1:0;return {jour,requetes,ok:requetes-refus,partiels:0,echecs:0,servis_sans_cout:5,servis_cache:2,rejoues:0,rembourses:0,eleves:6+i%5,tokens_in:requetes*310,tokens_out:requetes*190,cout_usd_estime:(requetes-5)*0.004,latence_p50_ms:1200+i*13,latence_p95_ms:3500+i*21,rejets_hors_sujet:0,rejets_sans_reponse:0,items_servis:(requetes-refus)*5,refus};});
const gamification = ():ViewMap["v_gamification"][]=>days.map((jour,i)=>({jour,efforts:16+i%12,eleves_effort:8+i%9,journees_validees:6+i%7,jalons:i%3,reparations:i%2,series_rompues:i%4===0?1:0,badges:i%3,niveaux:i%2,cap_vus:10,cap_ouverts:6}));
const notifications = ():ViewMap["v_notifs_efficacite"][]=>days.flatMap(jour=>[8,18].map(h=>({jour,type:"Rappel de révision",heure_prevue:`${h}:00`,planifiees:10,destinataires:10,ouvertes:h===18?4:2,ouverture_pct:h===18?40:20})));
export const fixtures: {[K in keyof ViewMap]:()=>ViewMap[K][]} = {
  profile_detail:()=>profiles().map(p=>({...p,full_name:"Élève fictif",usage_limits:{quiz:10}})),
  daily_xp:()=>profiles().flatMap(p=>days.map((date,i)=>({profile_id:p.id,date,amount:20+i%4*10}))),
  gamification_efforts:()=>profiles().map(p=>({profile_id:p.id,day_key:FIXTURE_DATE,kind:"Quiz terminé",xp:20})),
  user_badges:()=>profiles().map(p=>({profile_id:p.id,badge_id:"premier-quiz"})),
  profiles,
  profiles_public:()=>profiles().map(({id,level,xp,streak,last_seen,platform},i)=>({id,level,xp,streak,last_seen,platform,display_name:`${["Lune","Nova","Étoile","Comète","Orion"][i%5]} ${i+1}`})),
  friendships:()=>[...Array.from({length:17},(_,i)=>[i,i+1]),[0,5],[3,10],...Array.from({length:11},(_,i)=>[18+i,19+i]),[18,23]].map(([a,b])=>({user_id:`fixture-${a}`,friend_id:`fixture-${b}`,status:"accepted",created_at:last})),
  v_pouls:()=>[{actifs_aujourdhui:14,actifs_7j:32,actifs_30j:40,nouveaux_aujourdhui:1,nouveaux_7j:7,north_star_3j:9,north_star_pct:28.125,dau_mau_pct:35,sessions_7j:168,ecrans_par_jour_actif:8.5,activation_ia_pct:62.5,echecs_24h:1,erreurs_24h:0,installs_7j:14,demos_7j:0,onboarding_pct_7j:50}],
  v_retention:()=>["2026-08-10","2026-08-17","2026-08-24","2026-08-31","2026-09-07"].map((cohorte,i)=>({cohorte,eleves:8,j1_pct:75-i*12.5,j7_pct:i<4?50-i*12.5:null,j30_pct:null})),
  v_versions:()=>[{app_version:"1.3.0",platform:"ios",evenements:1240,eleves:26,depuis:days[0]},{app_version:"1.3.0",platform:"android",evenements:810,eleves:14,depuis:days[0]}],
  v_demarrage:()=>["iPhone 13","Pixel 7"].map((appareil,i)=>({appareil,platform:i?"android":"ios",app_version:"1.3.0",lancements:40+i*5,p50_ms:680+i*200,p95_ms:1400+i*800})),
  v_ecrans:()=>["Accueil","Devoirs","Quiz","Cours","Amis"].map((ecran,i)=>({ecran,vues:320-i*55,eleves:32-i*4,duree_moy_ecran_precedent_s:24+i*8})),
  v_sorties:()=>["Connexion Pronote","Quiz","Devoirs"].map((ecran,i)=>({ecran,sorties:30-i*8,personnes:15-i*3,mediane_s_sur_ecran:40+i*10})),
  v_demo:()=>days.map((jour,i)=>({jour,platform:"ios",demos:i<12?1:0,ecrans_moyen:i<12?4:0,ont_fait_un_quiz:i<8?1:0,quiz_termines:i<6?1:0,sorties_explicites:i<4?1:0,convertis:i<6?1:0,conversion_pct:i<6?100:0,dernier:jour})),
  v_demo_fuites:()=>[], v_evenements_inconnus:()=>[],
  v_onboarding:onboarding,
  v_onboarding_abandons:()=>[["0. bienvenue",3],["1. confidentialité",4],["5. écran de connexion vu",9],["6. connexion envoyée",4]].map(([derniere_etape,installs])=>({derniere_etape:String(derniere_etape),service:"Pronote",platform:"ios",installs:Number(installs),dernier:last})),
  v_onboarding_echecs:()=>["Identifiants incorrects","Double authentification"].map((motif,i)=>({service:"Pronote",motif,origine:"Connexion",app_version:"1.3.0",platform:"ios",n:3-i,installs:3-i,dernier:last})),
  v_activation:()=>onboarding().map(r=>({jour:r.jour,service:"Pronote",comptes:r.compte_ajoute,ont_vu_leurs_donnees:r.compte_ajoute,donnees_pct:100,mediane_s_avant_donnees:12,sync_en_echec:0,ont_vu_un_ecran_vide:0,ont_touche_ia_j0:1,ont_valide_j0:1,ont_accepte_notifs:1})),
  v_services:()=>["Pronote","ÉcoleDirecte","Skolengo"].map((service,i)=>({service,actifs_7j:[24,6,2][i],actifs_30j:[30,8,2][i],syncs_ok_7j:[190,28,3][i],syncs_ko_7j:[10,2,1][i],echec_pct_7j:[5,100*2/30,25][i],sync_mediane_ms:800+i*500,motif_principal:["Session expirée","Réseau indisponible","Service indisponible"][i]})),
  v_ai_pouls:ai,
  v_ai_pouls_routes:()=>ai().map(r=>({jour:r.jour,requetes:r.requetes,depuis_le_cours:r.requetes-7-r.refus,depuis_le_programme:2,depuis_la_banque:3,mutualisees:2,refus_contexte_mince:r.refus,part_programme_pct:pct(2,r.requetes)})),
  v_ia:()=>[{tache:"Quiz",moteur:"Serveur",requetes:120,personnes:20,ok_pct:95,p50_ms:1400,p95_ms:3900,motif_principal:"Contexte insuffisant"}],
  v_ia_locale:()=>[{modele:"Modèle embarqué",moteur:"Local",appareil:"iPhone 15",generations:18,personnes:4,tok_s_p50:23,prefill_p50:120,duree_p50_ms:2700}],
  v_ia_entonnoir:()=>[{tache:"Quiz",moteur:"Serveur",demandes:180,reussies:174,suivies_d_un_lancement:140,suivies_d_une_fin:112,suivies_d_un_avis:32,taux_d_usage_pct:100*140/174}],
  v_ai_quality:()=>["Cours","Programme","Banque"].map((route,i)=>({route,model:"Modèle serveur",prompt_version:"v1",quiz_servis:60,votes:10,likes:9-i,pct_likes:90-i*10,votes_avec_signalement:i,score_moyen:4.5-i*0.5})),
  v_ai_bank_health:()=>["Équations du second degré","La cellule","La Révolution française"].map((title,i)=>({id:`bank-${i}`,level:"Seconde",subject_canon:["Mathématiques","SVT","Histoire"][i],topic_slug:`theme-${i}`,title,source:"Équipe LUCID",published:i<2,quality:5-i,fois_servi:30-i*10,votes:10,pct_likes:90-i*10,signalements:i,questions_signalees:i?[`q-${i}`]:[]})),
  v_ai_bank_questions:()=>[{bank_id:"bank-1",level:"Seconde",subject_canon:"SVT",topic_slug:"theme-1",title:"La cellule",published:true,question_id:"q-1",eleves_signalants:1,chapitre_servi:"La cellule",taux_signalement:5,dernier_signalement:last}],
  v_ai_cache:()=>[{task:"Quiz",level:"Seconde",subject_canon:"Mathématiques",entrees:18,reutilisations:42,mutualisation_moyenne:2.33,jamais_reutilise:4,derniere_reutilisation:last}],
  v_ai_repeats:()=>[{subject_id:"Matière anonymisée",content_key:"Contenu A",fois_servi:3,chemins:["Banque","Cache"],premier:days[0],dernier:last}],
  v_ai_options:()=>ai().map(r=>({jour:r.jour,quiz_servis:r.ok,generations_mesurees:r.ok-5,modele_moins_de_4:1,modele_pile_ou_face:0,fusionnees_par_nous:1,servies_moins_de_4:0,reponse_la_plus_longue:2,repetitions:0,items_servis:r.items_servis})),
  v_ai_themes:()=>[{slug:"polynômes",occurrences:8,derniere_fois:last,connu_en_banque:false},{slug:"cellule",occurrences:12,derniere_fois:last,connu_en_banque:true}],
  v_ai_rebond:()=>ai().map(r=>({jour:r.jour,refus_contexte_mince:r.refus,suivis_d_un_quiz:0,rebonds_vers_la_banque:0,rebonds_vers_generation:0,taux_rebond:0})),
  v_gamification:gamification,
  v_efforts:()=>["Quiz terminé","Fiche révisée","Devoir travaillé"].map((kind,i)=>({kind,n:[240,240,147][i],eleves:30-i*5,xp_moyen:20-i*5,valide_journee_pct:80-i*10})),
  v_notifs:()=>[{notif_type:"Rappel de révision",planifiees:600,eleves_planifies:30,ouvertes:180,converties:90,conversion_pct:15}],
  v_notifs_efficacite:notifications,
  v_notif_permissions:()=>[{statut:"Autorisées",personnes:30},{statut:"Refusées",personnes:8},{statut:"Non demandées",personnes:2}],
  v_social:()=>[{event_name:"Amitié acceptée",n:31,personnes:30,dernier:last},{event_name:"Encouragement envoyé",n:42,personnes:18,dernier:last}],
  v_alertes:()=>["Pannes IA","Échecs de connexion","Crashs fatals","Fuites démo","Événements inconnus","Syncs en échec","Coût IA","Refus IA","Arrêts brutaux","Instrumentation","Production"].map((indicateur,i)=>({indicateur,valeur:[0,1,0,0,0,6,0.06,0,0,1,0][i],seuil:[1,5,1,1,1,5,2,10,3,1,1][i],etat:i===5?"à regarder":i===10?"pour mémoire":"calme"})),
  v_crashs:()=>[{event_name:"Erreur interface",app_version:"1.3.0",platform:"android",erreur:"Échec de rendu",identifiant_fautif:"Quiz",motif:"Ressource absente",ecran:"Quiz",gravite:"frontiere",n:2,personnes:2,dernier:last}],
  v_morts_brutales:()=>days.slice(-14).map((jour,i)=>({jour,app_version:"1.3.0",platform:"android",origine:"Système",n:i%5===0?1:0,appareils:i%5===0?1:0,session_mediane_s:180})),
  v_echecs:()=>[{event_name:"Synchronisation échouée",app_version:"1.3.0",platform:"ios",n:8,eleves:4,dernier_jour:FIXTURE_DATE}],
  v_echecs_detail:()=>[{event_name:"Synchronisation échouée",module:"Pronote",motif:"Session expirée",app_version:"1.3.0",platform:"ios",n:4,eleves:3,dernier:last}],
  v_sante_instrumentation:()=>[{famille:"IA",evenement:"Quiz terminé",n_14j:112,dernier:last,etat:"vivant",description:"Le quiz est terminé"},{famille:"Social",evenement:"Invitation refusée",n_14j:0,dernier:"",etat:"jamais vu",description:"Refus d’une invitation"}],
  v_feedbacks_support:()=>[{created_at:last,ref:"APERÇU-001",type:"Problème",content:"La connexion à mon établissement a expiré.",app_version:"1.3.0",build:"1",ota:"stable",platform:"ios",os_version:"18",model:"iPhone 13",ent_service:"Pronote",was_online:true,pending_writes:0,user_id:"fixture-1"}],
  lucid_posts:()=>[{id:"post-fiction",kind:"news",status:"draft",title:"Bienvenue dans LUCID",author_name:"L’équipe LUCID",pinned:false,publish_at:null,expires_at:null,push_sent_at:null,created_at:last}],
  lucid_staff:()=>[{profile_id:"staff-fiction",label:"Équipe fictive",added_at:last}],
  app_config:()=>[{key:"maintenance_mode",value:"false"},{key:"ai_flags",value:'{"kill_switch":false,"bank":true}'}],
  app_banners:()=>[{id:"banner-fiction",title:"Bienvenue",body:"Une nouvelle année commence",active:true}],
};
