import unittest

import pandas as pd

from app.services.panic_strategy import StrategyConfig, _panic_level, simulate


def market_rows() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"date": pd.Timestamp("2020-01-02"), "qqq_close": 100.0, "vix": 20.0, "drawdown": 0.0, "ma50": None, "ma200": None, "qqq_return": 0.0, "tqqq_return": 0.0, "cash_return": 0.0},
            {"date": pd.Timestamp("2020-01-03"), "qqq_close": 90.0, "vix": 25.0, "drawdown": -0.10, "ma50": None, "ma200": None, "qqq_return": -0.10, "tqqq_return": -0.30, "cash_return": 0.0},
            {"date": pd.Timestamp("2020-01-06"), "qqq_close": 90.0, "vix": 25.0, "drawdown": -0.10, "ma50": None, "ma200": None, "qqq_return": 0.0, "tqqq_return": 0.0, "cash_return": 0.0},
        ]
    )


class PanicStrategyTests(unittest.TestCase):
    def test_panic_boundaries_follow_documented_levels(self):
        config = StrategyConfig()
        self.assertEqual(_panic_level(-0.10, 25.0, config), 1)
        self.assertEqual(_panic_level(-0.20, 30.0, config), 2)
        self.assertEqual(_panic_level(-0.30, 40.0, config), 3)
        self.assertEqual(_panic_level(-0.40, 10.0, config), 4)
        self.assertEqual(_panic_level(-0.099, 80.0, config), 0)

    def test_signal_is_executed_on_the_next_trading_day(self):
        result, _ = simulate(market_rows())
        signal_day = result.iloc[1]
        execution_day = result.iloc[2]
        self.assertEqual(signal_day["state"], "panic_1")
        self.assertEqual(signal_day["target_tqqq_weight"], 0.05)
        self.assertAlmostEqual(signal_day["actual_tqqq_weight"], 0.0, places=6)
        self.assertGreater(execution_day["actual_tqqq_weight"], 0.049)
        self.assertGreater(execution_day["transaction_cost"], 0.0)

    def test_portfolio_stays_non_negative_after_costs(self):
        result, _ = simulate(market_rows())
        self.assertTrue((result["portfolio_value"] > 0).all())
        self.assertTrue((result["actual_cash_weight"] >= 0).all())


if __name__ == "__main__":
    unittest.main()
