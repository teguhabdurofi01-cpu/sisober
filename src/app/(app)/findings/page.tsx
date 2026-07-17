import Link from "next/link";
import { Search } from "lucide-react";
import { requireUserOrRedirect as requireUser } from "@/lib/supabase/server";
type Params = {
  q?: string;
  view?: string;
  status?: string;
  company?: string;
  category?: string;
  section?: string;
  page?: string;
};
export default async function Findings({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const ctx = await requireUser(),
    p = await searchParams,
    page = Math.max(1, Number(p.page) || 1),
    size = 50,
    from = (page - 1) * size,
    isContractor = ctx!.profile.role === "CONTRACTOR";
  const [companyResult, { data: categories }, { data: sections }] =
    await Promise.all([
      isContractor
        ? ctx!.db
            .from("user_company_access")
            .select("companies(id,code)")
            .eq("user_id", ctx!.user.id)
        : ctx!.db
            .from("companies")
            .select("id,code")
            .eq("active", true)
            .order("code"),
      ctx!.db
        .from("categories")
        .select("id,name")
        .eq("active", true)
        .order("name"),
      ctx!.db
        .from("sections")
        .select("id,name")
        .eq("active", true)
        .order("name"),
    ]);
  const companies = isContractor
    ? (companyResult.data ?? [])
        .map((x: any) => x.companies)
        .filter(Boolean)
        .sort((a: any, b: any) => a.code.localeCompare(b.code))
    : companyResult.data;
  let query = ctx!.db
    .from("findings")
    .select(
      "id,finding_number,finding_date,detailed_description,current_status,target_date,unit_number,companies(name),categories(short_name),sections(name)",
      { count: "exact" },
    )
    .order("finding_date", { ascending: false })
    .range(from, from + size - 1);
  if (p.view === "outstanding") query = query.neq("current_status", "CLOSED");
  else if (p.status) query = query.eq("current_status", p.status);
  if (p.company) query = query.eq("company_id", p.company);
  if (p.category) query = query.eq("category_id", p.category);
  if (p.section) query = query.eq("section_id", p.section);
  if (p.q) {
    const safe = p.q.replace(/[%(),]/g, "").trim();
    if (safe)
      query = query.or(
        `finding_number.ilike.%${safe}%,detailed_description.ilike.%${safe}%,unit_number.ilike.%${safe}%`,
      );
  }
  const { data, error, count } = await query,
    total = count ?? 0,
    pages = Math.max(1, Math.ceil(total / size));
  const preserved = new URLSearchParams(
    Object.entries(p).filter(([k, v]) => k !== "page" && Boolean(v)) as [
      string,
      string,
    ][],
  );
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">
            {p.view === "outstanding"
              ? "Outstanding perusahaan saya"
              : "Daftar temuan"}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {total} temuan ditemukan · akses dibatasi otomatis oleh RLS.
          </p>
        </div>
        {["VERIFIER", "SUPER_ADMIN"].includes(ctx!.profile.role) && (
          <Link className="btn" href="/findings/new">
            Buat temuan
          </Link>
        )}
      </div>
      <form
        method="get"
        className="panel mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <label className="text-xs font-bold lg:col-span-2">
          Cari nomor, unit, atau deskripsi
          <div className="relative mt-1">
            <Search
              className="absolute left-3 top-3 text-[var(--muted)]"
              size={16}
            />
            <input
              className="field pl-9"
              name="q"
              defaultValue={p.q}
              placeholder="Contoh: SIS-2026 atau SCMHLG"
            />
          </div>
        </label>
        <label className="text-xs font-bold">
          Tampilan
          <select
            className="field mt-1"
            name="view"
            defaultValue={p.view || "all"}
          >
            <option value="all">Semua temuan</option>
            <option value="outstanding">Outstanding saja</option>
          </select>
        </label>
        <label className="text-xs font-bold">
          Status
          <select
            className="field mt-1"
            name="status"
            defaultValue={p.status || ""}
          >
            <option value="">Semua status</option>
            {[
              "OPEN",
              "PENDING_VERIFICATION",
              "REVISION_REQUIRED",
              "CLOSED",
            ].map((x) => (
              <option key={x}>{x.replaceAll("_", " ")}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Perusahaan
          <select
            className="field mt-1"
            name="company"
            defaultValue={p.company || ""}
          >
            <option value="">Semua perusahaan</option>
            {companies?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.code}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          Section
          <select
            className="field mt-1"
            name="section"
            defaultValue={p.section || ""}
          >
            <option value="">Semua section</option>
            {sections?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold lg:col-span-2">
          Kategori
          <select
            className="field mt-1"
            name="category"
            defaultValue={p.category || ""}
          >
            <option value="">Semua kategori</option>
            {categories?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn self-end">Tarik data</button>
        <Link className="btn btn-secondary self-end" href="/findings">
          Reset
        </Link>
      </form>
      {error && <p className="mt-4 text-red-700">{error.message}</p>}
      <div className="panel mt-5 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Nomor</th>
              <th>Tanggal</th>
              <th>Perusahaan</th>
              <th>Unit</th>
              <th>Keterangan</th>
              <th>Kategori</th>
              <th>Section</th>
              <th>Target</th>
              <th>Status</th>
              {isContractor && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {data?.map((r: any) => (
              <tr key={r.id}>
                <td>
                  <Link
                    className="font-bold text-[var(--accent)]"
                    href={`/findings/${r.id}`}
                  >
                    {r.finding_number}
                  </Link>
                </td>
                <td>{r.finding_date}</td>
                <td>{r.companies?.name}</td>
                <td className="whitespace-nowrap font-black">
                  {r.unit_number || "—"}
                </td>
                <td className="min-w-64">{r.detailed_description}</td>
                <td>{r.categories?.short_name}</td>
                <td>{r.sections?.name}</td>
                <td>{r.target_date || "—"}</td>
                <td>{r.current_status.replaceAll("_", " ")}</td>
                {isContractor && (
                  <td>
                    {["OPEN", "REVISION_REQUIRED"].includes(
                      r.current_status,
                    ) ? (
                      <Link
                        className="btn whitespace-nowrap px-3 py-2 text-xs"
                        href={`/findings/${r.id}/close`}
                      >
                        Ajukan penutupan
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">
                        Menunggu / selesai
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td
                  colSpan={isContractor ? 10 : 9}
                  className="py-12 text-center text-[var(--muted)]"
                >
                  Tidak ada temuan yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">
          Halaman {page} dari {pages}
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              className="btn btn-secondary"
              href={`/findings?${preserved.toString()}${preserved.size ? "&" : ""}page=${page - 1}`}
            >
              Sebelumnya
            </Link>
          )}
          {page < pages && (
            <Link
              className="btn btn-secondary"
              href={`/findings?${preserved.toString()}${preserved.size ? "&" : ""}page=${page + 1}`}
            >
              Berikutnya
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
