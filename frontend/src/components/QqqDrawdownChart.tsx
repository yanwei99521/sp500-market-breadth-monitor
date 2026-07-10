import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  LineSeries,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { QqqDrawdownPoint, TimeRange } from "../types";

interface Props {
  data: QqqDrawdownPoint[];
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

export default function QqqDrawdownChart({ data, range, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const drawdownRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ret25Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const deepLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const crashLineRef = useRef<ISeriesApi<"Line"> | null>(null);

  const hasData = data.length >= 2;

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#ffffff" }, textColor: "#4b5563" },
      grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
      crosshair: { vertLine: { color: "#d1d5db" }, horzLine: { color: "#d1d5db" } },
      rightPriceScale: { borderColor: "#e5e7eb", scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderColor: "#e5e7eb", timeVisible: false },
      width: containerRef.current.clientWidth,
      height: 380,
    });

    const drawdown = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 1, minMove: 0.1 },
      priceLineVisible: false,
      lastValueVisible: true,
    });
    const ret25 = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 1,
      priceFormat: { type: "price", precision: 1, minMove: 0.1 },
      priceLineVisible: false,
      lastValueVisible: true,
    });
    const deep = chart.addSeries(LineSeries, {
      color: "#16a34a",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const crash = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    drawdownRef.current = drawdown;
    ret25Ref.current = ret25;
    deepLineRef.current = deep;
    crashLineRef.current = crash;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      drawdownRef.current = null;
      ret25Ref.current = null;
      deepLineRef.current = null;
      crashLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!drawdownRef.current || data.length < 2) return;
    const drawdownData: LineData[] = data.map((d) => ({
      time: d.date as Time,
      value: d.drawdown * 100,
    }));
    const ret25Data: LineData[] = data
      .filter((d) => d.return_25d !== null)
      .map((d) => ({
        time: d.date as Time,
        value: (d.return_25d ?? 0) * 100,
      }));
    drawdownRef.current.setData(drawdownData);
    ret25Ref.current?.setData(ret25Data);
    const first = drawdownData[0].time;
    const last = drawdownData[drawdownData.length - 1].time;
    deepLineRef.current?.setData([{ time: first, value: -20 }, { time: last, value: -20 }]);
    crashLineRef.current?.setData([{ time: first, value: -12 }, { time: last, value: -12 }]);
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
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-blue-600 inline-block" />距高点回撤</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-purple-500 inline-block" />25 日涨跌幅</span>
        <span className="flex items-center gap-1.5"><span className="w-4 inline-block" style={{ borderTop: "2px dashed #16a34a" }} />-20% 深度超跌</span>
        <span className="flex items-center gap-1.5"><span className="w-4 inline-block" style={{ borderTop: "2px dashed #ef4444" }} />-12% 快崩预警</span>
      </div>
      <div className="relative w-full">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70"><span className="text-sm text-zinc-500">加载中…</span></div>}
        <div ref={containerRef} className="w-full overflow-hidden rounded-lg" />
      </div>
    </div>
  );
}
