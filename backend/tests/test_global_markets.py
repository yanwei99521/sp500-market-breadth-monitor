import unittest

import pandas as pd

from app.services.global_markets import _last_daily_quote


class GlobalMarketTests(unittest.TestCase):
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
