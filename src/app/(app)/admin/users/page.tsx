import { Trash2, UserPlus, Users } from "lucide-react";
import { redirect } from "next/navigation";
import {
  createManagedUser,
  deleteManagedUser,
  resetManagedUserPassword,
  setManagedUserActive,
  updateManagedUserRole,
} from "@/app/actions";
import { requireUserOrRedirect as requireUser } from "@/lib/supabase/server";
import { PasswordInput } from "@/components/password-input";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const ctx = await requireUser(),
    notice = await searchParams;
  if (ctx.profile.role !== "SUPER_ADMIN") redirect("/dashboard");
  const [{ data }, { data: companies }] = await Promise.all([
    ctx.db
      .from("profiles")
      .select(
        "id,full_name,email,nik,role,active,must_change_password,user_company_access(companies(id,code,name))",
      )
      .order("full_name"),
    ctx.db
      .from("companies")
      .select("id,code,name")
      .eq("active", true)
      .order("code"),
  ]);
  return (
    <>
      <header>
        <div className="flex items-center gap-3">
          <Users className="text-[var(--accent)]" />
          <div>
            <h1 className="text-2xl font-black">Pengguna & akses</h1>
            <p className="text-sm text-[var(--muted)]">
              Kelola akun, cakupan kontraktor, status, dan pemulihan akses tanpa
              menyentuh database.
            </p>
          </div>
        </div>
      </header>
      {notice.error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {notice.error}
        </p>
      ) : null}
      {notice.success ? (
        <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Perubahan pengguna berhasil disimpan.
        </p>
      ) : null}
      <section className="panel mt-6 p-5">
        <div className="flex items-center gap-2">
          <UserPlus size={18} />
          <h2 className="font-bold">Tambah pengguna</h2>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Gunakan email asli agar pemulihan mandiri dapat bekerja. Pengguna
          wajib mengganti kata sandi sementara saat login pertama.
        </p>
        <form
          action={createManagedUser}
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="text-xs font-bold">
            Nama lengkap
            <input required name="full_name" className="field mt-1" />
          </label>
          <label className="text-xs font-bold">
            Email aktif
            <input required type="email" name="email" className="field mt-1" />
          </label>
          <label className="text-xs font-bold">
            NIK
            <input name="nik" className="field mt-1" />
          </label>
          <label className="text-xs font-bold">
            Kata sandi sementara
            <PasswordInput
              required
              name="password"
              minLength={10}
              className="mt-1"
            />
          </label>
          <label className="text-xs font-bold">
            Peran
            <select
              required
              name="role"
              className="field mt-1"
              defaultValue="CONTRACTOR"
            >
              <option>CONTRACTOR</option>
              <option>VIEWER</option>
              <option>VERIFIER</option>
              <option>SUPER_ADMIN</option>
            </select>
          </label>
          <label className="text-xs font-bold sm:col-span-2">
            Perusahaan kontraktor
            <select name="company_id" className="field mt-1">
              <option value="">Pilih untuk akun kontraktor</option>
              {companies?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.code} — {x.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn self-end">Tambah pengguna</button>
        </form>
      </section>
      <div className="panel mt-6 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Peran</th>
              <th>Perusahaan</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((p: any) => (
              <tr key={p.id} className={!p.active ? "opacity-55" : ""}>
                <td className="font-bold">
                  {p.full_name}
                  <div className="mt-1 text-xs font-normal text-[var(--muted)]">
                    {p.nik || "Tanpa NIK"}
                  </div>
                </td>
                <td>{p.email}</td>
                <td>
                  {p.id === ctx.user.id ? (
                    p.role.replaceAll("_", " ")
                  ) : (
                    <details>
                      <summary className="cursor-pointer font-bold text-[var(--accent)]">
                        {p.role.replaceAll("_", " ")} · Ubah
                      </summary>
                      <form
                        action={updateManagedUserRole}
                        className="mt-2 min-w-64 space-y-2 rounded-lg border border-[var(--line)] bg-white p-3"
                      >
                        <input type="hidden" name="user_id" value={p.id} />
                        <label className="block text-xs font-bold">
                          Peran
                          <select
                            name="role"
                            defaultValue={p.role}
                            className="field mt-1"
                          >
                            <option>CONTRACTOR</option>
                            <option>VIEWER</option>
                            <option>VERIFIER</option>
                            <option>SUPER_ADMIN</option>
                          </select>
                        </label>
                        <label className="block text-xs font-bold">
                          Perusahaan (wajib untuk contractor)
                          <select
                            name="company_id"
                            className="field mt-1"
                            defaultValue={
                              p.user_company_access?.[0]?.companies?.id || ""
                            }
                          >
                            <option value="">
                              Tidak ada / akses lintas perusahaan
                            </option>
                            {companies?.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.code} — {company.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className="btn w-full px-3 py-2 text-xs">
                          Simpan peran
                        </button>
                      </form>
                    </details>
                  )}
                </td>
                <td>
                  {p.user_company_access
                    ?.map(
                      (x: any) => `${x.companies.code} — ${x.companies.name}`,
                    )
                    .join(", ") || "Akses lintas perusahaan"}
                </td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${p.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {p.active
                      ? p.must_change_password
                        ? "Harus ganti sandi"
                        : "Aktif"
                      : "Nonaktif"}
                  </span>
                </td>
                <td>
                  {p.id === ctx.user.id ? (
                    <span className="text-xs text-[var(--muted)]">
                      Akun Anda
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <details>
                        <summary className="btn cursor-pointer px-3 py-2 text-xs">
                          Reset sandi
                        </summary>
                        <form
                          action={resetManagedUserPassword}
                          className="mt-2 min-w-64 space-y-2 rounded-lg border border-[var(--line)] bg-white p-3"
                        >
                          <input type="hidden" name="user_id" value={p.id} />
                          <label className="text-xs font-bold">
                            Kata sandi sementara
                            <PasswordInput
                              required
                              name="password"
                              minLength={10}
                              className="mt-1"
                            />
                          </label>
                          <button className="btn w-full px-3 py-2 text-xs">
                            Reset & wajibkan ganti
                          </button>
                        </form>
                      </details>
                      <form action={setManagedUserActive}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={String(!p.active)}
                        />
                        <button
                          className={`btn px-3 py-2 text-xs ${p.active ? "bg-red-700" : ""}`}
                        >
                          {p.active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </form>
                      <form action={deleteManagedUser}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <ConfirmSubmitButton
                          className="btn bg-[#3b1715] px-3 py-2 text-xs"
                          message={`Hapus akun ${p.full_name}? Akun dengan riwayat operasional aktif akan dilindungi.`}
                        >
                          <Trash2 size={14} />
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
