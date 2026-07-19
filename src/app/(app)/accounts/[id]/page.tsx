"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Shield,
  Phone,
  Mail,
  MapPin,
  Users,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Zap,
  Clock,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StatusBadge, FlagBadge, ConfidenceBadge } from "@/components/StatusBadge";
import { clsx } from "clsx";

// ─── Types ───────────────────────────────────────────────────────────────────

type AccountDetail = {
  account: {
    id: string;
    accountNumber: string;
    balance: string;
    openDate: string | null;
    chargeOffDate: string | null;
    skipTraceStatus: string;
    failedCallAttempts: number;
    mailReturned: boolean;
    emailBounced: boolean;
    daysNoContact: number;
    priority: number;
    lastTraceDate: string | null;
    nextRetraceDue: string | null;
    debtorId: string;
    debtorFirstName: string;
    debtorLastName: string;
    debtorMiddleName: string | null;
    debtorAliases: string | null;
    debtorDob: string | null;
    debtorGender: string | null;
    debtorSsnLast4: string | null;
    agentId: string | null;
    agentFirstName: string | null;
    agentLastName: string | null;
    agentRole: string | null;
    bankName: string;
    bankCode: string;
    bankContactName: string | null;
  };
  contacts: Array<{
    id: string;
    contactType: string;
    value: string;
    phoneType: string | null;
    confidenceScore: string;
    sourceTier: string | null;
    sourceProvider: string | null;
    firstSeen: string | null;
    lastSeen: string | null;
    isCurrent: boolean;
    tcpaFlagged: boolean;
    dncStatus: boolean;
    verified: boolean;
    crossVerified: boolean;
  }>;
  flags: Array<{
    id: string;
    flagType: string;
    flagDate: string;
    source: string | null;
    notes: string | null;
    isActive: boolean;
  }>;
  network: Array<{
    id: string;
    relationshipType: string;
    name: string;
    phone: string | null;
    address: string | null;
    sourceProvider: string | null;
    fdcpaContactAttempts: number;
  }>;
  auditLogs: Array<{
    id: string;
    dataSource: string;
    permissiblePurpose: string;
    resultSummary: Record<string, unknown> | null;
    searchTimestamp: string;
    agentFirstName: string | null;
    agentLastName: string | null;
  }>;
  results: Array<{
    id: string;
    resultStatus: string;
    confidenceScore: string | null;
    bestAddress: string | null;
    bestPhone: string | null;
    bestEmail: string | null;
    notes: string | null;
    completedAt: string;
  }>;
  notes: Array<{
    id: string;
    note: string;
    createdAt: string;
    agentFirstName: string | null;
    agentLastName: string | null;
  }>;
};

// ─── Compliance Panel ────────────────────────────────────────────────────────

function CompliancePanel({
  flags,
  account,
}: {
  flags: AccountDetail["flags"];
  account: AccountDetail["account"];
}) {
  const activeFlags = flags.filter((f) => f.isActive);
  const hasBankruptcy = activeFlags.some((f) => f.flagType === "bankruptcy");
  const hasDeceased = activeFlags.some((f) => f.flagType === "deceased");
  const hasAttorney = activeFlags.some((f) => f.flagType === "attorney_rep");
  const hasDNC = activeFlags.some((f) => f.flagType === "do_not_contact");

  const checks = [
    {
      label: "Permissible Purpose",
      ok: true,
      value: "FCRA §604(a)(3)(A) — Debt Collection",
    },
    {
      label: "Bankruptcy Scrub",
      ok: !hasBankruptcy,
      value: hasBankruptcy ? "⚠ BANKRUPTCY FILED — STOP" : "CLEAR",
    },
    {
      label: "Deceased Check (SSDI)",
      ok: !hasDeceased,
      value: hasDeceased ? "⚠ DECEASED — CLOSE ACCOUNT" : "CLEAR",
    },
    {
      label: "Attorney Representation",
      ok: !hasAttorney,
      value: hasAttorney ? "⚠ ROUTE VIA ATTORNEY" : "Clear",
    },
    {
      label: "Do Not Contact",
      ok: !hasDNC,
      value: hasDNC ? "⚠ CEASE COMMS REQUESTED" : "Clear",
    },
  ];

  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-bold text-white">Compliance Panel</h3>
        {activeFlags.length > 0 && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
            {activeFlags.length} ACTIVE FLAG{activeFlags.length > 1 ? "S" : ""}
          </span>
        )}
      </div>
      {checks.map((check) => (
        <div
          key={check.label}
          className={clsx(
            "flex items-start gap-3 p-3 rounded-xl border",
            check.ok
              ? "bg-emerald-500/5 border-emerald-500/15"
              : "bg-red-500/10 border-red-500/25"
          )}
        >
          {check.ok ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-slate-300">
              {check.label}
            </div>
            <div
              className={clsx(
                "text-[11px] mt-0.5",
                check.ok ? "text-emerald-400" : "text-red-400 font-bold"
              )}
            >
              {check.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Contact Card ────────────────────────────────────────────────────────────

function ContactCard({
  contact,
}: {
  contact: AccountDetail["contacts"][number];
}) {
  const score = parseFloat(contact.confidenceScore);
  const icons = {
    address: MapPin,
    phone: Phone,
    email: Mail,
  };
  const Icon = icons[contact.contactType as keyof typeof icons] ?? FileText;

  return (
    <div
      className={clsx(
        "p-4 rounded-xl border transition-all",
        contact.isCurrent
          ? "bg-white/4 border-white/10"
          : "bg-white/2 border-white/6 opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2">
          <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <div
              className={clsx(
                "text-sm font-semibold",
                contact.isCurrent ? "text-white" : "text-slate-400"
              )}
            >
              {contact.value}
            </div>
            {contact.phoneType && (
              <div className="text-[10px] text-slate-500 capitalize mt-0.5">
                {contact.phoneType}
                {!contact.isCurrent && " — Inactive"}
              </div>
            )}
          </div>
        </div>
        <ConfidenceBadge score={score} />
      </div>

      <div className="flex items-center flex-wrap gap-1.5 mt-2">
        {contact.sourceProvider && (
          <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
            {contact.sourceProvider}
          </span>
        )}
        {contact.lastSeen && (
          <span className="text-[10px] text-slate-500">
            Last seen: {contact.lastSeen}
          </span>
        )}
        {contact.tcpaFlagged && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-2.5 h-2.5" />
            TCPA — Consent Required
          </span>
        )}
        {contact.dncStatus && (
          <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
            DNC — Do Not Call
          </span>
        )}
        {contact.verified && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Verified
          </span>
        )}
        {contact.crossVerified && (
          <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
            Cross-Verified
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Trace Button ────────────────────────────────────────────────────────────

function TraceButton({
  accountId,
  agentId,
  onComplete,
}: {
  accountId: string;
  agentId: string | null;
  onComplete: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    finalScore: number;
    resultStatus: string;
    sourcesQueried: string[];
  } | null>(null);
  const [showWaterfall, setShowWaterfall] = useState(false);

  const runTrace = async (type: string) => {
    if (!agentId) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}/trace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, traceType: type }),
      });
      if (!res.ok) throw new Error("Trace failed");
      const data = await res.json();
      setResult(data);
      onComplete();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-bold text-white">Run Skip Trace</h3>
      </div>

      <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
            FCRA Permissible Purpose Certification
          </span>
        </div>
        <p className="text-[11px] text-amber-400/80">
          By initiating this search I certify the permissible purpose is debt
          collection under FCRA §604(a)(3)(A). This search will be permanently
          logged.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => runTrace("quick")}
          disabled={running || !agentId}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="w-4 h-4 text-blue-400" />
          <span className="text-[10px] font-semibold text-blue-400">Single Search</span>
        </button>
        <button
          onClick={() => runTrace("waterfall")}
          disabled={running || !agentId}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-semibold text-indigo-400">Waterfall</span>
        </button>
        <button
          onClick={() => runTrace("full")}
          disabled={running || !agentId}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4 text-purple-400" />
          <span className="text-[10px] font-semibold text-purple-400">Full Trace</span>
        </button>
      </div>

      {running && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <div>
            <div className="text-xs font-semibold text-blue-300">Running API Waterfall...</div>
            <div className="text-[10px] text-blue-400/70">Querying data providers in sequence</div>
          </div>
        </div>
      )}

      {result && (
        <div
          className={clsx(
            "p-4 rounded-xl border",
            result.finalScore >= 0.8
              ? "bg-emerald-500/10 border-emerald-500/25"
              : result.finalScore >= 0.5
              ? "bg-amber-500/10 border-amber-500/25"
              : "bg-red-500/10 border-red-500/25"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">Trace Complete</span>
            <ConfidenceBadge score={result.finalScore} />
          </div>
          <div className="text-[11px] text-slate-400">
            Status:{" "}
            <span className="text-white font-semibold capitalize">
              {result.resultStatus.replace("_", " ")}
            </span>
          </div>
          <button
            onClick={() => setShowWaterfall((v) => !v)}
            className="text-[10px] text-blue-400 hover:text-blue-300 mt-2 flex items-center gap-1"
          >
            {showWaterfall ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Sources queried ({result.sourcesQueried.length})
          </button>
          {showWaterfall && (
            <div className="mt-2 space-y-1">
              {result.sourcesQueried.map((src, i) => (
                <div key={i} className="text-[10px] text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {src}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Case Notes ──────────────────────────────────────────────────────────────

function CaseNotes({
  accountId,
  agentId,
  notes,
  onRefresh,
}: {
  accountId: string;
  agentId: string | null;
  notes: AccountDetail["notes"];
  onRefresh: () => void;
}) {
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const saveNote = async () => {
    if (!newNote.trim() || !agentId) return;
    setSaving(true);
    await fetch(`/api/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: newNote.trim(), agentId }),
    });
    setNewNote("");
    setSaving(false);
    onRefresh();
  };

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-bold text-white">Case Notes</h3>
        <span className="text-[10px] text-slate-500 ml-auto">{notes.length} notes</span>
      </div>

      {/* Add note */}
      <div className="space-y-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add case note... (documented per FDCPA requirements)"
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none transition-all"
        />
        <button
          onClick={saveNote}
          disabled={!newNote.trim() || saving || !agentId}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all flex items-center gap-2"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save Note
        </button>
      </div>

      {/* Notes list */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {notes.map((note) => (
          <div key={note.id} className="p-3 rounded-xl bg-white/3 border border-white/6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold text-slate-300">
                {note.agentFirstName} {note.agentLastName}
              </span>
              <span className="text-[10px] text-slate-500 ml-auto">
                {new Date(note.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{note.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"contacts" | "network" | "audit" | "results">("contacts");

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/accounts/${id}`);
    if (!res.ok) {
      router.push("/accounts");
      return;
    }
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) return null;

  const { account, contacts, flags, network, auditLogs, results, notes } = data;
  const activeFlags = flags.filter((f) => f.isActive);

  const addresses = contacts.filter((c) => c.contactType === "address");
  const phones = contacts.filter((c) => c.contactType === "phone");
  const emails = contacts.filter((c) => c.contactType === "email");

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/accounts"
          className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">
              {account.debtorFirstName}{" "}
              {account.debtorMiddleName ? `${account.debtorMiddleName} ` : ""}
              {account.debtorLastName}
            </h1>
            <StatusBadge status={account.skipTraceStatus} />
            {activeFlags.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-[10px] font-bold">
                <AlertTriangle className="w-3 h-3" />
                {activeFlags.length} Compliance Flag{activeFlags.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
            <span className="font-mono">{account.accountNumber}</span>
            <span>·</span>
            <span>{account.bankName}</span>
            <span>·</span>
            <span className="text-emerald-400 font-bold">
              ${parseFloat(account.balance).toLocaleString()}
            </span>
            {account.debtorSsnLast4 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  SSN: ***-**-{account.debtorSsnLast4}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Compliance alert banner */}
      {activeFlags.length > 0 && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/25 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-red-400 mb-2">
                Active Compliance Flags — Action Required
              </div>
              <div className="flex flex-wrap gap-2">
                {activeFlags.map((flag) => (
                  <div key={flag.id}>
                    <FlagBadge flagType={flag.flagType} />
                    <span className="text-[10px] text-red-400/70 ml-2">{flag.notes}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left column — identity + compliance + trace */}
        <div className="space-y-5">
          {/* Identity */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4">Debtor Identity</h3>
            <div className="space-y-2.5">
              {[
                ["Full Name", `${account.debtorFirstName} ${account.debtorMiddleName ?? ""} ${account.debtorLastName}`.trim()],
                ["Date of Birth", account.debtorDob ?? "N/A"],
                ["Gender", account.debtorGender ?? "N/A"],
                ["SSN (masked)", account.debtorSsnLast4 ? `***-**-${account.debtorSsnLast4}` : "N/A"],
                ["AKAs / Aliases", account.debtorAliases ?? "None on file"],
                ["Balance", `$${parseFloat(account.balance).toLocaleString()}`],
                ["Charge-Off Date", account.chargeOffDate ?? "N/A"],
                ["Days No Contact", `${account.daysNoContact} days`],
                ["Failed Call Attempts", `${account.failedCallAttempts}`],
                ["Mail Returned", account.mailReturned ? "Yes" : "No"],
                ["Agent", account.agentFirstName ? `${account.agentFirstName} ${account.agentLastName}` : "Unassigned"],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between gap-3">
                  <span className="text-[11px] text-slate-500 shrink-0">{label}</span>
                  <span className="text-[11px] text-slate-300 text-right font-medium">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance */}
          <CompliancePanel flags={flags} account={account} />

          {/* Trace button */}
          <TraceButton
            accountId={account.id}
            agentId={account.agentId}
            onComplete={fetchData}
          />
        </div>

        {/* Right columns — contacts + tabs */}
        <div className="xl:col-span-2 space-y-5">
          {/* Latest result */}
          {results.length > 0 && (
            <div
              className={clsx(
                "rounded-2xl p-4 border",
                parseFloat(results[0].confidenceScore ?? "0") >= 0.8
                  ? "bg-emerald-500/8 border-emerald-500/25"
                  : parseFloat(results[0].confidenceScore ?? "0") >= 0.5
                  ? "bg-amber-500/8 border-amber-500/25"
                  : "bg-red-500/8 border-red-500/25"
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-white">Latest Trace Result</span>
                {results[0].confidenceScore && (
                  <ConfidenceBadge score={results[0].confidenceScore} />
                )}
                <span className="text-[10px] text-slate-500 ml-auto">
                  {new Date(results[0].completedAt).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {results[0].bestAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5" />
                    <div>
                      <div className="text-[10px] text-slate-500">Best Address</div>
                      <div className="text-[11px] text-white font-medium">{results[0].bestAddress}</div>
                    </div>
                  </div>
                )}
                {results[0].bestPhone && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-3.5 h-3.5 text-blue-400 mt-0.5" />
                    <div>
                      <div className="text-[10px] text-slate-500">Best Phone</div>
                      <div className="text-[11px] text-white font-medium">{results[0].bestPhone}</div>
                    </div>
                  </div>
                )}
                {results[0].bestEmail && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-3.5 h-3.5 text-purple-400 mt-0.5" />
                    <div>
                      <div className="text-[10px] text-slate-500">Best Email</div>
                      <div className="text-[11px] text-white font-medium">{results[0].bestEmail}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex border-b border-white/8">
              {(
                [
                  { key: "contacts", label: `Found Contacts (${contacts.length})`, icon: Phone },
                  { key: "network", label: `Network (${network.length})`, icon: Users },
                  { key: "audit", label: `Audit Log (${auditLogs.length})`, icon: FileText },
                  { key: "results", label: `Trace Results (${results.length})`, icon: Zap },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={clsx(
                      "flex items-center gap-2 px-4 py-3.5 text-xs font-semibold transition-all border-b-2",
                      activeTab === tab.key
                        ? "border-blue-500 text-blue-300 bg-blue-500/5"
                        : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/3"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-5">
              {/* Contacts Tab */}
              {activeTab === "contacts" && (
                <div className="space-y-5">
                  {addresses.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-bold text-white">Addresses</span>
                        <span className="text-[10px] text-slate-500">Ranked by confidence</span>
                      </div>
                      <div className="space-y-2">
                        {addresses.map((c) => (
                          <ContactCard key={c.id} contact={c} />
                        ))}
                      </div>
                    </div>
                  )}
                  {phones.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Phone className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs font-bold text-white">Phone Numbers</span>
                      </div>
                      <div className="space-y-2">
                        {phones.map((c) => (
                          <ContactCard key={c.id} contact={c} />
                        ))}
                      </div>
                    </div>
                  )}
                  {emails.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Mail className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs font-bold text-white">Email Addresses</span>
                      </div>
                      <div className="space-y-2">
                        {emails.map((c) => (
                          <ContactCard key={c.id} contact={c} />
                        ))}
                      </div>
                    </div>
                  )}
                  {contacts.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">
                      No contact records found. Run a skip trace to populate this section.
                    </p>
                  )}
                </div>
              )}

              {/* Network Tab */}
              {activeTab === "network" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[11px] font-bold text-amber-400">FDCPA §804 — Third-Party Contact Rules</div>
                        <div className="text-[10px] text-amber-400/70 mt-0.5 leading-relaxed">
                          You may identify yourself and confirm location information only. Do NOT reveal the debt. Do NOT contact the same third party more than once.
                        </div>
                      </div>
                    </div>
                  </div>
                  {network.map((person) => (
                    <div key={person.id} className="p-4 rounded-xl bg-white/4 border border-white/10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                            {person.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{person.name}</div>
                            <div className="text-[11px] text-blue-400 mt-0.5">
                              {person.relationshipType}
                            </div>
                            {person.phone && (
                              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {person.phone}
                              </div>
                            )}
                            {person.address && (
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {person.address}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {person.sourceProvider && (
                            <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                              {person.sourceProvider}
                            </span>
                          )}
                          {person.fdcpaContactAttempts > 0 && (
                            <div className="text-[10px] text-amber-400 mt-1">
                              {person.fdcpaContactAttempts}x contacted
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {network.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">
                      No relatives or associates on file.
                    </p>
                  )}
                </div>
              )}

              {/* Audit Tab */}
              {activeTab === "audit" && (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-xl bg-white/3 border border-white/6">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-xs font-semibold text-white">{log.dataSource}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.searchTimestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span>Agent: {log.agentFirstName} {log.agentLastName}</span>
                        <span>·</span>
                        <span className="text-emerald-400">{log.permissiblePurpose}</span>
                      </div>
                      {log.resultSummary && (
                        <div className="mt-2 text-[10px] text-slate-400 font-mono bg-black/20 rounded-lg p-2">
                          {JSON.stringify(log.resultSummary)}
                        </div>
                      )}
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">
                      No audit log entries yet.
                    </p>
                  )}
                </div>
              )}

              {/* Results Tab */}
              {activeTab === "results" && (
                <div className="space-y-3">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className={clsx(
                        "p-4 rounded-xl border",
                        result.resultStatus === "located"
                          ? "bg-emerald-500/8 border-emerald-500/20"
                          : result.resultStatus === "partial"
                          ? "bg-amber-500/8 border-amber-500/20"
                          : "bg-red-500/8 border-red-500/20"
                      )}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold text-white capitalize">
                          {result.resultStatus.replace("_", " ")}
                        </span>
                        {result.confidenceScore && (
                          <ConfidenceBadge score={result.confidenceScore} />
                        )}
                        <span className="text-[10px] text-slate-500 ml-auto">
                          {new Date(result.completedAt).toLocaleString()}
                        </span>
                      </div>
                      {result.notes && (
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {result.notes}
                        </p>
                      )}
                    </div>
                  ))}
                  {results.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">
                      No trace results yet. Run a skip trace above.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Case Notes */}
          <CaseNotes
            accountId={account.id}
            agentId={account.agentId}
            notes={notes}
            onRefresh={fetchData}
          />
        </div>
      </div>
    </div>
  );
}
