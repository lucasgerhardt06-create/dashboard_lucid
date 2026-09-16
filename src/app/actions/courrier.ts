"use server";

// Les gestes de l'équipe sur le Courrier LUCID : composer et envoyer, publier un
// brouillon, notifier, archiver, répondre à un élève. Chaque action rend une
// phrase à afficher plutôt que de jeter : un envoi raté doit se lire à l'écran.

import { revalidatePath } from "next/cache";
import { requireDashboardSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { countAudience } from "@/lib/courrier/data";
import { audienceFromForm, describeSend, readCompose, type AudienceCount, type PushReport } from "@/lib/courrier/model";
import { sendPostPush, type PushOutcome } from "@/lib/courrier/push";

export interface ActionResult { ok:boolean; message:string; postId?:string; stamp:number }

const UUID = /^[0-9a-f-]{36}$/i;
const result = (ok:boolean, message:string, postId?:string):ActionResult => ({ ok, message, postId, stamp:Date.now() });
const reason = (e:unknown) => e instanceof Error ? e.message : String(e);

function refresh(postId?:string) {
  revalidatePath("/dashboard/courrier");
  if (postId) revalidatePath(`/dashboard/courrier/${postId}`);
}

function guardPreview(form:FormData):ActionResult|null {
  return form.get("preview")==="1" ? result(false, "Les écritures sont désactivées en aperçu.") : null;
}

function pushSentence(outcome:PushOutcome):{ report:PushReport|null; note:string } {
  if (outcome.ok) return { report:outcome.report, note:"" };
  switch (outcome.reason) {
    case "already_sent": return { report:null, note:" La notification avait déjà été envoyée, elle n'est pas repartie." };
    case "not_published": return { report:null, note:" La notification n'est pas partie : l'envoi n'est pas publié." };
    case "targets_failed": return { report:null, note:` La notification n'est pas partie : ${outcome.detail ?? "la liste des appareils n'a pas répondu"}.` };
    default: return { report:null, note:" La notification n'est pas partie : envoi introuvable." };
  }
}

/** Le formulaire « Nouveau message » : enregistre, publie si demandé, notifie si demandé. */
export async function composeCourrier(_previous:ActionResult|null, form:FormData):Promise<ActionResult> {
  await requireDashboardSession();
  const preview = guardPreview(form); if (preview) return preview;
  const parsed = readCompose(form);
  if (!parsed.ok) return result(false, parsed.error);
  const { input } = parsed;

  let count:AudienceCount|null = null;
  try { count = await countAudience(input.audience); }
  catch (e) { return result(false, `Impossible de compter l'audience : ${reason(e)}`); }
  if (input.publish && count.eleves===0) return result(false, "Personne ne correspond à cette audience : vérifie la classe, l'établissement ou le profil.");

  const { data:postId, error } = await supabaseAdmin.rpc("lucid_admin_save_post", {
    p_id:null, p_kind:input.kind, p_title:input.title, p_body:input.body,
    p_options:input.kind==="poll" ? input.options : null,
    p_multi_choice:input.multiChoice, p_show_results:true, p_allow_reply:input.allowReply,
    p_audience:input.audience, p_pinned:input.pinned,
    p_status:input.publish ? "published" : "draft",
    p_publish_at:null, p_expires_at:null,
    p_push_title:input.pushTitle, p_push_body:input.pushBody,
    p_author_name:input.authorName, p_cta_label:input.ctaLabel, p_cta_url:input.ctaUrl,
  });
  if (error || typeof postId!=="string") {
    console.error("Courrier : enregistrement refusé", error);
    return result(false, `L'enregistrement a échoué : ${error?.message ?? "réponse vide"}.`);
  }

  let note = "";
  let report:PushReport|null = null;
  if (input.publish && input.notify) ({ report, note } = pushSentence(await sendPostPush(postId)));
  refresh(postId);
  return result(true, describeSend(count, input.publish && input.notify ? report : null, input.publish)+note, postId);
}

/** Publie un brouillon (et prévient les appareils si `notify`). */
export async function publishCourrier(_previous:ActionResult|null, form:FormData):Promise<ActionResult> {
  await requireDashboardSession();
  const preview = guardPreview(form); if (preview) return preview;
  const postId = String(form.get("post_id") ?? "");
  if (!UUID.test(postId)) return result(false, "Envoi introuvable.");
  const { data:post, error:readError } = await supabaseAdmin.from("lucid_posts").select("id,status,audience").eq("id", postId).maybeSingle();
  if (readError || !post) return result(false, "Envoi introuvable.");
  if (post.status==="published") return result(false, "Cet envoi est déjà publié.");
  let count:AudienceCount|null = null;
  try { count = await countAudience(post.audience ?? {}); } catch { count = null; }
  if (count && count.eleves===0) return result(false, "Personne ne correspond à l'audience de cet envoi : modifie-la avant de publier.");
  const { error } = await supabaseAdmin.from("lucid_posts").update({ status:"published", publish_at:new Date().toISOString() }).eq("id", postId);
  if (error) return result(false, `La publication a échoué : ${error.message}.`);
  const notify = form.get("notify")==="on";
  let note = "";
  let report:PushReport|null = null;
  if (notify) ({ report, note } = pushSentence(await sendPostPush(postId)));
  refresh(postId);
  return result(true, describeSend(count, notify ? report : null, true)+note, postId);
}

/** Envoie (ou renvoie, avec `force`) la notification d'un envoi publié. */
export async function notifyCourrier(_previous:ActionResult|null, form:FormData):Promise<ActionResult> {
  await requireDashboardSession();
  const preview = guardPreview(form); if (preview) return preview;
  const postId = String(form.get("post_id") ?? "");
  if (!UUID.test(postId)) return result(false, "Envoi introuvable.");
  const outcome = await sendPostPush(postId, { force:form.get("force")==="1" });
  refresh(postId);
  if (!outcome.ok) return result(false, pushSentence(outcome).note.trim());
  const r = outcome.report;
  if (r.targets===0) return result(true, "Aucun appareil enregistré dans cette audience : personne à prévenir.", postId);
  return result(true, `Notification acceptée pour ${r.sent} appareil${r.sent>1?"s":""} sur ${r.targets}${r.failed?`, ${r.failed} en échec (${r.errors.join(", ")})`:""}${r.disabled?`, ${r.disabled} désinstallé${r.disabled>1?"s":""} retiré${r.disabled>1?"s":""}`:""}.`, postId);
}

/** Retire un envoi de la messagerie des élèves (les réponses restent lisibles ici). */
export async function archiveCourrier(_previous:ActionResult|null, form:FormData):Promise<ActionResult> {
  await requireDashboardSession();
  const preview = guardPreview(form); if (preview) return preview;
  const postId = String(form.get("post_id") ?? "");
  if (!UUID.test(postId)) return result(false, "Envoi introuvable.");
  const { error } = await supabaseAdmin.from("lucid_posts").update({ status:"archived" }).eq("id", postId);
  if (error) return result(false, `L'archivage a échoué : ${error.message}.`);
  refresh(postId);
  return result(true, "Envoi archivé : il a disparu de la messagerie des élèves.", postId);
}

/** Répond à un élève dans son fil privé ; il reverra l'envoi comme non lu. */
export async function replyCourrier(_previous:ActionResult|null, form:FormData):Promise<ActionResult> {
  await requireDashboardSession();
  const preview = guardPreview(form); if (preview) return preview;
  const postId = String(form.get("post_id") ?? "");
  const profileId = String(form.get("profile_id") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (!UUID.test(postId) || !profileId) return result(false, "Fil introuvable.");
  if (!body) return result(false, "La réponse est vide.");
  if (body.length>2000) return result(false, "La réponse dépasse 2000 caractères.");
  const { error } = await supabaseAdmin.rpc("lucid_admin_reply", { p_post_id:postId, p_profile_id:profileId, p_body:body });
  if (error) return result(false, `La réponse n'est pas partie : ${error.message}.`);
  refresh(postId);
  return result(true, "Réponse envoyée : l'élève la verra dans son fil, comme un nouveau message.", postId);
}

/** Pendant la saisie : combien d'élèves ce filtre touche, combien ont un appareil. */
export async function previewAudience(mode:string, value:string):Promise<AudienceCount|null> {
  await requireDashboardSession();
  try { return await countAudience(audienceFromForm(mode, value)); }
  catch (e) { console.error("Courrier : comptage d'audience impossible", reason(e)); return null; }
}
