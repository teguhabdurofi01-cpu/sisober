import Link from "next/link";
import {login} from "@/app/actions";
import {AuthBrand} from "@/components/company-brand";
import {PasswordInput} from "@/components/password-input";

export default async function Login({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}) {
  const {error,message}=await searchParams;
  return <main className="grid min-h-screen place-items-center p-5">
    <section className="panel w-full max-w-sm p-7">
      <AuthBrand/>
      <p className="eyebrow">Safety Inspection Unit and Behavior Driver</p>
      <h1 className="mt-2 text-2xl font-black">Masuk ke SISOBER</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Gunakan akun yang telah diaktifkan oleh administrator.</p>
      {error&&<p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message&&<p className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <form action={login} className="mt-6 space-y-4">
        <label className="block text-sm font-bold">Email<input required type="email" name="email" className="field mt-1"/></label>
        <label className="block text-sm font-bold">Kata sandi<PasswordInput required name="password" autoComplete="current-password" className="mt-1"/></label>
        <div className="text-right"><Link href="/forgot-password" className="text-xs font-bold text-[var(--accent)]">Lupa kata sandi?</Link></div>
        <button className="btn w-full">Masuk</button>
      </form>
    </section>
  </main>;
}
