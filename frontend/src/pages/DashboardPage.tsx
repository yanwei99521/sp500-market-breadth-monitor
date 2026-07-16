import { Link } from "react-router-dom";
import GlobalMarketTicker from "../components/GlobalMarketTicker";
import MarketPriceChartPanel from "../components/MarketPriceChartPanel";
import TradingDecisionPanel from "../components/TradingDecisionPanel";
import { useIndicatorsOverview } from "../hooks/useBreadth";

export default function DashboardPage() {
  const { data: overview, loading, error } = useIndicatorsOverview();

  return (
    <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 sm:px-6">
      {error && (
        <div className="border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          市场指标暂不可用，请稍后重试或前往后台检查数据更新。
        </div>
      )}

      <GlobalMarketTicker />

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.8fr)]">
        <MarketPriceChartPanel />
        {loading ? (
          <div className="h-[620px] animate-pulse rounded-lg border border-zinc-200 bg-white" />
        ) : (
          <TradingDecisionPanel overview={overview} />
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">研究中心</h2>
          <p className="mt-1 text-xs text-zinc-500">查看完整指标、策略回测、每日状态和市场规律。</p>
        </div>
        <Link to="/research" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
          打开研究中心 →
        </Link>
      </section>

      <footer className="pb-2 text-center text-xs text-zinc-400">
        数据按日线模型更新；行情数据可能存在延迟。
      </footer>
    </main>
  );
}
