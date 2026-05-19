import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BreadthChart from "../components/BreadthChart";
import CallSkewChart from "../components/CallSkewChart";
import CotChart from "../components/CotChart";
import FngChart from "../components/FngChart";
import VixChart from "../components/VixChart";
import SignalCard from "../components/SignalCard";
import SignalHistory from "../components/SignalHistory";
import { getIndicatorById } from "../config/indicators";
import {
  useBreadthHistory,
  useCallSkewCurrent,
  useCallSkewHistory,
  useCotCurrent,
  useCotHistory,
  useCurrentBreadth,
  useFngCurrent,
  useFngHistory,
  useSignals,
  useVixCurrent,
  useVixHistory,
} from "../hooks/useBreadth";
import type { TimeRange } from "../types";

const RANGE_DAYS: Record<TimeRange, number | null> = {
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
  "3y": 365 * 3,
  "all": null,
};

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "1Y", value: "1y" },
  { label: "3Y", value: "3y" },
  { label: "全部", value: "all" },
];

export default function DetailPage() {
  const { indicatorId } = useParams<{ indicatorId: string }>();
  const config = getIndicatorById(indicatorId ?? "");

  const [range, setRange] = useState<TimeRange>("3y");

  const isCallSkew = config?.variant === "call-skew";
  const isCot = config?.variant === "cot";
  const isVix = config?.variant === "vix";
  const isFng = config?.variant === "fng";
  const ma = config?.apiParams?.ma ?? 50;

  const { data: current } = useCurrentBreadth();
  const { data: breadthHistory, loading: breadthLoading } = useBreadthHistory(ma as 50 | 200);
  const { data: signals } = useSignals(ma as 50 | 200);
  const { data: skewHistory, loading: skewLoading } = useCallSkewHistory("all");
  const { data: skewCurrent } = useCallSkewCurrent();
  const { data: cotHistory, loading: cotLoading } = useCotHistory("all");
  const { data: cotCurrent } = useCotCurrent();
  const { data: vixHistory, loading: vixLoading } = useVixHistory("all");
  const { data: vixCurrent } = useVixCurrent();
  const { data: fngHistory, loading: fngLoading } = useFngHistory("all");
  const { data: fngCurrent } = useFngCurrent();

  const history = isCallSkew || isCot || isVix || isFng ? [] : breadthHistory;
  const loading = isCallSkew ? skewLoading
    : isCot ? cotLoading
    : isVix ? vixLoading
    : isFng ? fngLoading
    : breadthLoading;

  const currentStatus = config && !isCallSkew && !isCot && !isVix && !isFng
    ? ma === 50
      ? current?.ma50
      : current?.ma200
    : undefined;

  const filteredSignals = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days === null) return signals;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return signals.filter((s) => s.date >= cutoffStr);
  }, [signals, range]);

  if (!config) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="text-zinc-500 text-sm">指标不存在</div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      {/* Back navigation */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        ← 返回仪表盘
      </Link>

      {/* Current status card — breadth */}
      {currentStatus && (
        <section>
          <h2 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
            当前状态
          </h2>
          <div className="max-w-xs">
            <SignalCard data={currentStatus} config={config} />
          </div>
        </section>
      )}

      {/* Current status card — COT */}
      {isCot && cotCurrent && (
        <section>
          <h2 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
            当前状态
          </h2>
          <div className="max-w-sm rounded-xl border-2 border-zinc-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">CTA 净持仓（E-mini S&P）</span>
              <span className="text-xs text-zinc-400">{cotCurrent.date}</span>
            </div>
            <div className={`text-4xl font-bold tabular-nums ${cotCurrent.net_long < -200000 ? "text-green-700" : "text-zinc-800"}`}>
              {cotCurrent.net_long > 0 ? "+" : ""}{(cotCurrent.net_long / 1000).toFixed(0)}k
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-zinc-400 mb-0.5">多仓</div>
                <div className="text-zinc-700">+{(cotCurrent.long_contracts / 1000).toFixed(0)}k 张</div>
              </div>
              <div>
                <div className="text-zinc-400 mb-0.5">空仓</div>
                <div className="text-zinc-700">-{(cotCurrent.short_contracts / 1000).toFixed(0)}k 张</div>
              </div>
            </div>
            <div className="text-xs text-zinc-400">
              净空头阈值 &lt; -200k 张
              {cotCurrent.net_long < -200000
                ? <span className="ml-2 text-green-700 font-medium">● CTA 极端空头</span>
                : <span className="ml-2 text-zinc-400">· 正常</span>
              }
            </div>
            <div className="text-xs text-zinc-400">
              数据来源：CFTC TFF 报告（杠杆基金期货持仓）
            </div>
          </div>
        </section>
      )}

      {/* Current status card — F&G */}
      {isFng && fngCurrent && (
        <section>
          <h2 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">当前状态</h2>
          <div className={`max-w-sm rounded-xl border-2 bg-white p-5 space-y-3
            ${fngCurrent.score <= 25 ? "border-green-500 bg-green-50"
              : fngCurrent.score >= 75 ? "border-red-400 bg-red-50"
              : "border-zinc-200"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">CNN Fear & Greed</span>
              <span className="text-xs text-zinc-400">{fngCurrent.date}</span>
            </div>
            <div className={`text-4xl font-bold tabular-nums
              ${fngCurrent.score <= 25 ? "text-green-700"
                : fngCurrent.score >= 75 ? "text-red-600"
                : "text-zinc-800"}`}
            >
              {fngCurrent.score.toFixed(1)}
            </div>
            <div className="text-sm font-medium text-zinc-500 capitalize">{fngCurrent.rating.replace(/_/g, " ")}</div>
            {(fngCurrent.previous_close > 0 || fngCurrent.previous_1_week > 0) && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {fngCurrent.previous_close > 0 && (
                  <div>
                    <div className="text-zinc-400 mb-0.5">昨日收盘</div>
                    <div className="text-zinc-700">{fngCurrent.previous_close.toFixed(1)}</div>
                  </div>
                )}
                {fngCurrent.previous_1_week > 0 && (
                  <div>
                    <div className="text-zinc-400 mb-0.5">一周前</div>
                    <div className="text-zinc-700">{fngCurrent.previous_1_week.toFixed(1)}</div>
                  </div>
                )}
                {fngCurrent.previous_1_month > 0 && (
                  <div>
                    <div className="text-zinc-400 mb-0.5">一月前</div>
                    <div className="text-zinc-700">{fngCurrent.previous_1_month.toFixed(1)}</div>
                  </div>
                )}
                {fngCurrent.previous_1_year > 0 && (
                  <div>
                    <div className="text-zinc-400 mb-0.5">一年前</div>
                    <div className="text-zinc-700">{fngCurrent.previous_1_year.toFixed(1)}</div>
                  </div>
                )}
              </div>
            )}
            <div className="text-xs text-zinc-500">
              {fngCurrent.score <= 25 && <span className="text-green-700 font-semibold">● ≤ 25 极度恐慌 — 买入信号</span>}
              {fngCurrent.score >= 75 && <span className="text-red-600 font-semibold">● ≥ 75 极度贪婪 — 卖出信号</span>}
              {fngCurrent.score > 25 && fngCurrent.score < 75 && <span className="text-zinc-400">· 25～75 正常区间</span>}
            </div>
          </div>
        </section>
      )}

      {/* Current status card — VIX */}
      {isVix && vixCurrent && (
        <section>
          <h2 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">当前状态</h2>
          <div className={`max-w-sm rounded-xl border-2 bg-white p-5 space-y-3
            ${vixCurrent.zone === "buy_strong" ? "border-green-500 bg-green-50"
              : vixCurrent.zone === "buy" ? "border-blue-400 bg-blue-50"
              : vixCurrent.zone === "sell" ? "border-red-400 bg-red-50"
              : "border-zinc-200"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">CBOE VIX 恐慌指数</span>
              <span className="text-xs text-zinc-400">{vixCurrent.date}</span>
            </div>
            <div className={`text-4xl font-bold tabular-nums
              ${vixCurrent.zone === "buy_strong" ? "text-green-700"
                : vixCurrent.zone === "buy" ? "text-blue-700"
                : vixCurrent.zone === "sell" ? "text-red-600"
                : "text-zinc-800"}`}
            >
              {vixCurrent.close.toFixed(2)}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><div className="text-zinc-400 mb-0.5">今日高</div><div className="text-zinc-700">{vixCurrent.high.toFixed(2)}</div></div>
              <div><div className="text-zinc-400 mb-0.5">今日低</div><div className="text-zinc-700">{vixCurrent.low.toFixed(2)}</div></div>
              <div><div className="text-zinc-400 mb-0.5">开盘</div><div className="text-zinc-700">{vixCurrent.open.toFixed(2)}</div></div>
            </div>
            <div className="text-xs text-zinc-500">
              {vixCurrent.zone === "buy_strong" && <span className="text-green-700 font-semibold">● ≥ 40 极度恐慌 — 重仓买入</span>}
              {vixCurrent.zone === "buy" && <span className="text-blue-700 font-semibold">● ≥ 30 高度恐慌 — 买入</span>}
              {vixCurrent.zone === "sell" && <span className="text-red-600 font-semibold">● ≤ 14 极度平静 — 减仓/卖出</span>}
              {vixCurrent.zone === "normal" && <span className="text-zinc-400">· 14～30 正常区间</span>}
            </div>
          </div>
        </section>
      )}

      {/* Current status card — call skew */}
      {isCallSkew && skewCurrent && (
        <section>
          <h2 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
            当前状态
          </h2>
          <div className="max-w-sm rounded-xl border-2 border-zinc-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">QQQ 3M Call Skew</span>
              <span className="text-xs text-zinc-400">{skewCurrent.date}</span>
            </div>
            <div className={`text-4xl font-bold tabular-nums ${skewCurrent.is_signal ? "text-green-700" : "text-zinc-800"}`}>
              {skewCurrent.skew.toFixed(3)}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-zinc-400 mb-0.5">ATM IV</div>
                <div className="text-zinc-700">{(skewCurrent.atm_iv * 100).toFixed(2)}%</div>
              </div>
              <div>
                <div className="text-zinc-400 mb-0.5">25d Call IV</div>
                <div className="text-zinc-700">{(skewCurrent.otm25d_iv * 100).toFixed(2)}%</div>
              </div>
            </div>
            <div className="text-xs text-zinc-400">
              信号阈值 &gt; 0.90
              {skewCurrent.is_signal
                ? <span className="ml-2 text-green-700 font-medium">● 买入信号</span>
                : <span className="ml-2 text-zinc-400">· 正常</span>
              }
            </div>
          </div>
        </section>
      )}

      {/* Chart */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs text-zinc-400 uppercase tracking-wider">
            {config.name} — 历史走势
          </h2>
          {/* Time range */}
          <div className="flex gap-1">
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  range === r.value
                    ? "bg-zinc-200 text-zinc-900"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="text-xs text-zinc-400 mb-3">
            {config.description} — 信号阈值{" "}
            {config.thresholdDirection === "below" ? "<" : ">"}{" "}
            {config.valueFormat === "percent"
              ? `${(config.threshold * 100).toFixed(0)}%`
              : config.threshold.toFixed(2)}
          </div>
          {isCallSkew ? (
            <CallSkewChart data={skewHistory} range={range} loading={loading} />
          ) : isCot ? (
            <CotChart data={cotHistory} range={range} loading={loading} />
          ) : isVix ? (
            <VixChart data={vixHistory} range={range} loading={loading} />
          ) : isFng ? (
            <FngChart data={fngHistory} range={range} loading={loading} />
          ) : (
            <BreadthChart
              data={history}
              threshold={config.threshold}
              thresholdColor={config.thresholdColor}
              range={range}
              loading={loading}
            />
          )}
        </div>
      </section>

      {/* Signal history (breadth only) */}
      {!isCallSkew && !isCot && !isVix && !isFng && (
        <section>
          <h2 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
            历史信号触发记录
          </h2>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <SignalHistory
              signals={filteredSignals}
              indicatorName={config.name}
              threshold={config.threshold}
              thresholdDirection={config.thresholdDirection}
              type={config.type}
            />
          </div>
        </section>
      )}

      {/* Usage guide */}
      <section>
        <h2 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
          使用指南
        </h2>
        <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
          {/* What it measures */}
          <div className="p-4 space-y-1">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              指标说明
            </div>
            <p className="text-sm text-zinc-700 leading-relaxed">
              {config.usage.what}
            </p>
          </div>

          {/* What the signal means */}
          <div className="p-4 space-y-1">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              信号含义
            </div>
            <p className="text-sm text-zinc-700 leading-relaxed">
              {config.usage.signal}
            </p>
          </div>

          {/* How to use */}
          <div className="p-4">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              操作建议
            </div>
            <ul className="space-y-2">
              {config.usage.howToUse.map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-700 leading-relaxed">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 text-xs flex items-center justify-center font-medium">
                    {i + 1}
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Caution */}
          {config.usage.caution && (
            <div className="p-4 bg-amber-50">
              <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
                注意事项
              </div>
              <p className="text-sm text-amber-800 leading-relaxed">
                {config.usage.caution}
              </p>
            </div>
          )}
        </div>
      </section>

    </main>
  );
}
