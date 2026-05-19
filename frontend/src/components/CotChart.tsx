import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  LineSeries,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { CotPoint, TimeRange } from "../types";

interface Props {
  data: CotPoint[];
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

// Signal threshold: -200k contracts ≈ extreme short territory
const SIGNAL_THRESHOLD = -200000;

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Format net contracts as thousands with k suffix */
function fmtContracts(v: number): string {
  return `${(v / 1000).toFixed(0)}k`;
}

export default function CotChart({ data, range, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const zeroRef = useRef<ISeriesApi<"Line"> | null>(null);
  const thresholdRef = useRef<ISeriesApi<"Line"> | null>(null);

  const hasEnoughData = data.length >= 2;

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
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: "#e5e7eb",
        timeVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 380,
    });

    // Main COT series — blue line
    const mainSeries = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        minMove: 1,
        formatter: fmtContracts,
      },
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // Zero line — thin grey
    const zeroSeries = chart.addSeries(LineSeries, {
      color: "#9ca3af",
      lineWidth: 1,
      lineStyle: 0,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: {
        type: "custom",
        minMove: 1,
        formatter: fmtContracts,
      },
    });

    // Threshold line — amber dashed
    const thresholdSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: {
        type: "custom",
        minMove: 1,
        formatter: fmtContracts,
      },
    });

    chartRef.current = chart;
    seriesRef.current = mainSeries;
    zeroRef.current = zeroSeries;
    thresholdRef.current = thresholdSeries;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      zeroRef.current = null;
      thresholdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      !seriesRef.current ||
      !zeroRef.current ||
      !thresholdRef.current ||
      data.length < 2
    )
      return;

    const mainData: LineData[] = data.map((d) => ({
      time: d.date as Time,
      value: d.net_long,
    }));

    seriesRef.current.setData(mainData);

    const firstTime = mainData[0].time;
    const lastTime = mainData[mainData.length - 1].time;

    zeroRef.current.setData([
      { time: firstTime, value: 0 },
      { time: lastTime, value: 0 },
    ]);

    thresholdRef.current.setData([
      { time: firstTime, value: SIGNAL_THRESHOLD },
      { time: lastTime, value: SIGNAL_THRESHOLD },
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

  if (!loading && !hasEnoughData) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
        <div className="text-zinc-500 text-sm">
          {data.length === 1
            ? `当前净多仓：${fmtContracts(data[0].net_long)}`
            : "暂无数据"}
        </div>
        <div className="text-zinc-400 text-xs">
          CFTC 每周五发布，数据积累后自动显示
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-lg">
          <span className="text-zinc-500 text-sm">加载中…</span>
        </div>
      )}
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />
    </div>
  );
}
