import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  LineSeries,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { TimeRange, VixPoint } from "../types";

interface Props {
  data: VixPoint[];
  range: TimeRange;
  loading: boolean;
}

const RANGE_DAYS: Record<TimeRange, number | null> = {
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
  "3y": 365 * 3,
  "all": null,
};

// Threshold levels
const VIX_SELL = 14;
const VIX_BUY = 30;
const VIX_BUY_STRONG = 40;

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function VixChart({ data, range, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sellLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const buyLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const buyStrongLineRef = useRef<ISeriesApi<"Line"> | null>(null);

  const hasData = data.length >= 2;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#ffffff" },
        textColor: "#4b5563",
      },
      grid: {
        vertLines: { color: "#f3f4f6" },
        horzLines: { color: "#f3f4f6" },
      },
      crosshair: {
        vertLine: { color: "#d1d5db" },
        horzLine: { color: "#d1d5db" },
      },
      rightPriceScale: {
        borderColor: "#e5e7eb",
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      timeScale: { borderColor: "#e5e7eb", timeVisible: false },
      width: containerRef.current.clientWidth,
      height: 380,
    });

    // Main VIX line
    const main = chart.addSeries(LineSeries, {
      color: "#374151",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // Sell zone line — red at 14
    const sellLine = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: 2,        // dashed
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
    });

    // Buy zone line — blue at 30
    const buyLine = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
    });

    // Strong buy line — green at 40
    const buyStrongLine = chart.addSeries(LineSeries, {
      color: "#16a34a",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
    });

    chartRef.current = chart;
    mainRef.current = main;
    sellLineRef.current = sellLine;
    buyLineRef.current = buyLine;
    buyStrongLineRef.current = buyStrongLine;

    const observer = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      mainRef.current = null;
      sellLineRef.current = null;
      buyLineRef.current = null;
      buyStrongLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mainRef.current || data.length < 2) return;

    const mainData: LineData[] = data.map((d) => ({
      time: d.date as Time,
      value: d.close,
    }));
    mainRef.current.setData(mainData);

    const first = mainData[0].time;
    const last = mainData[mainData.length - 1].time;

    sellLineRef.current?.setData([
      { time: first, value: VIX_SELL },
      { time: last, value: VIX_SELL },
    ]);
    buyLineRef.current?.setData([
      { time: first, value: VIX_BUY },
      { time: last, value: VIX_BUY },
    ]);
    buyStrongLineRef.current?.setData([
      { time: first, value: VIX_BUY_STRONG },
      { time: last, value: VIX_BUY_STRONG },
    ]);
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || data.length < 2) return;
    const days = RANGE_DAYS[range];
    if (days === null) {
      chartRef.current.timeScale().fitContent();
    } else {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - days);
      chartRef.current.timeScale().setVisibleRange({
        from: toDateString(from) as Time,
        to: toDateString(to) as Time,
      });
    }
  }, [range, data]);

  if (!loading && !hasData) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-400 text-sm">
        暂无数据
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-zinc-500 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-green-600 inline-block" style={{ borderTop: "2px dashed #16a34a" }} />
          ≥ 40 重仓买入
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 inline-block" style={{ borderTop: "2px dashed #2563eb" }} />
          ≥ 30 买入
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 inline-block" style={{ borderTop: "2px dashed #ef4444" }} />
          ≤ 14 卖出
        </span>
      </div>

      <div className="relative w-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-lg">
            <span className="text-zinc-500 text-sm">加载中…</span>
          </div>
        )}
        <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />
      </div>
    </div>
  );
}
