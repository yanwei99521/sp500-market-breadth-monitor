import { usePanicStrategyBacktest, usePanicStrategyCurrent } from "../hooks/useBreadth";

const STATE_STYLE: Record<string, string> = {
  normal: "border-zinc-200 bg-white text-zinc-800",
  panic_1: "border-amber-300 bg-amber-50 text-amber-800",
  panic_2: "border-orange-300 bg-orange-50 text-orange-800",
  panic_3: "border-red-300 bg-red-50 text-red-800",
  panic_4: "border-red-500 bg-red-50 text-red-900",
  recovery_1: "border-sky-300 bg-sky-50 text-sky-800",
  recovery_2: "border-blue-300 bg-blue-50 text-blue-800",
};

function Percent({ value }: { value: number }) {
  return <span className="font-semibold tabular-nums">{(value * 100).toFixed(0)}%</span>;
}

export default function PanicStrategyPanel() {
  const current = usePanicStrategyCurrent();
  const backtest = usePanicStrategyBacktest();

  if (current.loading) {
    return <div className="h-44 animate-pulse rounded-lg border border-zinc-200 bg-white" />;
  }

  if (current.error || !current.data) {
    return (
      <section className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        QQQ 恐慌策略正在准备历史回测数据。
      </section>
    );
  }

  const data = current.data;
  const backtestData = backtest.data;
  const primaryMetric = backtestData?.metrics.find((metric) => metric.id === "strategy");
  const qqqMetric = backtestData?.metrics.find((metric) => metric.id === "qqq");
  const style = STATE_STYLE[data.state] ?? STATE_STYLE.normal;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs uppercase tracking-wider text-zinc-400">QQQ 恐慌策略</h2>
        <span className="text-xs text-zinc-400">模型日期 {data.date}</span>
      </div>

      <div className={`rounded-lg border p-4 ${style}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold">{data.state_label}</div>
            <div className="mt-1 text-sm leading-6">{data.action}</div>
            <div className="text-xs leading-5 text-zinc-500">{data.reason}</div>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs sm:text-right">
            <span className="text-zinc-500">VIX</span><span className="font-semibold tabular-nums">{data.vix?.toFixed(1) ?? "--"}</span>
            <span className="text-zinc-500">QQQ 回撤</span><span className="font-semibold tabular-nums">{(data.drawdown * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 border-t border-current/10 pt-3 text-center text-xs">
          <div className="border-r border-current/10"><div className="text-zinc-500">QQQ 目标</div><div className="mt-1 text-lg"><Percent value={data.target.qqq} /></div></div>
          <div className="border-r border-current/10"><div className="text-zinc-500">TQQQ 目标</div><div className="mt-1 text-lg"><Percent value={data.target.tqqq} /></div></div>
          <div><div className="text-zinc-500">现金目标</div><div className="mt-1 text-lg"><Percent value={data.target.cash} /></div></div>
        </div>
      </div>

      {!backtest.loading && backtestData && primaryMetric && qqqMetric && (
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div className="border border-zinc-200 bg-white p-3"><div className="text-zinc-500">策略终值</div><div className="mt-1 text-base font-semibold tabular-nums">${Math.round(primaryMetric.terminal_value).toLocaleString()}</div></div>
          <div className="border border-zinc-200 bg-white p-3"><div className="text-zinc-500">策略最大回撤</div><div className="mt-1 text-base font-semibold tabular-nums">{(primaryMetric.max_drawdown * 100).toFixed(1)}%</div></div>
          <div className="border border-zinc-200 bg-white p-3"><div className="text-zinc-500">QQQ 终值</div><div className="mt-1 text-base font-semibold tabular-nums">${Math.round(qqqMetric.terminal_value).toLocaleString()}</div></div>
          <div className="border border-zinc-200 bg-white p-3"><div className="text-zinc-500">回测区间</div><div className="mt-1 text-base font-semibold tabular-nums">{backtestData.start_date.slice(0, 4)}-{backtestData.end_date.slice(0, 4)}</div></div>
        </div>
      )}
    </section>
  );
}
