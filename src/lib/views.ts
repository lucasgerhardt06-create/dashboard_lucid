import { fixtures } from "@/lib/fixtures";
import { requireDashboardSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Scalar = string | number | boolean | null;
export interface Pouls { actifs_aujourdhui:number; actifs_7j:number; actifs_30j:number; nouveaux_aujourdhui:number; nouveaux_7j:number; north_star_3j:number; north_star_pct:number; dau_mau_pct:number; sessions_7j:number; ecrans_par_jour_actif:number; activation_ia_pct:number; echecs_24h:number; erreurs_24h:number; installs_7j:number; demos_7j:number; onboarding_pct_7j:number }
export interface Retention { cohorte:string; eleves:number; j1_pct:number|null; j7_pct:number|null; j30_pct:number|null }
export interface Versions { app_version:string; platform:string; evenements:number; eleves:number; depuis:string }
export interface Demarrage { appareil:string; platform:string; app_version:string; lancements:number; p50_ms:number; p95_ms:number }
export interface Ecrans { ecran:string; vues:number; eleves:number; duree_moy_ecran_precedent_s:number }
export interface Sorties { ecran:string; sorties:number; personnes:number; mediane_s_sur_ecran:number }
export interface Demo { jour:string; platform:string; demos:number; ecrans_moyen:number; ont_fait_un_quiz:number; quiz_termines:number; sorties_explicites:number; convertis:number; conversion_pct:number; dernier:string }
export interface DemoFuites { famille:string; app_version:string; platform:string; n:number; installs:number; dernier:string }
export interface Onboarding { jour:string; arrivees:number; confidentialite:number; service_choisi:number; demo:number; connexion_envoyee:number; au_moins_un_echec:number; compte_ajoute:number; conversion_pct:number; demo_puis_ent_pct:number }
export interface OnboardingAbandons { derniere_etape:string; service:string; platform:string; installs:number; dernier:string }
export interface OnboardingEchecs { service:string; motif:string; origine:string; app_version:string; platform:string; n:number; installs:number; dernier:string }
export interface Activation { jour:string; service:string; comptes:number; ont_vu_leurs_donnees:number; donnees_pct:number; mediane_s_avant_donnees:number; sync_en_echec:number; ont_vu_un_ecran_vide:number; ont_touche_ia_j0:number; ont_valide_j0:number; ont_accepte_notifs:number }
export interface Services { service:string; actifs_7j:number; actifs_30j:number; syncs_ok_7j:number; syncs_ko_7j:number; echec_pct_7j:number; sync_mediane_ms:number; motif_principal:string }
export interface AiPouls { jour:string; requetes:number; ok:number; partiels:number; echecs:number; servis_sans_cout:number; servis_cache:number; rejoues:number; rembourses:number; eleves:number; tokens_in:number; tokens_out:number; cout_usd_estime:number; latence_p50_ms:number; latence_p95_ms:number; rejets_hors_sujet:number; rejets_sans_reponse:number; items_servis:number; refus:number }
export interface AiPoulsRoutes { jour:string; requetes:number; depuis_le_cours:number; depuis_le_programme:number; depuis_la_banque:number; mutualisees:number; refus_contexte_mince:number; part_programme_pct:number }
export interface Ia { tache:string; moteur:string; requetes:number; personnes:number; ok_pct:number; p50_ms:number; p95_ms:number; motif_principal:string }
export interface IaLocale { modele:string; moteur:string; appareil:string; generations:number; personnes:number; tok_s_p50:number; prefill_p50:number; duree_p50_ms:number }
export interface IaEntonnoir { tache:string; moteur:string; demandes:number; reussies:number; suivies_d_un_lancement:number; suivies_d_une_fin:number; suivies_d_un_avis:number; taux_d_usage_pct:number }
export interface AiQuality { route:string; model:string; prompt_version:string; quiz_servis:number; votes:number; likes:number; pct_likes:number; votes_avec_signalement:number; score_moyen:number }
export interface AiBankHealth { id:string; level:string; subject_canon:string; topic_slug:string; title:string; source:string; published:boolean; quality:number; fois_servi:number; votes:number; pct_likes:number; signalements:number; questions_signalees:string[] }
export interface AiBankQuestions { bank_id:string; level:string; subject_canon:string; topic_slug:string; title:string; published:boolean; question_id:string; eleves_signalants:number; chapitre_servi:string; taux_signalement:number; dernier_signalement:string }
export interface AiCache { task:string; level:string; subject_canon:string; entrees:number; reutilisations:number; mutualisation_moyenne:number; jamais_reutilise:number; derniere_reutilisation:string }
export interface AiRepeats { subject_id:string; content_key:string; fois_servi:number; chemins:string[]; premier:string; dernier:string }
export interface AiOptions { jour:string; quiz_servis:number; generations_mesurees:number; modele_moins_de_4:number; modele_pile_ou_face:number; fusionnees_par_nous:number; servies_moins_de_4:number; reponse_la_plus_longue:number; repetitions:number; items_servis:number }
export interface AiThemes { slug:string; occurrences:number; derniere_fois:string; connu_en_banque:boolean }
export interface AiRebond { jour:string; refus_contexte_mince:number; suivis_d_un_quiz:number; rebonds_vers_la_banque:number; rebonds_vers_generation:number; taux_rebond:number }
export interface Gamification { jour:string; efforts:number; eleves_effort:number; journees_validees:number; jalons:number; reparations:number; series_rompues:number; badges:number; niveaux:number; cap_vus:number; cap_ouverts:number }
export interface Efforts { kind:string; n:number; eleves:number; xp_moyen:number; valide_journee_pct:number }
export interface Notifs { notif_type:string; planifiees:number; eleves_planifies:number; ouvertes:number; converties:number; conversion_pct:number }
export interface NotifsEfficacite { jour:string; type:string; heure_prevue:string; planifiees:number; destinataires:number; ouvertes:number; ouverture_pct:number }
export interface NotifPermissions { statut:string; personnes:number }
export interface Social { event_name:string; n:number; personnes:number; dernier:string }
export interface Alertes { indicateur:string; valeur:string | number; seuil:string | number; etat:"calme"|"à regarder"|"pour mémoire"|"aucune donnée de production" }
export interface Crashs { event_name:string; app_version:string; platform:string; erreur:string; identifiant_fautif:string; motif:string; ecran:string; gravite:"frontiere"|"fatal"|"rejet"; n:number; personnes:number; dernier:string }
export interface MortsBrutales { jour:string; app_version:string; platform:string; origine:string; n:number; appareils:number; session_mediane_s:number }
export interface Echecs { event_name:string; app_version:string; platform:string; n:number; eleves:number; dernier_jour:string }
export interface EchecsDetail { event_name:string; module:string; motif:string; app_version:string; platform:string; n:number; eleves:number; dernier:string }
export interface EvenementsInconnus { event_name:string; n:number; app_version:string; dernier:string }
export interface SanteInstrumentation { famille:string; evenement:string; n_14j:number; dernier:string; etat:"jamais vu"|"anecdotique"|"vivant"; description:string }
export interface FeedbackSupport { created_at:string; ref:string; type:string; content:string; app_version:string; build:string; ota:string; platform:string; os_version:string; model:string; ent_service:string; was_online:boolean; pending_writes:number; user_id:string }

export interface Profile { id:string; level:number|null; xp:number; streak:number; school_name:string|null; class_name:string|null; last_seen:string|null; platform:string|null }
export interface PublicProfile { id:string; display_name:string|null; level:number|null; xp:number; streak:number; last_seen:string|null; platform:string|null }
export interface Friendship { user_id:string; friend_id:string; status:string; created_at:string }
export interface Post { id:string; kind:string; status:string; title:string; author_name:string; pinned:boolean; publish_at:string|null; expires_at:string|null; push_sent_at:string|null; created_at:string }
export interface Staff { profile_id:string; label:string; added_at:string }
export interface Config { key:string; value:string }
export interface Banner { id:string; title:string; body:string; active:boolean }
export interface ProfileDetail extends Profile { full_name:string|null; usage_limits:Record<string,unknown>|null }
export interface DailyXp { profile_id:string; date:string; amount:number }
export interface PupilEffort { profile_id:string; day_key:string; kind:string; xp:number }
export interface PupilBadge { profile_id:string; badge_id:string }
export interface ViewMap {
  profile_detail:ProfileDetail; daily_xp:DailyXp; gamification_efforts:PupilEffort; user_badges:PupilBadge;
  profiles:Profile; profiles_public:PublicProfile; friendships:Friendship; lucid_posts:Post; lucid_staff:Staff; app_config:Config; app_banners:Banner;
  v_pouls:Pouls; v_retention:Retention; v_versions:Versions; v_demarrage:Demarrage; v_ecrans:Ecrans; v_sorties:Sorties; v_demo:Demo; v_demo_fuites:DemoFuites;
  v_onboarding:Onboarding; v_onboarding_abandons:OnboardingAbandons; v_onboarding_echecs:OnboardingEchecs; v_activation:Activation; v_services:Services;
  v_ai_pouls:AiPouls; v_ai_pouls_routes:AiPoulsRoutes; v_ia:Ia; v_ia_locale:IaLocale; v_ia_entonnoir:IaEntonnoir; v_ai_quality:AiQuality; v_ai_bank_health:AiBankHealth; v_ai_bank_questions:AiBankQuestions; v_ai_cache:AiCache; v_ai_repeats:AiRepeats; v_ai_options:AiOptions; v_ai_themes:AiThemes; v_ai_rebond:AiRebond;
  v_gamification:Gamification; v_efforts:Efforts; v_notifs:Notifs; v_notifs_efficacite:NotifsEfficacite; v_notif_permissions:NotifPermissions; v_social:Social;
  v_alertes:Alertes; v_crashs:Crashs; v_morts_brutales:MortsBrutales; v_echecs:Echecs; v_echecs_detail:EchecsDetail; v_evenements_inconnus:EvenementsInconnus; v_sante_instrumentation:SanteInstrumentation; v_feedbacks_support:FeedbackSupport;
}
export type ViewName = keyof ViewMap;
export type ViewResult<T> = { data:T[]; error:boolean };
const tableColumns:Partial<Record<ViewName,string>> = {
  profile_detail:"id,full_name,level,xp,streak,school_name,class_name,last_seen,platform,usage_limits",
  daily_xp:"profile_id,date,amount", gamification_efforts:"profile_id,day_key,kind,xp", user_badges:"profile_id,badge_id",
  profiles:"id,level,xp,streak,school_name,class_name,last_seen,platform",
  profiles_public:"id,display_name,level,xp,streak,last_seen,platform",
  friendships:"user_id,friend_id,status,created_at",
  lucid_posts:"id,kind,status,title,author_name,pinned,publish_at,expires_at,push_sent_at,created_at",
  lucid_staff:"profile_id,label,added_at", app_config:"key,value", app_banners:"id,title,body,active",
};
export async function readView<N extends ViewName>(name:N, options?: { preview?:boolean; profileId?:string; limit?:number; order?:string; ascending?:boolean }): Promise<ViewResult<ViewMap[N]>> {
  // Preview never bypasses authentication, including in production.
  await requireDashboardSession();
  if (["profile_detail","daily_xp","gamification_efforts","user_badges"].includes(name)&&!options?.profileId) throw new Error("Lecture individuelle : identifiant requis.");
  if (options?.preview) {
    let rows = fixtures[name]() as ViewMap[N][];
    if(options.profileId) rows=rows.filter(row=>{const r=row as unknown as Record<string,unknown>;return name==="friendships"?r.user_id===options.profileId||r.friend_id===options.profileId:(r.id??r.profile_id)===options.profileId;});
    if(options.order) { const key=options.order as keyof ViewMap[N]; rows=[...rows].sort((a,b)=>String(a[key]).localeCompare(String(b[key]))*(options.ascending?1:-1)); }
    return {data: options.limit ? rows.slice(0,options.limit) : rows, error:false};
  }
  try {
    const rows:ViewMap[N][]=[];
    const size=1000;
    for(let offset=0;;offset+=size) {
      let query=supabaseAdmin.from(name==="profile_detail"?"profiles":name).select(tableColumns[name] ?? "*");
      if(name==="friendships") query=query.eq("status","accepted");
      if(options?.profileId){ if(name==="friendships") { if(!/^[a-zA-Z0-9-]+$/.test(options.profileId)) throw new Error("Identifiant invalide"); query=query.or(`user_id.eq.${options.profileId},friend_id.eq.${options.profileId}`); } else query=query.eq(name==="profile_detail"?"id":"profile_id",options.profileId); }
      if(options?.order) query=query.order(options.order,{ascending:options.ascending??false});
      else if(name==="profiles"||name==="profiles_public"||name==="friendships") query=query.order(name==="friendships"?"user_id":"id");
      const end=options?.limit ? Math.min(offset+size,options.limit)-1 : offset+size-1;
      const {data,error}=await query.range(offset,end);
      if(error) throw error;
      rows.push(...(data??[]) as ViewMap[N][]);
      if(!data||data.length<size||(options?.limit&&rows.length>=options.limit)) break;
    }
    return {data:rows,error:false};
  } catch(error) {
    console.error("Lecture Supabase impossible", {vue:name,message:error instanceof Error?error.message:"Requête refusée"});
    return {data:[],error:true};
  }
}
export function formatValue(value: Scalar | string[]) {
  if (value === null || value === undefined) return "Non renseigné";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  const labels:Record<string,string>={draft:"Brouillon",published:"Publié",archived:"Archivé",news:"Actualité",poll:"Sondage",question:"Question",frontiere:"Frontière de rendu",fatal:"Fatal",rejet:"Rejet"};
  return labels[value]??value;
}
