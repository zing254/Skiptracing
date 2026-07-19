"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Bell,
  Activity,
  Users,
  Target,
} from "lucide-react";
import { StatusBadge, FlagBadge } from "@/components/StatusBadge";
import { clsx } from "clsx";

type DashboardData = {
  summary: {
    pending: number;
    inProgress: number;
    located: number;
    unresolved: number;
    closed: number;
    total: number;
    locateRate: string;
  };
  recentFlags: Array<{
    id: string;
    flagType: string;
    flagDate: string;
    notes: string;
    accountId: string;
  }>;
  activeBatches: Array<{
    id: string;
    fileName: string;
    totalRecords: number;
    processedRecords: number;
    status: string;
  }>;
  kpiTrend: Array<{
    snapshotDate: string;
    locatedToday: number;
    pendingToday: number;
    inProgressToday: number;
    locateRate: string;
  }>;
  topAgents: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    located: number;
    inProgress: number;
    total: number;
  }>;
};

const PIE_COLORS = {
  located: "#10b981",
  in_progress: "#3b82f6",
  pending: "#f59e0b",
  unresolved: "#ef4444",
  closed: "#64748b",
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const inner = (
    <div className="glass rounded-2xl p-5 glass-hover group relative overflow-hidden">
      <div
        className={clsx(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          `bg-gradient-to-br ${color} opacity-5`
        )}
      />
      <div className="flex items-start justify-between mb-4">
        <div
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            `bg-gradient-to-br ${color}`
          )}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        {href && (
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, recentFlags, activeBatches, kpiTrend, topAgents } = data;

  const pieData = [
    { name: "Located", value: summary.located, key: "located" },
    { name: "In Progress", value: summary.inProgress, key: "in_progress" },
    { name: "Pending", value: summary.pending, key: "pending" },
    { name: "Unresolved", value: summary.unresolved, key: "unresolved" },
    { name: "Closed", value: summary.closed, key: "closed" },
  ].filter((d) => d.value > 0);

  const chartData = kpiTrend.map((k) => ({
    date: k.snapshotDate.slice(5),
    located: k.locatedToday,
    pending: k.pendingToday,
    inProgress: k.inProgressToday,
    rate: parseFloat(k.locateRate ?? "0"),
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Skip Trace Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time overview — {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass px-3 py-2 rounded-xl flex items-center gap-2 text-xs text-slate-400">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            All Systems Operational
          </div>
          <Link
            href="/accounts"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-semibold text-white"
          >
            Open Case Queue
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Pending"
          value={summary.pending}
          icon={Clock}
          color="from-amber-500 to-orange-600"
          href="/accounts?status=pending"
        />
        <StatCard
          label="In Progress"
          value={summary.inProgress}
          icon={Loader2}
          color="from-blue-500 to-indigo-600"
          href="/accounts?status=in_progress"
        />
        <StatCard
          label="Located"
          value={summary.located}
          sub={`${summary.locateRate}% locate rate`}
          icon={CheckCircle2}
          color="from-emerald-500 to-teal-600"
          href="/accounts?status=located"
        />
        <StatCard
          label="Unresolved"
          value={summary.unresolved}
          icon={XCircle}
          color="from-red-500 to-rose-600"
          href="/accounts?status=unresolved"
        />
        <StatCard
          label="Total Accounts"
          value={summary.total}
          sub="All active cases"
          icon={Target}
          color="from-slate-500 to-slate-600"
          href="/accounts"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-white">Locate Activity — 14 Days</h2>
              <p className="text-xs text-slate-500 mt-0.5">Daily accounts located vs. pending</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-1 rounded bg-emerald-500 inline-block" /> Located
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-1 rounded bg-amber-500 inline-block" /> Pending
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradLocated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Area type="monotone" dataKey="located" stroke="#10b981" strokeWidth={2} fill="url(#gradLocated)" />
              <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} fill="url(#gradPending)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-1">Account Status</h2>
          <p className="text-xs text-slate-500 mb-4">Distribution by status</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={PIE_COLORS[entry.key as keyof typeof PIE_COLORS] ?? "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieData.map((entry) => (
              <div key={entry.key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: PIE_COLORS[entry.key as keyof typeof PIE_COLORS] }}
                  />
                  <span className="text-slate-400">{entry.name}</span>
                </div>
                <span className="text-white font-semibold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Compliance Alerts */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Compliance Alerts</h2>
            </div>
            <Link href="/compliance" className="text-[11px] text-blue-400 hover:text-blue-300">
              View all →
            </Link>
          </div>
          {recentFlags.length === 0 ? (
            <p className="text-xs text-slate-500">No active compliance flags</p>
          ) : (
            <div className="space-y-3">
              {recentFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="p-3 rounded-xl bg-white/3 border border-white/6"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <FlagBadge flagType={flag.flagType} />
                    <span className="text-[10px] text-slate-500">{flag.flagDate}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {flag.notes}
                  </p>
                  {flag.accountId && (
                    <Link
                      href={`/accounts/${flag.accountId}`}
                      className="text-[10px] text-blue-400 hover:text-blue-300 mt-1.5 inline-block"
                    >
                      View account →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Batches */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">Active Batches</h2>
            </div>
            <Link href="/batch" className="text-[11px] text-blue-400 hover:text-blue-300">
              Manage →
            </Link>
          </div>
          {activeBatches.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-slate-500">No batches currently running</p>
              <Link
                href="/batch"
                className="text-[11px] text-blue-400 hover:text-blue-300 mt-2 inline-block"
              >
                Start a batch →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBatches.map((batch) => {
                const pct =
                  batch.totalRecords > 0
                    ? Math.round((batch.processedRecords / batch.totalRecords) * 100)
                    : 0;
                return (
                  <div key={batch.id} className="p-3 rounded-xl bg-white/3 border border-white/6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-slate-300 font-medium truncate max-w-[160px]">
                        {batch.fileName}
                      </span>
                      <span className="text-[10px] text-blue-400 font-bold">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                      <span>
                        {batch.processedRecords.toLocaleString()} / {batch.totalRecords.toLocaleString()} records
                      </span>
                      <span className="text-blue-400">Processing</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Agents */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Top Agents</h2>
          </div>
          <div className="space-y-3">
            {topAgents.slice(0, 5).map((agent, idx) => {
              const locateRate =
                Number(agent.total) > 0
                  ? Math.round((Number(agent.located) / Number(agent.total)) * 100)
                  : 0;
              return (
                <div key={agent.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white">
                      {agent.firstName} {agent.lastName}
                    </div>
                    <div className="text-[10px] text-slate-500 capitalize">
                      {agent.role.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400">
                      {agent.located} located
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {locateRate}% rate
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
