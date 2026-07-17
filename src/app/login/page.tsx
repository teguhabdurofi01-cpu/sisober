import Link from "next/link";
import {ShieldCheck} from "lucide-react";
import {login} from "@/app/actions";
import {AuthBrand} from "@/components/company-brand";
import {PasswordInput} from "@/components/password-input";

export default async function Login({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}) {
  const {error,message}=await searchParams;
  return <main className="login-page">
    <section className="login-story" aria-label="Tentang SISOBER">
      <AuthBrand/>
      <div className="login-story-copy">
        <span className="login-kicker"><ShieldCheck size={16}/> Safety intelligence platform</span>
        <h1>Inspeksi lebih tajam.<br/>Operasi lebih aman.</h1>
        <p>SISOBER menyatukan temuan unit, tindakan kontraktor, dan keputusan keselamatan dalam satu alur kerja yang dapat dipertanggungjawabkan.</p>
      </div>
      <p className="login-photo-caption">Safety Inspection Unit and Behavior Driver</p>
    </section>

    <section className="login-form-wrap">
      <div className="login-mobile-brand"><AuthBrand/></div>
      <div className="login-form-heading">
        <p className="eyebrow">SISOBER workspace</p>
        <h2>Selamat datang kembali</h2>
        <p>Masuk dengan akun yang telah diaktifkan administrator.</p>
      </div>
      {error&&<p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message&&<p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <form action={login} className="mt-7 space-y-5">
        <label className="block text-sm font-bold">Email<input required type="email" name="email" autoComplete="email" className="field mt-2" placeholder="nama@perusahaan.com"/></label>
        <label className="block text-sm font-bold">Kata sandi<PasswordInput required name="password" autoComplete="current-password" className="mt-2"/></label>
        <div className="text-right"><Link href="/forgot-password" className="text-xs font-bold text-[var(--accent)] hover:underline">Lupa kata sandi?</Link></div>
        <button className="btn w-full">Masuk ke SISOBER</button>
      </form>
      <p className="login-support">Butuh akses? Hubungi administrator SISOBER perusahaan Anda.</p>
    </section>
  </main>;
}
