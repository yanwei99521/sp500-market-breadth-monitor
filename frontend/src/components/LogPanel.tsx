import { useCallback, useEffect, useRef, useState } from "react";
import type { LogEntry, LogLevel } from "../types";

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: "text-zinc-400",
  INFO: "text-blue-500",
  WARNING: "text-yellow-500",
  ERROR: "text-red-500",
  CRITICAL: "text-red-600 font-bold",
};

const LEVEL_BG: Record<LogLevel, string> = {
  DEBUG: "bg-zinc-100",
  INFO: "bg-blue-50",
  WARNING: "bg-yellow-50",
  ERROR: "bg-red-50",
  CRITICAL: "bg-red-100",
};

const LEVELS: (LogLevel | "ALL")[] = ["ALL", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];

interface Props {
  entries: LogEntry[];
  loading: boolean;
  filterLevel: LogLevel | "ALL";
  onFilterChange: (level: LogLevel | "ALL") => void;
  onRefresh: () => void;
  totalCount: number;
}

export default function LogPanel({
  entries,
  loading,
  filterLevel,
  onFilterChange,
  onRefresh,
  totalCount,
}: Props) {
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new entries arrive (newest first)
  useEffect(() => {
    if (autoScroll && listRef.current && entries.length > 0) {
      listRef.current.scrollTop = 0;
    }
  }, [entries, autoScroll]);

  const levelCounts = useCallback(() => {
    const counts: Record<string, number> = { ALL: totalCount };
    for (const e of entries) {
      counts[e.level] = (counts[e.level] ?? 0) + 1;
    }
    return counts;
  }, [entries, totalCount]);

  const counts = levelCounts();

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-b border-zinc-200">
        {/* Level filter chips */}
        <div className="flex gap-1 flex-wrap">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => onFilterChange(lvl)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors
                ${filterLevel === lvl
                  ? "bg-zinc-800 text-white"
                  : "bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-100"
                }`}
            >
              {lvl === "ALL" ? "全部" : lvl}
              {lvl !== "ALL" && counts[lvl] != null && counts[lvl] > 0 && (
                <span className="ml-1 opacity-60">{counts[lvl]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Auto-scroll toggle */}
          <label className="flex items-center gap-1 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-zinc-300"
            />
            自动滚动
          </label>
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-white hover:border-zinc-300 border border-transparent transition-colors disabled:opacity-50"
          >
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={listRef}
        className="max-h-[70vh] overflow-y-auto font-mono text-xs"
      >
        {entries.length === 0 && !loading && (
          <div className="px-4 py-8 text-center text-zinc-400">
            暂无日志
          </div>
        )}

        {entries.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className={`flex items-start gap-2 px-3 py-1.5 border-b border-zinc-100
              ${LEVEL_BG[entry.level] ?? "bg-white"}`}
          >
            <span className="text-zinc-400 shrink-0 w-[150px] truncate">
              {entry.timestamp.replace("T", " ").slice(0, 19)}
            </span>
            <span
              className={`shrink-0 w-14 font-bold text-center rounded px-1 ${LEVEL_COLORS[entry.level]}`}
            >
              {entry.level}
            </span>
            <span className="text-zinc-500 shrink-0 w-32 truncate">
              {entry.name}
            </span>
            <span className="text-zinc-700 break-all flex-1">
              {entry.message}
            </span>
          </div>
        ))}

        {loading && entries.length === 0 && (
          <div className="px-4 py-8 text-center text-zinc-400">
            加载中…
          </div>
        )}
      </div>
    </div>
  );
}
