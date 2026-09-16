// Lectures du Courrier pour les pages : les RPC `lucid_admin_*` en production
// (le serveur est reconnu comme équipe par `lucid_is_staff()`), un scénario figé
// en aperçu. Aucune écriture ici : voir `app/actions/courrier.ts`.

import { requireDashboardSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AdminPost, AdminResults, Audience, AudienceCount, PickableProfile } from "./model";

const FIXTURE_DAY = "2026-09-10T08:30:00.000Z";
const fixturePosts = ():AdminPost[] => [
  { id:"post-fiction", kind:"poll", status:"published", title:"Qu'est-ce qu'on améliore en priorité ?", body:"On a de la place pour une grosse nouveauté ce trimestre. Tu choisis.", options:[{id:"o1",label:"Les révisions"},{id:"o2",label:"L'emploi du temps"},{id:"o3",label:"Les amis et le classement"}], audience:{}, pinned:false, publish_at:FIXTURE_DAY, expires_at:null, push_sent_at:FIXTURE_DAY, reads:31, voters:19, replies:4, created_at:FIXTURE_DAY },
  { id:"post-fiction-2", kind:"news", status:"draft", title:"Bienvenue dans LUCID", body:"Tes messages ENT se lisent maintenant ici.", options:null, audience:{ class_name:["1ere B"] }, pinned:true, publish_at:FIXTURE_DAY, expires_at:null, push_sent_at:null, reads:0, voters:0, replies:0, created_at:FIXTURE_DAY },
];
const fixtureResults = ():AdminResults => ({
  post:{ ...fixturePosts()[0], author_name:"L'équipe LUCID", push_title:"Ton avis compte", push_body:"Un sondage rapide : qu'est-ce qu'on améliore ?", cta_label:null, cta_url:null, show_results:true, multi_choice:false, allow_reply:true },
  reads:31, votes:{ o1:11, o2:5, o3:3 }, voters:19,
  replies:[
    { id:2, profile_id:"fixture-1", name:"Élève fictif", class:"1ere B", from_staff:true, body:"Merci, c'est noté !", created_at:FIXTURE_DAY },
    { id:1, profile_id:"fixture-1", name:"Élève fictif", class:"1ere B", from_staff:false, body:"Les flashcards, clairement.", created_at:FIXTURE_DAY },
  ],
});
const fixtureProfiles = ():PickableProfile[] => [
  { id:"fixture-1", full_name:"Élève fictif", class_name:"1ere B", school_name:"Lycée fictif" },
  { id:"fixture-2", full_name:"Autre élève", class_name:"Terminale C", school_name:"Lycée fictif" },
];

export type Loaded<T> = { data:T; error:false } | { data:null; error:true };
async function guard<T>(preview:boolean, fixture:()=>T, real:()=>Promise<T>):Promise<Loaded<T>> {
  await requireDashboardSession();
  if (preview) return { data:fixture(), error:false };
  try { return { data:await real(), error:false }; }
  catch (error) { console.error("Lecture Courrier impossible", { message:error instanceof Error?error.message:String(error) }); return { data:null, error:true }; }
}

export function readCourrierPosts(preview:boolean, limit=100) {
  return guard(preview, fixturePosts, async ()=>{
    const { data, error } = await supabaseAdmin.rpc("lucid_admin_posts", { p_limit:limit });
    if (error) throw error;
    return (data ?? []) as AdminPost[];
  });
}

export function readCourrierResults(preview:boolean, postId:string) {
  return guard(preview, fixtureResults, async ()=>{
    const { data, error } = await supabaseAdmin.rpc("lucid_admin_results", { p_post_id:postId });
    if (error) throw error;
    return data as AdminResults;
  });
}

/** Combien d'élèves voient un filtre, combien ont un appareil à prévenir. */
export async function countAudience(audience:Audience):Promise<AudienceCount> {
  const { data, error } = await supabaseAdmin.rpc("lucid_admin_audience_count", { p_audience:audience });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as AudienceCount|undefined;
  return { eleves:Number(row?.eleves ?? 0), joignables:Number(row?.joignables ?? 0) };
}

/** Les élèves pour le sélecteur de test et les listes de classes / établissements, les plus récents d'abord. */
export function readPickableProfiles(preview:boolean) {
  return guard(preview, fixtureProfiles, async ()=>{
    const { data, error } = await supabaseAdmin.from("profiles").select("id,full_name,class_name,school_name").order("last_seen", { ascending:false, nullsFirst:false }).limit(400);
    if (error) throw error;
    return (data ?? []) as PickableProfile[];
  });
}

/** Le pouls du canal : combien d'élèves, combien d'appareils joignables. */
export function readCourrierReach(preview:boolean) {
  return guard(preview, ()=>({ eleves:40, joignables:23 }), ()=>countAudience({}));
}
