import unittest

import pandas as pd

from app.services.global_markets import _last_daily_quote
from app.services.market_prices import _build_snapshot, normalize_ticker


class GlobalMarketTests(unittest.TestCase):
    def test_tqqq_is_an_allowed_chart_ticker(self):
        self.assertEqual(normalize_ticker("tqqq"), "TQQQ")

    def test_snapshot_calculates_long_ma_and_macd_state(self):
        dates = pd.date_range("2025-01-01", periods=240, freq="D")
        rows = [
            {"date": date.strftime("%Y-%m-%d"), "close": 100.0 + index * 0.25}
            for index, date in enumerate(dates)
        ]

        snapshot = _build_snapshot("TQQQ", rows)

        self.assertIsNotNone(snapshot)
        assert snapshot is not None
        self.assertEqual(snapshot["ticker"], "TQQQ")
        self.assertIsNotNone(snapshot["ma55"])
        self.assertIsNotNone(snapshot["ma233"])
        self.assertIn(snapshot["macd_cross"], {"bullish", "bearish", "none"})

    def test_daily_fallback_skips_yahoo_current_day_nan_placeholder(self):
        history = pd.DataFrame(
            {"Close": [100.0, 102.5, float("nan")]},
            index=pd.to_datetime(["2026-07-11", "2026-07-14", "2026-07-15"]),
        )

        self.assertEqual(_last_daily_quote(history), (102.5, 100.0, "2026-07-14"))

    def test_daily_fallback_requires_two_valid_closes(self):
        history = pd.DataFrame(
            {"Close": [float("nan"), 102.5]},
            index=pd.to_datetime(["2026-07-14", "2026-07-15"]),
        )

        self.assertIsNone(_last_daily_quote(history))


if __name__ == "__main__":
    unittest.main()
