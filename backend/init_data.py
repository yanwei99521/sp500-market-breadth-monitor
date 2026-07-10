"""
One-time data initialization script.
Run: uv run python init_data.py

Steps:
1. Create DB tables
2. Fetch S&P 500 constituent list from Wikipedia
3. Download 3 years of historical close prices
4. Calculate MA50 / MA200 breadth history
"""
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s — %(message)s",
    stream=sys.stdout,
)

from app.database import init_db
from app.services import calculator, fetcher, sp500, three_signals


def main() -> None:
    print("=" * 60)
    print("S&P 500 Market Breadth — Data Initialization")
    print("=" * 60)

    print("\n[1/4] Initializing database…")
    init_db()

    print("\n[2/4] Fetching S&P 500 constituents from Wikipedia…")
    tickers = sp500.refresh()
    print(f"      → {len(tickers)} tickers saved")

    print(f"\n[3/4] Downloading 3 years of price history ({len(tickers)} stocks)…")
    print("      This may take 15-30 minutes. Please wait…")
    fetcher.backfill_all(tickers)

    print("\n[4/5] Calculating MA50 and MA200 breadth…")
    calculator.run_full_calculation()

    print("\n[5/5] Fetching QQQ/CAPE data for three-signal framework…")
    three_signals.fetch_and_store()

    print("\n" + "=" * 60)
    print("Initialization complete! Run the server with:")
    print("  uv run uvicorn app.main:app --reload")
    print("=" * 60)


if __name__ == "__main__":
    main()
