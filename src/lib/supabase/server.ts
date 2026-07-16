import "server-only";import {createServerClient,type CookieOptions} from "@supabase/ssr";import {cookies} from "next/headers";import {redirect} from "next/navigation";
type CookieItem={name:string;value:string;options?:CookieOptions};
export async function createClient(){const store=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>store.getAll(),setAll(items:CookieItem[]){try{items.forEach(x=>store.set(x.name,x.value,x.options));}catch{}}}})}
export async function requireUser(){const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return null;const {data:profile}=await db.from("profiles").select("*").eq("id",user.id).single();return profile?.active?{user,profile,db}:null}
export async function requireUserOrRedirect(){const ctx=await requireUser();if(!ctx)redirect("/login");return ctx}
