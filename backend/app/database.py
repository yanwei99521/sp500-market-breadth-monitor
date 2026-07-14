import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "stock.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS constituents (
                ticker TEXT PRIMARY KEY,
                name   TEXT,
                sector TEXT,
                updated_at DATE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS daily_prices (
                ticker TEXT NOT NULL,
                date   DATE NOT NULL,
                close  REAL NOT NULL,
                PRIMARY KEY (ticker, date)
            );

            CREATE INDEX IF NOT EXISTS idx_prices_date
                ON daily_prices(date);

            CREATE TABLE IF NOT EXISTS breadth_history (
                date         DATE    NOT NULL,
                ma_period    INTEGER NOT NULL,
                total_stocks INTEGER NOT NULL,
                above_ma     INTEGER NOT NULL,
                breadth_pct  REAL    NOT NULL,
                is_signal    INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (date, ma_period)
            );

            CREATE INDEX IF NOT EXISTS idx_breadth_date
                ON breadth_history(date);

            CREATE TABLE IF NOT EXISTS call_skew_history (
                date        DATE    NOT NULL PRIMARY KEY,
                atm_iv      REAL    NOT NULL,
                otm25d_iv   REAL    NOT NULL,
                skew        REAL    NOT NULL,
                is_signal   INTEGER NOT NULL DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_call_skew_date
                ON call_skew_history(date);

            CREATE TABLE IF NOT EXISTS fng_history (
                date   DATE    NOT NULL PRIMARY KEY,
                score  REAL    NOT NULL,
                rating TEXT    NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_fng_date
                ON fng_history(date);

            CREATE TABLE IF NOT EXISTS vix_history (
                date  DATE NOT NULL PRIMARY KEY,
                open  REAL NOT NULL,
                high  REAL NOT NULL,
                low   REAL NOT NULL,
                close REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_vix_date
                ON vix_history(date);

            CREATE TABLE IF NOT EXISTS qqq_history (
                date  DATE NOT NULL PRIMARY KEY,
                close REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_qqq_date
                ON qqq_history(date);

            CREATE TABLE IF NOT EXISTS market_price_history (
                ticker TEXT NOT NULL,
                date   DATE NOT NULL,
                open   REAL,
                high   REAL,
                low    REAL,
                close  REAL NOT NULL,
                PRIMARY KEY (ticker, date)
            );

            CREATE INDEX IF NOT EXISTS idx_market_price_history_ticker_date
                ON market_price_history(ticker, date);

            CREATE TABLE IF NOT EXISTS cape_history (
                month      TEXT NOT NULL PRIMARY KEY,
                cape       REAL NOT NULL,
                percentile REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tqqq_history (
                date  DATE NOT NULL PRIMARY KEY,
                close REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS risk_free_history (
                date      DATE NOT NULL PRIMARY KEY,
                yield_pct REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS panic_strategy_history (
                date                     DATE NOT NULL PRIMARY KEY,
                qqq_close                REAL NOT NULL,
                vix                      REAL,
                drawdown                 REAL NOT NULL,
                state                    TEXT NOT NULL,
                panic_level              INTEGER NOT NULL,
                target_qqq_weight        REAL NOT NULL,
                target_tqqq_weight       REAL NOT NULL,
                target_cash_weight       REAL NOT NULL,
                actual_qqq_weight        REAL NOT NULL,
                actual_tqqq_weight       REAL NOT NULL,
                actual_cash_weight       REAL NOT NULL,
                portfolio_value          REAL NOT NULL,
                portfolio_drawdown       REAL NOT NULL,
                transaction_cost         REAL NOT NULL,
                turnover                 REAL NOT NULL,
                qqq_benchmark_value      REAL NOT NULL,
                tqqq_benchmark_value     REAL NOT NULL,
                balanced_benchmark_value REAL NOT NULL,
                action                   TEXT NOT NULL,
                reason                   TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_panic_strategy_date
                ON panic_strategy_history(date);

            CREATE TABLE IF NOT EXISTS panic_strategy_summary (
                id            INTEGER PRIMARY KEY CHECK (id = 1),
                calculated_at DATETIME NOT NULL,
                payload       TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS market_rules (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT    NOT NULL,
                content     TEXT    NOT NULL,
                category    TEXT    NOT NULL DEFAULT 'general',
                source      TEXT,
                tags        TEXT,
                is_active   INTEGER NOT NULL DEFAULT 1,
                created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)
        columns = {row[1] for row in conn.execute("PRAGMA table_info(market_price_history)")}
        for column in ("open", "high", "low"):
            if column not in columns:
                conn.execute(f"ALTER TABLE market_price_history ADD COLUMN {column} REAL")
        conn.commit()
