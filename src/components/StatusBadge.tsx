import { clsx } from "clsx";

type Status = "pending" | "in_progress" | "located" | "unresolved" | "closed";
type FlagType = "bankruptcy" | "deceased" | "attorney_rep" | "do_not_contact" | "minor";

const statusConfig: Record<Status, { label: string; cls: string; dot: string }> = {
  pending: {
    label: "Pending",
    cls: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    dot: "bg-amber-400",
  },
  in_progress: {
    label: "In Progress",
    cls: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    dot: "bg-blue-400",
  },
  located: {
    label: "Located",
    cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    dot: "bg-emerald-400",
  },
  unresolved: {
    label: "Unresolved",
    cls: "bg-red-500/15 text-red-400 border border-red-500/25",
    dot: "bg-red-400",
  },
  closed: {
    label: "Closed",
    cls: "bg-slate-500/15 text-slate-400 border border-slate-500/25",
    dot: "bg-slate-400",
  },
};

const flagConfig: Record<FlagType, { label: string; cls: string }> = {
  bankruptcy: {
    label: "Bankruptcy",
    cls: "bg-red-500/15 text-red-400 border border-red-500/30",
  },
  deceased: {
    label: "Deceased",
    cls: "bg-slate-500/15 text-slate-300 border border-slate-500/30",
  },
  attorney_rep: {
    label: "Attorney Rep",
    cls: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  },
  do_not_contact: {
    label: "Do Not Contact",
    cls: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  },
  minor: {
    label: "Minor",
    cls: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status as Status] ?? statusConfig.pending;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
        cfg.cls
      )}
    >
      <span className={clsx("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export function FlagBadge({ flagType }: { flagType: string }) {
  const cfg = flagConfig[flagType as FlagType];
  if (!cfg) return null;
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold",
        cfg.cls
      )}
    >
      ⚠ {cfg.label}
    </span>
  );
}

export function ConfidenceBadge({ score }: { score: number | string }) {
  const num = typeof score === "string" ? parseFloat(score) : score;
  const pct = Math.round(num * 100);
  const cls =
    num >= 0.8
      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
      : num >= 0.5
      ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
      : num >= 0.2
      ? "bg-orange-500/15 text-orange-400 border border-orange-500/25"
      : "bg-red-500/15 text-red-400 border border-red-500/25";

  const dots = Math.round(num * 5);

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
        cls
      )}
    >
      <span className="tracking-widest text-[9px]">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < dots ? "opacity-100" : "opacity-25"}>
            ●
          </span>
        ))}
      </span>
      {pct}%
    </span>
  );
}
