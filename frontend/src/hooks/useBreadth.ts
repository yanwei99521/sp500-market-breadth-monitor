import { useEffect, useState } from "react";
import type {
  BreadthPoint,
  CallSkewCurrent,
  CallSkewPoint,
  CotCurrent,
  CotPoint,
  CurrentBreadth,
  FngCurrent,
  FngPoint,
  MaPeriod,
  MarketRule,
  SignalPoint,
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

export function useCotCurrent() {
  const [data, setData] = useState<CotCurrent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<CotCurrent | null>(`${BASE}/cot/current`)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useCotHistory(range: TimeRange = "all") {
  const [data, setData] = useState<CotPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchJson<CotPoint[]>(`${BASE}/cot/history?range=${range}`)
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
