// Envoi de la notification système d'un courrier, depuis le serveur du dashboard.
//
// Miroir de l'Edge Function `lucid-push` (supabase/functions/lucid-push) : même
// résolution d'audience en base (`lucid_push_targets`), mêmes lots de 100 vers
// Expo, mêmes jetons morts désactivés, même `push_sent_at`. Ici l'appelant est
// le dashboard (clé service_role), là-bas un profil de `lucid_staff` : les deux
// chemins doivent rester interchangeables.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { PUSH_BODY_MAX, PUSH_TITLE_MAX, type PushReport } from "./model";

const EXPO_ENDPOINT = "https://exp.host/--/api/v2/push/send";
/** Expo accepte 100 messages par requête. */
const CHUNK = 100;

interface ExpoTicket { status:"ok"|"error"; id?:string; message?:string; details?:{ error?:string } }
interface Target { token:string; platform:string|null; profile_id:string }

export type PushOutcome = { ok:true; report:PushReport } | { ok:false; reason:"not_found"|"not_published"|"already_sent"|"targets_failed"; detail?:string; sentAt?:string|null };

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
  const errors = new Map<string,number>();
  const note = (code:string) => errors.set(code, (errors.get(code) ?? 0)+1);

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
        note(result.errors?.[0]?.message ?? result.errors?.[0]?.code ?? `HTTP ${response.status}`);
        continue;
      }
      result.data.forEach((ticket, index)=>{
        if (ticket.status==="ok") { sent += 1; return; }
        const code = ticket.details?.error ?? ticket.message ?? "unknown";
        note(code);
        // Appareil désinstallé / jeton révoqué : on ne le rappellera plus.
        if (code==="DeviceNotRegistered") dead.push(slice[index]);
      });
    } catch (e) {
      note(e instanceof Error ? e.message : String(e));
    }
  }

  if (dead.length>0) await supabaseAdmin.from("push_tokens").update({ disabled_at:stamp }).in("token", dead);
  await supabaseAdmin.from("lucid_posts").update({ push_sent_at:stamp }).eq("id", postId);

  const report:PushReport = {
    targets:tokens.length, sent, failed:tokens.length-sent, disabled:dead.length,
    errors:[...errors].slice(0,5).map(([code,n])=>n>1?`${code} ×${n}`:code),
  };
  console.info("Courrier LUCID : notification envoyée", { postId, ...report, at:stamp });
  return { ok:true, report };
}
