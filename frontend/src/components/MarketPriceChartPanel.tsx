import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMarketPriceHistory } from "../hooks/useBreadth";
import type { MarketPriceTicker, TimeRange } from "../types";

const TICKERS: MarketPriceTicker[] = ["QQQ", "SPY", "SOXL"];
const RANGES: TimeRange[] = ["1m", "3m", "6m", "1y", "3y", "all"];

const TICKER_LABEL: Record<MarketPriceTicker, string> = {
  QQQ: "纳指100",
  SPY: "标普500",
  SOXL: "半导体3倍",
};

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}

export default function MarketPriceChartPanel() {
  const [ticker, setTicker] = useState<MarketPriceTicker>("QQQ");
  const [range, setRange] = useState<TimeRange>("1y");
  const { data, loading, error } = useMarketPriceHistory(ticker, range);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const latest = data.length > 0 ? data[data.length - 1] : undefined;
  const rangeReturn = useMemo(() => {
    if (data.length < 2) return null;
    return data[data.length - 1].close / data[0].close - 1;
  }, [data]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#ffffff" }, textColor: "#4b5563" },
      grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
      crosshair: { vertLine: { color: "#d1d5db" }, horzLine: { color: "#d1d5db" } },
      rightPriceScale: { borderColor: "#e5e7eb", scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderColor: "#e5e7eb", timeVisible: false },
      width: containerRef.current.clientWidth,
      height: 320,
    });

    const series = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      priceLineVisible: false,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || data.length < 2) return;

    const points: LineData[] = data.map((point) => ({
      time: point.date as Time,
      value: point.close,
    }));
    seriesRef.current.setData(points);
    chartRef.current.timeScale().fitContent();
  }, [data]);

  return (
    <section>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-zinc-400">ETF 日线走势</h2>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xl font-semibold text-zinc-900">{ticker}</span>
            <span className="text-sm text-zinc-500">{TICKER_LABEL[ticker]}</span>
            <span className="text-sm font-medium tabular-nums text-zinc-700">
              {latest ? `$${latest.close.toFixed(2)}` : "--"}
            </span>
            <span className={`text-sm font-semibold tabular-nums ${rangeReturn !== null && rangeReturn >= 0 ? "text-green-700" : "text-red-700"}`}>
              {formatPercent(rangeReturn)}
            </span>
            <span className="text-xs text-zinc-400">{latest?.date ?? "--"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-zinc-200 bg-white p-1">
            {TICKERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTicker(item)}
                className={`min-w-14 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  ticker === item ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-zinc-200 bg-white p-1">
            {RANGES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={`min-w-10 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  range === item ? "bg-blue-600 text-white" : "text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative rounded-lg border border-zinc-200 bg-white p-3">
        {(loading || error) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/75">
            <span className={`text-sm ${error ? "text-red-600" : "text-zinc-500"}`}>
              {error ? "走势图数据暂不可用" : "加载中…"}
            </span>
          </div>
        )}
        {!loading && !error && data.length < 2 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white">
            <span className="text-sm text-zinc-400">暂无数据</span>
          </div>
        )}
        <div ref={containerRef} className="w-full overflow-hidden rounded" />
      </div>
    </section>
  );
}
