// Courrier LUCID : le modèle et les règles pures (aucune lecture réseau ici),
// pour que le formulaire, les actions serveur et les tests parlent la même langue.

export type CourrierKind = "news" | "poll" | "question";
export type CourrierStatus = "draft" | "published" | "archived";
export type AudienceMode = "tous" | "niveau" | "etablissement" | "classe" | "profil";
/** Niveau scolaire déduit de la classe en base (`lucid_grade_of`). */
export type Grade = "terminale" | "premiere" | "seconde" | "college" | "autre";

export interface CourrierOption { id:string; label:string }
/** Le filtre d'audience tel que la base le lit (`lucid_matches_audience`). `{}` = tout le monde.
 *  `app_version_lt` se lit sur l'appareil, pas sur le profil (`lucid_push_targets`) : la
 *  notification ne part qu'aux appareils dont l'app est plus ancienne que cette version,
 *  le message reste visible de tous dans la messagerie. */
export interface Audience { grade?:Grade[]; class_name?:string[]; school_name?:string[]; profile_ids?:string[]; platform?:string[]; min_level?:number; min_streak?:number; app_version_lt?:string }

/** Une ligne de `lucid_admin_posts()`. */
export interface AdminPost {
  id:string; kind:CourrierKind; status:CourrierStatus; title:string; body:string;
  options:CourrierOption[]|null; audience:Audience; pinned:boolean;
  publish_at:string; expires_at:string|null; push_sent_at:string|null;
  reads:number; voters:number; replies:number; created_at:string;
}
export interface AdminReply { id:number; profile_id:string; name:string|null; class:string|null; from_staff:boolean; body:string; created_at:string }
/** Le détail d'un envoi (`lucid_admin_results()`). */
export interface AdminResults {
  post:AdminPost & { author_name:string; push_title:string|null; push_body:string|null; cta_label:string|null; cta_url:string|null; show_results:boolean; multi_choice:boolean; allow_reply:boolean };
  reads:number; votes:Record<string,number>; voters:number; replies:AdminReply[];
}
/** `eleves` voient l'envoi dans l'app ; `joignables` = appareils qui recevraient la notification. */
export interface AudienceCount { eleves:number; joignables:number }
/** Ce qu'un envoi de notification a donné, pour le dire à l'écran. */
export interface PushReport { targets:number; sent:number; failed:number; disabled:number; errors:string[] }
/** Ce que les reçus Expo disent d'un envoi, appareil par appareil (`push_deliveries`). */
export interface DeliverySummary { targets:number; accepted:number; refused:number; delivered:number; failed:number; pending:number; errors:string[]; checkedAt:string|null }
/** Les reçus se lisent au plus tôt un quart d'heure après l'envoi. */
export const RECEIPT_DELAY_MS = 15*60*1000;
/** Un élève tel que le sélecteur de test et les listes de classes le voient. */
export interface PickableProfile { id:string; full_name:string|null; class_name:string|null; school_name:string|null }

export const KIND_LABELS:Record<CourrierKind,string> = { news:"Actualité", poll:"Sondage", question:"Question" };
export const STATUS_LABELS:Record<CourrierStatus,string> = { draft:"Brouillon", published:"Publié", archived:"Archivé" };
export const GRADE_LABELS:Record<Grade,string> = { terminale:"Terminale", premiere:"Première", seconde:"Seconde", college:"Collège", autre:"Autres et classe inconnue" };
export const AUDIENCE_MODE_LABELS:Record<AudienceMode,string> = { tous:"Tous les élèves", niveau:"Un niveau", etablissement:"Un lycée", classe:"Une classe", profil:"Un seul élève, pour tester" };
const isGrade = (value:string):value is Grade => value in GRADE_LABELS;

export const TITLE_MAX = 120;
export const BODY_MAX = 4000;
export const PUSH_TITLE_MAX = 100;
export const PUSH_BODY_MAX = 180;

const clean = (value:unknown) => String(value ?? "").replace(/\r\n/g,"\n").trim();

/** Les options d'un sondage, une par ligne. Les doublons et les vides tombent. */
export function parsePollOptions(text:string):CourrierOption[] {
  const seen = new Set<string>();
  const options:CourrierOption[] = [];
  for (const raw of clean(text).split("\n")) {
    const label = raw.replace(/^\s*(?:[-*•]|\d+[.)])\s*/,"").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ id:`o${options.length+1}`, label:label.slice(0,80) });
  }
  return options;
}

const VERSION = /^\d+(\.\d+){1,3}$/;
/** Une version x.y.z propre, ou null si le champ est vide ou mal formé. */
export function cleanVersion(value:unknown):string|null {
  const v = clean(value).replace(/^v/i,"");
  return VERSION.test(v) ? v : null;
}

/** Le filtre d'audience depuis les champs du formulaire (`value` : une classe, un lycée, un profil, ou des niveaux séparés par des virgules ; `versionLt` : n'alerter que les appareils plus anciens que cette version). */
export function audienceFromForm(mode:string, value:string, versionLt=""):Audience {
  const v = clean(value);
  const audience:Audience = {};
  if (mode==="niveau") { const grades = [...new Set(v.split(",").map(g=>g.trim().toLowerCase()).filter(isGrade))]; if (grades.length) audience.grade = grades; }
  else if (mode==="classe" && v) audience.class_name = [v];
  else if (mode==="etablissement" && v) audience.school_name = [v];
  else if (mode==="profil" && v) audience.profile_ids = [v.split(/\s+/)[0]];
  const version = cleanVersion(versionLt);
  if (version) audience.app_version_lt = version;
  return audience;
}

/** Le filtre porte-t-il sur les élèves (et pas seulement sur la version de l'app) ? */
export function hasProfileFilter(audience:Audience):boolean {
  return Object.keys(audience).some(k=>k!=="app_version_lt");
}

/** L'audience en français, pour la liste et le détail. */
export function describeAudience(audience:Audience|null|undefined):string {
  if (!audience || Object.keys(audience).length===0) return "Tous les élèves";
  const parts:string[] = [];
  if (audience.grade?.length) parts.push(audience.grade.map(g=>GRADE_LABELS[g] ?? g).join(", "));
  if (audience.class_name?.length) parts.push(`classe ${audience.class_name.join(", ")}`);
  if (audience.school_name?.length) parts.push(audience.school_name.join(", "));
  if (audience.profile_ids?.length) parts.push(audience.profile_ids.length===1?`le profil ${audience.profile_ids[0]}`:`${audience.profile_ids.length} profils`);
  if (audience.platform?.length) parts.push(audience.platform.join(" / "));
  if (audience.min_level) parts.push(`niveau ${audience.min_level} et plus`);
  if (audience.min_streak) parts.push(`série de ${audience.min_streak} jours et plus`);
  if (audience.app_version_lt) parts.push(`notification aux appareils avant la ${audience.app_version_lt}`);
  return parts.length ? parts.join(" · ") : "Tous les élèves";
}

/** Le texte de la notification quand l'équipe ne l'a pas écrit : le début du message, coupé à un mot. */
export function excerpt(body:string, max=PUSH_BODY_MAX-40):string {
  const flat = clean(body).replace(/\s+/g," ");
  if (flat.length<=max) return flat;
  const cut = flat.slice(0,max);
  const at = cut.lastIndexOf(" ");
  return `${(at>max*0.6?cut.slice(0,at):cut).trimEnd()}…`;
}

export interface ComposeInput {
  title:string; body:string; kind:CourrierKind; options:CourrierOption[]; multiChoice:boolean;
  audience:Audience; publish:boolean; notify:boolean; pushTitle:string|null; pushBody:string|null;
  pinned:boolean; allowReply:boolean; authorName:string|null; ctaLabel:string|null; ctaUrl:string|null;
}

/** Lit et valide le formulaire. Rend soit l'envoi prêt, soit la phrase à afficher. */
export function readCompose(form:FormData):{ ok:true; input:ComposeInput }|{ ok:false; error:string } {
  const title = clean(form.get("title"));
  const body = clean(form.get("body"));
  const kind = (["news","poll","question"] as CourrierKind[]).find(k=>k===form.get("kind")) ?? "news";
  if (!title) return { ok:false, error:"Il manque un titre." };
  if (title.length>TITLE_MAX) return { ok:false, error:`Le titre dépasse ${TITLE_MAX} caractères.` };
  if (body.length>BODY_MAX) return { ok:false, error:`Le message dépasse ${BODY_MAX} caractères.` };
  const options = kind==="poll" ? parsePollOptions(String(form.get("options")??"")) : [];
  if (kind==="poll" && (options.length<2 || options.length>8)) return { ok:false, error:"Un sondage a besoin de 2 à 8 réponses possibles, une par ligne." };
  const mode = String(form.get("audience_mode")??"tous");
  const versionRaw = clean(form.get("app_version_lt"));
  if (versionRaw && !cleanVersion(versionRaw)) return { ok:false, error:"La version doit s'écrire comme 2.1.0." };
  const audience = audienceFromForm(mode, String(form.get("audience_value")??""), versionRaw);
  if (mode!=="tous" && !hasProfileFilter(audience)) return { ok:false, error:mode==="niveau"?"Quel niveau ? Choisis-en au moins un.":mode==="classe"?"Quelle classe ? Le champ est vide.":mode==="etablissement"?"Quel lycée ? Le champ est vide.":"Quel profil ? Le champ est vide." };
  const ctaLabel = clean(form.get("cta_label")) || null;
  const ctaUrl = clean(form.get("cta_url")) || null;
  if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) return { ok:false, error:"Le bouton a besoin d'un libellé et d'une destination." };
  if (ctaUrl && !/^(\/[^\s]*|https:\/\/[^\s]+)$/.test(ctaUrl)) return { ok:false, error:"La destination du bouton doit être une route de l'app (/ai/revisions) ou un lien https." };
  const custom = form.get("push_custom")==="on";
  const pushTitle = custom ? clean(form.get("push_title")).slice(0,PUSH_TITLE_MAX) || null : null;
  const pushBody = custom ? clean(form.get("push_body")).slice(0,PUSH_BODY_MAX) || null : (body ? excerpt(body) : null);
  return { ok:true, input:{
    title, body, kind, options, multiChoice:form.get("multi_choice")==="on",
    audience, publish:form.get("intent")!=="draft", notify:form.get("notify")==="on",
    pushTitle, pushBody, pinned:form.get("pinned")==="on", allowReply:form.get("no_reply")!=="on",
    authorName:clean(form.get("author_name")) || null, ctaLabel, ctaUrl,
  } };
}

/** Ce qu'un code d'erreur Expo veut dire pour l'équipe, quand il a une cause à régler. */
export function explainPushError(code:string):string|null {
  if (code.startsWith("InvalidCredentials")) return "Expo n'a pas la clé APNs de l'app : à déposer une fois avec `eas credentials --platform ios` (Push Notifications), sinon aucune notification iOS ne part.";
  if (code.startsWith("DeviceNotRegistered")) return "Appareils qui ont désinstallé l'app ou coupé les notifications : retirés de la liste.";
  if (code.startsWith("MessageTooBig")) return "Le texte de la notification dépasse la taille admise : à raccourcir.";
  if (code.startsWith("MessageRateExceeded")) return "Trop d'envois d'un coup pour Expo : réessayer dans quelques minutes.";
  return null;
}

/** La phrase de résultat après un envoi. */
export function describeSend(count:AudienceCount|null, push:PushReport|null, published:boolean):string {
  if (!published) return "Brouillon enregistré. Il n'est visible de personne pour l'instant.";
  const eleves = count ? `${count.eleves} élève${count.eleves>1?"s":""}` : "les élèves visés";
  if (!push) return `Publié dans la messagerie de ${eleves}, sans notification.`;
  if (push.targets===0) return `Publié dans la messagerie de ${eleves}. Aucun appareil enregistré à prévenir : personne n'a reçu de notification.`;
  const failed = push.failed>0 ? ` ${push.failed} en échec${push.errors.length?` (${push.errors.join(", ")})`:""}.` : "";
  const disabled = push.disabled>0 ? ` ${push.disabled} appareil${push.disabled>1?"s":""} désinstallé${push.disabled>1?"s":""} retiré${push.disabled>1?"s":""} de la liste.` : "";
  // Les appareils désinstallés sont déjà dits par `disabled` : on n'explique que ce qui reste à régler.
  const why = push.errors.filter(e=>!e.startsWith("DeviceNotRegistered")).map(e=>explainPushError(e)).find((x):x is string=>!!x);
  return `Publié dans la messagerie de ${eleves}. Notification acceptée pour ${push.sent} appareil${push.sent>1?"s":""} sur ${push.targets}.${failed}${disabled}${why?` ${why}`:""}`;
}

/** Ce que la relecture des reçus donne, en une phrase. */
export function describeDelivery(d:DeliverySummary):string {
  if (d.targets===0) return "Aucun appareil visé par cet envoi.";
  const parts:string[] = [];
  if (d.refused>0) parts.push(`${d.refused} refusé${d.refused>1?"s":""} par Expo dès l'envoi`);
  if (d.delivered>0) parts.push(`${d.delivered} remis${d.delivered>1?"es":"e"} à Apple ou Google`);
  if (d.failed>0) parts.push(`${d.failed} en erreur au reçu`);
  if (d.pending>0) parts.push(`${d.pending} sans reçu encore`);
  const errors = d.errors.length ? ` Erreurs : ${d.errors.join(", ")}.` : "";
  const why = d.errors.map(e=>explainPushError(e.replace(/ ×\d+$/,""))).find((x):x is string=>!!x);
  return `${d.targets} appareil${d.targets>1?"s":""} visé${d.targets>1?"s":""} : ${parts.join(", ")}.${errors}${why?` ${why}`:""}`;
}
