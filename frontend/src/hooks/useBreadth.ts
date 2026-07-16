import { useEffect, useState } from "react";
import type {
  BreadthPoint,
  CallSkewCurrent,
  CallSkewPoint,
  CapePoint,
  CurrentBreadth,
  DailyStatusResponse,
  FngCurrent,
  FngPoint,
  GlobalMarketsResponse,
  MaPeriod,
  MarketPricePoint,
  MarketPriceSnapshot,
  MarketPriceTicker,
  MarketRule,
  PanicBacktestResponse,
  PanicStrategyCurrent,
  QqqDrawdownPoint,
  SignalPoint,
  ThreeSignalStatus,
  TimeRange,
  VixCurrent,
  VixPoint,
} from "../types";
import type { IndicatorOverview } from "../types/indicator";

const BASE = "/api";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

export function useCurrentBreadth() {
  const [data, setData] = useState<CurrentBreadth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<CurrentBreadth>(`${BASE}/breadth/current`)
      .then(setData)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  return { data, error };
}

export function useBreadthHistory(ma: MaPeriod) {
  const [data, setData] = useState<BreadthPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchJson<BreadthPoint[]>(`${BASE}/breadth/history?ma=${ma}&range=all`)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(String(e));
        setLoading(false);
      });
  }, [ma]);

  return { data, loading, error };
}

export function useSignals(ma: MaPeriod) {
  const [data, setData] = useState<SignalPoint[]>([]);

  useEffect(() => {
    fetchJson<SignalPoint[]>(`${BASE}/signals?ma=${ma}`)
      .then(setData)
      .catch(console.error);
  }, [ma]);

  return { data };
}

export function useCallSkewCurrent() {
  const [data, setData] = useState<CallSkewCurrent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<CallSkewCurrent | null>(`${BASE}/call-skew/current`)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useCallSkewHistory(range: TimeRange = "all") {
  const [data, setData] = useState<CallSkewPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchJson<CallSkewPoint[]>(`${BASE}/call-skew/history?range=${range}`)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [range]);

  return { data, loading };
}

export function useVixCurrent() {
  const [data, setData] = useState<VixCurrent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<VixCurrent | null>(`${BASE}/vix/current`)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useVixHistory(range: TimeRange = "3y") {
  const [data, setData] = useState<VixPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchJson<VixPoint[]>(`${BASE}/vix/history?range=${range}`)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  return { data, loading };
}

export function useFngCurrent() {
  const [data, setData] = useState<FngCurrent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<FngCurrent | null>(`${BASE}/fng/current`)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useFngHistory(range: TimeRange = "all") {
  const [data, setData] = useState<FngPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchJson<FngPoint[]>(`${BASE}/fng/history?range=${range}`)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  return { data, loading };
}

export function useIndicatorsOverview() {
  const [data, setData] = useState<IndicatorOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<IndicatorOverview[]>(`${BASE}/indicators/overview`)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}

export function useDailyIndicatorStatus(range: TimeRange = "1y") {
  const [data, setData] = useState<DailyStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchJson<DailyStatusResponse>(`${BASE}/indicators/daily-status?range=${range}`)
      .then((d) => {
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(String(e));
        setLoading(false);
      });
  }, [range]);

  return { data, loading, error };
}

export function useThreeSignalStatus() {
  const [data, setData] = useState<ThreeSignalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<ThreeSignalStatus>(`${BASE}/three-signals/current`)
      .then((d) => {
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}

export function usePanicStrategyCurrent() {
  const [data, setData] = useState<PanicStrategyCurrent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<PanicStrategyCurrent>(`${BASE}/panic-strategy/current`)
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export function usePanicStrategyBacktest() {
  const [data, setData] = useState<PanicBacktestResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<PanicBacktestResponse>(`${BASE}/panic-strategy/backtest`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useCapeHistory(range: TimeRange = "all") {
  const [data, setData] = useState<CapePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchJson<CapePoint[]>(`${BASE}/three-signals/cape/history?range=${range}`)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [range]);

  return { data, loading };
}

export function useQqqDrawdownHistory(range: TimeRange = "all") {
  const [data, setData] = useState<QqqDrawdownPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchJson<QqqDrawdownPoint[]>(`${BASE}/three-signals/qqq-drawdown/history?range=${range}`)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [range]);

  return { data, loading };
}

export function useMarketPriceHistory(ticker: MarketPriceTicker, range: TimeRange = "1y") {
  const [data, setData] = useState<MarketPricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchJson<MarketPricePoint[]>(`${BASE}/market-prices/history?ticker=${ticker}&range=${range}`)
      .then((d) => {
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(String(e));
        setLoading(false);
      });
  }, [ticker, range]);

  return { data, loading, error };
}

export function useMarketPriceSnapshots() {
  const [data, setData] = useState<MarketPriceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = () => {
      fetchJson<MarketPriceSnapshot[]>(`${BASE}/market-prices/snapshots`)
        .then((result) => {
          if (!active) return;
          setData(result);
          setError(null);
        })
        .catch((err: unknown) => {
          if (active) setError(String(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return { data, loading, error };
}

export function useGlobalMarketQuotes() {
  const [data, setData] = useState<GlobalMarketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = () => {
      fetchJson<GlobalMarketsResponse>(`${BASE}/global-markets/quotes`)
        .then((result) => {
          if (!active) return;
          setData(result);
          setError(null);
        })
        .catch((err: unknown) => {
          if (active) setError(String(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return { data, loading, error };
}

export function useMarketRules() {
  const [rules, setRules] = useState<MarketRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<MarketRule[]>(`${BASE}/admin/rules/public`)
      .then(setRules)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return { rules, loading, error };
}
