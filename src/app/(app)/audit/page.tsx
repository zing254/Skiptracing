"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Lock,
  CheckCircle2,
  Loader2,
  Download,
  Shield,
} from "lucide-react";
import { clsx } from "clsx";

type AuditLog = {
  id: string;
  dataSource: string;
  permissiblePurpose: string;
  queryInput: Record<string, unknown> | null;
  resultSummary: Record<string, unknown> | null;
  searchTimestamp: string;
  accountNumber: string | null;
  accountId: string | null;
  debtorFirst: string | null;
  debtorLast: string | null;
  agentFirst: string | null;
  agentLast: string | null;
  agentRole: string | null;
};

const SOURCE_COLORS: Record<string, string> = {
  "LexisNexis Accurint": "bg-blue-500/15 text-blue-400 border-blue-500/25",
  "TransUnion TLO": "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
  "Experian Skip Trace": "bg-purple-500/15 text-purple-400 border-purple-500/25",
  Tracers: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  Searchbug: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  "USPS NCOA": "bg-green-500/15 text-green-400 border-green-500/25",
  "County Records": "bg-slate-500/15 text-slate-400 border-slate-500/25",
  "Experian": "bg-violet-500/15 text-violet-400 border-violet-500/25",
  default: "bg-slate-500/15 text-slate-400 border-slate-500/25",
};

function getSourceColor(source: string) {
  return SOURCE_COLORS[source] ?? SOURCE_COLORS.default;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/audit-log?page=${page}&limit=20`);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable FCRA & FDCPA compliance trail — {total.toLocaleString()} records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-all">
            <Download className="w-3.5 h-3.5" />
            Export Log
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            Tamper-Proof Verified
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="glass rounded-2xl p-4 flex items-start gap-4">
        <div className="p-2 rounded-xl bg-blue-500/10 shrink-0">
          <Shield className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-white mb-1">
            FCRA Compliant Audit Trail
          </div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Every skip trace search is permanently logged with the agent ID, timestamp, data source,
            and permissible purpose certification. This log is immutable — records cannot be
            modified or deleted. Retained for 7 years per FCRA requirements.
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-slate-500">Total Log Entries</div>
          <div className="text-2xl font-bold text-white">{total.toLocaleString()}</div>
        </div>
      </div>

      {/* Log table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-white/8 text-[11px] font-semibold text-slate-500 uppercase tracking-wider gap-3">
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-2">Agent</div>
          <div className="col-span-2">Account</div>
          <div className="col-span-2">Data Source</div>
          <div className="col-span-3">Permissible Purpose</div>
          <div className="col-span-1 text-right">Result</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map((log) => (
              <div key={log.id}>
                <button
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="w-full grid grid-cols-12 px-5 py-3.5 gap-3 hover:bg-white/3 transition-colors text-left"
                >
                  <div className="col-span-2">
                    <div className="text-[11px] text-slate-300 font-mono">
                      {new Date(log.searchTimestamp).toLocaleString("en-US", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-white font-medium">
                      {log.agentFirst} {log.agentLast}
                    </div>
                    <div className="text-[10px] text-slate-500 capitalize">
                      {log.agentRole?.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="col-span-2">
                    {log.accountNumber ? (
                      <div>
                        <div className="text-xs font-mono text-slate-300">
                          {log.accountNumber}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {log.debtorFirst} {log.debtorLast}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-600">N/A</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span
                      className={clsx(
                        "inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                        getSourceColor(log.dataSource)
                      )}
                    >
                      {log.dataSource}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-emerald-400/80 truncate">
                        {log.permissiblePurpose}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1 text-right">
                    {log.resultSummary && (
                      <span
                        className={clsx(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
                          (log.resultSummary as Record<string, unknown>).found === false ||
                          (log.resultSummary as Record<string, unknown>).no_results
                            ? "bg-red-500/15 text-red-400"
                            : "bg-emerald-500/15 text-emerald-400"
                        )}
                      >
                        {(log.resultSummary as Record<string, unknown>).found === false ||
                        (log.resultSummary as Record<string, unknown>).no_results
                          ? "No Hit"
                          : "Hit"}
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded row */}
                {expanded === log.id && (
                  <div className="px-5 pb-4 bg-black/20">
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {log.queryInput && (
                        <div>
                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            Query Input
                          </div>
                          <pre className="text-[10px] text-slate-300 font-mono bg-black/30 rounded-xl p-3 overflow-x-auto">
                            {JSON.stringify(log.queryInput, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.resultSummary && (
                        <div>
                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            Result Summary
                          </div>
                          <pre className="text-[10px] text-slate-300 font-mono bg-black/30 rounded-xl p-3 overflow-x-auto">
                            {JSON.stringify(log.resultSummary, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                    {log.accountId && (
                      <Link
                        href={`/accounts/${log.accountId}`}
                        className="inline-flex items-center gap-1.5 mt-3 text-[11px] text-blue-400 hover:text-blue-300"
                      >
                        <FileText className="w-3 h-3" />
                        View Account →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/8">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
