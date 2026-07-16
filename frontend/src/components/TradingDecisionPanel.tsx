import { useMemo, useState } from "react";
import {
  useMarketPriceSnapshots,
  usePanicStrategyCurrent,
  useThreeSignalStatus,
} from "../hooks/useBreadth";
import type { IndicatorOverview } from "../types/indicator";
import type { MarketPriceSnapshot } from "../types";

type DecisionTab = "today" | "three" | "panic";

interface Props {
  overview: IndicatorOverview[];
}

const TREND_META: Record<MarketPriceSnapshot["trend_state"], { label: string; style: string }> = {
  strong: { label: "强势跟踪", style: "text-red-700 bg-red-50 border-red-200" },
  watch: { label: "趋势观察", style: "text-amber-700 bg-amber-50 border-amber-200" },
  defensive: { label: "防守观察", style: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  insufficient_data: { label: "数据不足", style: "text-zinc-500 bg-zinc-50 border-zinc-200" },
};

function formatOverviewValue(item: IndicatorOverview | undefined) {
  if (!item) return "--";
  if (item.id === "vix") return item.value.toFixed(1);
  if (item.id === "fng") return item.value.toFixed(0);
  return `${(item.value * 100).toFixed(1)}%`;
}

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-zinc-200 px-3 last:border-r-0">
      <div className="text-[11px] text-zinc-400">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-zinc-800">{value}</div>
    </div>
  );
}

function OverviewRow({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "buy" | "sell" }) {
  const color = tone === "buy" ? "text-red-600" : tone === "sell" ? "text-emerald-600" : "text-zinc-700";
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-2 last:border-b-0">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function ThreeSignalView({ data }: { data: ReturnType<typeof useThreeSignalStatus>["data"] }) {
  if (!data) return <div className="py-8 text-center text-sm text-zinc-400">三信号数据加载中</div>;
  const isNormal = data.action_label === "正常投入";
  return (
    <div className="space-y-3">
      <div className={`border px-3 py-3 text-sm ${isNormal ? "border-zinc-200 bg-zinc-50 text-zinc-700" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">{data.action_label}</span>
          <span className="text-xs text-zinc-400">{data.date ?? "--"}</span>
        </div>
        <div className="mt-1 text-xs leading-5 text-zinc-600">{data.action_description}</div>
      </div>
      <div className="grid grid-cols-3 border-y border-zinc-200 py-2">
        {data.items.map((item) => (
          <div key={item.id} className="border-r border-zinc-200 px-2 text-center last:border-r-0">
            <div className="truncate text-[11px] text-zinc-400">{item.name}</div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-zinc-800">{item.display_value}</div>
            <div className="mt-0.5 truncate text-[11px] text-zinc-500">{item.status_label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanicView({ data }: { data: ReturnType<typeof usePanicStrategyCurrent>["data"] }) {
  if (!data) return <div className="py-8 text-center text-sm text-zinc-400">恐慌策略数据加载中</div>;
  return (
    <div className="space-y-3">
      <div className="border border-zinc-200 bg-zinc-50 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-zinc-800">{data.state_label}</span>
          <span className="text-xs text-zinc-400">{data.date}</span>
        </div>
        <div className="mt-1 text-xs leading-5 text-zinc-600">{data.action}</div>
      </div>
      <div className="grid grid-cols-3 border-y border-zinc-200 py-2 text-center">
        <div className="border-r border-zinc-200"><div className="text-[11px] text-zinc-400">QQQ</div><div className="mt-1 text-sm font-semibold tabular-nums">{(data.target.qqq * 100).toFixed(0)}%</div></div>
        <div className="border-r border-zinc-200"><div className="text-[11px] text-zinc-400">TQQQ</div><div className="mt-1 text-sm font-semibold tabular-nums">{(data.target.tqqq * 100).toFixed(0)}%</div></div>
        <div><div className="text-[11px] text-zinc-400">现金</div><div className="mt-1 text-sm font-semibold tabular-nums">{(data.target.cash * 100).toFixed(0)}%</div></div>
      </div>
      <div className="grid grid-cols-2 gap-x-4">
        <OverviewRow label="VIX" value={data.vix?.toFixed(1) ?? "--"} />
        <OverviewRow label="QQQ 回撤" value={`${(data.drawdown * 100).toFixed(1)}%`} />
      </div>
    </div>
  );
}

export default function TradingDecisionPanel({ overview }: Props) {
  const [tab, setTab] = useState<DecisionTab>("today");
  const { data: snapshots, loading: snapshotsLoading } = useMarketPriceSnapshots();
  const { data: threeSignals } = useThreeSignalStatus();
  const { data: panicStrategy } = usePanicStrategyCurrent();
  const overviewMap = useMemo(() => new Map(overview.map((item) => [item.id, item])), [overview]);
  const soxl = snapshots.find((item) => item.ticker === "SOXL");
  const trend = soxl ? TREND_META[soxl.trend_state] : TREND_META.insufficient_data;
  const macdTone = soxl?.macd_cross === "bullish" ? "buy" : soxl?.macd_cross === "bearish" ? "sell" : "normal";

  const tabs: Array<{ id: DecisionTab; label: string }> = [
    { id: "today", label: "今日决策" },
    { id: "three", label: "三信号" },
    { id: "panic", label: "恐慌策略" },
  ];

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs uppercase tracking-wider text-zinc-400">交易决策</h2>
        <span className="text-[11px] text-zinc-400">SOXL 优先 · 日线波段</span>
      </div>

      <div className="mb-4 flex border-b border-zinc-200">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`border-b-2 px-3 pb-2 text-xs font-medium transition first:pl-0 ${tab === item.id ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-700"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "today" && (
        <div className="space-y-4">
          <div className={`border px-3 py-3 ${trend.style}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-zinc-500">SOXL 技术状态</div>
                <div className="mt-1 text-lg font-semibold">{trend.label}</div>
              </div>
              {soxl && (
                <div className="text-right">
                  <div className="text-lg font-semibold tabular-nums">${soxl.close.toFixed(2)}</div>
                  <div className={`text-xs font-semibold tabular-nums ${soxl.change_pct >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {soxl.change_pct >= 0 ? "+" : ""}{soxl.change_pct.toFixed(2)}%
                  </div>
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-zinc-500">{soxl?.date ?? (snapshotsLoading ? "技术数据加载中" : "暂无数据")}</div>
          </div>

          <div className="grid grid-cols-3 border-y border-zinc-200 py-2">
            <SnapshotMetric label="MA55" value={soxl?.ma55 ? `$${soxl.ma55.toFixed(2)}` : "--"} />
            <SnapshotMetric label="MA233" value={soxl?.ma233 ? `$${soxl.ma233.toFixed(2)}` : "--"} />
            <SnapshotMetric label="MACD" value={soxl ? `${soxl.macd_histogram >= 0 ? "+" : ""}${soxl.macd_histogram.toFixed(2)}` : "--"} />
          </div>

          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wider text-zinc-400">市场环境</div>
            <OverviewRow label="VIX" value={formatOverviewValue(overviewMap.get("vix"))} tone={overviewMap.get("vix")?.zone === "buy" || overviewMap.get("vix")?.zone === "buy_strong" ? "buy" : "normal"} />
            <OverviewRow label="Fear & Greed" value={formatOverviewValue(overviewMap.get("fng"))} />
            <OverviewRow label="MA50 宽度" value={formatOverviewValue(overviewMap.get("breadth-ma50"))} />
            <OverviewRow label="MA200 宽度" value={formatOverviewValue(overviewMap.get("breadth-ma200"))} />
          </div>

          <div className="border-t border-zinc-200 pt-3">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-zinc-400">当前警报</div>
            {soxl?.macd_panic_buy && <div className="py-1 text-xs font-semibold text-red-700">SOXL MACD 低位金叉</div>}
            {threeSignals && threeSignals.action_label !== "正常投入" && <div className="py-1 text-xs font-semibold text-amber-700">三信号：{threeSignals.action_label}</div>}
            {panicStrategy && panicStrategy.state !== "normal" && <div className="py-1 text-xs font-semibold text-amber-700">恐慌策略：{panicStrategy.state_label}</div>}
            {soxl?.macd_panic_buy === false && threeSignals?.action_label === "正常投入" && panicStrategy?.state === "normal" && <div className="py-1 text-xs text-zinc-500">暂无触发警报，按计划观察。</div>}
          </div>
        </div>
      )}

      {tab === "three" && <ThreeSignalView data={threeSignals} />}
      {tab === "panic" && <PanicView data={panicStrategy} />}
    </section>
  );
}
