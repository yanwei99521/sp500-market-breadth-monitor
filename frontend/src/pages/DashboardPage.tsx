import { INDICATORS } from "../config/indicators";
import DailyStatusTable from "../components/DailyStatusTable";
import IndicatorCard from "../components/IndicatorCard";
import MarketRulesSection from "../components/MarketRulesSection";
import SentimentCard from "../components/SentimentCard";
import ThreeSignalPanel from "../components/ThreeSignalPanel";
import { useIndicatorsOverview } from "../hooks/useBreadth";
import type { IndicatorOverview } from "../types/indicator";

export default function DashboardPage() {
  const { data: overview, loading, error } = useIndicatorsOverview();

  // Map overview by id for easy lookup
  const overviewMap = new Map<string, IndicatorOverview>(
    overview.map((o) => [o.id, o]),
  );

  // Separate sentiment (VIX, F&G) from regular indicators
  const sentimentConfigs = INDICATORS.filter((c) => c.isSentiment);
  const regularConfigs = INDICATORS.filter((c) => !c.isSentiment);

  // Check if multiple buy signals are simultaneously active (regular indicators only)
  const activeBuySignals = overview.filter(
    (o) => o.type === "buy" && o.zone === "active",
  );
  const dualConfirmed = activeBuySignals.length >= 2;

  const skeletonCard = (
    <div className="rounded-xl border-2 border-zinc-200 bg-white p-5 animate-pulse">
      <div className="h-3 bg-zinc-200 rounded w-16 mb-4" />
      <div className="h-10 bg-zinc-200 rounded w-24 mb-3" />
      <div className="h-3 bg-zinc-200 rounded w-32" />
    </div>
  );

  return (
    <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      {/* Error */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-lg px-4 py-3 text-sm">
          ⚠ 数据尚未初始化。请先运行：
          <code className="ml-2 bg-yellow-100 px-2 py-0.5 rounded font-mono">
            cd backend && uv run python init_data.py
          </code>
        </div>
      )}

      {/* Sentiment indicators (VIX + F&G) — top row */}
      <section>
        <h2 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
          情绪指标
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sentimentConfigs.map((c) => <div key={c.id}>{skeletonCard}</div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sentimentConfigs.map((config) => {
              const ov = overviewMap.get(config.id);
              if (!ov) return null;
              return <SentimentCard key={config.id} config={config} overview={ov} />;
            })}
          </div>
        )}
      </section>

      <ThreeSignalPanel />

      {/* Dual confirmation banner */}
      {dualConfirmed && (
        <div className="bg-green-50 border border-green-400 rounded-lg px-4 py-3 text-sm text-green-800">
          <strong>双重确认信号：</strong>MA50 与 MA200 宽度同时进入买入区间，历史上最强买入信号。
        </div>
      )}

      {/* Regular indicator grid */}
      <section>
        <h2 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
          市场宽度 & 衍生指标
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularConfigs.map((c) => <div key={c.id}>{skeletonCard}</div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularConfigs.map((config) => {
              const ov = overviewMap.get(config.id);
              if (!ov) return null;
              return <IndicatorCard key={config.id} config={config} overview={ov} />;
            })}
          </div>
        )}
      </section>

      {/* Global daily status table */}
      <DailyStatusTable />

      {/* Market Rules */}
      <MarketRulesSection />

      {/* Footer */}
      <footer className="text-xs text-zinc-400 text-center pb-4">
        点击指标卡片查看详细历史图表与信号记录
      </footer>
    </main>
  );
}
