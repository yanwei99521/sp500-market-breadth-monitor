"""
CFTC Commitments of Traders — Traders in Financial Futures (TFF) report.

Fetches weekly Leveraged Funds (CTA/CPO) positioning in E-mini S&P 500 futures
from the CFTC Socrata public API and stores results in cot_history.

Data published every Friday at 3:30 PM ET, reflecting positions as of prior Tuesday.
"""
import logging

import requests

from app.database import get_conn

logger = logging.getLogger(__name__)

# CFTC TFF Futures-Only report (Socrata dataset ID: gpe5-46if)
CFTC_API_URL = "https://publicreporting.cftc.gov/resource/gpe5-46if.json"

# "S&P 500 Consolidated" = E-mini + full-size S&P 500 futures aggregate
SP500_MARKET_NAME = "S&P 500 Consolidated"


def fetch_cot_raw(limit: int = 300) -> list[dict]:
    """Download TFF Leveraged Funds data from CFTC public API."""
    params = {
        "$where": f"contract_market_name='{SP500_MARKET_NAME}'",
        "$order": "report_date_as_yyyy_mm_dd DESC",
        "$limit": limit,
        "$select": (
            "report_date_as_yyyy_mm_dd,"
            "lev_money_positions_long,"
            "lev_money_positions_short,"
            "open_interest_all"
        ),
    }
    resp = requests.get(CFTC_API_URL, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def update_cot_history() -> int:
    """Fetch latest COT data and upsert into cot_history. Returns rows processed."""
    records = fetch_cot_raw()
    if not records:
        logger.warning("CFTC API returned empty result")
        return 0

    inserted = 0
    with get_conn() as conn:
        for r in records:
            date_str = r.get("report_date_as_yyyy_mm_dd", "")[:10]
            if not date_str:
                continue

            long_pos = int(float(r.get("lev_money_positions_long") or 0))
            short_pos = int(float(r.get("lev_money_positions_short") or 0))
            net_long = long_pos - short_pos
            oi = int(float(r.get("open_interest_all") or 0))

            conn.execute(
                """
                INSERT OR REPLACE INTO cot_history
                    (date, long_contracts, short_contracts, net_long, open_interest)
                VALUES (?, ?, ?, ?, ?)
                """,
                (date_str, long_pos, short_pos, net_long, oi),
            )
            inserted += 1

        conn.commit()

    logger.info("COT update: %d rows upserted", inserted)
    return inserted
