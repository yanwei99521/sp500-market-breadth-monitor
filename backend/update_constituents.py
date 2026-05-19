"""
Update S&P 500 constituent list without affecting historical breadth calculations.

- Newly added stocks: fetches only the last ~250 days of prices (enough MA200 warmup).
- Removed stocks: deleted from constituents table; their price history is kept in DB.
- Historical breadth_history rows are NEVER overwritten — only the last 5 days are
  recalculated to incorporate the new composition.

Usage:
    cd backend && uv run python update_constituents.py
"""
import logging
import time
from datetime import date, timedelta

from app.database import init_db
from app.services import calculator, fetcher, sp500

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Days of history to fetch for newly added tickers.
# 250 trading days ≈ 1 calendar year, enough to warm up MA200.
NEW_TICKER_HISTORY_DAYS = 250


def main() -> None:
    init_db()

    # 1. Fetch current constituent list from Wikipedia.
    logger.info("Fetching current S&P 500 constituent list…")
    new_constituents = sp500.fetch_constituents()

    # 2. Diff against what is already in DB.
    added, removed = sp500.diff_constituents(new_constituents)

    if not added and not removed:
        logger.info("No constituent changes detected — nothing to do.")
        return

    logger.info(
        "Constituent changes: +%d added, -%d removed", len(added), len(removed)
    )
    if added:
        logger.info("  Added:   %s", added)
    if removed:
        logger.info("  Removed: %s", removed)

    # 3. Remove departed stocks from constituents table.
    #    Their prices remain in daily_prices but won't be included in future
    #    breadth calculations because _load_prices() joins on constituents.
    if removed:
        sp500.remove_constituents(removed)

    # 4. Upsert the full new list into constituents (adds new rows, updates names/sectors).
    sp500.save_constituents(new_constituents)

    # 5. Fetch recent prices for newly added tickers only.
    if added:
        end = date.today().isoformat()
        start = (date.today() - timedelta(days=NEW_TICKER_HISTORY_DAYS)).isoformat()
        logger.info(
            "Fetching %d days of prices for %d new ticker(s) (start=%s)…",
            NEW_TICKER_HISTORY_DAYS, len(added), start,
        )
        batch_size = fetcher.BATCH_SIZE
        batches = [added[i : i + batch_size] for i in range(0, len(added), batch_size)]
        for idx, batch in enumerate(batches, 1):
            logger.info("  Batch %d/%d: %s…", idx, len(batches), batch[:3])
            data = fetcher.fetch_batch(batch, start, end)
            rows = [row for ticker_rows in data.values() for row in ticker_rows]
            fetcher._save_prices(rows)
            logger.info("    → saved %d price rows", len(rows))
            if idx < len(batches):
                time.sleep(fetcher.BATCH_DELAY)

    # 6. Recalculate only the last 5 days of breadth.
    #    All older breadth_history rows remain unchanged.
    logger.info("Recalculating recent breadth (last 5 days)…")
    calculator.run_incremental_calculation()

    logger.info("Constituent update complete.")


if __name__ == "__main__":
    main()
