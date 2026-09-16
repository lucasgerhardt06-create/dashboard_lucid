import Link from "next/link";
import { courrierInsights } from "@/lib/insights/pages";
import { changeStaff } from "@/app/actions/admin";
import { DenseTable, PageHeader, ViewPanel } from "@/components/dashboard/analytics-ui";
import { ComposeForm } from "@/components/dashboard/courrier/ComposeForm";
import { PostActions } from "@/components/dashboard/courrier/PostActions";
import { PreviewBanner, Findings, type SearchProps } from "@/components/dashboard/story";
import { readCourrierPosts, readCourrierReach, readPickableProfiles } from "@/lib/courrier/data";
import { describeAudience, KIND_LABELS, STATUS_LABELS } from "@/lib/courrier/model";
import { formatValue, readView } from "@/lib/views";
export const dynamic="force-dynamic"; export const revalidate=0;

const statusTone:Record<string,string> = { published:"bg-[#173230] text-[#8FD8C2]", draft:"bg-[#27212C] text-[#CDC8D6]", archived:"bg-[#09060C] text-[#6E6680]" };

export default async function CourrierPage({searchParams}:SearchProps){
  const preview=(await searchParams).apercu==="1";
  const [posts,reach,profiles,staff]=await Promise.all([readCourrierPosts(preview),readCourrierReach(preview),readPickableProfiles(preview),readView("lucid_staff",{preview,order:"added_at"})]);
  const rows=posts.data??[];
  const live=rows.filter(p=>p.status!=="archived");
  const archived=rows.filter(p=>p.status==="archived");
  return <>
    <PreviewBanner preview={preview}/>
    <PageHeader title="Courrier" description="Écrire aux élèves dans leur messagerie, à côté de leurs conversations ENT, avec une notification sur leur téléphone si tu le veux. Tout part d'ici : publier, prévenir, lire les réponses."/>
    <Findings items={courrierInsights(rows,reach.data,posts.error||reach.error)}/>

    <ViewPanel title="Nouveau message" view="lucid_admin_save_post · lucid-push" empty={false}>
      <ComposeForm preview={preview} profiles={profiles.data??[]} reach={reach.data}/>
    </ViewPanel>

    <ViewPanel className="mt-5" title="Envois" view="lucid_admin_posts" error={posts.error} empty={live.length===0} caveat={live.length===0&&!posts.error?"Rien n'a encore été envoyé : le premier message part du formulaire ci-dessus.":undefined}>
      <ul className="grid gap-3">
        {live.map(p=><li key={p.id} className="grid gap-3 rounded-2xl border border-[#332D3D] bg-[#09060C] p-4 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-lg px-2 py-0.5 font-semibold ${statusTone[p.status]??""}`}>{STATUS_LABELS[p.status]??p.status}</span>
              <span className="rounded-lg bg-[#27212C] px-2 py-0.5 text-[#CDC8D6]">{KIND_LABELS[p.kind]??p.kind}</span>
              {p.pinned&&<span className="rounded-lg bg-[#27212C] px-2 py-0.5 text-[#CDC8D6]">Épinglé</span>}
              <span className="text-[#A8A0B4]">{describeAudience(p.audience)}</span>
            </div>
            <Link href={`/dashboard/courrier/${p.id}${preview?"?apercu=1":""}`} className="mt-2 block font-display text-lg leading-tight text-[#F3F0F9] underline-offset-4 hover:underline">{p.title}</Link>
            {p.body&&<p className="mt-1 line-clamp-2 text-sm text-[#A8A0B4]">{p.body}</p>}
            <p className="mt-2 text-xs text-[#A8A0B4]">
              {p.status==="published"?`Publié le ${formatValue(p.publish_at)}`:`Créé le ${formatValue(p.created_at)}`}
              {" · "}{p.push_sent_at?`notification envoyée le ${formatValue(p.push_sent_at)}`:"pas de notification envoyée"}
              {" · "}{p.reads} lecture{p.reads>1?"s":""}{p.kind==="poll"?` · ${p.voters} votant${p.voters>1?"s":""}`:""} · {p.replies} réponse{p.replies>1?"s":""}
            </p>
          </div>
          <div className="lg:min-w-[260px]"><PostActions post={p} preview={preview}/></div>
        </li>)}
      </ul>
      {archived.length>0&&<details className="mt-4 text-sm text-[#A8A0B4]"><summary className="cursor-pointer">{archived.length} envoi{archived.length>1?"s":""} archivé{archived.length>1?"s":""}</summary><ul className="mt-2 grid gap-1">{archived.map(p=><li key={p.id}><Link className="underline underline-offset-4" href={`/dashboard/courrier/${p.id}${preview?"?apercu=1":""}`}>{p.title}</Link> · {p.reads} lectures · {p.replies} réponses</li>)}</ul></details>}
    </ViewPanel>

    <ViewPanel className="mt-5" title="Équipe autorisée dans l'app" view="lucid_staff" error={staff.error} empty={false} caveat="Ce tableau de bord publie de son propre droit ; cette liste sert aux membres qui voudraient un jour publier depuis l'app.">
      {staff.data.length>0?<DenseTable label="Équipe LUCID" rows={staff.data} columns={[{key:"label",label:"Libellé"},{key:"profile_id",label:"Profil"},{key:"added_at",label:"Ajout"}]}/>:<p className="text-sm text-[#A8A0B4]">Personne pour l’instant : aucun compte de l’app ne peut publier, seul ce tableau de bord le fait.</p>}
      <fieldset disabled={preview} className="contents"><form action={changeStaff} className="mt-4 flex flex-wrap items-center gap-2"><input name="profile_id" required list="staff-profiles" autoComplete="off" placeholder="Identifiant de profil (prenom.nom)" className="min-w-[240px] rounded-2xl border border-[#332D3D] bg-[#09060C] p-3 text-sm"/><datalist id="staff-profiles">{(profiles.data??[]).map(p=><option key={p.id} value={p.id}>{[p.full_name,p.class_name].filter(Boolean).join(" · ")}</option>)}</datalist><input name="label" placeholder="Libellé (Lucas, Camille…)" className="rounded-2xl border border-[#332D3D] bg-[#09060C] p-3 text-sm"/><button className="rounded-2xl border border-[#332D3D] px-4 py-3 text-sm font-semibold text-[#CDC8D6] hover:border-[#6E6680]">Autoriser ce profil</button><input type="hidden" name="preview" value={preview?"1":"0"}/></form></fieldset>
    </ViewPanel>
  </>;
}
