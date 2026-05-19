"""
QQQ 3-Month Call Skew (25dC / ATM).

Algorithm:
1. Fetch QQQ spot price.
2. Select the nearest expiration to 3 months out (60–100 days).
3. From the call chain, pick:
   - ATM strike  : closest to spot
   - 25d-call strike : closest to spot * exp(0.674 * atm_iv * sqrt(T))
     where T = days_to_expiry / 365 (Black-Scholes 25-delta approximation)
4. Both strikes must have IV > 5% and open interest > 0.
5. skew = otm25d_iv / atm_iv
6. is_signal when skew >= SIGNAL_THRESHOLD (0.90).
"""
import logging
import math
from datetime import date, datetime

import yfinance as yf

from app.database import get_conn

logger = logging.getLogger(__name__)

SIGNAL_THRESHOLD = 0.90
MIN_DAYS = 60
MAX_DAYS = 100


def _find_expiry(expirations: tuple[str, ...], today: date) -> str | None:
    """Return the nearest expiry between MIN_DAYS and MAX_DAYS from today."""
    candidates = []
    for exp in expirations:
        d = date.fromisoformat(exp)
        delta = (d - today).days
        if MIN_DAYS <= delta <= MAX_DAYS:
            candidates.append((delta, exp))
    if not candidates:
        return None
    candidates.sort()
    return candidates[0][1]


def fetch_and_store(target_date: date | None = None) -> dict | None:
    """
    Fetch today's QQQ call skew and persist to call_skew_history.
    Returns the stored row as a dict, or None on failure.
    """
    today = target_date or date.today()

    with get_conn() as conn:
        existing = conn.execute(
            "SELECT skew FROM call_skew_history WHERE date = ?",
            (today.isoformat(),),
        ).fetchone()
    if existing:
        logger.info("Call skew already stored for %s, skipping", today)
        return dict(existing)

    try:
        qqq = yf.Ticker("QQQ")
        hist = qqq.history(period="1d")
        if hist.empty:
            logger.warning("Could not fetch QQQ spot price")
            return None
        spot = float(hist["Close"].iloc[-1])

        expirations = qqq.options
        expiry = _find_expiry(expirations, today)
        if expiry is None:
            logger.warning("No suitable QQQ option expiry found (60–100 days out)")
            return None

        exp_date = date.fromisoformat(expiry)
        T = (exp_date - today).days / 365.0

        chain = qqq.option_chain(expiry)
        calls = chain.calls.copy()

        # Filter: valid IV and non-zero open interest
        calls = calls[
            (calls["impliedVolatility"] > 0.05)
            & (calls["openInterest"] > 0)
            & (calls["strike"] > 0)
        ].sort_values("strike").reset_index(drop=True)

        if len(calls) < 5:
            logger.warning("Insufficient QQQ call option data")
            return None

        # ATM: strike closest to spot
        atm_idx = int((calls["strike"] - spot).abs().idxmin())
        atm_iv = float(calls.loc[atm_idx, "impliedVolatility"])

        # 25-delta call: K = spot * exp(0.674 * atm_iv * sqrt(T))
        target_25d = spot * math.exp(0.674 * atm_iv * math.sqrt(T))
        d25_idx = int((calls["strike"] - target_25d).abs().idxmin())
        d25_iv = float(calls.loc[d25_idx, "impliedVolatility"])

        if atm_iv <= 0 or d25_iv <= 0:
            logger.warning("Invalid IV values: atm=%.4f, 25d=%.4f", atm_iv, d25_iv)
            return None

        skew = round(d25_iv / atm_iv, 4)
        is_signal = 1 if skew >= SIGNAL_THRESHOLD else 0

        logger.info(
            "QQQ call skew %s: expiry=%s spot=%.2f atm_iv=%.4f "
            "25d_iv=%.4f skew=%.4f signal=%s",
            today, expiry, spot, atm_iv, d25_iv, skew, bool(is_signal),
        )

        with get_conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO call_skew_history
                    (date, atm_iv, otm25d_iv, skew, is_signal)
                VALUES (?, ?, ?, ?, ?)
                """,
                (today.isoformat(), round(atm_iv, 4), round(d25_iv, 4), skew, is_signal),
            )

        return {
            "date": today.isoformat(),
            "atm_iv": round(atm_iv, 4),
            "otm25d_iv": round(d25_iv, 4),
            "skew": skew,
            "is_signal": bool(is_signal),
        }

    except Exception:
        logger.exception("Failed to fetch QQQ call skew")
        return None
