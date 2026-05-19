# 标普500市场宽度分析平台

## 项目概述

Web 版技术分析平台，监测标普500成份股宽度指标，识别极端超卖买入信号。

- **后端**：Python 3.12 + FastAPI，运行在 `http://localhost:8000`
- **前端**：React 19 + Vite + TypeScript，运行在 `http://localhost:5173`
- **数据库**：`backend/stock.db`（SQLite，已包含 3 年历史数据）
- **包管理**：uv（Python）/ pnpm（前端）

## 启动命令

```bash
# 后端（绑定公网 0.0.0.0:8000）
cd backend && ~/.local/bin/uv run python run.py

# 前端（绑定公网 0.0.0.0:5173）
cd frontend && pnpm dev
```

## 核心业务逻辑

### 两大指标

| 指标 | 信号阈值 | 用途 |
|------|---------|------|
| 高于50日均线比例（MA50） | < 7% | 短期极端超卖 → 买入比特币/股票 |
| 高于200日均线比例（MA200） | < 30% | 长期结构性底部 → 重大上涨前信号 |

两者同时触发 = 最强买入信号。

### 计算方式

```
breadth_pct = count(close > rolling_mean(close, window=N)) / total_valid_stocks
```

历史信号记录（已验证）：
- 2025-04-07：MA50 = 6.99%（触发）
- 2025-04-08：MA50 = 5.79%（最低，对应关税暴跌底部）

## 关键文件

| 文件 | 职责 |
|------|------|
| `backend/app/services/sp500.py` | 从 Wikipedia 获取 S&P500 成份股（503只） |
| `backend/app/services/fetcher.py` | yfinance 批量拉取价格，分批50只/次，间隔1.5秒 |
| `backend/app/services/calculator.py` | 计算 MA50/MA200 宽度，写入 `breadth_history` 表 |
| `backend/app/api/breadth.py` | 3个 GET 端点：`/current` `/history` `/signals` |
| `backend/app/scheduler.py` | APScheduler，每日 06:00 CST 自动增量更新 |
| `backend/init_data.py` | 一次性初始化脚本（已运行，勿重复） |
| `frontend/src/components/BreadthChart.tsx` | TradingView Lightweight Charts 图表 |
| `frontend/src/components/SignalCard.tsx` | 当前值卡片（含状态颜色） |

## 数据库表结构

```sql
constituents       -- 503只成份股（ticker, name, sector）
daily_prices       -- 每日收盘价（ticker, date, close）
breadth_history    -- 预计算宽度（date, ma_period, breadth_pct, is_signal）
```

## API 端点

```
GET /api/breadth/current                    → 当前 MA50 + MA200 状态
GET /api/breadth/history?ma=50&range=1y     → 历史序列（range: 1m/3m/6m/1y/3y/all）
GET /api/signals?ma=50                      → 历史信号触发列表
GET /health                                 → 健康检查
```

## 数据更新

```bash
# 手动增量更新（通常不需要，调度器每日自动执行）
cd backend
~/.local/bin/uv run python -c "
from app.database import init_db
from app.services import sp500, fetcher, calculator
init_db()
tickers = sp500.get_tickers()
fetcher.update_incremental(tickers)
calculator.run_full_calculation()
"
```

## 注意事项

- yfinance 拉取限速：每批50只，间隔1.5秒，勿并发过高
- Wikipedia 成份股请求须带 User-Agent，已在 `sp500.py` 配置
- `pd.read_html()` 须用 `io.StringIO()` 包装 HTML 字符串（pandas 3.x 兼容）
- `init_data.py` 已运行完毕，数据库有完整历史数据，勿重复执行
