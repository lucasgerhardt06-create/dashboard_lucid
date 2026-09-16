// Envoi de la notification système d'un courrier, depuis le serveur du dashboard.
//
// Miroir de l'Edge Function `lucid-push` (supabase/functions/lucid-push) : même
// résolution d'audience en base (`lucid_push_targets`), mêmes lots de 100 vers
// Expo, mêmes jetons morts désactivés, même `push_sent_at`. Ici l'appelant est
// le dashboard (clé service_role), là-bas un profil de `lucid_staff` : les deux
// chemins doivent rester interchangeables.
//
// Deux temps, parce qu'Expo répond en deux temps. Le TICKET dit si Expo a pris
// le message ; le REÇU, un quart d'heure plus tard, dit si Apple ou Google l'ont
// accepté (ou pourquoi pas : clé APNs absente, appareil désinstallé…). Sans
// relire les reçus, on croyait envoyer alors qu'aucune notification n'est
// jamais partie (`InvalidCredentials`, constaté le 16/09/2026). Chaque appareil
// visé a sa ligne dans `push_deliveries`, ticket puis reçu.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { PUSH_BODY_MAX, PUSH_TITLE_MAX, RECEIPT_DELAY_MS, type DeliverySummary, type PushReport } from "./model";

const EXPO_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS = "https://exp.host/--/api/v2/push/getReceipts";
/** Expo accepte 100 messages par requête, et 1 000 reçus. */
const CHUNK = 100;
const RECEIPT_CHUNK = 500;

interface ExpoTicket { status:"ok"|"error"; id?:string; message?:string; details?:{ error?:string } }
interface ExpoReceipt { status:"ok"|"error"; message?:string; details?:{ error?:string } }
interface Target { token:string; platform:string|null; profile_id:string|null }
interface DeliveryRow { post_id:string; token:string; ticket_id:string|null; ticket_error:string|null }

export type PushOutcome = { ok:true; report:PushReport } | { ok:false; reason:"not_found"|"not_published"|"already_sent"|"targets_failed"; detail?:string; sentAt?:string|null };

const tally = () => {
  const errors = new Map<string,number>();
  return {
    note: (code:string) => errors.set(code, (errors.get(code) ?? 0)+1),
    list: () => [...errors].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([code,n])=>n>1?`${code} ×${n}`:code),
  };
};

export async function sendPostPush(postId:string, { force=false }:{ force?:boolean } = {}):Promise<PushOutcome> {
  const { data:post, error:postError } = await supabaseAdmin
    .from("lucid_posts")
    .select("id, title, status, publish_at, push_title, push_body, push_sent_at")
    .eq("id", postId)
    .maybeSingle();
  if (postError || !post) return { ok:false, reason:"not_found", detail:postError?.message };
  if (post.status!=="published" || new Date(post.publish_at)>new Date()) return { ok:false, reason:"not_published" };
  if (post.push_sent_at && !force) return { ok:false, reason:"already_sent", sentAt:post.push_sent_at };

  const { data:targets, error:targetsError } = await supabaseAdmin.rpc("lucid_push_targets", { p_post_id:postId });
  if (targetsError) return { ok:false, reason:"targets_failed", detail:targetsError.message };

  const tokens = ((targets ?? []) as Target[]).map(t=>t.token);
  const stamp = new Date().toISOString();
  if (tokens.length===0) {
    await supabaseAdmin.from("lucid_posts").update({ push_sent_at:stamp }).eq("id", postId);
    return { ok:true, report:{ targets:0, sent:0, failed:0, disabled:0, errors:[] } };
  }

  const title = String(post.push_title ?? post.title ?? "LUCID").slice(0, PUSH_TITLE_MAX);
  const body = String(post.push_body ?? "").slice(0, PUSH_BODY_MAX);

  let sent = 0;
  const dead:string[] = [];
  const errors = tally();
  const deliveries:DeliveryRow[] = [];

  for (let i=0; i<tokens.length; i+=CHUNK) {
    const slice = tokens.slice(i, i+CHUNK);
    const payload = slice.map(to=>({
      to, title, body:body||undefined, sound:"default",
      // `url` est ce que lit le routeur de l'app au tap (app/_layout.tsx).
      data:{ type:"lucid_post", postId, url:`/messages/lucid/${postId}` },
      channelId:"default",
    }));
    try {
      const response = await fetch(EXPO_ENDPOINT, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Accept:"application/json" },
        body:JSON.stringify(payload),
      });
      const result = await response.json() as { data?:ExpoTicket[]; errors?:{ code?:string; message?:string }[] };
      if (!response.ok || !result.data) {
        const code = result.errors?.[0]?.message ?? result.errors?.[0]?.code ?? `HTTP ${response.status}`;
        errors.note(code);
        slice.forEach(token=>deliveries.push({ post_id:postId, token, ticket_id:null, ticket_error:code }));
        continue;
      }
      result.data.forEach((ticket, index)=>{
        const token = slice[index];
        if (ticket.status==="ok") { sent += 1; deliveries.push({ post_id:postId, token, ticket_id:ticket.id ?? null, ticket_error:null }); return; }
        const code = ticket.details?.error ?? ticket.message ?? "unknown";
        errors.note(code);
        deliveries.push({ post_id:postId, token, ticket_id:null, ticket_error:code });
        // Appareil désinstallé / jeton révoqué : on ne le rappellera plus.
        if (code==="DeviceNotRegistered") dead.push(token);
      });
    } catch (e) {
      const code = e instanceof Error ? e.message : String(e);
      errors.note(code);
      slice.forEach(token=>deliveries.push({ post_id:postId, token, ticket_id:null, ticket_error:code }));
    }
  }

  if (dead.length>0) await supabaseAdmin.from("push_tokens").update({ disabled_at:stamp }).in("token", dead);
  await supabaseAdmin.from("lucid_posts").update({ push_sent_at:stamp }).eq("id", postId);
  // Un renvoi (`force`) remplace le relevé précédent : la page lit le dernier envoi.
  if (force) await supabaseAdmin.from("push_deliveries").delete().eq("post_id", postId);
  const { error:deliveryError } = await supabaseAdmin.from("push_deliveries").insert(deliveries);
  if (deliveryError) console.error("Courrier LUCID : relevé de livraison non enregistré", deliveryError.message);

  const report:PushReport = {
    targets:tokens.length, sent, failed:tokens.length-sent, disabled:dead.length,
    errors:errors.list(),
  };
  console.info("Courrier LUCID : notification envoyée", { postId, ...report, at:stamp });
  return { ok:true, report };
}

/**
 * Relit auprès d'Expo les reçus des tickets encore sans réponse, et marque les
 * jetons que le reçu déclare morts. Sans effet sur les lignes déjà relues.
 */
export async function checkPostReceipts(postId:string):Promise<{ ok:true; summary:DeliverySummary; checked:number }|{ ok:false; reason:string }> {
  const { data:rows, error } = await supabaseAdmin
    .from("push_deliveries")
    .select("id, token, ticket_id, sent_at")
    .eq("post_id", postId)
    .is("receipt_status", null)
    .not("ticket_id", "is", null);
  if (error) return { ok:false, reason:error.message };

  const pending = (rows ?? []) as { id:number; token:string; ticket_id:string; sent_at:string }[];
  const dead:string[] = [];
  const stamp = new Date().toISOString();
  let checked = 0;

  for (let i=0; i<pending.length; i+=RECEIPT_CHUNK) {
    const slice = pending.slice(i, i+RECEIPT_CHUNK);
    let receipts:Record<string,ExpoReceipt> = {};
    try {
      const response = await fetch(EXPO_RECEIPTS, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Accept:"application/json" },
        body:JSON.stringify({ ids:slice.map(r=>r.ticket_id) }),
      });
      const result = await response.json() as { data?:Record<string,ExpoReceipt> };
      if (!response.ok || !result.data) return { ok:false, reason:`Expo a répondu ${response.status}` };
      receipts = result.data;
    } catch (e) {
      return { ok:false, reason:e instanceof Error ? e.message : String(e) };
    }
    for (const row of slice) {
      const receipt = receipts[row.ticket_id];
      // Pas encore de reçu : Expo le garde 24 h, on repassera.
      if (!receipt) continue;
      const code = receipt.status==="ok" ? null : (receipt.details?.error ?? receipt.message ?? "unknown");
      await supabaseAdmin.from("push_deliveries").update({ receipt_status:receipt.status==="ok"?"ok":"error", receipt_error:code, checked_at:stamp }).eq("id", row.id);
      checked += 1;
      if (code==="DeviceNotRegistered") dead.push(row.token);
    }
  }
  if (dead.length>0) await supabaseAdmin.from("push_tokens").update({ disabled_at:stamp }).in("token", dead);

  const summary = await readDeliverySummary(postId);
  if (!summary) return { ok:false, reason:"le relevé n'a pas répondu" };
  return { ok:true, summary, checked };
}

/** Le relevé d'un envoi : tickets, reçus, et ce qui manque encore. */
export async function readDeliverySummary(postId:string):Promise<DeliverySummary|null> {
  const { data, error } = await supabaseAdmin
    .from("push_deliveries")
    .select("ticket_id, ticket_error, receipt_status, receipt_error, sent_at, checked_at")
    .eq("post_id", postId);
  if (error) { console.error("Courrier LUCID : relevé de livraison illisible", error.message); return null; }
  const rows = (data ?? []) as { ticket_id:string|null; ticket_error:string|null; receipt_status:"ok"|"error"|null; receipt_error:string|null; sent_at:string; checked_at:string|null }[];
  const errors = tally();
  let accepted = 0, refused = 0, delivered = 0, failed = 0, pending = 0;
  let checkedAt:string|null = null;
  for (const r of rows) {
    if (r.checked_at && (!checkedAt || r.checked_at>checkedAt)) checkedAt = r.checked_at;
    if (!r.ticket_id) { refused += 1; if (r.ticket_error) errors.note(r.ticket_error); continue; }
    accepted += 1;
    if (r.receipt_status==="ok") delivered += 1;
    else if (r.receipt_status==="error") { failed += 1; if (r.receipt_error) errors.note(r.receipt_error); }
    else pending += 1;
  }
  return { targets:rows.length, accepted, refused, delivered, failed, pending, errors:errors.list(), checkedAt };
}

/** Les reçus d'un envoi sont-ils mûrs (un quart d'heure) et encore à lire ? */
export function receiptsDue(summary:DeliverySummary|null, sentAt:string|null):boolean {
  if (!summary || !sentAt || summary.pending===0) return false;
  return Date.now()-new Date(sentAt).getTime() >= RECEIPT_DELAY_MS;
}
