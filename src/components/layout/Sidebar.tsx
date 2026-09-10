"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Bot, Cable, CircleHelp, Cog, FolderHeart, GraduationCap, HeartPulse, Mail, Menu, MessageSquareText, ShieldAlert, Sparkles, Users, X } from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

export const navigation = [
  { id:"matin", name:"Le matin", href:"/dashboard", icon:HeartPulse }, { id:"retention", name:"Rétention et usage", href:"/dashboard/retention", icon:BarChart3 },
  { id:"entonnoir", name:"Entonnoir", href:"/dashboard/entonnoir", icon:CircleHelp }, { id:"services", name:"Services scolaires", href:"/dashboard/services", icon:Cable },
  { id:"ia", name:"Moteur IA", href:"/dashboard/ia", icon:Bot }, { id:"banque", name:"Banque de questions", href:"/dashboard/banque", icon:FolderHeart },
  { id:"rituel", name:"Rituel", href:"/dashboard/rituel", icon:Sparkles }, { id:"amis", name:"Amis", href:"/dashboard/amis", icon:Users },
  { id:"eleves", name:"Élèves", href:"/dashboard/eleves", icon:GraduationCap }, { id:"courrier", name:"Courrier", href:"/dashboard/courrier", icon:Mail },
  { id:"support", name:"Support", href:"/dashboard/support", icon:MessageSquareText }, { id:"erreurs", name:"Erreurs", href:"/dashboard/erreurs", icon:ShieldAlert },
  { id:"configuration", name:"Configuration", href:"/dashboard/configuration", icon:Cog },
];
const mobileIds = ["matin", "entonnoir", "ia", "eleves"];

function NavLinks({ compact=false, onClick }: { compact?:boolean; onClick?:()=>void }) {
  const pathname = usePathname();
  const preview=useSearchParams().get("apercu")==="1";
  const items = compact ? mobileIds.map((id) => navigation.find((item) => item.id === id)!).filter(Boolean) : navigation;
  return <>{items.map((item) => { const active = pathname === item.href; return <Link key={item.id} onClick={onClick} href={item.href+(preview?"?apercu=1":"")} className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors", active ? "bg-[#B580F4] text-[#1A1224] font-bold" : "text-[#CDC8D6] hover:bg-[#27212C] hover:text-white")}><item.icon className="size-4 shrink-0" /><span>{compact ? item.name.split(" ")[0] : item.name}</span></Link>; })}</>;
}

export function Sidebar() {
  const pathname=usePathname();
  const preview=useSearchParams().get("apercu")==="1";
  const [open, setOpen] = useState(false);
  return <>
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-68 border-r border-[#332D3D] bg-[#08040A] p-4 md:flex md:flex-col">
      <div className="mb-6 flex items-center gap-3 px-3 py-2"><span className="grid size-9 place-items-center rounded-2xl bg-[#B580F4] text-[#1A1224]"><Sparkles className="size-5" /></span><span className="font-display text-xl">LUCID</span></div>
      <nav className="flex-1 space-y-1 overflow-y-auto"><NavLinks /></nav>
      <Link href={pathname+(preview?"":"?apercu=1")} className="mb-2 rounded-xl border border-[#332D3D] px-3 py-2 text-xs text-[#FFB08F]">{preview?"Quitter l’aperçu fictif":"Ouvrir l’aperçu fictif"}</Link><form action={logout}><button className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[#A8A0B4] hover:bg-[#27212C] hover:text-white"><X className="size-4" />Déconnexion</button></form>
    </aside>
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[#332D3D] bg-[#08040A]/95 px-2 py-2 backdrop-blur md:hidden"><NavLinks compact /><button aria-label="Ouvrir le menu" onClick={() => setOpen(true)} className="grid place-items-center gap-1 rounded-xl px-2 text-xs text-[#CDC8D6]"><Menu className="size-5" />Menu</button></div>
    {open && <div className="fixed inset-0 z-50 bg-black/70 p-4 md:hidden"><div className="ml-auto flex h-full max-w-sm flex-col rounded-3xl border border-[#332D3D] bg-[#0E0911] p-4"><div className="mb-5 flex justify-between"><span className="font-display text-xl">Navigation</span><button aria-label="Fermer le menu" onClick={() => setOpen(false)}><X /></button></div><nav className="flex-1 space-y-1 overflow-auto"><NavLinks onClick={() => setOpen(false)} /></nav><Link href={pathname+(preview?"":"?apercu=1")} className="mb-2 rounded-xl border border-[#332D3D] px-3 py-2 text-xs text-[#FFB08F]">{preview?"Quitter l’aperçu fictif":"Ouvrir l’aperçu fictif"}</Link><form action={logout}><button className="w-full rounded-2xl bg-[#27212C] px-3 py-3 text-left">Déconnexion</button></form></div></div>}
  </>;
}
