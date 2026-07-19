"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Shield,
  FileText,
  BarChart3,
  Layers,
  AlertTriangle,
  ChevronRight,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import UserMenu from "@/components/auth/UserMenu";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Overview & alerts",
  },
  {
    label: "Case Queue",
    href: "/accounts",
    icon: Layers,
    description: "All accounts",
  },
  {
    label: "Batch Processing",
    href: "/batch",
    icon: Search,
    description: "Bulk skip trace",
  },
  {
    label: "Compliance",
    href: "/compliance",
    icon: Shield,
    description: "Flags & scrubs",
  },
  {
    label: "Audit Log",
    href: "/audit",
    icon: FileText,
    description: "FCRA trail",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "KPI reporting",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-40"
      style={{ width: "260px" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-wide">
              SkipTrace Pro
            </div>
            <div className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
              Debt Recovery
            </div>
          </div>
        </div>
      </div>

      {/* Agent info */}
      <div className="px-3 py-4 border-b border-white/8">
        <UserMenu />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 mb-3">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group",
                active
                  ? "bg-blue-500/20 border border-blue-500/30 text-blue-300"
                  : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
              )}
            >
              <Icon
                className={clsx(
                  "w-4 h-4 shrink-0 transition-colors",
                  active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <div className="flex-1 min-w-0">
                <div
                  className={clsx(
                    "text-xs font-semibold",
                    active ? "text-blue-300" : "group-hover:text-white"
                  )}
                >
                  {item.label}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {item.description}
                </div>
              </div>
              {active && (
                <ChevronRight className="w-3 h-3 text-blue-400 shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Compliance warning */}
      <div className="px-3 pb-4">
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                FCRA Compliance Active
              </div>
              <div className="text-[10px] text-amber-400/70 mt-0.5 leading-relaxed">
                All searches are logged. Permissible purpose required.
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
