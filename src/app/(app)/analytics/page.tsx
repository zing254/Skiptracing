"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Target,
  Clock,
  AlertTriangle,
  Loader2,
  Award,
  BarChart3,
} from "lucide-react";
import { clsx } from "clsx";

type KpiData = {
  snapshotDate: string;
  totalAccountsActive: number;
  locatedToday: number;
  pendingToday: number;
  inProgressToday: number;
  locateRate: string;
  avgDaysToLocate: string;
  bankruptcyFlags: number;
  deceasedFlags: number;
  highConfidenceLocates: number;
};

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
  kpiTrend: KpiData[];
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

const PROVIDER_MOCK = [
  { provider: "LexisNexis Accurint", hitRate: 74, avgConf: 0.78, cost: 3200 },
  { provider: "TransUnion TLO", hitRate: 68, avgConf: 0.72, cost: 2800 },
  { provider: "Experian Skip Trace", hitRate: 71, avgConf: 0.76, cost: 2400 },
  { provider: "Tracers", hitRate: 62, avgConf: 0.65, cost: 1100 },
  { provider: "USPS NCOA", hitRate: 45, avgConf: 0.81, cost: 580 },
  { provider: "Searchbug", hitRate: 38, avgConf: 0.58, cost: 420 },
];

const KPI_BENCHMARKS = [
  { label: "Single Search Locate Rate", target: 70, current: 72.4, unit: "%" },
  { label: "Batch Locate Rate", target: 65, current: 68.9, unit: "%" },
  { label: "High Confidence Locates (0.80+)", target: 50, current: 54.2, unit: "%" },
  { label: "Avg Time to Locate", target: 4, current: 2.8, unit: " hrs", lowerBetter: true },
  { label: "Compliance Flag Accuracy", target: 100, current: 100, unit: "%" },
  { label: "Audit Log Completeness", target: 100, current: 100, unit: "%" },
  { label: "False Positive Rate", target: 2, current: 1.4, unit: "%", lowerBetter: true },
  { label: "System Uptime", target: 99.9, current: 99.97, unit: "%" },
];

function KpiMeter({
  label,
  target,
  current,
  unit,
  lowerBetter,
}: {
  label: string;
  target: number;
  current: number;
  unit: string;
  lowerBetter?: boolean;
}) {
  const meeting = lowerBetter ? current <= target : current >= target;
  const pct = lowerBetter
    ? Math.min(100, (target / current) * 100)
    : Math.min(100, (current / target) * 100);

  return (
    <div className="p-4 rounded-xl bg-white/3 border border-white/6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-slate-400 font-medium">{label}</span>
        <span
          className={clsx(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            meeting
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-red-500/15 text-red-400"
          )}
        >
          {meeting ? "✓ MET" : "✗ MISS"}
        </span>
      </div>
      <div className="flex items-end gap-3 mb-2">
        <span className={clsx("text-xl font-bold", meeting ? "text-emerald-400" : "text-red-400")}>
          {current}{unit}
        </span>
        <span className="text-[10px] text-slate-600 mb-1">
          Target: {target}{unit}
        </span>
      </div>
      <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all",
            meeting ? "bg-emerald-500" : "bg-red-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
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
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, kpiTrend, topAgents } = data;

  const chartData = kpiTrend.map((k) => ({
    date: k.snapshotDate.slice(5),
    located: k.locatedToday,
    pending: k.pendingToday,
    locateRate: parseFloat(k.locateRate ?? "0"),
    avgDays: parseFloat(k.avgDaysToLocate ?? "0"),
    flags: (k.bankruptcyFlags ?? 0) + (k.deceasedFlags ?? 0),
    highConf: k.highConfidenceLocates ?? 0,
  }));

  const sourceData = PROVIDER_MOCK.map((p) => ({
    name: p.provider.split(" ")[0],
    hitRate: p.hitRate,
    confidence: Math.round(p.avgConf * 100),
    costPerSearch: (p.cost / 1000).toFixed(1),
  }));

  const pieData = [
    { name: "High Conf.", value: summary.located, fill: "#10b981" },
    { name: "In Progress", value: summary.inProgress, fill: "#3b82f6" },
    { name: "Pending", value: summary.pending, fill: "#f59e0b" },
    { name: "Unresolved", value: summary.unresolved, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  // Cumulative trend
  let cumLocated = 0;
  const cumulData = chartData.map((d) => {
    cumLocated += d.located;
    return { ...d, cumLocated };
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics & KPIs</h1>
          <p className="text-sm text-slate-400 mt-1">
            Performance metrics, provider analysis, and SLA tracking
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 glass px-3 py-2 rounded-xl">
          <Clock className="w-3.5 h-3.5" />
          Last 14 days
        </div>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Locate Rate",
            value: `${summary.locateRate}%`,
            sub: "Target: >70%",
            icon: Target,
            color: "from-emerald-500 to-teal-600",
            good: parseFloat(summary.locateRate) >= 70,
          },
          {
            label: "Avg Days to Locate",
            value: "2.8 days",
            sub: "Target: <4 hrs",
            icon: Clock,
            color: "from-blue-500 to-indigo-600",
            good: true,
          },
          {
            label: "High Conf. Locates",
            value: "54.2%",
            sub: "Target: >50%",
            icon: Award,
            color: "from-purple-500 to-violet-600",
            good: true,
          },
          {
            label: "Compliance Rate",
            value: "100%",
            sub: "0 audit gaps",
            icon: AlertTriangle,
            color: "from-amber-500 to-orange-600",
            good: true,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div
                  className={clsx(
                    "w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br",
                    card.color
                  )}
                >
                  <Icon className="w-4.5 h-4.5 text-white" />
                </div>
                <span
                  className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    card.good
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  )}
                >
                  {card.good ? "ON TARGET" : "BELOW"}
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <div className="text-[11px] text-slate-400 mt-1">{card.label}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Locate rate trend */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-1">Locate Rate Trend</h2>
          <p className="text-xs text-slate-500 mb-4">Daily locate rate (%) — 14 day window</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [typeof v === "number" ? `${v.toFixed(1)}%` : String(v), "Locate Rate"]}
              />
              <Line
                type="monotone"
                dataKey="locateRate"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: "#10b981", r: 3 }}
              />
              {/* Target reference line */}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution pie */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-1">Case Distribution</h2>
          <p className="text-xs text-slate-500 mb-4">Current snapshot</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: entry.fill }}
                  />
                  <span className="text-slate-400">{entry.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-bold">{entry.value}</span>
                  <span className="text-slate-600 ml-1">
                    ({summary.total > 0 ? ((entry.value / summary.total) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Provider hit rates */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-1">API Provider Performance</h2>
          <p className="text-xs text-slate-500 mb-4">Hit rate by data provider (%)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sourceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={70} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [typeof v === "number" ? `${v}%` : String(v), "Hit Rate"]}
              />
              <Bar dataKey="hitRate" radius={[0, 4, 4, 0]}>
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${210 + i * 20}, 70%, 60%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Volume chart */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-1">Daily Activity Volume</h2>
          <p className="text-xs text-slate-500 mb-4">Located vs Pending per day</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 10, color: "#64748b" }} />
              <Bar dataKey="located" fill="#10b981" radius={[2, 2, 0, 0]} name="Located" />
              <Bar dataKey="pending" fill="#f59e0b" radius={[2, 2, 0, 0]} name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPI Benchmarks */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">SLA & KPI Benchmarks</h2>
          <span className="ml-auto text-xs text-slate-500">
            {KPI_BENCHMARKS.filter((k) =>
              k.lowerBetter ? k.current <= k.target : k.current >= k.target
            ).length}{" "}
            / {KPI_BENCHMARKS.length} targets met
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {KPI_BENCHMARKS.map((kpi) => (
            <KpiMeter
              key={kpi.label}
              label={kpi.label}
              target={kpi.target}
              current={kpi.current}
              unit={kpi.unit}
              lowerBetter={kpi.lowerBetter}
            />
          ))}
        </div>
      </div>

      {/* Top agents */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-bold text-white">Agent Leaderboard</h2>
        </div>
        <div className="space-y-3">
          {topAgents.map((agent, idx) => {
            const locateRate =
              Number(agent.total) > 0
                ? ((Number(agent.located) / Number(agent.total)) * 100).toFixed(1)
                : "0.0";
            const barWidth =
              Number(agent.total) > 0
                ? (Number(agent.located) / Number(agent.total)) * 100
                : 0;

            return (
              <div key={agent.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/3 border border-white/6">
                <div
                  className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                    idx === 0
                      ? "bg-amber-500 text-white"
                      : idx === 1
                      ? "bg-slate-400 text-white"
                      : idx === 2
                      ? "bg-orange-700 text-white"
                      : "bg-slate-700 text-slate-300"
                  )}
                >
                  {idx + 1}
                </div>
                <div className="w-32 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {agent.firstName} {agent.lastName}
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize truncate">
                    {agent.role.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-emerald-400">
                    {agent.located} located
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {locateRate}% rate · {agent.total} total
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provider detail table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-bold text-white">API Provider Cost & Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                {["Provider", "Hit Rate", "Avg. Confidence", "Est. Monthly Cost", "Cost/Locate Est."].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {PROVIDER_MOCK.map((p) => (
                <tr key={p.provider} className="hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-semibold text-white">{p.provider}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${p.hitRate}%` }}
                        />
                      </div>
                      <span className="text-xs text-white">{p.hitRate}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={clsx(
                        "text-xs font-bold",
                        p.avgConf >= 0.75 ? "text-emerald-400" : p.avgConf >= 0.65 ? "text-amber-400" : "text-red-400"
                      )}
                    >
                      {(p.avgConf * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-white">
                    ${p.cost.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">
                    ~${(p.cost / (1000 * (p.hitRate / 100))).toFixed(2)} / locate
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
