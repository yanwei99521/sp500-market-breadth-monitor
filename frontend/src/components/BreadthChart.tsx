import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  LineSeries,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { BreadthPoint, TimeRange } from "../types";

interface Props {
  data: BreadthPoint[];
  threshold: number;
  thresholdColor: string;
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

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function BreadthChart({
  data,
  threshold,
  thresholdColor,
  range,
  loading,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const thresholdRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Initialize chart once (recreate if threshold color changes — i.e. new indicator)
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
      timeScale: {
        borderColor: "#e5e7eb",
        timeVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 380,
    });

    const mainSeries = chart.addSeries(LineSeries, {
      color: "#374151",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        minMove: 0.1,
        formatter: (price: number) => `${price.toFixed(1)}%`,
      },
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const thresholdSeries = chart.addSeries(LineSeries, {
      color: thresholdColor,
      lineWidth: 1,
      lineStyle: 2, // dashed
      priceFormat: {
        type: "custom",
        minMove: 0.1,
        formatter: (price: number) => `${price.toFixed(1)}%`,
      },
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = mainSeries;
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
      thresholdRef.current = null;
    };
  }, [thresholdColor]); // recreate when indicator changes

  // Update data
  useEffect(() => {
    if (!seriesRef.current || !thresholdRef.current || data.length === 0) return;

    const mainData: LineData[] = data.map((d) => ({
      time: d.date as Time,
      value: d.breadth_pct * 100,
    }));

    seriesRef.current.setData(mainData);

    const t = threshold * 100;
    const thresholdData: LineData[] = [
      { time: mainData[0].time, value: t },
      { time: mainData[mainData.length - 1].time, value: t },
    ];
    thresholdRef.current.setData(thresholdData);
    thresholdRef.current.applyOptions({ color: thresholdColor });
  }, [data, threshold, thresholdColor]);

  // Apply visible range
  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

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
