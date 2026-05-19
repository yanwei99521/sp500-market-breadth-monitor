"""
APScheduler: daily update job at 07:00 Beijing time (UTC+8).
Fetches incremental price data → recalculates breadth.
"""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.services import calculator, call_skew, cot_fetcher, fetcher, fng_fetcher, sp500, vix_fetcher

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")


async def daily_update() -> None:
    logger.info("=== Daily update started ===")
    try:
        tickers = sp500.get_tickers()
        if not tickers:
            logger.warning("No tickers in DB — refreshing constituent list first")
            tickers = sp500.refresh()

        fetcher.update_incremental(tickers)
        calculator.run_incremental_calculation()
        call_skew.fetch_and_store()
        vix_fetcher.fetch_and_store()
        fng_fetcher.fetch_and_store()
        logger.info("=== Daily update complete ===")
    except Exception:
        logger.exception("Daily update failed")


async def weekly_cot_update() -> None:
    """Fetch CFTC COT data — runs every Saturday (published Friday after market close)."""
    logger.info("=== Weekly COT update started ===")
    try:
        inserted = cot_fetcher.update_cot_history()
        logger.info("=== Weekly COT update complete: %d rows ===", inserted)
    except Exception:
        logger.exception("Weekly COT update failed")


def start() -> None:
    scheduler.add_job(
        daily_update,
        CronTrigger(hour=7, minute=0, timezone="Asia/Shanghai"),
        id="daily_update",
        replace_existing=True,
    )
    # CFTC publishes Friday 3:30 PM ET = Saturday 03:30 CST
    scheduler.add_job(
        weekly_cot_update,
        CronTrigger(day_of_week="sat", hour=4, minute=0, timezone="Asia/Shanghai"),
        id="weekly_cot_update",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started (daily 07:00 CST + weekly COT Sat 04:00 CST)")


def stop() -> None:
    scheduler.shutdown(wait=False)
