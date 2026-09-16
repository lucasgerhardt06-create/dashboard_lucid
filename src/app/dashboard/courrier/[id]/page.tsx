import Link from "next/link";
import { notFound } from "next/navigation";
import { BarList, Metric, PageHeader, ViewPanel } from "@/components/dashboard/analytics-ui";
import { PostActions, ReplyForm } from "@/components/dashboard/courrier/PostActions";
import { PreviewBanner, Findings, type SearchProps } from "@/components/dashboard/story";
import { readCourrierResults } from "@/lib/courrier/data";
import { describeAudience, KIND_LABELS, STATUS_LABELS, type AdminReply } from "@/lib/courrier/model";
import { ratio, type Insight } from "@/lib/insights";
import { formatValue } from "@/lib/views";
export const dynamic="force-dynamic"; export const revalidate=0;

function threads(replies:AdminReply[]) {
  const byProfile = new Map<string,{ name:string; replies:AdminReply[] }>();
  for (const r of [...replies].sort((a,b)=>a.created_at.localeCompare(b.created_at))) {
    const entry = byProfile.get(r.profile_id) ?? { name:[r.name,r.class].filter(Boolean).join(" · ")||r.profile_id, replies:[] };
    entry.replies.push(r); byProfile.set(r.profile_id, entry);
  }
  return [...byProfile].sort((a,b)=>b[1].replies.at(-1)!.created_at.localeCompare(a[1].replies.at(-1)!.created_at));
}

export default async function CourrierDetailPage({params,searchParams}:SearchProps&{params:Promise<{id:string}>}){
  const preview=(await searchParams).apercu==="1", id=(await params).id;
  const results=await readCourrierResults(preview,id);
  if(!results.data&&!results.error) notFound();
  const back=<Link className="mb-4 inline-block text-sm text-[#CDA1F9] underline underline-offset-4" href={`/dashboard/courrier${preview?"?apercu=1":""}`}>← Tous les envois</Link>;
  if(!results.data) return <>{back}<PreviewBanner preview={preview}/><PageHeader title="Envoi introuvable" description="La base n'a pas rendu cet envoi."/><Findings items={[{text:"La lecture de l'envoi a échoué : la base n'a pas répondu.",source:"lucid_admin_results",window:"État actuel"}]}/></>;
  const {post,reads,votes,voters,replies}=results.data;
  const fromStudents=replies.filter(r=>!r.from_staff);
  const options=(post.options??[]).map(o=>({label:o.label,voix:votes[o.id]??0}));
  const insights:Insight[]=[
    {text:post.status!=="published"?`${STATUS_LABELS[post.status]} : les élèves ne le voient pas${post.status==="draft"?" encore":" plus"}.`:`${reads} élève${reads>1?"s ont":" a"} ouvert cet envoi${post.push_sent_at?`, notification envoyée le ${formatValue(post.push_sent_at)}`:", aucune notification envoyée"}.`,source:"lucid_post_reads · lucid_posts.push_sent_at",window:"Depuis la publication"},
    post.kind==="poll"
      ?{text:voters>0?`${voters} votant${voters>1?"s":""}, soit ${ratio(voters,Math.max(reads,voters))} des élèves qui ont ouvert. En tête : ${[...options].sort((a,b)=>b.voix-a.voix)[0]?.label??"aucune option"}.`:"Aucun vote pour l'instant.",source:"lucid_post_votes",window:"Depuis la publication"}
      :{text:fromStudents.length>0?`${fromStudents.length} réponse${fromStudents.length>1?"s":""} d'élèves, ${new Set(fromStudents.map(r=>r.profile_id)).size} fil${new Set(fromStudents.map(r=>r.profile_id)).size>1?"s":""} ouvert${new Set(fromStudents.map(r=>r.profile_id)).size>1?"s":""}. Chaque réponse de l'équipe repasse l'envoi en non lu chez l'élève.`:"Aucune réponse d'élève pour l'instant.",source:"lucid_post_replies",window:"Depuis la publication"},
  ];
  return <>
    {back}
    <PreviewBanner preview={preview}/>
    <PageHeader title={post.title} description={`${KIND_LABELS[post.kind]} · ${STATUS_LABELS[post.status]} · ${describeAudience(post.audience)} · signé ${post.author_name}`}/>
    <Findings items={insights}/>
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <ViewPanel title="Le message" view="lucid_admin_results" empty={false}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#F3F0F9]">{post.body||<span className="text-[#6E6680]">Sans texte.</span>}</p>
        {post.cta_label&&<p className="mt-4 inline-block rounded-2xl bg-[#B580F4] px-4 py-2 text-sm font-bold text-[#1A1224]">{post.cta_label} <span className="font-mono text-xs font-normal">→ {post.cta_url}</span></p>}
        <dl className="mt-5 grid gap-2 text-xs text-[#A8A0B4] sm:grid-cols-2">
          <div><dt className="font-semibold text-[#CDC8D6]">Publication</dt><dd>{post.status==="published"?formatValue(post.publish_at):STATUS_LABELS[post.status]}{post.pinned?" · épinglé":""}</dd></div>
          <div><dt className="font-semibold text-[#CDC8D6]">Notification</dt><dd>{post.push_sent_at?`envoyée le ${formatValue(post.push_sent_at)}`:"pas envoyée"}{post.push_title||post.push_body?` · « ${post.push_title??post.title} : ${post.push_body??""} »`:""}</dd></div>
          <div><dt className="font-semibold text-[#CDC8D6]">Réponses des élèves</dt><dd>{post.allow_reply?"autorisées":"fermées"}</dd></div>
          <div><dt className="font-semibold text-[#CDC8D6]">Identifiant</dt><dd className="font-mono">{post.id}</dd></div>
        </dl>
        <div className="mt-5 border-t border-[#332D3D] pt-4"><PostActions post={post} preview={preview}/></div>
      </ViewPanel>
      <div className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric question="Ont ouvert" value={reads} view="lucid_post_reads"/>
          {post.kind==="poll"?<Metric question="Ont voté" value={voters} view="lucid_post_votes" tone="menthe"/>:<Metric question="Ont répondu" value={new Set(fromStudents.map(r=>r.profile_id)).size} view="lucid_post_replies" tone="menthe"/>}
        </div>
        {post.kind==="poll"&&<ViewPanel title="Résultats du sondage" view="lucid_post_votes" empty={options.length===0} caveat={post.multi_choice?"Plusieurs réponses par élève possibles : le total dépasse le nombre de votants.":undefined}>
          <BarList rows={options} label="label" valueKey="voix"/>
        </ViewPanel>}
      </div>
    </div>
    <ViewPanel className="mt-5" title="Fils privés avec les élèves" view="lucid_post_replies" empty={replies.length===0} caveat={replies.length===0?"Personne n'a encore écrit. Les réponses arrivent ici, une conversation par élève.":undefined}>
      <ul className="grid gap-4">
        {threads(replies).map(([profileId,thread])=><li key={profileId} className="rounded-2xl border border-[#332D3D] bg-[#09060C] p-4">
          <p className="text-sm font-semibold text-[#F3F0F9]">{thread.name} <Link className="ml-2 text-xs font-normal text-[#CDA1F9] underline underline-offset-4" href={`/dashboard/eleves/${profileId}${preview?"?apercu=1":""}`}>fiche élève</Link></p>
          <ul className="mt-3 grid gap-2">{thread.replies.map(r=><li key={r.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${r.from_staff?"ml-auto bg-[#27212C] text-[#F3F0F9]":"bg-[#1D1822] text-[#CDC8D6]"}`}><p className="whitespace-pre-wrap">{r.body}</p><p className="mt-1 text-[10px] text-[#6E6680]">{r.from_staff?"L'équipe":"L'élève"} · {formatValue(r.created_at)}</p></li>)}</ul>
          <div className="mt-3"><ReplyForm postId={post.id} profileId={profileId} preview={preview}/></div>
        </li>)}
      </ul>
    </ViewPanel>
  </>;
}
