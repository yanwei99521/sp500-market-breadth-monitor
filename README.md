# 标普500市场宽度分析平台

美股技术分析 Web 平台，监测标普500成份股宽度指标，识别极端超卖买入信号。

## 快速启动

```bash
# 终端1：后端（端口 8000，绑定公网）
cd backend
~/.local/bin/uv run python run.py

# 终端2：前端（端口 5173，绑定公网）
cd frontend
pnpm dev
```

浏览器访问：**http://localhost:5173**

---

## 核心指标

| 指标 | 买入信号阈值 | 含义 |
|------|------------|------|
| 高于50日均线比例 | **< 7%** | 短期极端超卖，买入比特币/股票时机 |
| 高于200日均线比例 | **< 30%** | 长期结构性底部，历史每次大涨前出现 |

两者同时触发 = **最强买入信号**（上次：2025年4月关税暴跌）

---

## 数据

- 数据源：yfinance（免费）
- 成份股：503只，数据来自 Wikipedia
- 历史深度：3年
- 数据库：`backend/stock.db`（SQLite）
- 每日自动更新：06:00 北京时间

### 首次初始化（已完成，无需重复）

```bash
cd backend
~/.local/bin/uv run python init_data.py
```

### 手动触发更新

```bash
cd backend
~/.local/bin/uv run python -c "
from app.database import init_db
from app.services import sp500, fetcher, calculator
init_db()
tickers = sp500.get_tickers()
fetcher.update_incremental(tickers)
calculator.run_full_calculation()
print('done')
"
```

---

## 项目结构

```
stock/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── database.py          # SQLite
│   │   ├── models.py            # Pydantic 模型
│   │   ├── api/breadth.py       # API 端点
│   │   ├── services/
│   │   │   ├── sp500.py         # 成份股列表
│   │   │   ├── fetcher.py       # yfinance 拉取
│   │   │   └── calculator.py    # 宽度计算
│   │   └── scheduler.py         # 定时任务
│   ├── init_data.py             # 一次性初始化脚本
│   ├── stock.db                 # 数据库（380k+ 价格记录）
│   └── pyproject.toml
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── types.ts
    │   ├── hooks/useBreadth.ts
    │   └── components/
    │       ├── BreadthChart.tsx  # TradingView Lightweight Charts
    │       ├── SignalCard.tsx    # 当前值卡片
    │       └── SignalHistory.tsx # 历史信号表
    └── package.json
```

---

## API

```
GET /api/breadth/current          # 当前 MA50 + MA200 宽度
GET /api/breadth/history?ma=50&range=1y   # 历史数据（range: 1m/3m/6m/1y/3y/all）
GET /api/signals?ma=50            # 历史信号触发记录
GET /health                       # 健康检查
```

---

## 技术栈

- **后端**：Python 3.12 + FastAPI + APScheduler + SQLite
- **前端**：React 19 + Vite + TypeScript + Tailwind CSS v4
- **图表**：TradingView Lightweight Charts v5
- **包管理**：uv（Python）/ pnpm（前端）
