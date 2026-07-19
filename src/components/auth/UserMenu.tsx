"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { LogOut, ChevronDown } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  system_admin: "System Admin",
  skip_trace_agent: "Skip Trace Agent",
  senior_analyst: "Senior Analyst",
  batch_manager: "Batch Manager",
  compliance_officer: "Compliance Officer",
  bank_client: "Bank Client",
};

export default function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  if (!session?.user) return null;

  const user = session.user as { name: string; role: string };
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all w-full"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
          {initials}
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="text-xs font-semibold text-white truncate">{user.name}</div>
          <div className="text-[10px] text-slate-400 truncate">{ROLE_LABELS[user.role] ?? user.role}</div>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_#34d399]" />
        <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full mt-1 z-20 glass rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-xs font-semibold text-white">{user.name}</div>
              <div className="text-[10px] text-slate-400">{session.user.email}</div>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
