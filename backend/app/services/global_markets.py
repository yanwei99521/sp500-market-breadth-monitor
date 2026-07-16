"""Latest global equity index quotes for the dashboard ticker strip.

Quotes are fetched from Yahoo Finance through yfinance and kept in a short
in-memory cache.  Yahoo can delay exchange data, so callers must present the
values as the latest available quote rather than exchange-grade real time.
"""
import logging
import math
from datetime import datetime, timezone
from threading import Lock
from time import monotonic

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

CACHE_SECONDS = 60

MARKETS = (
    ("shanghai", "亚洲", "上证综指", "000001.SS"),
    ("hang_seng", "亚洲", "恒生指数", "^HSI"),
    ("nikkei", "亚洲", "日经 225", "^N225"),
    ("kospi", "亚洲", "韩国综合指数", "^KS11"),
    ("sp500", "美国", "标普 500", "^GSPC"),
    ("nasdaq", "美国", "纳斯达克综合", "^IXIC"),
    ("dow", "美国", "道琼斯", "^DJI"),
)

_cache_lock = Lock()
_cache_at = 0.0
_cache_payload: dict | None = None


def _number(value: object) -> float | None:
    """Return finite numeric values only; Yahoo occasionally supplies NaN."""
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _last_daily_quote(history: pd.DataFrame) -> tuple[float, float, str] | None:
    """Fallback to the final two daily closes when a live quote is unavailable."""
    closes = history.get("Close")
    if closes is None:
        return None

    # Yahoo can append a current-day row before it has a valid close.  Ignore
    # that placeholder rather than treating the whole market as unavailable.
    valid_closes = pd.to_numeric(closes, errors="coerce").dropna()
    if len(valid_closes) < 2:
        return None

    price = _number(valid_closes.iloc[-1])
    previous_close = _number(valid_closes.iloc[-2])
    if price is None or previous_close is None or previous_close == 0:
        return None
    quote_date = valid_closes.index[-1].strftime("%Y-%m-%d")
    return price, previous_close, quote_date


def _fetch_quote(market_id: str, region: str, name: str, symbol: str) -> dict | None:
    """Read a latest quote, retaining a daily-close fallback for closed markets."""
    ticker = yf.Ticker(symbol)
    history = ticker.history(period="5d", interval="1d", auto_adjust=False)
    fallback = _last_daily_quote(history)
    if fallback is None:
        logger.warning("Global quote unavailable for %s (%s)", name, symbol)
        return None

    fallback_price, fallback_previous_close, quote_date = fallback
    price = fallback_price
    previous_close = fallback_previous_close

    try:
        fast_info = ticker.fast_info
        latest_price = _number(fast_info.get("last_price"))
        latest_previous_close = _number(fast_info.get("previous_close"))
        if latest_price is not None and latest_previous_close not in (None, 0):
            price = latest_price
            previous_close = latest_previous_close
    except Exception as exc:  # Fallback remains useful for individual failed symbols.
        logger.info("Live quote fallback for %s: %s", symbol, exc)

    change = price - previous_close
    return {
        "id": market_id,
        "region": region,
        "name": name,
        "symbol": symbol,
        "price": round(price, 2),
        "change": round(change, 2),
        "change_pct": round(change / previous_close * 100, 3),
        "quote_date": quote_date,
    }


def latest_quotes() -> dict:
    """Return cached global quotes, refreshing at most once per minute."""
    global _cache_at, _cache_payload

    now = monotonic()
    with _cache_lock:
        if _cache_payload is not None and now - _cache_at < CACHE_SECONDS:
            return _cache_payload

        quotes: list[dict] = []
        for market in MARKETS:
            try:
                quote = _fetch_quote(*market)
                if quote is not None:
                    quotes.append(quote)
            except Exception:
                logger.exception("Failed to fetch global quote for %s", market[3])

        _cache_payload = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "quotes": quotes,
        }
        _cache_at = now
        return _cache_payload
