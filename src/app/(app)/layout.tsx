import {redirect} from "next/navigation";import {AppShell} from "@/components/app-shell";import {requireUserOrRedirect as requireUser} from "@/lib/supabase/server";
export default async function Layout({children}:{children:React.ReactNode}){const ctx=await requireUser();if(ctx.profile.must_change_password)redirect("/change-password");return <AppShell profile={ctx.profile}>{children}</AppShell>}
