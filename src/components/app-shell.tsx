import Link from "next/link";import {LogOut} from "lucide-react";import {signOut} from "@/app/actions";import {FloatingNav} from "@/components/floating-nav";
export function AppShell({children,profile}:{children:React.ReactNode;profile:{full_name:string;role:string}}){return <div className={`min-h-screen pb-24 lg:pb-0 role-${profile.role.toLowerCase()}`}>
 <header className="site-header"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4"><Link href="/dashboard" className="brand-mark" title="Safety Inspection Unit and Behavior Driver"><span className="brand-dot"/>SISOBER<span className="hidden sm:inline"> / Safety operations</span></Link>
 <FloatingNav role={profile.role}/>
 <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-black">{profile.full_name}</p><p className="text-[10px] uppercase tracking-[.14em] text-[var(--muted)]">{profile.role.replaceAll("_"," ")}</p></div><div className="profile-orb">{profile.full_name.slice(0,1).toUpperCase()}</div><form action={signOut}><button aria-label="Keluar" title="Keluar" className="icon-button"><LogOut size={16}/></button></form></div></div></header>
 <main className="mx-auto min-w-0 max-w-[1500px] p-4 md:p-8">{children}</main>
 </div>}
