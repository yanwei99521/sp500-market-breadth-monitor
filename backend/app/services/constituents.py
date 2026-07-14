"""Synchronize the current S&P 500 constituent list and its required price history."""
import logging
import time
from datetime import date, timedelta

from app.services import calculator, fetcher, sp500

logger = logging.getLogger(__name__)

NEW_TICKER_HISTORY_DAYS = 250


def sync_current_constituents() -> tuple[list[str], list[str]]:
    """Sync the constituent list and return (added, removed) ticker symbols."""
    logger.info("Fetching current S&P 500 constituents")
    new_constituents = sp500.fetch_constituents()
    added, removed = sp500.diff_constituents(new_constituents)

    if not added and not removed:
        logger.info("No constituent changes detected")
        return added, removed

    logger.info("Constituent changes: +%d added, -%d removed", len(added), len(removed))

    if removed:
        sp500.remove_constituents(removed)
    sp500.save_constituents(new_constituents)

    if added:
        end = date.today().isoformat()
        start = (date.today() - timedelta(days=NEW_TICKER_HISTORY_DAYS)).isoformat()
        logger.info(
            "Fetching %d days of prices for %d new ticker(s) (start=%s)",
            NEW_TICKER_HISTORY_DAYS,
            len(added),
            start,
        )
        batches = [
            added[index:index + fetcher.BATCH_SIZE]
            for index in range(0, len(added), fetcher.BATCH_SIZE)
        ]
        for index, batch in enumerate(batches, 1):
            data = fetcher.fetch_batch(batch, start, end)
            rows = [row for ticker_rows in data.values() for row in ticker_rows]
            saved = fetcher._save_prices(rows)
            logger.info("New constituent batch %d/%d: saved %d price rows", index, len(batches), saved)
            if index < len(batches):
                time.sleep(fetcher.BATCH_DELAY)

    calculator.run_incremental_calculation()
    logger.info("Constituent update complete")
    return added, removed
