import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  LineSeries,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { CapePoint, TimeRange } from "../types";

interface Props {
  data: CapePoint[];
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

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function CapeChart({ data, range, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainRef = useRef<ISeriesApi<"Line"> | null>(null);
  const cheapLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const expensiveLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bubbleLineRef = useRef<ISeriesApi<"Line"> | null>(null);

  const hasData = data.length >= 2;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#ffffff" }, textColor: "#4b5563" },
      grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
      crosshair: { vertLine: { color: "#d1d5db" }, horzLine: { color: "#d1d5db" } },
      rightPriceScale: { borderColor: "#e5e7eb", scaleMargins: { top: 0.05, bottom: 0.05 } },
      timeScale: { borderColor: "#e5e7eb", timeVisible: false },
      width: containerRef.current.clientWidth,
      height: 380,
    });

    const main = chart.addSeries(LineSeries, {
      color: "#dc2626",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 1, minMove: 0.1 },
      priceLineVisible: false,
      lastValueVisible: true,
    });
    const cheap = chart.addSeries(LineSeries, {
      color: "#16a34a",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const expensive = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const bubble = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    mainRef.current = main;
    cheapLineRef.current = cheap;
    expensiveLineRef.current = expensive;
    bubbleLineRef.current = bubble;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      mainRef.current = null;
      cheapLineRef.current = null;
      expensiveLineRef.current = null;
      bubbleLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mainRef.current || data.length < 2) return;
    const mainData: LineData[] = data.map((d) => ({
      time: d.date as Time,
      value: d.percentile,
    }));
    mainRef.current.setData(mainData);
    const first = mainData[0].time;
    const last = mainData[mainData.length - 1].time;
    cheapLineRef.current?.setData([{ time: first, value: 20 }, { time: last, value: 20 }]);
    expensiveLineRef.current?.setData([{ time: first, value: 70 }, { time: last, value: 70 }]);
    bubbleLineRef.current?.setData([{ time: first, value: 85 }, { time: last, value: 85 }]);
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
    return <div className="flex h-48 items-center justify-center text-sm text-zinc-400">暂无数据</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-5 px-1 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="w-4 inline-block" style={{ borderTop: "2px dashed #16a34a" }} />20% 估值便宜</span>
        <span className="flex items-center gap-1.5"><span className="w-4 inline-block" style={{ borderTop: "2px dashed #f59e0b" }} />70% 估值偏高</span>
        <span className="flex items-center gap-1.5"><span className="w-4 inline-block" style={{ borderTop: "2px dashed #ef4444" }} />85% 泡沫警戒</span>
      </div>
      <div className="relative w-full">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70"><span className="text-sm text-zinc-500">加载中…</span></div>}
        <div ref={containerRef} className="w-full overflow-hidden rounded-lg" />
      </div>
    </div>
  );
}
