"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Phone,
  Scale,
  Info,
} from "lucide-react";
import { FlagBadge } from "@/components/StatusBadge";
import { clsx } from "clsx";

type ComplianceFlag = {
  id: string;
  flagType: string;
  flagDate: string;
  source: string | null;
  notes: string | null;
  isActive: boolean;
  resolvedAt: string | null;
  createdAt: string;
  debtorFirst: string | null;
  debtorLast: string | null;
  debtorDob: string | null;
  accountNumber: string | null;
  accountId: string | null;
  bankName: string | null;
};

type TypeCount = {
  flagType: string;
  count: number;
  active: number;
};

const FLAG_INFO: Record<string, { title: string; law: string; action: string; icon: React.ElementType; color: string }> = {
  bankruptcy: {
    title: "Bankruptcy Filed",
    law: "11 U.S.C. §362 — Automatic Stay",
    action: "Immediately cease all collection activity. Route to legal team.",
    icon: Scale,
    color: "red",
  },
  deceased: {
    title: "Debtor Deceased",
    law: "SSDI Match / Death Certificate",
    action: "Close account. Contact estate executor if applicable.",
    icon: XCircle,
    color: "slate",
  },
  attorney_rep: {
    title: "Attorney Representation",
    law: "FDCPA §1692c(a)(2)",
    action: "Route ALL communication through debtor's attorney. No direct contact.",
    icon: FileText,
    color: "purple",
  },
  do_not_contact: {
    title: "Do Not Contact",
    law: "FDCPA §1692c(c)",
    action: "Cease all communication immediately per written request.",
    icon: Phone,
    color: "orange",
  },
  minor: {
    title: "Minor / Underage",
    law: "CFPB Guidelines",
    action: "Verify age. If confirmed minor, close account and notify bank client.",
    icon: AlertTriangle,
    color: "yellow",
  },
};

const COLOR_MAP: Record<string, string> = {
  red: "bg-red-500/10 border-red-500/25 text-red-400",
  slate: "bg-slate-500/10 border-slate-500/25 text-slate-300",
  purple: "bg-purple-500/10 border-purple-500/25 text-purple-400",
  orange: "bg-orange-500/10 border-orange-500/25 text-orange-400",
  yellow: "bg-yellow-500/10 border-yellow-500/25 text-yellow-400",
};

export default function CompliancePage() {
  const [flags, setFlags] = useState<ComplianceFlag[]>([]);
  const [typeCounts, setTypeCounts] = useState<TypeCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/compliance")
      .then(async (r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((data) => {
        setFlags(data.flags ?? []);
        setTypeCounts(data.typeCounts ?? []);
      })
      .catch(() => setError("Failed to load compliance data"))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all"
      ? flags
      : filter === "active"
      ? flags.filter((f) => f.isActive)
      : flags.filter((f) => f.flagType === filter);

  const activeTotal = flags.filter((f) => f.isActive).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            FCRA · FDCPA · TCPA · Bankruptcy · Deceased scrubs
          </p>
        </div>
        <div
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold",
            activeTotal > 0
              ? "bg-red-500/10 border-red-500/25 text-red-400"
              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
          )}
        >
          {activeTotal > 0 ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {activeTotal > 0 ? `${activeTotal} Active Flags` : "All Clear"}
        </div>
      </div>

      {/* Regulatory reference cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(FLAG_INFO).map(([key, info]) => {
          const Icon = info.icon;
          const count = typeCounts.find((t) => t.flagType === key);
          const colorCls = COLOR_MAP[info.color] ?? COLOR_MAP.slate;
          return (
            <div
              key={key}
              className={clsx("rounded-2xl p-4 border", colorCls)}
            >
              <div className="flex items-start gap-3">
                <div className={clsx("p-2 rounded-xl bg-white/8")}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold">{info.title}</span>
                    {count && Number(count.count) > 0 && (
                      <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">
                        {Number(count.count)} on file
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] opacity-70 mb-2">{info.law}</div>
                  <div className="text-[10px] leading-relaxed opacity-80">
                    <strong>Required Action:</strong> {info.action}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compliance checklist */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">System Compliance Checklist</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { label: "Permissible Purpose Certification", desc: "Required before each search — FCRA §604", ok: true },
            { label: "Bankruptcy Auto-Scrub", desc: "Real-time PACER monitoring", ok: true },
            { label: "Deceased Flag (SSDI)", desc: "Social Security Death Index integration", ok: true },
            { label: "TCPA Cell Phone Flagging", desc: "All mobile numbers flagged automatically", ok: true },
            { label: "DNC Registry Check", desc: "Federal & state Do Not Call lists", ok: true },
            { label: "Attorney Rep Detection", desc: "Auto-flag on written notification receipt", ok: true },
            { label: "Immutable Audit Trail", desc: "Write-once FCRA + FDCPA log", ok: true },
            { label: "Third-Party Contact Limit", desc: "FDCPA §1692b — one contact per third party", ok: true },
            { label: "State-Specific Rules", desc: "CA, NY, TX, FL rule engine active", ok: true },
            { label: "Data Retention Policy", desc: "7-year retention per state requirements", ok: true },
            { label: "SSN Encryption at Rest", desc: "AES-256 encryption for all PII", ok: true },
            { label: "Reg F Communication Limits", desc: "7-call per week limit monitoring", ok: true },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/6"
            >
              {item.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-xs font-semibold text-white">{item.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flags table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-bold text-white">All Compliance Flags</h2>
          <div className="flex items-center gap-1">
            {["all", "active", "bankruptcy", "deceased", "attorney_rep", "do_not_contact", "minor"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  "px-3 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all",
                  filter === f
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
                )}
              >
                {f.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No compliance flags found
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((flag) => {
              const info = FLAG_INFO[flag.flagType];
              return (
                <div key={flag.id} className="px-5 py-4 flex items-start gap-4">
                  <FlagBadge flagType={flag.flagType} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-white">
                        {flag.debtorFirst} {flag.debtorLast}
                      </span>
                      {flag.accountNumber && (
                        <span className="text-[11px] font-mono text-slate-500">
                          {flag.accountNumber}
                        </span>
                      )}
                      {flag.bankName && (
                        <span className="text-[11px] text-slate-600">
                          {flag.bankName}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">
                      {flag.notes}
                    </div>
                    {info && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500">
                        <Info className="w-3 h-3" />
                        {info.law}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={clsx(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
                        flag.isActive
                          ? "bg-red-500/15 text-red-400 border border-red-500/25"
                          : "bg-slate-500/15 text-slate-400 border border-slate-500/25"
                      )}
                    >
                      {flag.isActive ? "ACTIVE" : "RESOLVED"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{flag.flagDate}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      Source: {flag.source ?? "System"}
                    </div>
                    {flag.accountId && (
                      <Link
                        href={`/accounts/${flag.accountId}`}
                        className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 inline-block"
                      >
                        View account →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
