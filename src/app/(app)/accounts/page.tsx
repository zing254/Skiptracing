"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  SortAsc,
  UserPlus,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { clsx } from "clsx";

type Account = {
  id: string;
  accountNumber: string;
  balance: string;
  skipTraceStatus: string;
  failedCallAttempts: number;
  mailReturned: boolean;
  emailBounced: boolean;
  daysNoContact: number;
  priority: number;
  chargeOffDate: string | null;
  updatedAt: string;
  debtorId: string;
  debtorFirstName: string;
  debtorLastName: string;
  debtorDob: string | null;
  debtorSsnLast4: string | null;
  agentFirstName: string | null;
  agentLastName: string | null;
  bankName: string;
  bankCode: string;
  hasComplianceFlag: boolean;
};

const STATUS_TABS = [
  { value: "all", label: "All Cases" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "located", label: "Located" },
  { value: "unresolved", label: "Unresolved" },
  { value: "closed", label: "Closed" },
];

const SORT_OPTIONS = [
  { value: "priority", label: "Priority" },
  { value: "balance", label: "Balance" },
  { value: "daysNoContact", label: "Days No Contact" },
  { value: "updatedAt", label: "Last Updated" },
];

function AccountsInner() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "all";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("priority");
  const [page, setPage] = useState(1);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      status,
      search,
      sort,
      page: String(page),
      limit: "15",
    });
    const res = await fetch(`/api/accounts?${params}`);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    setAccounts(data.accounts ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [status, search, sort, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [status, search, sort]);

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Case Queue</h1>
          <p className="text-sm text-slate-400 mt-1">
            {total.toLocaleString()} accounts in system
          </p>
        </div>
        <Link
          href="/search"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-semibold text-white"
        >
          <UserPlus className="w-4 h-4" />
          Search New Person
        </Link>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 space-y-4">
        {/* Status tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                status === tab.value
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + sort */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or account number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-slate-500" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-slate-900">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
            No accounts found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Debtor / Account
                  </th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Bank
                  </th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Contact Failures
                  </th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {accounts.map((acct) => (
                  <tr
                    key={acct.id}
                    className="hover:bg-white/3 transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={clsx(
                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                            acct.priority <= 2
                              ? "bg-red-400"
                              : acct.priority <= 4
                              ? "bg-amber-400"
                              : "bg-slate-600"
                          )}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {acct.debtorFirstName} {acct.debtorLastName}
                            </span>
                            {acct.hasComplianceFlag && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {acct.accountNumber}
                            </span>
                            {acct.debtorSsnLast4 && (
                              <span className="text-[10px] text-slate-600">
                                SSN: ***-**-{acct.debtorSsnLast4}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-slate-300">{acct.bankName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{acct.bankCode}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold text-white">
                        ${parseFloat(acct.balance).toLocaleString()}
                      </div>
                      {acct.chargeOffDate && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          CO: {acct.chargeOffDate}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={acct.skipTraceStatus} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {acct.failedCallAttempts > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                            <Phone className="w-3 h-3" />
                            {acct.failedCallAttempts} failed
                          </span>
                        )}
                        {acct.mailReturned && (
                          <span className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                            <MapPin className="w-3 h-3" />
                            Mail RTN
                          </span>
                        )}
                        {acct.emailBounced && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            <Mail className="w-3 h-3" />
                            Bounced
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {acct.daysNoContact}d no contact
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {acct.agentFirstName ? (
                        <span className="text-xs text-slate-400">
                          {acct.agentFirstName} {acct.agentLastName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/accounts/${acct.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 text-blue-400 text-xs font-semibold transition-all"
                      >
                        Open
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/8">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages} — {total.toLocaleString()} accounts
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <AccountsInner />
    </Suspense>
  );
}
