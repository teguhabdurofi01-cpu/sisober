import Link from "next/link";
import { ArrowRight, CalendarDays, Download, Filter, Plus, RotateCcw } from "lucide-react";
import { PrimaryDashboardCharts, SupportingDashboardCharts, type MonthlyPoint, type RepeatUnit } from "@/components/dashboard-charts";
import { requireUserOrRedirect as requireUser } from "@/lib/supabase/server";

type Params = { from?: string; to?: string; year?: string; month?: string; company?: string; category?: string; group?: string; section?: string; status?: string };
type Finding = { id: string; finding_number: string; finding_date: string; target_date: string | null; detailed_description: string; current_status: string; closed_at: string | null; company_id: string; category_id: string; section_id: string; unit_number: string | null; companies: { name: string; code: string } | null; categories: { name: string; category_group: string } | null; sections: { name: string } | null };
const statusLabels: Record<string, string> = { OPEN: "Terbuka", PENDING_VERIFICATION: "Menunggu verifikasi", REVISION_REQUIRED: "Perlu revisi", CLOSED: "Selesai" };
const ageInDays = (date: string) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
const shortDate = (date: string) => new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const countBy = (values: string[], limit = 20) => Object.entries(values.reduce<Record<string, number>>((acc, value) => { acc[value] = (acc[value] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, value]) => ({ name, value }));

export default async function Dashboard({ searchParams }: { searchParams: Promise<Params> }) {
  const ctx = await requireUser();
  const db = ctx.db;
  const params = await searchParams;
  const isContractor = ctx.profile.role === "CONTRACTOR";
  const isAdmin = ctx.profile.role === "SUPER_ADMIN";
  const [companyResult, { data: categories }, { data: sections }] = await Promise.all([
    isContractor ? db.from("user_company_access").select("companies(id,code,name)").eq("user_id", ctx.user.id) : db.from("companies").select("id,code,name").eq("active", true).order("code"),
    db.from("categories").select("id,name,category_group").eq("active", true).order("name"),
    db.from("sections").select("id,name").eq("active", true).order("name"),
  ]);
  const companies = isContractor ? (companyResult.data ?? []).map((item: any) => item.companies).filter(Boolean).sort((a: any, b: any) => a.code.localeCompare(b.code)) : companyResult.data;
  let query = db.from("findings").select("id,finding_number,finding_date,target_date,detailed_description,current_status,closed_at,company_id,category_id,section_id,unit_number,companies(name,code),categories(name,category_group),sections(name)").order("finding_date", { ascending: false });
  if (params.from) query = query.gte("finding_date", params.from);
  if (params.to) query = query.lte("finding_date", params.to);
  if (params.company) query = query.eq("company_id", params.company);
  if (params.category) query = query.eq("category_id", params.category);
  if (params.section) query = query.eq("section_id", params.section);
  if (params.status) query = query.eq("current_status", params.status);
  const { data, error } = await query;
  const rows = (data ?? []) as unknown as Finding[];
  const active = rows.filter((item) => item.current_status !== "CLOSED");
  const closed = rows.filter((item) => item.current_status === "CLOSED");
  const revision = rows.filter((item) => item.current_status === "REVISION_REQUIRED");
  const overdue = active.filter((item) => item.target_date && new Date(item.target_date).getTime() < Date.now());
  const urgent = active.slice().sort((a, b) => Number(Boolean(b.target_date && new Date(b.target_date).getTime() < Date.now())) - Number(Boolean(a.target_date && new Date(a.target_date).getTime() < Date.now())) || (a.target_date || "9999").localeCompare(b.target_date || "9999"));
  const currentMonth = new Date().toISOString().slice(0, 7);
  const closedThisMonth = closed.filter((item) => item.closed_at?.slice(0, 7) === currentMonth).length;

  const monthlyMap = new Map<string, MonthlyPoint>();
  rows.forEach((item) => { const key = item.finding_date.slice(0, 7); const point = monthlyMap.get(key) ?? { name: key, open: 0, closed: 0 }; point.open += 1; if (item.current_status === "CLOSED") point.closed += 1; monthlyMap.set(key, point); });
  const monthly = [...monthlyMap.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(-8).map((item) => ({ ...item, name: new Date(`${item.name}-01`).toLocaleDateString("id-ID", { month: "short", year: "2-digit" }) }));
  const repeatMap = new Map<string, RepeatUnit>();
  rows.filter((item) => item.unit_number?.trim()).forEach((item) => { const name = item.unit_number!.trim(); const company = item.companies?.code || "—"; const key = `${company}:${name}`; const current = repeatMap.get(key) ?? { name, company, total: 0, outstanding: 0, last: item.finding_date }; current.total += 1; current.outstanding += item.current_status === "CLOSED" ? 0 : 1; if (item.finding_date > current.last) current.last = item.finding_date; repeatMap.set(key, current); });
  const repeatUnits = [...repeatMap.values()].filter((item) => item.total > 1).sort((a, b) => b.outstanding - a.outstanding || b.total - a.total).map((item) => ({ ...item, last: shortDate(item.last) }));
  const companyGroups = rows.reduce<Record<string, { total: number; closed: number }>>((acc, item) => { const name = item.companies?.code || "—"; acc[name] ??= { total: 0, closed: 0 }; acc[name].total += 1; acc[name].closed += item.current_status === "CLOSED" ? 1 : 0; return acc; }, {});
  const companyRate = Object.entries(companyGroups).map(([name, value]) => ({ name, value: Math.round(value.closed / value.total * 100) })).sort((a, b) => b.value - a.value);
  const aging = [{ name: "0–3 hari", value: 0 }, { name: "4–7 hari", value: 0 }, { name: "8–14 hari", value: 0 }, { name: ">14 hari", value: 0 }];
  active.forEach((item) => { const age = ageInDays(item.finding_date); aging[age <= 3 ? 0 : age <= 7 ? 1 : age <= 14 ? 2 : 3].value += 1; });
  const activeFilters = [params.from, params.to, params.company, params.category, params.section, params.status].filter(Boolean).length;
  const today = new Date();
  const weekday = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "Asia/Jakarta" }).format(today);
  const fullDate = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(today);
  const metrics = [
    { label: "Temuan terbuka", value: active.length, note: `${overdue.length} melewati target`, tone: "orange", href: "/findings?view=outstanding" },
    { label: "Ditutup bulan ini", value: closedThisMonth, note: `${closed.length} selesai seluruhnya`, tone: "green", href: "/findings?status=CLOSED" },
    { label: "Overdue", value: overdue.length, note: overdue.length ? "perlu tindakan segera" : "tidak ada keterlambatan", tone: "red", href: "/findings?view=outstanding" },
    { label: "Rejected closure", value: revision.length, note: "menunggu perbaikan bukti", tone: "amber", href: "/findings?status=REVISION_REQUIRED" },
  ];

  return <div className="command-dashboard">
    <header className="command-toolbar"><div><h1>Safety intelligence</h1><p>{isContractor ? `Outstanding untuk ${companies?.map((item: any) => item.code).join(", ") || "kontraktor Anda"}` : "Ringkasan keselamatan unit dan perilaku pengemudi"}</p><time className="command-date" dateTime={today.toISOString()}><CalendarDays size={12}/>{weekday}, {fullDate}</time></div><div className="command-actions">{isAdmin && <a className="command-btn secondary" href="/api/export/findings"><Download size={15}/>Export</a>}<Link className="command-btn" href={isContractor ? "/findings?view=outstanding" : "/findings/new"}>{isContractor ? "Lihat tugas" : <><Plus size={15}/>Temuan baru</>}</Link></div></header>
    {!isContractor && <details className="command-filter" open={activeFilters > 0}><summary><span><Filter size={15}/>Filter data {activeFilters > 0 && <b>{activeFilters} aktif</b>}</span><span className="filter-summary"><CalendarDays size={14}/>{params.from || "Semua tanggal"}{params.to ? ` – ${params.to}` : ""}</span></summary><form method="get"><label>Dari<input type="date" name="from" defaultValue={params.from}/></label><label>Sampai<input type="date" name="to" defaultValue={params.to}/></label><label>Kontraktor<select name="company" defaultValue={params.company || ""}><option value="">Semua</option>{companies?.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label><label>Kategori<select name="category" defaultValue={params.category || ""}><option value="">Semua</option>{categories?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Section<select name="section" defaultValue={params.section || ""}><option value="">Semua</option>{sections?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Status<select name="status" defaultValue={params.status || ""}><option value="">Semua</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="command-btn">Terapkan</button><Link className="command-reset" href="/dashboard"><RotateCcw size={14}/>Reset</Link></form></details>}
    {error && <p className="command-error">{error.message}</p>}
    <section className="command-kpis">{metrics.map((metric) => <Link href={metric.href} className={`command-kpi ${metric.tone}`} key={metric.label}><p>{metric.label}</p><div><strong>{metric.value}</strong><span>{metric.note}</span></div></Link>)}</section>
    <section className="command-primary-grid"><PrimaryDashboardCharts monthly={monthly} repeatUnits={repeatUnits}/><section className="command-panel command-queue"><header className="command-panel-head"><div><h2>Antrian tindak lanjut</h2><p>Outstanding paling mendesak</p></div><Link href="/findings?view=outstanding">Lihat semua <ArrowRight size={13}/></Link></header><div className="queue-list">{urgent.slice(0,7).map((item) => { const age = ageInDays(item.finding_date); const isOverdue = Boolean(item.target_date && new Date(item.target_date).getTime() < Date.now()); return <Link href={`/findings/${item.id}`} className="queue-row" key={item.id}><span className={`queue-age ${isOverdue ? "danger" : ""}`}><b>{age}</b>hari</span><span className="queue-copy"><b>{item.unit_number || item.finding_number}</b><small>{item.companies?.code} · {item.categories?.name}</small><em>{item.detailed_description || "Tidak ada catatan"}</em></span><span className={`queue-status ${isOverdue ? "danger" : item.current_status === "REVISION_REQUIRED" ? "revision" : ""}`}>{isOverdue ? "Overdue" : statusLabels[item.current_status]}</span></Link>; })}{!urgent.length && <div className="queue-empty">Antrian bersih. Tidak ada temuan aktif.</div>}</div></section></section>
    <SupportingDashboardCharts aging={aging} companyRate={companyRate} category={countBy(rows.map((item) => item.categories?.name || "Tanpa kategori"), 8)} section={countBy(rows.map((item) => item.sections?.name || "Tanpa section"), 8)}/>
    <footer className="command-footer"><span>SISOBER · Safety Inspection Unit and Behavior Driver</span><span>Data diperbarui {new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span></footer>
  </div>;
}
