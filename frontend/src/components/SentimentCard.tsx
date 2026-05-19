import { Link } from "react-router-dom";
import type { IndicatorConfig, IndicatorOverview } from "../types/indicator";

// ── VIX zone display config ─────────────────────────────────────────────────

const VIX_ZONE_STYLES: Record<string, {
  border: string; bg: string; valueColor: string;
  dot: string; badgeBg: string; badgeText: string;
}> = {
  buy_strong: {
    border: "border-green-500", bg: "bg-green-50",
    valueColor: "text-green-700",
    dot: "bg-green-500", badgeBg: "bg-green-100 border-green-300", badgeText: "text-green-700",
  },
  buy: {
    border: "border-blue-500", bg: "bg-blue-50",
    valueColor: "text-blue-700",
    dot: "bg-blue-500", badgeBg: "bg-blue-100 border-blue-300", badgeText: "text-blue-700",
  },
  normal: {
    border: "border-zinc-200", bg: "bg-white",
    valueColor: "text-zinc-800",
    dot: "bg-zinc-400", badgeBg: "bg-zinc-100 border-zinc-200", badgeText: "text-zinc-600",
  },
  sell: {
    border: "border-red-400", bg: "bg-red-50",
    valueColor: "text-red-600",
    dot: "bg-red-500", badgeBg: "bg-red-100 border-red-300", badgeText: "text-red-700",
  },
};

// ── F&G zone display config ──────────────────────────────────────────────────

const FNG_ZONE_STYLES: Record<string, {
  border: string; bg: string; valueColor: string;
  dot: string; badgeBg: string; badgeText: string;
}> = {
  extreme_fear: {
    border: "border-green-500", bg: "bg-green-50",
    valueColor: "text-green-700",
    dot: "bg-green-500", badgeBg: "bg-green-100 border-green-300", badgeText: "text-green-700",
  },
  fear: {
    border: "border-emerald-400", bg: "bg-emerald-50",
    valueColor: "text-emerald-700",
    dot: "bg-emerald-400", badgeBg: "bg-emerald-100 border-emerald-300", badgeText: "text-emerald-700",
  },
  neutral: {
    border: "border-zinc-200", bg: "bg-white",
    valueColor: "text-zinc-800",
    dot: "bg-zinc-400", badgeBg: "bg-zinc-100 border-zinc-200", badgeText: "text-zinc-600",
  },
  greed: {
    border: "border-amber-400", bg: "bg-amber-50",
    valueColor: "text-amber-700",
    dot: "bg-amber-400", badgeBg: "bg-amber-100 border-amber-300", badgeText: "text-amber-700",
  },
  extreme_greed: {
    border: "border-red-400", bg: "bg-red-50",
    valueColor: "text-red-600",
    dot: "bg-red-500", badgeBg: "bg-red-100 border-red-300", badgeText: "text-red-700",
  },
};

// ── Zone range hints ─────────────────────────────────────────────────────────

const VIX_RANGE_HINT: Record<string, string> = {
  buy_strong: "≥ 40",
  buy: "30 ~ 40",
  normal: "14 ~ 30",
  sell: "≤ 14",
};

const FNG_RANGE_HINT: Record<string, string> = {
  extreme_fear: "≤ 25",
  fear: "26 ~ 44",
  neutral: "45 ~ 54",
  greed: "55 ~ 74",
  extreme_greed: "≥ 75",
};

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  config: IndicatorConfig;
  overview: IndicatorOverview;
}

export default function SentimentCard({ config, overview }: Props) {
  const isVix = config.variant === "vix";
  const zoneStyles = isVix
    ? (VIX_ZONE_STYLES[overview.zone] ?? VIX_ZONE_STYLES.normal)
    : (FNG_ZONE_STYLES[overview.zone] ?? FNG_ZONE_STYLES.neutral);

  const rangeHint = isVix
    ? (VIX_RANGE_HINT[overview.zone] ?? "")
    : (FNG_RANGE_HINT[overview.zone] ?? "");

  const zoneLabel = overview.zone_label ?? "—";
  const isActive = overview.is_signal;

  return (
    <Link
      to={`/indicator/${config.id}`}
      className={`block rounded-xl border-2 ${zoneStyles.border} ${zoneStyles.bg} p-5 flex flex-col gap-3 hover:opacity-90 transition-opacity cursor-pointer`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
          {config.shortName}
        </span>
        <span className="text-xs text-zinc-400">{overview.date}</span>
      </div>

      {/* Value */}
      <div className={`text-4xl font-bold tabular-nums ${zoneStyles.valueColor}`}>
        {overview.value.toFixed(isVix ? 2 : 1)}
      </div>

      {/* Zone badge + name */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-zinc-500">{config.name}</span>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${zoneStyles.badgeBg} ${zoneStyles.badgeText}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${zoneStyles.dot} ${isActive ? "animate-pulse" : ""}`} />
          {zoneLabel}
        </span>
      </div>

      {/* Range hint */}
      <div className="text-xs text-zinc-400">
        当前区间 {rangeHint}
        <span className="ml-2 text-zinc-400">· 点击查看详情 →</span>
      </div>
    </Link>
  );
}
