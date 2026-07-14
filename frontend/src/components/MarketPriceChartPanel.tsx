import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMarketPriceHistory } from "../hooks/useBreadth";
import type { MarketPriceTicker, TimeRange } from "../types";

const TICKERS: MarketPriceTicker[] = ["QQQ", "SPY", "SOXL"];
const RANGES: TimeRange[] = ["1m", "3m", "6m", "1y", "3y", "all"];
const MOVING_AVERAGES = [
  { window: 55, label: "MA55", color: "#2563eb" },
  { window: 200, label: "MA200", color: "#dc2626" },
  { window: 233, label: "MA233", color: "#9333ea" },
  { window: 610, label: "MA610", color: "#059669" },
] as const;
const MACD_PANIC_BUY_THRESHOLD = -0.25;

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

function rangeStartDate(range: TimeRange, latestDate: string | undefined): string | null {
  if (range === "all" || !latestDate) return null;

  const date = new Date(`${latestDate}T00:00:00`);
  if (range === "1m") date.setMonth(date.getMonth() - 1);
  if (range === "3m") date.setMonth(date.getMonth() - 3);
  if (range === "6m") date.setMonth(date.getMonth() - 6);
  if (range === "1y") date.setFullYear(date.getFullYear() - 1);
  if (range === "3y") date.setFullYear(date.getFullYear() - 3);
  return date.toISOString().slice(0, 10);
}

function calculateMovingAverage(data: { date: string; close: number }[], window: number): LineData[] {
  const points: LineData[] = [];
  let sum = 0;

  data.forEach((point, index) => {
    sum += point.close;
    if (index >= window) sum -= data[index - window].close;
    if (index >= window - 1) {
      points.push({ time: point.date as Time, value: sum / window });
    }
  });

  return points;
}

function calculateEma(values: number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  return values.reduce<number[]>((ema, value, index) => {
    ema.push(index === 0 ? value : value * multiplier + ema[index - 1] * (1 - multiplier));
    return ema;
  }, []);
}

function calculateMacd(data: { date: string; close: number }[]): {
  macd: LineData[];
  signal: LineData[];
  histogram: HistogramData[];
} {
  const closes = data.map((point) => point.close);
  const fast = calculateEma(closes, 12);
  const slow = calculateEma(closes, 26);
  const macdValues = fast.map((value, index) => value - slow[index]);
  const signalValues = calculateEma(macdValues, 9);

  return data.map((point, index) => {
    const time = point.date as Time;
    const histogramValue = macdValues[index] - signalValues[index];
    return {
      macd: { time, value: macdValues[index] },
      signal: { time, value: signalValues[index] },
      histogram: {
        time,
        value: histogramValue,
        color: histogramValue >= 0 ? "#16a34a" : "#dc2626",
      },
    };
  }).reduce<{ macd: LineData[]; signal: LineData[]; histogram: HistogramData[] }>(
    (result, point) => {
      result.macd.push(point.macd);
      result.signal.push(point.signal);
      result.histogram.push(point.histogram);
      return result;
    },
    { macd: [], signal: [], histogram: [] },
  );
}

function calculateMacdPanicBuyMarkers(data: { date: string; close: number }[]): SeriesMarker<Time>[] {
  const closes = data.map((point) => point.close);
  const fast = calculateEma(closes, 12);
  const slow = calculateEma(closes, 26);
  const dif = fast.map((value, index) => value - slow[index]);
  const dea = calculateEma(dif, 9);

  return data.flatMap((point, index) => {
    if (index === 0) return [];

    const isGoldenCross = dif[index - 1] <= dea[index - 1] && dif[index] > dea[index];
    const isBelowPanicThreshold = dif[index] < MACD_PANIC_BUY_THRESHOLD
      && dea[index] < MACD_PANIC_BUY_THRESHOLD;
    if (!isGoldenCross || !isBelowPanicThreshold) return [];

    return [{
      time: point.date as Time,
      position: "belowBar" as const,
      color: "#d97706",
      shape: "arrowUp" as const,
      text: "MACD 买入",
    }];
  });
}

function calculateTdSequential(data: { date: string; close: number }[]): SeriesMarker<Time>[] {
  let direction: "buy" | "sell" | null = null;
  let buyCount = 0;
  let sellCount = 0;
  let activeSequence: SeriesMarker<Time>[] = [];
  const completedSequences: SeriesMarker<Time>[] = [];

  data.forEach((point, index) => {
    if (index < 4) return;
    const referenceClose = data[index - 4].close;
    const nextDirection = point.close < referenceClose ? "buy" : point.close > referenceClose ? "sell" : null;

    if (nextDirection === null) {
      direction = null;
      buyCount = 0;
      sellCount = 0;
      activeSequence = [];
      return;
    }

    if (nextDirection !== direction) {
      direction = nextDirection;
      buyCount = 0;
      sellCount = 0;
      activeSequence = [];
    }

    if (direction === "buy") {
      buyCount += 1;
      activeSequence.push({
        time: point.date as Time,
        position: "belowBar",
        color: "#16a34a",
        shape: "circle",
        size: 0,
        text: String(buyCount),
      });
    } else {
      sellCount += 1;
      activeSequence.push({
        time: point.date as Time,
        position: "aboveBar",
        color: "#dc2626",
        shape: "circle",
        size: 0,
        text: String(sellCount),
      });
    }

    const count = direction === "buy" ? buyCount : sellCount;
    if (count === 9) {
      completedSequences.push(...activeSequence);
      direction = null;
      buyCount = 0;
      sellCount = 0;
      activeSequence = [];
    }
  });

  const currentCount = direction === "buy" ? buyCount : sellCount;
  return currentCount > 5 ? [...completedSequences, ...activeSequence] : completedSequences;
}

export default function MarketPriceChartPanel() {
  const [ticker, setTicker] = useState<MarketPriceTicker>("QQQ");
  const [range, setRange] = useState<TimeRange>("1y");
  const { data: fullData, loading, error } = useMarketPriceHistory(ticker, "all");
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const movingAverageSeriesRef = useRef<ISeriesApi<"Line">[]>([]);
  const tdSequentialMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const signalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const histogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const syncingTimeScaleRef = useRef(false);

  const rangeStart = useMemo(
    () => rangeStartDate(range, fullData.length > 0 ? fullData[fullData.length - 1].date : undefined),
    [fullData, range],
  );
  const data = useMemo(
    () => (rangeStart ? fullData.filter((point) => point.date >= rangeStart) : fullData),
    [fullData, rangeStart],
  );
  const movingAverages = useMemo(
    () => MOVING_AVERAGES.map((average) => ({
      ...average,
      points: calculateMovingAverage(fullData, average.window)
        .filter((point) => !rangeStart || String(point.time) >= rangeStart),
    })),
    [fullData, rangeStart],
  );
  const macd = useMemo(() => {
    const points = calculateMacd(fullData);
    if (!rangeStart) return points;
    return {
      macd: points.macd.filter((point) => String(point.time) >= rangeStart),
      signal: points.signal.filter((point) => String(point.time) >= rangeStart),
      histogram: points.histogram.filter((point) => String(point.time) >= rangeStart),
    };
  }, [fullData, rangeStart]);
  const tdSequentialMarkers = useMemo(
    () => calculateTdSequential(fullData).filter((marker) => !rangeStart || String(marker.time) >= rangeStart),
    [fullData, rangeStart],
  );
  const macdPanicBuyMarkers = useMemo(
    () => calculateMacdPanicBuyMarkers(fullData).filter((marker) => !rangeStart || String(marker.time) >= rangeStart),
    [fullData, rangeStart],
  );
  const priceMarkers = useMemo(
    () => [...tdSequentialMarkers, ...macdPanicBuyMarkers]
      .sort((left, right) => String(left.time).localeCompare(String(right.time))),
    [macdPanicBuyMarkers, tdSequentialMarkers],
  );

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

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#dc2626",
      downColor: "#16a34a",
      borderUpColor: "#dc2626",
      borderDownColor: "#16a34a",
      wickUpColor: "#dc2626",
      wickDownColor: "#16a34a",
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      priceLineVisible: false,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    tdSequentialMarkersRef.current = createSeriesMarkers(series, []);
    movingAverageSeriesRef.current = MOVING_AVERAGES.map((average) => chart.addSeries(LineSeries, {
      color: average.color,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    }));

    const observer = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      movingAverageSeriesRef.current = [];
      tdSequentialMarkersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!macdContainerRef.current) return;

    const chart = createChart(macdContainerRef.current, {
      layout: { background: { color: "#ffffff" }, textColor: "#4b5563" },
      grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
      crosshair: { vertLine: { color: "#d1d5db" }, horzLine: { color: "#d1d5db" } },
      rightPriceScale: { borderColor: "#e5e7eb", scaleMargins: { top: 0.12, bottom: 0.12 } },
      timeScale: { borderColor: "#e5e7eb", timeVisible: false },
      width: macdContainerRef.current.clientWidth,
      height: 150,
    });
    const histogram = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
      base: 0,
    });
    const macdLine = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const signalLine = chart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    macdChartRef.current = chart;
    histogramSeriesRef.current = histogram;
    macdSeriesRef.current = macdLine;
    signalSeriesRef.current = signalLine;

    const observer = new ResizeObserver(() => {
      if (macdContainerRef.current) chart.applyOptions({ width: macdContainerRef.current.clientWidth });
    });
    observer.observe(macdContainerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      macdChartRef.current = null;
      histogramSeriesRef.current = null;
      macdSeriesRef.current = null;
      signalSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const priceChart = chartRef.current;
    const macdChart = macdChartRef.current;
    if (!priceChart || !macdChart) return;

    const syncTo = (target: IChartApi) => (logicalRange: { from: number; to: number } | null) => {
      if (!logicalRange || syncingTimeScaleRef.current) return;
      syncingTimeScaleRef.current = true;
      target.timeScale().setVisibleLogicalRange(logicalRange);
      syncingTimeScaleRef.current = false;
    };
    const syncMacd = syncTo(macdChart);
    const syncPrice = syncTo(priceChart);

    priceChart.timeScale().subscribeVisibleLogicalRangeChange(syncMacd);
    macdChart.timeScale().subscribeVisibleLogicalRangeChange(syncPrice);

    return () => {
      priceChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncMacd);
      macdChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncPrice);
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || data.length < 2) return;

    const points: CandlestickData[] = data.map((point) => ({
      time: point.date as Time,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
    }));
    seriesRef.current.setData(points);
    movingAverages.forEach((average, index) => {
      movingAverageSeriesRef.current[index]?.setData(average.points);
    });
    tdSequentialMarkersRef.current?.setMarkers(priceMarkers);
    chartRef.current.timeScale().fitContent();
  }, [data, movingAverages, priceMarkers]);

  useEffect(() => {
    if (!macdChartRef.current || data.length < 2) return;
    histogramSeriesRef.current?.setData(macd.histogram);
    macdSeriesRef.current?.setData(macd.macd);
    signalSeriesRef.current?.setData(macd.signal);
    macdChartRef.current.timeScale().fitContent();
  }, [data.length, macd]);

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
        <div className="absolute left-5 top-5 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-white/85 px-1.5 py-1 text-xs text-zinc-500 backdrop-blur-sm">
          <span className="font-medium text-zinc-700">日线</span>
          {MOVING_AVERAGES.map((average) => (
            <span key={average.window} className="inline-flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-full" style={{ backgroundColor: average.color }} />
              {average.label}
            </span>
          ))}
          <span className="ml-1 border-l border-zinc-200 pl-3 text-green-700">绿：下跌九转</span>
          <span className="text-red-700">红：上涨九转</span>
          <span className="border-l border-zinc-200 pl-3 font-medium text-amber-700">
            黄箭头：MACD &lt; {MACD_PANIC_BUY_THRESHOLD} 金叉买入
          </span>
        </div>
        <div ref={containerRef} className="w-full overflow-hidden rounded" />
        <div className="mt-4 border-t border-zinc-100 pt-3">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span className="font-medium text-zinc-700">MACD (12, 26, 9)</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue-600" />DIF</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-orange-500" />DEA</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-green-600" />柱状图</span>
          </div>
          <div ref={macdContainerRef} className="w-full overflow-hidden rounded" />
        </div>
      </div>
    </section>
  );
}
