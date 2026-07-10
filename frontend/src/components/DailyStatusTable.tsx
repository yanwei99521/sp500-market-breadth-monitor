import { INDICATORS } from "../config/indicators";
import { useDailyIndicatorStatus } from "../hooks/useBreadth";
import type { DailyIndicatorCell, DailyIndicatorStatus } from "../types";

const COLUMNS = [
  "breadth-ma50",
  "breadth-ma200",
  "vix",
  "fng",
  "call-skew-qqq",
];

const STATUS_LABEL: Record<DailyIndicatorStatus, string> = {
  buy: "买入",
  sell: "卖出",
  normal: "正常",
};

const STATUS_STYLE: Record<DailyIndicatorStatus, string> = {
  buy: "border-green-200 bg-green-50 text-green-700",
  sell: "border-red-200 bg-red-50 text-red-700",
  normal: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

const configById = new Map(INDICATORS.map((indicator) => [indicator.id, indicator]));

function StatusCell({ cell, date }: { cell: DailyIndicatorCell | undefined; date: string }) {
  if (!cell || cell.value === null) {
    return (
      <div className="min-w-24 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-center text-xs text-zinc-400">
        --
      </div>
    );
  }

  const carried = cell.source_date !== null && cell.source_date !== date;

  return (
    <div
      title={carried ? `数据日期：${cell.source_date}` : undefined}
      className={`min-w-24 rounded-md border px-2 py-1.5 text-center tabular-nums ${STATUS_STYLE[cell.status]}`}
    >
      <div className="text-sm font-semibold leading-5">{cell.display_value}</div>
      <div className="text-[11px] leading-4 opacity-80">
        {cell.status_label || STATUS_LABEL[cell.status]}
        {carried ? " · 延续" : ""}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-t border-zinc-100">
          <td className="sticky left-0 z-10 bg-white px-3 py-2">
            <div className="h-5 w-20 animate-pulse rounded bg-zinc-100" />
          </td>
          {COLUMNS.map((id) => (
            <td key={id} className="px-2 py-2">
              <div className="h-12 min-w-24 animate-pulse rounded-md bg-zinc-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function DailyStatusTable() {
  const { data, loading, error } = useDailyIndicatorStatus("1y");

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs text-zinc-400 uppercase tracking-wider">
          全局每日状态
        </h2>
        {data && (
          <span className="text-xs text-zinc-400">
            最近 {data.rows.length} 个交易日
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          全局状态数据暂不可用
        </div>
      )}

      {!error && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="max-h-[620px] overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20 bg-white shadow-[0_1px_0_#e4e4e7]">
                <tr>
                  <th className="sticky left-0 z-30 bg-white px-3 py-3 text-left text-xs font-medium text-zinc-500">
                    日期
                  </th>
                  {COLUMNS.map((id) => (
                    <th
                      key={id}
                      className="px-2 py-3 text-left text-xs font-medium text-zinc-500"
                    >
                      <div className="min-w-24">
                        {configById.get(id)?.shortName ?? id}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <SkeletonRows />}
                {!loading && data?.rows.map((row) => (
                  <tr key={row.date} className="border-t border-zinc-100 hover:bg-zinc-50/60">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 text-xs font-medium tabular-nums text-zinc-500">
                      {row.date}
                    </td>
                    {COLUMNS.map((id) => (
                      <td key={id} className="px-2 py-2">
                        <StatusCell cell={row.indicators[id]} date={row.date} />
                      </td>
                    ))}
                  </tr>
                ))}
                {!loading && data?.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLUMNS.length + 1}
                      className="px-3 py-8 text-center text-sm text-zinc-400"
                    >
                      暂无每日状态数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
