import {AppShell} from "@/components/app-shell";import {requireUserOrRedirect as requireUser} from "@/lib/supabase/server";
export default async function Layout({children}:{children:React.ReactNode}){const ctx=await requireUser();return <AppShell profile={ctx.profile}>{children}</AppShell>}
