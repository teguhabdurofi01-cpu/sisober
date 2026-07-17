import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Save } from "lucide-react";
import { updateFinding } from "@/app/actions";
import { requireUserOrRedirect } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";

const statuses = ["OPEN", "PENDING_VERIFICATION", "REVISION_REQUIRED", "CLOSED"];
const evidenceRequirements = ["NONE", "OPTIONAL", "REQUIRED"];

export default async function EditFinding({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, notice] = await Promise.all([params, searchParams]);
  const ctx = await requireUserOrRedirect();
  if (ctx.profile.role !== "SUPER_ADMIN") redirect(`/findings/${id}`);

  const [{ data: finding }, { data: companies }, { data: categories }, { data: sections }] = await Promise.all([
    ctx.db.from("findings").select("*").eq("id", id).single(),
    ctx.db.from("companies").select("id,code,name").order("code"),
    ctx.db.from("categories").select("id,name").order("name"),
    ctx.db.from("sections").select("id,name").order("name"),
  ]);
  if (!finding) notFound();

  return <>
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm text-[var(--muted)]">Master Admin · Edit data</p><h1 className="text-2xl font-black">{finding.finding_number}</h1></div>
      <Link href={`/findings/${id}`} className="btn btn-secondary">Batal</Link>
    </header>
    {notice.error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{notice.error}</p>}
    <form action={updateFinding} className="panel mt-5 grid max-w-4xl gap-4 p-5 sm:grid-cols-2">
      <input type="hidden" name="id" value={id} />
      <label className="text-sm font-bold">Tanggal<input className="field mt-1" type="date" name="finding_date" required defaultValue={finding.finding_date} /></label>
      <label className="text-sm font-bold">Perusahaan<select className="field mt-1" name="company_id" defaultValue={finding.company_id}>{companies?.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label>
      <label className="text-sm font-bold">Unit<input className="field mt-1" name="unit_number" defaultValue={finding.unit_number || ""} /></label>
      <label className="text-sm font-bold">Section<select className="field mt-1" name="section_id" defaultValue={finding.section_id}>{sections?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-bold sm:col-span-2">Kategori<select className="field mt-1" name="category_id" defaultValue={finding.category_id}>{categories?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-bold sm:col-span-2">Keterangan singkat<textarea className="field mt-1 min-h-24" name="detailed_description" required defaultValue={finding.detailed_description} /></label>
      <label className="text-sm font-bold">Lokasi<input className="field mt-1" name="location" defaultValue={finding.location || ""} /></label>
      <label className="text-sm font-bold">Target<input className="field mt-1" type="date" name="target_date" defaultValue={finding.target_date || ""} /></label>
      <label className="text-sm font-bold">Status<select className="field mt-1" name="current_status" defaultValue={finding.current_status}>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
      <label className="text-sm font-bold">Persyaratan bukti<select className="field mt-1" name="evidence_requirement" defaultValue={finding.evidence_requirement}>{evidenceRequirements.map((requirement) => <option key={requirement} value={requirement}>{requirement}</option>)}</select></label>
      <SubmitButton className="btn sm:col-span-2" pendingLabel="Menyimpan perubahan…"><Save size={16} className="mr-2" />Simpan perubahan</SubmitButton>
    </form>
  </>;
}
