import { Sidebar } from "@/components/layout/Sidebar";
export default function DashboardLayout({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-[#0E0911] text-[#F3F0F9]"><Sidebar /><main className="min-h-screen pb-24 md:ml-68 md:pb-0"><div className="mx-auto max-w-[1600px] p-4 sm:p-7">{children}</div></main></div>; }
