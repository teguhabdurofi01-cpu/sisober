"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ClipboardCheck, Database, LayoutDashboard, Settings, UserRound, Users } from "lucide-react";

const items = [
  ["/dashboard", "Beranda", LayoutDashboard],
  ["/findings", "Temuan", ClipboardCheck],
  ["/verification", "Verifikasi", Database],
  ["/notifications", "Notifikasi", Bell],
  ["/settings", "Profil", UserRound],
  ["/admin/users", "Pengguna", Users],
  ["/admin/master-data", "Kelola", Settings],
] as const;

export function FloatingNav({ role }: { role: string }) {
  const pathname = usePathname();
  const visible = items.filter(([href]) => {
    if (href.startsWith("/admin/")) return role === "SUPER_ADMIN";
    if (href === "/verification") return ["VERIFIER", "SUPER_ADMIN"].includes(role);
    return true;
  });
  const active = (href: string) => href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return <>
    <nav aria-label="Navigasi utama" className="floating-nav hidden lg:flex">
      {visible.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={active(href) ? "is-active" : ""}>
        <Icon size={15} strokeWidth={2.4}/><span>{label}</span>
      </Link>)}
    </nav>
    <nav aria-label="Navigasi seluler" className="mobile-dock lg:hidden">
      {visible.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={active(href) ? "is-active" : ""}>
        <Icon size={18} strokeWidth={2.3}/><span>{label}</span>
      </Link>)}
    </nav>
  </>;
}
