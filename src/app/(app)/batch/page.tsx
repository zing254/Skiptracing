"use client";

import { useEffect, useState, useCallback } from "react";
import { parseBatchCsv } from "@/lib/batch/csv-parser";
import {
  Upload,
  Play,
  CheckCircle2,
  Loader2,
  Clock,
  XCircle,
  Download,
  RefreshCw,
  BarChart2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";

type BatchJob = {
  id: string;
  fileName: string | null;
  status: "queued" | "processing" | "complete" | "failed";
  totalRecords: number;
  processedRecords: number;
  locatedHigh: number;
  locatedMed: number;
  notFound: number;
  complianceFlags: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  bankName: string | null;
  bankCode: string | null;
  submitterFirst: string | null;
  submitterLast: string | null;
};

const STATUS_ICONS = {
  queued: Clock,
  processing: Loader2,
  complete: CheckCircle2,
  failed: XCircle,
};

const STATUS_COLORS = {
  queued: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  processing: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  complete: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  failed: "text-red-400 bg-red-500/10 border-red-500/20",
};

function BatchCard({ job, onRefresh }: { job: BatchJob; onRefresh: () => void }) {
  const Icon = STATUS_ICONS[job.status];
  const isProcessing = job.status === "processing";
  const pct =
    job.totalRecords > 0
      ? Math.round((job.processedRecords / job.totalRecords) * 100)
      : 0;

  const locateRate =
    job.totalRecords > 0
      ? ((job.locatedHigh + job.locatedMed) / job.totalRecords) * 100
      : 0;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border",
                STATUS_COLORS[job.status]
              )}
            >
              <Icon
                className={clsx(
                  "w-3 h-3",
                  isProcessing && "animate-spin"
                )}
              />
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
            {job.bankName && (
              <span className="text-[11px] text-slate-500 font-mono">
                {job.bankName}
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {job.fileName ?? "batch_file.csv"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Submitted by {job.submitterFirst} {job.submitterLast} ·{" "}
            {new Date(job.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {job.status === "complete" && (
            <button
              onClick={async () => {
                const res = await fetch(`/api/accounts/export?status=all`);
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `batch_${job.fileName ?? "export"}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          )}
          {(job.status === "complete" || job.status === "failed") && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(isProcessing || job.status === "queued") && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-slate-500">
              {job.processedRecords.toLocaleString()} / {job.totalRecords.toLocaleString()} records
            </span>
            <span className="text-[11px] font-bold text-blue-400">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-1000",
                isProcessing
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                  : "bg-slate-600"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats for complete jobs */}
      {job.status === "complete" && job.totalRecords > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-center">
            <div className="text-lg font-bold text-emerald-400">{job.locatedHigh}</div>
            <div className="text-[10px] text-emerald-400/70">High Conf.</div>
            <div className="text-[9px] text-slate-500">
              {((job.locatedHigh / job.totalRecords) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/15 text-center">
            <div className="text-lg font-bold text-amber-400">{job.locatedMed}</div>
            <div className="text-[10px] text-amber-400/70">Med. Conf.</div>
            <div className="text-[9px] text-slate-500">
              {((job.locatedMed / job.totalRecords) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/15 text-center">
            <div className="text-lg font-bold text-red-400">{job.notFound}</div>
            <div className="text-[10px] text-red-400/70">Not Found</div>
            <div className="text-[9px] text-slate-500">
              {((job.notFound / job.totalRecords) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-orange-500/8 border border-orange-500/15 text-center">
            <div className="text-lg font-bold text-orange-400">{job.complianceFlags}</div>
            <div className="text-[10px] text-orange-400/70">Flags</div>
            <div className="text-[9px] text-slate-500">Compliance</div>
          </div>
        </div>
      )}

      {/* Summary line for complete */}
      {job.status === "complete" && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
          <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            <span className="text-white font-semibold">{locateRate.toFixed(1)}%</span> locate rate ·{" "}
            {(job.locatedHigh + job.locatedMed).toLocaleString()} total located ·{" "}
            {job.complianceFlags > 0 && (
              <span className="text-amber-400">
                {job.complianceFlags} compliance flags detected
              </span>
            )}
          </span>
          {job.completedAt && (
            <span className="ml-auto text-slate-600">
              Completed {new Date(job.completedAt).toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function BatchPage() {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadFile, setUploadFile] = useState<string>("");
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [recordCount, setRecordCount] = useState(500);
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/batch");
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    setJobs(data.jobs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const submitBatch = async () => {
    setSubmitting(true);
    try {
      const usersRes = await fetch("/api/users");
      if (!usersRes.ok) throw new Error("Failed to fetch users");
      const usersData = await usersRes.json();
      const mgr = usersData.users.find((u: { role: string }) => u.role === "batch_manager");

      const acctRes = await fetch("/api/accounts?limit=1");
      if (!acctRes.ok) throw new Error("Failed to fetch accounts");
      const acctData = await acctRes.json();
      const bankClientId = acctData.accounts?.[0]?.bankClientId;

      await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankClientId,
          submittedBy: mgr?.id,
          fileName: uploadFile || `batch_${Date.now()}.csv`,
          totalRecords: recordCount,
        }),
      });
      setShowUpload(false);
      setUploadFile("");
      setUploadFileObj(null);
      setCsvPreview([]);
      await fetchJobs();
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJobs = filterStatus === "all"
    ? jobs
    : jobs.filter((j) => j.status === filterStatus);

  const stats = {
    total: jobs.reduce((s, j) => s + j.totalRecords, 0),
    located: jobs.reduce((s, j) => s + j.locatedHigh + j.locatedMed, 0),
    flags: jobs.reduce((s, j) => s + j.complianceFlags, 0),
    running: jobs.filter((j) => j.status === "processing").length,
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Batch Processing</h1>
          <p className="text-sm text-slate-400 mt-1">
            High-volume skip trace job manager
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-semibold text-white"
          >
            <Upload className="w-4 h-4" />
            New Batch
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Records Processed", value: stats.total.toLocaleString(), color: "text-white" },
          { label: "Total Located", value: stats.located.toLocaleString(), color: "text-emerald-400" },
          { label: "Compliance Flags", value: stats.flags.toLocaleString(), color: "text-amber-400" },
          { label: "Active Batches", value: stats.running, color: "text-blue-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-4 text-center">
            <div className={clsx("text-2xl font-bold", stat.color)}>{stat.value}</div>
            <div className="text-[11px] text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="glass rounded-2xl p-5 border border-blue-500/20">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-400" />
            New Batch Job
          </h2>

          <div
            className={clsx(
              "border-2 border-dashed rounded-xl p-8 text-center transition-all mb-4",
              dragOver
                ? "border-blue-500 bg-blue-500/10"
                : "border-white/15 hover:border-white/25"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) {
                setUploadFileObj(file);
                setUploadFile(file.name);
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const text = ev.target?.result as string;
                  const { rows, errors } = parseBatchCsv(text);
                  setRecordCount(rows.length);
                  setCsvPreview(errors.length > 0
                    ? [`${rows.length} valid, ${errors.length} errors (first: row ${errors[0].row})`]
                    : [`${rows.length} rows parsed`, ...rows.slice(0, 3).map((r) => `  ${r.firstName} ${r.lastName} — ${r.accountNumber}`)]);
                };
                reader.readAsText(file);
              }
            }}
          >
            {uploadFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="text-sm font-semibold text-white">{uploadFile}</div>
                  <div className="text-xs text-slate-500">File selected</div>
                </div>
                <button
                  onClick={() => { setUploadFile(""); setUploadFileObj(null); setCsvPreview([]); }}
                  className="text-slate-500 hover:text-white ml-4"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                <div className="text-sm text-slate-400">
                  Drag & drop CSV/Excel file or{" "}
                  <label className="text-blue-400 hover:text-blue-300 cursor-pointer">
                    browse
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadFileObj(file);
                          setUploadFile(file.name);
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const text = ev.target?.result as string;
                            const { rows, errors } = parseBatchCsv(text);
                            setRecordCount(rows.length);
                            setCsvPreview(errors.length > 0
                              ? [`${rows.length} valid, ${errors.length} errors (first: row ${errors[0].row})`]
                              : [`${rows.length} rows parsed`, ...rows.slice(0, 3).map((r) => `  ${r.firstName} ${r.lastName} — ${r.accountNumber}`)]);
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Supports CSV, Excel — max 100,000 records per batch
                </div>
              </>
            )}
          </div>

          {uploadFile && (
            <div className="p-3 rounded-xl bg-white/3 border border-white/6 mb-4">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">CSV Preview</div>
              <div className="space-y-0.5">
                {csvPreview.map((line, i) => (
                  <div key={i} className="text-[11px] text-slate-400 font-mono">{line}</div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1.5 block">
                Record Count (for simulation)
              </label>
              <input
                type="number"
                value={recordCount}
                onChange={(e) => setRecordCount(parseInt(e.target.value) || 0)}
                min={1}
                max={100000}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-[11px] text-amber-400/80">
                <strong>FCRA Compliance:</strong> By submitting this batch, you certify
                that all records have a permissible purpose under FCRA §604(a)(3)(A) for
                debt collection. All searches will be permanently logged.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={submitBatch}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all text-sm font-semibold text-white"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Submit Batch
            </button>
            <button
              onClick={() => setShowUpload(false)}
              className="px-4 py-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {["all", "queued", "processing", "complete", "failed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
              filterStatus === s
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
            )}
          >
            {s === "all" ? "All Jobs" : s}
            {s !== "all" && (
              <span className="ml-1.5 text-[9px]">
                ({jobs.filter((j) => j.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Jobs list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No batch jobs found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <BatchCard key={job.id} job={job} onRefresh={fetchJobs} />
          ))}
        </div>
      )}
    </div>
  );
}
