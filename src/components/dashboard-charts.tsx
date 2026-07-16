"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type Point = { name: string; value: number };
export type MonthlyPoint = { name: string; open: number; closed: number };
export type RepeatUnit = { name: string; company: string; total: number; outstanding: number; last: string };
type Props = { category: Point[]; section: Point[]; aging: Point[]; companyRate: Point[]; monthly: MonthlyPoint[]; repeatUnits: RepeatUnit[] };

const tooltipStyle = { background: "#ffffff", border: "1px solid #d8dfdc", borderRadius: 7, color: "#17231f", boxShadow: "0 18px 40px rgba(25,55,42,.14)" };
const palette = ["#f47a20", "#65b96f", "#efb83f", "#7f78a8", "#d95649"];

function Panel({ title, note, children, className = "" }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return <section className={`command-panel ${className}`}><header className="command-panel-head"><div><h2>{title}</h2>{note && <p>{note}</p>}</div></header>{children}</section>;
}

function Empty() { return <div className="grid h-full place-items-center text-xs text-white/35">Belum ada data pada cakupan ini.</div>; }

export function PrimaryDashboardCharts({ monthly, repeatUnits }: Pick<Props, "monthly" | "repeatUnits">) {
  const max = Math.max(1, ...repeatUnits.map((item) => item.total));
  return <>
    <Panel title="Terbuka vs ditutup" note="Pergerakan temuan bulanan" className="command-primary-chart">
      <div className="h-[310px] lg:h-[340px]">
        {monthly.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={monthly} margin={{ left: -18, right: 14, top: 24, bottom: 4 }}><CartesianGrid stroke="#dce3e0" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="name" tick={{ fill: "#6f7e79", fontSize: 10 }} axisLine={false} tickLine={false}/><YAxis tick={{ fill: "#6f7e79", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false}/><Tooltip contentStyle={tooltipStyle} itemStyle={{color:"#17231f"}}/><Line type="monotone" dataKey="open" name="Terbuka" stroke="#df6b22" strokeWidth={3} dot={{ r: 3, fill: "#df6b22", strokeWidth: 0 }} label={{ fill: "#b9571c", fontSize: 10, position: "top" }}/><Line type="monotone" dataKey="closed" name="Ditutup" stroke="#36835a" strokeWidth={3} dot={{ r: 3, fill: "#36835a", strokeWidth: 0 }} label={{ fill: "#276947", fontSize: 10, position: "bottom" }}/></LineChart></ResponsiveContainer> : <Empty/>}
      </div>
      <div className="chart-key"><span><i className="bg-[#f47a20]"/>Terbuka</span><span><i className="bg-[#65b96f]"/>Ditutup</span></div>
    </Panel>
    <Panel title="Unit berulang" note="Prioritas inspeksi mendalam" className="command-repeat-panel">
      <div className="repeat-table-head"><span>Unit / kontraktor</span><span>Outstanding</span></div>
      <div className="repeat-list">{repeatUnits.slice(0,8).map((item, index) => <div className="repeat-row" key={`${item.name}-${item.company}`}>
        <span className="repeat-rank">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0"><div className="flex items-baseline justify-between gap-3"><b className="truncate">{item.name}</b><strong>{item.outstanding}</strong></div><p>{item.company} · terakhir {item.last}</p><div className="repeat-track"><i style={{ width: `${Math.max(8, item.total / max * 100)}%` }}/></div></div>
      </div>)}{!repeatUnits.length && <Empty/>}</div>
    </Panel>
  </>;
}

function HorizontalBars({ data, color = "#65b96f", suffix = "" }: { data: Point[]; color?: string; suffix?: string }) {
  if (!data.length) return <Empty/>;
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 0, right: 30, top: 4, bottom: 0 }}><CartesianGrid stroke="#dce3e0" strokeDasharray="3 5" horizontal={false}/><XAxis type="number" tick={{ fill: "#6f7e79", fontSize: 9 }} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" width={86} tick={{ fill: "#35443f", fontSize: 9 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={tooltipStyle} itemStyle={{color:"#17231f"}}/><Bar dataKey="value" name={suffix ? `Nilai ${suffix}` : "Temuan"} fill={color} radius={[0, 3, 3, 0]} maxBarSize={17} label={{ position: "right", fill: "#35443f", fontSize: 9, formatter: (value: unknown) => `${value}${suffix}` }}/></BarChart></ResponsiveContainer>;
}

export function SupportingDashboardCharts({ aging, companyRate, category, section }: Pick<Props, "aging" | "companyRate" | "category" | "section">) {
  const totalAging = aging.reduce((sum, item) => sum + item.value, 0);
  return <section className="command-support-grid">
    <Panel title="Aging outstanding" note="Umur temuan aktif"><div className="mini-chart-wrap">{totalAging ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={aging} dataKey="value" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={2}>{aging.map((_, index) => <Cell key={index} fill={palette[(index + 2) % palette.length]}/>)}</Pie><Tooltip contentStyle={tooltipStyle}/></PieChart></ResponsiveContainer> : <Empty/>}<div className="donut-total"><b>{totalAging}</b><span>aktif</span></div></div><div className="mini-legend">{aging.map((item, index) => <span key={item.name}><i style={{ background: palette[(index + 2) % palette.length] }}/>{item.name}<b>{item.value}</b></span>)}</div></Panel>
    <Panel title="Closure rate kontraktor" note="Rasio selesai terhadap total"><div className="h-[205px]"><HorizontalBars data={companyRate.slice(0,6)} suffix="%"/></div></Panel>
    <Panel title="Kategori dominan" note="Sumber temuan terbesar"><div className="h-[205px]"><HorizontalBars data={category.slice(0,6)} color="#f47a20"/></div></Panel>
    <Panel title="Distribusi section" note="Sebaran area hauling"><div className="h-[205px]"><HorizontalBars data={section.slice(0,6)} color="#efb83f"/></div></Panel>
  </section>;
}
