import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AdminStatus,
  LogEntry,
  LogLevel,
  MarketRule,
  MarketRuleCreate,
  MarketRuleUpdate,
} from "../types";

const BASE = "/api/admin";

async function adminFetch<T>(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token,
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function useAdminStatus(token: string) {
  const [data, setData] = useState<AdminStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    adminFetch<AdminStatus>(`${BASE}/status`, token)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(String(e));
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useMarketRules(token: string) {
  const [rules, setRules] = useState<MarketRule[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!token) return;
    setLoading(true);
    adminFetch<MarketRule[]>(`${BASE}/rules`, token)
      .then((d) => {
        setRules(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createRule = useCallback(
    async (body: MarketRuleCreate): Promise<MarketRule> => {
      const rule = await adminFetch<MarketRule>(`${BASE}/rules`, token, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setRules((prev) => [rule, ...prev]);
      return rule;
    },
    [token],
  );

  const updateRule = useCallback(
    async (id: number, body: MarketRuleUpdate): Promise<MarketRule> => {
      const rule = await adminFetch<MarketRule>(`${BASE}/rules/${id}`, token, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setRules((prev) => prev.map((r) => (r.id === id ? rule : r)));
      return rule;
    },
    [token],
  );

  const deleteRule = useCallback(
    async (id: number): Promise<void> => {
      await adminFetch<void>(`${BASE}/rules/${id}`, token, {
        method: "DELETE",
      });
      setRules((prev) => prev.filter((r) => r.id !== id));
    },
    [token],
  );

  return { rules, loading, refresh, createRule, updateRule, deleteRule };
}

export async function triggerUpdate(
  source: string,
  token: string,
): Promise<{ ok: boolean; message: string }> {
  return adminFetch(`${BASE}/update/${source}`, token, { method: "POST" });
}

export function useAdminLogs(token: string, autoRefresh = false) {
  const [data, setData] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterLevel, setFilterLevel] = useState<LogLevel | "ALL">("ALL");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(
    (level?: LogLevel | "ALL") => {
      if (!token) return;
      setLoading(true);
      const lvl = level ?? filterLevel;
      const params = new URLSearchParams({ tail: "200" });
      if (lvl !== "ALL") params.set("level", lvl);
      adminFetch<LogEntry[]>(`${BASE}/logs?${params}`, token)
        .then((d) => {
          setData(d);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    },
    [token, filterLevel],
  );

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      fetchLogs();
      intervalRef.current = setInterval(() => fetchLogs(), 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchLogs]);

  return { data, loading, filterLevel, setFilterLevel, refresh: fetchLogs };
}
