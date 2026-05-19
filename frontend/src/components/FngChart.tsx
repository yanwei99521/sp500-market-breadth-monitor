import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  LineSeries,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { FngPoint, TimeRange } from "../types";

interface Props {
  data: FngPoint[];
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

const FNG_EXTREME_FEAR = 25;
const FNG_EXTREME_GREED = 75;

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function FngChart({ data, range, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainRef = useRef<ISeriesApi<"Line"> | null>(null);
  const fearLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const greedLineRef = useRef<ISeriesApi<"Line"> | null>(null);

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

    // Main F&G score line
    const main = chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 1, minMove: 0.1 },
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // Extreme fear threshold — red at 25 (buy signal)
    const fearLine = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: 2,        // dashed
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
    });

    // Extreme greed threshold — green at 75 (sell signal)
    const greedLine = chart.addSeries(LineSeries, {
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
    fearLineRef.current = fearLine;
    greedLineRef.current = greedLine;

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
      fearLineRef.current = null;
      greedLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mainRef.current || data.length < 2) return;

    const mainData: LineData[] = data.map((d) => ({
      time: d.date as Time,
      value: d.score,
    }));
    mainRef.current.setData(mainData);

    const first = mainData[0].time;
    const last = mainData[mainData.length - 1].time;

    fearLineRef.current?.setData([
      { time: first, value: FNG_EXTREME_FEAR },
      { time: last, value: FNG_EXTREME_FEAR },
    ]);
    greedLineRef.current?.setData([
      { time: first, value: FNG_EXTREME_GREED },
      { time: last, value: FNG_EXTREME_GREED },
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
          <span className="w-4 inline-block" style={{ borderTop: "2px dashed #ef4444" }} />
          ≤ 25 极度恐慌（买入）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 inline-block" style={{ borderTop: "2px dashed #16a34a" }} />
          ≥ 75 极度贪婪（卖出）
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
