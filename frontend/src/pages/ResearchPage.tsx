import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { INDICATORS } from "../config/indicators";
import DailyStatusTable from "../components/DailyStatusTable";
import IndicatorCard from "../components/IndicatorCard";
import MarketRulesSection from "../components/MarketRulesSection";
import PanicStrategyPanel from "../components/PanicStrategyPanel";
import SentimentCard from "../components/SentimentCard";
import ThreeSignalPanel from "../components/ThreeSignalPanel";
import { useIndicatorsOverview } from "../hooks/useBreadth";
import type { IndicatorOverview } from "../types/indicator";

type ResearchTab = "indicators" | "strategies" | "history" | "rules";

const TABS: Array<{ id: ResearchTab; label: string }> = [
  { id: "indicators", label: "指标总览" },
  { id: "strategies", label: "策略详情" },
  { id: "history", label: "每日历史" },
  { id: "rules", label: "市场规律" },
];

function IndicatorOverviewSection({ overview, loading }: { overview: IndicatorOverview[]; loading: boolean }) {
  const overviewMap = useMemo(
    () => new Map<string, IndicatorOverview>(overview.map((item) => [item.id, item])),
    [overview],
  );
  const sentimentConfigs = INDICATORS.filter((config) => config.isSentiment);
  const regularConfigs = INDICATORS.filter((config) => !config.isSentiment);
  const activeBuySignals = overview.filter((item) => item.type === "buy" && item.zone === "active");

  const skeleton = (key: string) => (
    <div key={key} className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-white" />
  );

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider text-zinc-400">情绪指标</h2>
          <span className="text-xs text-zinc-400">VIX / Fear & Greed</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {loading
            ? sentimentConfigs.map((config) => skeleton(config.id))
            : sentimentConfigs.map((config) => {
              const item = overviewMap.get(config.id);
              return item ? <SentimentCard key={config.id} config={config} overview={item} /> : null;
            })}
        </div>
      </section>

      {activeBuySignals.length >= 2 && (
        <div className="border border-green-400 bg-green-50 px-4 py-3 text-sm text-green-800">
          <strong>双重确认信号：</strong>MA50 与 MA200 宽度同时进入买入区间。
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider text-zinc-400">市场宽度 & 衍生指标</h2>
          <span className="text-xs text-zinc-400">点击卡片进入趋势详情</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? regularConfigs.map((config) => skeleton(config.id))
            : regularConfigs.map((config) => {
              const item = overviewMap.get(config.id);
              return item ? <IndicatorCard key={config.id} config={config} overview={item} /> : null;
            })}
        </div>
      </section>
    </div>
  );
}

export default function ResearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") as ResearchTab | null;
  const tab = TABS.some((item) => item.id === requestedTab) ? requestedTab as ResearchTab : "indicators";
  const { data: overview, loading, error } = useIndicatorsOverview();

  const changeTab = (nextTab: ResearchTab) => {
    setSearchParams(nextTab === "indicators" ? {} : { tab: nextTab });
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-xs text-zinc-400"><Link to="/" className="hover:text-zinc-700">交易台</Link> / 研究中心</div>
          <h1 className="text-xl font-semibold text-zinc-900">研究中心</h1>
          <p className="mt-1 text-xs text-zinc-500">完整指标和策略资料，不干扰首页交易决策。</p>
        </div>
        <div className="flex overflow-x-auto border border-zinc-200 bg-white p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => changeTab(item.id)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium transition ${tab === item.id ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">指标数据暂不可用。</div>}

      {tab === "indicators" && <IndicatorOverviewSection overview={overview} loading={loading} />}
      {tab === "strategies" && (
        <div className="space-y-8">
          <ThreeSignalPanel />
          <PanicStrategyPanel />
        </div>
      )}
      {tab === "history" && <DailyStatusTable />}
      {tab === "rules" && <MarketRulesSection />}
    </main>
  );
}
