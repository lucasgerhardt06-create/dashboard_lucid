"use client";
// « Nouveau message » : un titre, un message, à qui, et un bouton. Le reste se déplie.
import { useActionState, useRef, useState } from "react";
import { composeCourrier, previewAudience, type ActionResult } from "@/app/actions/courrier";
import { AUDIENCE_MODE_LABELS, excerpt, GRADE_LABELS, KIND_LABELS, type AudienceCount, type AudienceMode, type CourrierKind, type Grade, type PickableProfile } from "@/lib/courrier/model";

const field = "w-full rounded-2xl border border-[#332D3D] bg-[#09060C] p-3 outline-none focus:border-[#CDA1F9] placeholder:text-[#6E6680]";
const pill = (on:boolean) => `cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${on?"border-[#B580F4] bg-[#B580F4] font-bold text-[#1A1224]":"border-[#332D3D] bg-[#09060C] text-[#CDC8D6] hover:border-[#6E6680]"}`;

export function ResultBanner({ state }:{ state:ActionResult|null }) {
  if (!state) return null;
  return <p role="status" className={`rounded-2xl border px-4 py-3 text-sm ${state.ok?"border-[#2FA97C] bg-[#173230] text-[#8FD8C2]":"border-[#E14D5E] bg-[#38222B] text-[#FFA1AC]"}`}>{state.message}</p>;
}

export function ComposeForm({ preview, profiles, reach }:{ preview:boolean; profiles:PickableProfile[]; reach:AudienceCount|null }) {
  const [state, action, pending] = useActionState(composeCourrier, null);
  return <div className="grid gap-4">
    <ResultBanner state={state}/>
    {/* La clé change à chaque succès : le formulaire repart vide, le message reste au-dessus. */}
    <Fields key={state?.ok?state.stamp:0} preview={preview} profiles={profiles} reach={reach} action={action} pending={pending}/>
  </div>;
}

function Fields({ preview, profiles, reach, action, pending }:{ preview:boolean; profiles:PickableProfile[]; reach:AudienceCount|null; action:(form:FormData)=>void; pending:boolean }) {
  const [kind, setKind] = useState<CourrierKind>("news");
  const [mode, setMode] = useState<AudienceMode>("tous");
  const [value, setValue] = useState("");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [count, setCount] = useState<AudienceCount|null|"pending">(reach);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notify, setNotify] = useState(true);
  const [custom, setCustom] = useState(false);
  const [versionLt, setVersionLt] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const classes = [...new Set(profiles.map(p=>p.class_name).filter((c):c is string=>!!c))].sort((a,b)=>a.localeCompare(b,"fr"));
  const schools = [...new Set(profiles.map(p=>p.school_name).filter((s):s is string=>!!s))].sort((a,b)=>a.localeCompare(b,"fr"));

  // Le comptage part 350 ms après la dernière frappe, jamais depuis un effet.
  function schedule(nextMode:AudienceMode, nextValue:string, nextVersion:string) {
    if (timer.current) clearTimeout(timer.current);
    if (nextMode==="tous" && !nextVersion.trim()) { setCount(reach); return; }
    if (nextMode!=="tous" && !nextValue.trim()) { setCount(null); return; }
    if (preview) { setCount({ eleves:12, joignables:7 }); return; }
    setCount("pending");
    timer.current = setTimeout(()=>{ void previewAudience(nextMode, nextValue, nextVersion).then(setCount); }, 350);
  }
  const pickMode = (next:AudienceMode) => { setMode(next); setValue(""); setGrades([]); schedule(next, "", versionLt); };
  const pickValue = (next:string) => { setValue(next); schedule(mode, next, versionLt); };
  const toggleGrade = (grade:Grade) => { const next = grades.includes(grade) ? grades.filter(g=>g!==grade) : [...grades, grade]; setGrades(next); schedule("niveau", next.join(","), versionLt); };
  const pickVersion = (next:string) => { setVersionLt(next); schedule(mode, audienceValue, next); };
  // Les niveaux voyagent dans le même champ que la classe ou le lycée, séparés par des virgules.
  const audienceValue = mode==="niveau" ? grades.join(",") : value;

  const countLine = count==="pending" ? "Comptage…" : count===null ? (mode==="tous" ? "Effectif indisponible pour l'instant." : mode==="niveau" ? "Choisis un ou plusieurs niveaux pour compter." : mode==="classe" ? "Indique une classe pour compter." : mode==="etablissement" ? "Indique un lycée pour compter." : "Choisis un profil pour compter.")
    : count.eleves===0 ? "Personne ne correspond." : `${count.eleves} élève${count.eleves>1?"s verront":" verra"} le message · ${count.joignables} appareil${count.joignables>1?"s recevront":" recevra"} la notification`;

  return <fieldset disabled={preview||pending} className="contents">
    <form action={action} className="grid gap-5">
      <input type="hidden" name="preview" value={preview?"1":"0"}/>
      <input type="hidden" name="kind" value={kind}/>
      <input type="hidden" name="audience_mode" value={mode}/>

      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type de message">
          {(Object.keys(KIND_LABELS) as CourrierKind[]).map(k=><button type="button" key={k} role="radio" aria-checked={kind===k} className={pill(kind===k)} onClick={()=>setKind(k)}>{KIND_LABELS[k]}</button>)}
        </div>
        <input name="title" required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder={kind==="poll"?"La question du sondage":kind==="question"?"Ta question aux élèves":"Le titre, comme l'élève le verra"} className={`${field} text-lg font-semibold`} aria-label="Titre"/>
        <textarea name="body" rows={5} maxLength={4000} value={body} onChange={e=>setBody(e.target.value)} placeholder={kind==="poll"?"Deux lignes pour dire pourquoi tu demandes (facultatif)":"Ton message. Tutoie, va droit au but : il se lit sur un téléphone."} className={field} aria-label="Message"/>
        {kind==="poll" && <div className="grid gap-2 rounded-2xl border border-[#332D3D] bg-[#09060C] p-3">
          <label className="text-sm font-semibold" htmlFor="poll-options">Les réponses possibles, une par ligne (2 à 8)</label>
          <textarea id="poll-options" name="options" rows={4} placeholder={"Les révisions\nL'emploi du temps\nLes amis et le classement"} className={`${field} bg-[#1D1822]`}/>
          <label className="flex items-center gap-2 text-sm text-[#CDC8D6]"><input type="checkbox" name="multi_choice"/> Plusieurs réponses possibles</label>
        </div>}
      </div>

      <section className="grid gap-3 rounded-2xl border border-[#332D3D] bg-[#09060C] p-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#CDA1F9]">À qui ?</h3>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Audience">
          {(Object.keys(AUDIENCE_MODE_LABELS) as AudienceMode[]).map(m=><button type="button" key={m} role="radio" aria-checked={mode===m} className={pill(mode===m)} onClick={()=>pickMode(m)}>{AUDIENCE_MODE_LABELS[m]}</button>)}
        </div>
        <input type="hidden" name="audience_value" value={audienceValue}/>
        {mode==="niveau" && <div className="flex flex-wrap gap-2" role="group" aria-label="Niveaux">
          {(Object.keys(GRADE_LABELS) as Grade[]).map(g=><button type="button" key={g} aria-pressed={grades.includes(g)} className={pill(grades.includes(g))} onClick={()=>toggleGrade(g)}>{GRADE_LABELS[g]}</button>)}
          <p className="basis-full text-xs text-[#6E6680]">Le niveau se lit dans le nom de la classe donné par l’ENT (TG3, 1ERE B, 2NDE 4, 3e…). Plusieurs niveaux possibles.</p>
        </div>}
        {(mode==="classe"||mode==="etablissement"||mode==="profil") && <>
          <input list={`audience-${mode}`} value={value} onChange={e=>pickValue(e.target.value)} autoComplete="off" placeholder={mode==="classe"?"Le nom exact de la classe, tel que l'ENT l'écrit (1ere B, TG3…)":mode==="etablissement"?"Le nom exact du lycée, tel que l'ENT l'écrit":"Tape un nom ou un identifiant de profil"} className={`${field} bg-[#1D1822]`} aria-label="Valeur de l'audience"/>
          <datalist id="audience-classe">{classes.map(c=><option key={c} value={c}/>)}</datalist>
          <datalist id="audience-etablissement">{schools.map(s=><option key={s} value={s}/>)}</datalist>
          <datalist id="audience-profil">{profiles.map(p=><option key={p.id} value={p.id}>{[p.full_name,p.class_name].filter(Boolean).join(" · ")}</option>)}</datalist>
        </>}
        <p className={`text-sm ${count!=="pending"&&count!==null&&count.eleves===0?"text-[#FFA1AC]":"text-[#A8A0B4]"}`}>{countLine}</p>
        <label className="grid gap-1 text-xs text-[#A8A0B4]">
          <span>Notification réservée aux appareils qui n’ont pas encore ouvert la version… <span className="text-[#6E6680]">(facultatif : pour dire « la mise à jour est là » à ceux qui ne l’ont pas vue)</span></span>
          <input name="app_version_lt" value={versionLt} onChange={e=>pickVersion(e.target.value)} inputMode="decimal" pattern="\d+(\.\d+){1,3}" placeholder="2.1.0" className={`${field} max-w-[180px] bg-[#1D1822]`} aria-label="Version de l'app en dessous de laquelle notifier"/>
        </label>
      </section>

      <section className="grid gap-3 rounded-2xl border border-[#332D3D] bg-[#09060C] p-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="notify" checked={notify} onChange={e=>setNotify(e.target.checked)} className="mt-1"/>
          <span><span className="block text-sm font-semibold">Prévenir par une notification sur le téléphone</span><span className="block text-xs text-[#A8A0B4]">Sans elle, le message attend dans la messagerie que l’élève l’ouvre.</span></span>
        </label>
        {notify && <div className="grid gap-2 rounded-2xl border border-dashed border-[#332D3D] p-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#6E6680]">Ce que l’élève verra</p>
          {custom
            ? <><input name="push_title" maxLength={100} placeholder={title||"Titre de la notification"} className={`${field} bg-[#1D1822]`} aria-label="Titre de la notification"/><input name="push_body" maxLength={180} placeholder={excerpt(body)||"Texte de la notification"} className={`${field} bg-[#1D1822]`} aria-label="Texte de la notification"/></>
            : <div className="rounded-xl bg-[#1D1822] p-3"><p className="text-sm font-semibold">{title||"Le titre du message"}</p><p className="text-sm text-[#CDC8D6]">{excerpt(body)||"Le début du message"}</p></div>}
          <label className="flex items-center gap-2 text-xs text-[#A8A0B4]"><input type="checkbox" name="push_custom" checked={custom} onChange={e=>setCustom(e.target.checked)}/> Écrire un texte différent pour la notification</label>
        </div>}
      </section>

      <details className="rounded-2xl border border-[#332D3D] bg-[#09060C] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[#CDC8D6]">Plus d’options</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pinned"/> Épingler en haut de la messagerie</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="no_reply"/> Ne pas permettre de répondre</label>
          <input name="cta_label" maxLength={40} placeholder="Libellé du bouton (facultatif)" className={`${field} bg-[#1D1822]`} aria-label="Libellé du bouton"/>
          <input name="cta_url" placeholder="Destination : /ai/revisions ou https://…" className={`${field} bg-[#1D1822]`} aria-label="Destination du bouton"/>
          <input name="author_name" maxLength={60} placeholder="Signature (par défaut : L'équipe LUCID)" className={`${field} bg-[#1D1822] md:col-span-2`} aria-label="Signature"/>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <button name="intent" value="send" className="rounded-2xl bg-[#B580F4] px-5 py-3 font-bold text-[#1A1224] disabled:opacity-60">{pending?"Envoi…":notify?"Envoyer et notifier":"Publier dans la messagerie"}</button>
        <button name="intent" value="draft" className="rounded-2xl border border-[#332D3D] px-5 py-3 text-sm font-semibold text-[#CDC8D6] hover:border-[#6E6680] disabled:opacity-60">Garder en brouillon</button>
        <p className="text-xs text-[#6E6680]">{mode==="profil"?"Un envoi de test : seul ce profil le voit.":"Un envoi publié se lit tout de suite dans l'app."}</p>
      </div>
    </form>
  </fieldset>;
}
