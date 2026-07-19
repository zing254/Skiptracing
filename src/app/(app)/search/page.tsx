"use client";

import { useState, useCallback } from "react";
import {
  Search,
  Loader2,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Shield,
  Zap,
  FileText,
  UserPlus,
  ArrowLeft,
} from "lucide-react";
import { StatusBadge, FlagBadge, ConfidenceBadge } from "@/components/StatusBadge";
import { clsx } from "clsx";
import Link from "next/link";

type SearchResult = {
  query: {
    firstName: string;
    lastName: string;
    middleName?: string;
    ssnLast4?: string;
    dob?: string;
  };
  finalScore: number;
  sourcesQueried: string[];
  resultStatus: string;
  contacts: {
    addresses: string[];
    phones: string[];
    emails: string[];
  };
  flags: {
    bankruptcy: boolean;
    deceased: boolean;
    attorneyRepresented: boolean;
  };
  providers: Array<{
    provider: string;
    found: boolean;
    confidence: number;
    data: Record<string, unknown>;
  }>;
};

type BankClient = {
  id: string;
  name: string;
  code: string;
};

export default function SearchPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    ssnLast4: "",
    dob: "",
    address: "",
    phone: "",
  });
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [bankClientId, setBankClientId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankClients, setBankClients] = useState<BankClient[]>([]);

  const fetchBankClients = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts?limit=100");
      if (res.ok) {
        const data = await res.json();
        const unique = new Map<string, BankClient>();
        for (const acct of data.accounts ?? []) {
          if (!unique.has(acct.bankCode)) {
            unique.set(acct.bankCode, {
              id: acct.bankCode,
              name: acct.bankName,
              code: acct.bankCode,
            });
          }
        }
      }
    } catch {}
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;

    setSearching(true);
    setError(null);
    setResult(null);
    setAdded(false);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          middleName: form.middleName.trim() || undefined,
          ssnLast4: form.ssnLast4.trim() || undefined,
          dob: form.dob.trim() || undefined,
          address: form.address.trim() || undefined,
          phone: form.phone.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Search failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleAddToSystem = async () => {
    if (!result || !bankClientId.trim() || !accountNumber.trim()) return;

    setAdding(true);
    try {
      const res = await fetch("/api/search/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: result.query.firstName,
          lastName: result.query.lastName,
          middleName: result.query.middleName,
          ssnLast4: result.query.ssnLast4,
          dob: result.query.dob,
          bankClientId: bankClientId.trim(),
          accountNumber: accountNumber.trim(),
          balance: 0,
          addresses: result.contacts.addresses,
          phones: result.contacts.phones,
          emails: result.contacts.emails,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to add");
      }
      setAdded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to system");
    } finally {
      setAdding(false);
    }
  };

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
        <div>
          <h1 className="text-2xl font-bold text-white">Skip Trace Search</h1>
          <p className="text-sm text-slate-400 mt-1">
            Search for individuals not currently in the system
          </p>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">Person Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              First Name *
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="John"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              Last Name *
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Smith"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              Middle Name
            </label>
            <input
              type="text"
              value={form.middleName}
              onChange={(e) => setForm({ ...form, middleName: e.target.value })}
              placeholder="Allen"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              SSN Last 4
            </label>
            <input
              type="text"
              value={form.ssnLast4}
              onChange={(e) => setForm({ ...form, ssnLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              placeholder="1234"
              maxLength={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              Date of Birth
            </label>
            <input
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              Phone
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 123-4567"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
            Last Known Address
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="123 Main St, Dallas, TX 75201"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={searching || !form.firstName.trim() || !form.lastName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all"
          >
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {searching ? "Searching..." : "Run Skip Trace"}
          </button>
          {result && (
            <button
              type="button"
              onClick={() => { setResult(null); setAdded(false); setError(null); }}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-sm font-semibold transition-all"
            >
              New Search
            </button>
          )}
        </div>

        {/* FCRA Notice */}
        <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
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
      </form>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-red-400">Search Error</div>
            <div className="text-xs text-red-400/80 mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Score Banner */}
          <div
            className={clsx(
              "rounded-2xl p-5 border",
              result.finalScore >= 0.7
                ? "bg-emerald-500/8 border-emerald-500/25"
                : result.finalScore >= 0.3
                ? "bg-amber-500/8 border-amber-500/25"
                : "bg-red-500/8 border-red-500/25"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white">
                  {result.query.firstName} {result.query.middleName} {result.query.lastName}
                </span>
                <StatusBadge status={result.resultStatus} />
                <ConfidenceBadge score={result.finalScore} />
              </div>
              <span className="text-[10px] text-slate-500">
                {result.sourcesQueried.length} sources queried
              </span>
            </div>

            {/* Compliance Flags */}
            {(result.flags.bankruptcy || result.flags.deceased || result.flags.attorneyRepresented) && (
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">Compliance Flags:</span>
                {result.flags.bankruptcy && <FlagBadge flagType="bankruptcy" />}
                {result.flags.deceased && <FlagBadge flagType="deceased" />}
                {result.flags.attorneyRepresented && <FlagBadge flagType="attorney_rep" />}
              </div>
            )}

            {/* Sources */}
            <div className="flex flex-wrap gap-1.5">
              {result.sourcesQueried.map((src, i) => (
                <span
                  key={i}
                  className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/8"
                >
                  {src}
                </span>
              ))}
            </div>
          </div>

          {/* Contacts Found */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Addresses */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Addresses</h3>
                <span className="text-[10px] text-slate-500 ml-auto">
                  {result.contacts.addresses.length} found
                </span>
              </div>
              {result.contacts.addresses.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No addresses found</p>
              ) : (
                <div className="space-y-2">
                  {result.contacts.addresses.map((addr, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/4 border border-white/10">
                      <div className="text-sm text-white">{addr}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phones */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Phone Numbers</h3>
                <span className="text-[10px] text-slate-500 ml-auto">
                  {result.contacts.phones.length} found
                </span>
              </div>
              {result.contacts.phones.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No phones found</p>
              ) : (
                <div className="space-y-2">
                  {result.contacts.phones.map((phone, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/4 border border-white/10">
                      <div className="text-sm text-white">{phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Emails */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Email Addresses</h3>
                <span className="text-[10px] text-slate-500 ml-auto">
                  {result.contacts.emails.length} found
                </span>
              </div>
              {result.contacts.emails.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No emails found</p>
              ) : (
                <div className="space-y-2">
                  {result.contacts.emails.map((email, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/4 border border-white/10">
                      <div className="text-sm text-white">{email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Provider Details */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Provider Results</h3>
            </div>
            <div className="space-y-3">
              {result.providers.map((prov, i) => (
                <div
                  key={i}
                  className={clsx(
                    "p-4 rounded-xl border",
                    prov.found
                      ? "bg-emerald-500/5 border-emerald-500/15"
                      : "bg-white/2 border-white/6"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">{prov.provider}</span>
                    <div className="flex items-center gap-2">
                      <ConfidenceBadge score={prov.confidence} />
                      {prov.found ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>
                  {prov.found && (
                    <div className="text-[11px] text-slate-400 font-mono bg-black/20 rounded-lg p-2 mt-2">
                      {JSON.stringify(prov.data, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add to System */}
          {!added ? (
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Add to System</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Bank Client ID *
                  </label>
                  <input
                    type="text"
                    value={bankClientId}
                    onChange={(e) => setBankClientId(e.target.value)}
                    placeholder="UUID of bank client"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="FNB-1234"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleAddToSystem}
                disabled={adding || !bankClientId.trim() || !accountNumber.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {adding ? "Adding..." : "Add to System"}
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-sm font-bold text-emerald-400">Added to System</div>
                <div className="text-xs text-emerald-400/80 mt-1">
                  {result.query.firstName} {result.query.lastName} has been added as a new debtor.
                </div>
              </div>
              <Link
                href="/accounts"
                className="ml-auto text-xs text-blue-400 hover:text-blue-300"
              >
                View Case Queue →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
