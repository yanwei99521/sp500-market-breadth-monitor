import { useGlobalMarketQuotes } from "../hooks/useBreadth";
import type { GlobalMarketQuote } from "../types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(price);
}

function formatUpdatedAt(value: string | undefined) {
  if (!value) return "";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(timestamp);
}

function Quote({ quote }: { quote: GlobalMarketQuote }) {
  const rising = quote.change > 0;
  const falling = quote.change < 0;
  const changeColor = rising ? "text-red-600" : falling ? "text-emerald-600" : "text-zinc-500";
  const sign = quote.change > 0 ? "+" : "";

  return (
    <div className="min-w-36 border-r border-zinc-200 px-4 py-3 last:border-r-0 sm:min-w-40">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{quote.region}</span>
        <span className="text-[10px] text-zinc-400">{quote.quote_date}</span>
      </div>
      <div className="mt-1 truncate text-xs font-medium text-zinc-700">{quote.name}</div>
      <div className="mt-1 text-base font-semibold tabular-nums text-zinc-900">{formatPrice(quote.price)}</div>
      <div className={`mt-0.5 text-xs font-semibold tabular-nums ${changeColor}`}>
        {sign}{quote.change.toFixed(2)} ({sign}{quote.change_pct.toFixed(2)}%)
      </div>
    </div>
  );
}

export default function GlobalMarketTicker() {
  const { data, loading, error } = useGlobalMarketQuotes();

  return (
    <section aria-label="全球市场行情">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-xs uppercase tracking-wider text-zinc-400">全球市场</h2>
        <span className="text-[11px] text-zinc-400">
          {data ? `${formatUpdatedAt(data.updated_at)} 更新` : "正在获取行情"}
        </span>
      </div>

      <div className="border-y border-zinc-200 bg-white">
        {loading ? (
          <div className="flex h-25 animate-pulse gap-px overflow-hidden bg-zinc-100">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="min-w-36 flex-1 bg-white" />
            ))}
          </div>
        ) : error || !data || data.quotes.length === 0 ? (
          <div className="px-4 py-4 text-sm text-zinc-500">全球市场行情暂不可用。</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-max">
              {data.quotes.map((quote) => <Quote key={quote.id} quote={quote} />)}
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] text-zinc-400">行情来自 Yahoo Finance，可能存在延迟；各市场休市时显示最后收盘价。</p>
    </section>
  );
}
