"""
APScheduler: daily update job at 07:00 Beijing time (UTC+8).
Fetches incremental price data → recalculates breadth.
"""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.services import calculator, call_skew, constituents, fetcher, fng_fetcher, market_prices, panic_strategy, sp500, three_signals, vix_fetcher

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")


async def daily_update() -> None:
    logger.info("=== Daily update started ===")

    def update_breadth() -> None:
        tickers = sp500.get_tickers()
        if not tickers:
            logger.warning("No tickers in DB — refreshing constituent list first")
            tickers = sp500.refresh()
        fetcher.update_incremental(tickers)
        calculator.run_incremental_calculation()

    updates = (
        ("宽度与价格", update_breadth),
        ("Call Skew", call_skew.fetch_and_store),
        ("VIX", vix_fetcher.fetch_and_store),
        ("Fear & Greed", fng_fetcher.fetch_and_store),
        ("三信号", three_signals.fetch_and_store),
        ("首页ETF走势图", market_prices.fetch_all),
        ("QQQ 恐慌策略", lambda: (panic_strategy.ensure_strategy_sources(), panic_strategy.calculate_and_store())),
    )
    failed: list[str] = []

    for name, run_update in updates:
        try:
            run_update()
            logger.info("Daily update completed: %s", name)
        except Exception:
            failed.append(name)
            logger.exception("Daily update failed at %s", name)

    if failed:
        logger.warning("=== Daily update completed with failures: %s ===", ", ".join(failed))
    else:
        logger.info("=== Daily update complete ===")


async def weekly_constituent_update() -> None:
    """Refresh the S&P 500 membership each Monday at 10:00 Beijing time."""
    logger.info("=== Weekly constituent update started ===")
    try:
        added, removed = constituents.sync_current_constituents()
        logger.info(
            "=== Weekly constituent update complete: +%d, -%d ===",
            len(added),
            len(removed),
        )
    except Exception:
        logger.exception("Weekly constituent update failed")


def start() -> None:
    scheduler.add_job(
        daily_update,
        CronTrigger(hour=7, minute=0, timezone="Asia/Shanghai"),
        id="daily_update",
        replace_existing=True,
    )
    scheduler.add_job(
        weekly_constituent_update,
        CronTrigger(day_of_week="mon", hour=10, minute=0, timezone="Asia/Shanghai"),
        id="weekly_constituent_update",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started (daily 07:00, constituents Monday 10:00 CST)")


def stop() -> None:
    scheduler.shutdown(wait=False)
