import Link from "next/link";
import { Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { requireUserOrRedirect as requireUser } from "@/lib/supabase/server";
export default async function Verification() {
  const ctx = await requireUser();
  if (!["VERIFIER", "SUPER_ADMIN"].includes(ctx!.profile.role))
    redirect("/dashboard");
  const { data, error } = await ctx!.db.rpc("verification_inbox");
  return (
    <>
      <div className="flex items-center gap-3">
        <Inbox className="text-[var(--accent)]" />
        <div>
          <h1 className="text-2xl font-black">Inbox verifikasi</h1>
          <p className="text-sm text-[var(--muted)]">
            {data?.length || 0} proposal menunggu keputusan.
          </p>
        </div>
      </div>
      {error && (
        <p className="mt-5 rounded bg-red-50 p-3 text-red-700">
          {error.message}
        </p>
      )}
      <div className="panel mt-6 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Temuan</th>
              <th>Unit</th>
              <th>Keterangan</th>
              <th>Perusahaan</th>
              <th>Pengirim</th>
              <th>Dikirim</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((s: any) => (
              <tr key={s.id}>
                <td className="font-bold">{s.finding_number}</td>
                <td className="whitespace-nowrap font-bold">
                  {s.unit_number || "—"}
                </td>
                <td className="min-w-64">{s.detailed_description}</td>
                <td>{s.company_name}</td>
                <td>{s.submitter_name}</td>
                <td className="whitespace-nowrap">
                  {s.submitted_at
                    ? new Date(s.submitted_at).toLocaleString("id-ID")
                    : "—"}
                </td>
                <td>
                  <Link
                    className="btn px-3 py-2 text-xs"
                    href={`/verification/${s.id}`}
                  >
                    Tinjau
                  </Link>
                </td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td
                  colSpan={7}
                  className="py-14 text-center text-[var(--muted)]"
                >
                  Tidak ada proposal yang menunggu verifikasi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
