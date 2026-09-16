"use client";
// Les gestes sur un envoi existant : publier un brouillon, envoyer ou renvoyer la
// notification, archiver, répondre à un élève. Chaque geste dit ce qu'il a fait.
import { useActionState } from "react";
import { archiveCourrier, checkReceiptsCourrier, notifyCourrier, publishCourrier, replyCourrier, type ActionResult } from "@/app/actions/courrier";
import { ResultBanner } from "./ComposeForm";

const primary = "rounded-xl bg-[#B580F4] px-3 py-2 text-xs font-bold text-[#1A1224] disabled:opacity-60";
const quiet = "rounded-xl border border-[#332D3D] px-3 py-2 text-xs text-[#CDC8D6] hover:border-[#6E6680] disabled:opacity-60";

export interface ActionablePost { id:string; status:string; push_sent_at:string|null }
/** Vrai quand des reçus restent à lire pour cet envoi (page de détail seulement). */
export type ReceiptsState = "none"|"pending"|"done";

function latest(...states:(ActionResult|null)[]):ActionResult|null {
  return states.reduce<ActionResult|null>((best,s)=>s&&(!best||s.stamp>best.stamp)?s:best, null);
}

export function PostActions({ post, preview, withBanner=true, receipts="none" }:{ post:ActionablePost; preview:boolean; withBanner?:boolean; receipts?:ReceiptsState }) {
  const [published, publish, publishing] = useActionState(publishCourrier, null);
  const [notified, notify, notifying] = useActionState(notifyCourrier, null);
  const [archived, archive, archiving] = useActionState(archiveCourrier, null);
  const [checked, check, checking] = useActionState(checkReceiptsCourrier, null);
  const busy = publishing||notifying||archiving||checking;
  const hidden = <><input type="hidden" name="post_id" value={post.id}/><input type="hidden" name="preview" value={preview?"1":"0"}/></>;
  const confirmFirst = (question:string) => (e:React.FormEvent<HTMLFormElement>) => { if (!window.confirm(question)) e.preventDefault(); };
  return <div className="grid gap-2">
    <fieldset disabled={preview||busy} className="contents">
      <div className="flex flex-wrap items-center gap-2">
        {post.status==="draft" && <form action={publish} className="flex flex-wrap items-center gap-2">{hidden}<label className="flex items-center gap-1.5 text-xs text-[#CDC8D6]"><input type="checkbox" name="notify" defaultChecked/> avec notification</label><button className={primary}>{publishing?"Publication…":"Publier"}</button></form>}
        {post.status==="published" && !post.push_sent_at && <form action={notify}>{hidden}<button className={primary}>{notifying?"Envoi…":"Envoyer la notification"}</button></form>}
        {post.status==="published" && post.push_sent_at && <form action={notify} onSubmit={confirmFirst("Renvoyer la notification à tous les appareils de l'audience ? Ils l'ont déjà reçue une fois.")}>{hidden}<input type="hidden" name="force" value="1"/><button className={quiet}>{notifying?"Envoi…":"Renvoyer la notification"}</button></form>}
        {post.push_sent_at && receipts!=="none" && <form action={check}>{hidden}<button className={receipts==="pending"?primary:quiet}>{checking?"Lecture…":"Vérifier la livraison"}</button></form>}
        {post.status!=="archived" && <form action={archive} onSubmit={confirmFirst("Archiver cet envoi ? Il disparaît de la messagerie des élèves, les réponses restent lisibles ici.")}>{hidden}<button className={quiet}>{archiving?"Archivage…":"Archiver"}</button></form>}
      </div>
    </fieldset>
    {withBanner && <ResultBanner state={latest(published,notified,archived,checked)}/>}
  </div>;
}

export function ReplyForm({ postId, profileId, preview }:{ postId:string; profileId:string; preview:boolean }) {
  const [state, action, pending] = useActionState(replyCourrier, null);
  return <div className="grid gap-2">
    <fieldset disabled={preview||pending} className="contents">
      <form key={state?.ok?state.stamp:0} action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="post_id" value={postId}/><input type="hidden" name="profile_id" value={profileId}/><input type="hidden" name="preview" value={preview?"1":"0"}/>
        <textarea name="body" required rows={2} maxLength={2000} placeholder="Répondre à cet élève, dans son fil privé" className="min-w-[240px] flex-1 rounded-2xl border border-[#332D3D] bg-[#09060C] p-3 text-sm outline-none focus:border-[#CDA1F9]" aria-label="Réponse"/>
        <button className={primary}>{pending?"Envoi…":"Répondre"}</button>
      </form>
    </fieldset>
    <ResultBanner state={state}/>
  </div>;
}
