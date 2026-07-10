# 美股风险资产择时仪表盘

一个用于监控美股市场宽度、市场情绪和衍生品仓位的 Web 仪表盘。项目的核心目标不是做个股筛选，而是识别标普500和风险资产在极端恐慌、极端超卖、结构性底部附近出现的买入窗口，并辅助后续分批建仓或减仓判断。

核心判断逻辑：

- 标普500成份股大面积跌破均线时，市场可能进入极端超卖区。
- VIX、Fear & Greed、QQQ 看涨偏斜等指标用于交叉确认市场情绪和资金状态。
- 多个买入信号同时出现时，前端会突出展示为更强的风险资产买入机会。

> 本项目是数据看板和研究工具，不构成投资建议。

## 快速启动

```bash
# 终端1：后端，默认端口 8000
cd backend
~/.local/bin/uv run python run.py

# 终端2：前端，默认端口 5173
cd frontend
pnpm dev
```

浏览器访问：

```text
http://localhost:5173
```

后端健康检查：

```text
http://localhost:8000/health
```

## 项目在看什么

### 1. 标普500市场宽度

市场宽度指标计算的是：标普500成份股中，有多少股票的收盘价高于自己的移动均线。

| 指标 | 买入信号阈值 | 含义 |
| --- | --- | --- |
| MA50 市场宽度 | `< 7%` | 短期极端超卖，代表绝大多数股票跌破50日均线 |
| MA200 市场宽度 | `< 30%` | 长期结构性底部区域，代表大多数股票跌破200日均线 |

两者同时触发时，前端会显示“双重确认信号”。

### 2. 情绪和衍生品辅助指标

| 指标 | 数据含义 | 当前用途 |
| --- | --- | --- |
| VIX 恐慌指数 | CBOE 标普500隐含波动率 | `>=40` 极度恐慌 → 重仓买入；`>=30` 高度恐慌 → 分批买入；`14-30` 正常观察；`<=14` 极度平静 → 减仓/止盈 |
| Fear & Greed Index | CNN 恐惧贪婪指数 | `<=25` 极度恐慌 → 重仓买入；`26-44` 恐慌 → 观察/轻仓；`45-54` 中性 → 持仓观望；`55-74` 贪婪 → 谨慎/减少买入；`>=75` 极度贪婪 → 减仓/止盈 |
| QQQ 看涨偏斜 | QQQ 约3个月25-delta看涨期权 IV / 平值 IV | 看涨偏斜走强时作为趋势修复确认 |

### 3. 市场规律

后台可以维护“市场规律”笔记，例如历史统计、技术分析、资金流向、情绪指标、宏观规律等。首页会展示已启用的规则，方便把人工研究结论和量化指标放在同一个看板里。

### 4. 全局每日状态

首页提供“全局每日状态”表，默认展示最近 1 年交易日，每天一行、每个指标一列。单元格显示指标数值和状态：绿色代表买入倾向，红色代表减仓/风险控制倾向，灰色代表正常；Fear & Greed 会按五档区间显示具体操作含义。周度或缺失数据会沿用上一条有效值，并保留原始数据日期。

## 数据来源和更新

| 数据 | 来源 | 存储表 |
| --- | --- | --- |
| 标普500成份股 | Wikipedia | `constituents` |
| 成份股日线收盘价 | yfinance | `daily_prices` |
| MA50/MA200 市场宽度 | 本地计算 | `breadth_history` |
| VIX | yfinance `^VIX` | `vix_history` |
| Fear & Greed | CNN 接口 | `fng_history` |
| QQQ Call Skew | yfinance 期权链 | `call_skew_history` |
| 市场规律 | 管理后台手工维护 | `market_rules` |

数据库是 SQLite：

```text
backend/stock.db
```

定时任务：

- 每天北京时间 `07:00`：更新成份股价格、重新计算近期市场宽度、更新 Call Skew、VIX、Fear & Greed、三信号框架（QQQ 回撤 + CAPE 分位）。

## 首次初始化

如果本地没有数据库或数据不完整，运行：

```bash
cd backend
~/.local/bin/uv run python init_data.py
```

初始化流程：

1. 创建 SQLite 表。
2. 从 Wikipedia 获取标普500成份股。
3. 从 yfinance 回填历史价格。
4. 计算 MA50 和 MA200 市场宽度。

注意：当前 `fetcher.py` 中 `HISTORY_YEARS = 10`，首次价格回填按 10 年历史数据执行，耗时可能较长。

## 手动更新数据

### 通过管理后台

访问：

```text
http://localhost:5173/admin
```

默认管理员密码：

```text
stock-admin
```

可以通过环境变量修改：

```bash
ADMIN_TOKEN=your-token ~/.local/bin/uv run python run.py
```

后台能力：

- 查看各数据源最新日期和记录数。
- 手动触发 MA 宽度、Call Skew、VIX、Fear & Greed、三信号更新。
- 查看运行日志。
- 新增、编辑、删除市场规律。

### 通过脚本

手动更新标普500价格并重算宽度：

```bash
cd backend
~/.local/bin/uv run python -c "
from app.database import init_db
from app.services import calculator, fetcher, sp500

init_db()
tickers = sp500.get_tickers()
if not tickers:
    tickers = sp500.refresh()
fetcher.update_incremental(tickers)
calculator.run_full_calculation()
print('done')
"
```

## API 概览

公开接口：

```text
GET /health

GET /api/indicators/overview
GET /api/indicators/daily-status?range=1y

GET /api/breadth/current
GET /api/breadth/history?ma=50&range=1y
GET /api/signals?ma=50

GET /api/vix/current
GET /api/vix/history?range=1y

GET /api/fng/current
GET /api/fng/history?range=1y

GET /api/call-skew/current
GET /api/call-skew/history?range=1y

GET /api/admin/rules/public
```

管理接口需要请求头：

```text
X-Admin-Token: stock-admin
```

主要管理接口：

```text
GET    /api/admin/status
GET    /api/admin/logs

POST   /api/admin/update/breadth
POST   /api/admin/update/call-skew
POST   /api/admin/update/vix
POST   /api/admin/update/fng
POST   /api/admin/update/three-signals

GET    /api/admin/rules
POST   /api/admin/rules
PUT    /api/admin/rules/{rule_id}
DELETE /api/admin/rules/{rule_id}
```

## 项目结构

```text
stock/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 入口，挂载 API 和生产环境前端静态文件
│   │   ├── database.py             # SQLite 连接和表结构
│   │   ├── models.py               # Pydantic 响应模型
│   │   ├── scheduler.py            # APScheduler 定时更新任务
│   │   ├── api/
│   │   │   ├── breadth.py          # MA50/MA200 市场宽度接口
│   │   │   ├── indicators.py       # 首页指标总览接口
│   │   │   ├── vix.py              # VIX 接口
│   │   │   ├── fng.py              # Fear & Greed 接口
│   │   │   ├── call_skew.py        # QQQ Call Skew 接口
│   │   │   └── admin.py            # 后台状态、日志、更新、市场规律
│   │   └── services/
│   │       ├── sp500.py            # 标普500成份股获取
│   │       ├── fetcher.py          # yfinance 价格拉取
│   │       ├── calculator.py       # 市场宽度计算
│   │       ├── vix_fetcher.py      # VIX 拉取
│   │       ├── fng_fetcher.py      # Fear & Greed 拉取
│   │       └── call_skew.py        # QQQ 期权偏斜计算
│   ├── init_data.py                # 一次性初始化脚本
│   ├── run.py                      # 本地启动脚本
│   └── pyproject.toml
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── pages/
    │   │   ├── DashboardPage.tsx   # 首页仪表盘
    │   │   ├── DetailPage.tsx      # 指标详情页和历史图表
    │   │   └── AdminPage.tsx       # 管理后台
    │   ├── config/indicators.ts    # 指标阈值、说明和展示配置
    │   ├── hooks/                  # API 请求 hooks
    │   └── components/             # 图表、卡片、日志、规则组件
    ├── package.json
    └── vite.config.ts
```

## 技术栈

- 后端：Python 3.11+、FastAPI、APScheduler、SQLite、pandas、yfinance、requests
- 前端：React 19、Vite、TypeScript、Tailwind CSS v4
- 图表：TradingView Lightweight Charts v5
- 包管理：uv、pnpm

## 生产模式

前端构建后，后端会自动挂载 `frontend/dist`，可由 FastAPI 直接提供单页应用：

```bash
cd frontend
pnpm build

cd ../backend
~/.local/bin/uv run python run.py
```

构建产物存在时，`backend/app/main.py` 会挂载 `/assets` 并把非 API 路由回退到 `index.html`。

## 使用标准 HTTPS 域名

当前使用 Cloudflare Tunnel，把 `https://f.yanwei99521.dpdns.org` 转发到本机的 `http://127.0.0.1:8000`。这种方式不需要开放路由器端口，不受公网 IPv4/IPv6 地址变化影响，也不需要继续运行 AAAA 动态解析任务。

### 1. 构建生产前端

```bash
cd frontend
pnpm build
```

### 2. 在 Cloudflare 创建 Tunnel

在 Cloudflare Zero Trust 中进入 `Networks > Tunnels`：

1. 创建名为 `stock-dashboard` 的 Cloudflared Tunnel。
2. 添加 Public Hostname：`f.yanwei99521.dpdns.org`。
3. Service Type 选择 `HTTP`，URL 填写 `127.0.0.1:8000`。
4. 复制 Cloudflare 提供的 Tunnel token。

把 token 保存到本机用户目录，文件不会进入项目仓库：

```bash
cat > ~/.stock-tunnel.env <<'EOF'
export TUNNEL_TOKEN="粘贴 Cloudflare Tunnel token"
EOF
chmod 600 ~/.stock-tunnel.env
```

同时为公网管理后台设置独立强密码：

```bash
cat > ~/.stock-dashboard.env <<'EOF'
export ADMIN_TOKEN="替换为独立强密码"
EOF
chmod 600 ~/.stock-dashboard.env
```

### 3. 设置登录后自动运行

项目提供两个 macOS LaunchAgent：一个运行仪表盘，一个维持 Cloudflare Tunnel。

```bash
install -m 755 scripts/stock_dashboard_server.sh \
  ~/.local/bin/stock-dashboard-server
install -m 755 scripts/cloudflare_tunnel.sh \
  ~/.local/bin/stock-dashboard-tunnel

cp scripts/com.stock-dashboard.server.plist.example \
  ~/Library/LaunchAgents/com.stock-dashboard.server.plist
cp scripts/com.stock-dashboard.cloudflare-tunnel.plist.example \
  ~/Library/LaunchAgents/com.stock-dashboard.cloudflare-tunnel.plist

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.stock-dashboard.server.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.stock-dashboard.cloudflare-tunnel.plist

launchctl kickstart -k gui/$(id -u)/com.stock-dashboard.server
launchctl kickstart -k gui/$(id -u)/com.stock-dashboard.cloudflare-tunnel
```

服务启动后访问：

```text
https://f.yanwei99521.dpdns.org
```

本机健康检查：

```bash
curl http://127.0.0.1:8000/health
```

日志位置：

```text
/tmp/stock-dashboard-server.log
/tmp/stock-dashboard-server.err
/tmp/stock-dashboard-tunnel.log
/tmp/stock-dashboard-tunnel.err
```

注意：

- `cloudflared` 通过出站连接接入 Cloudflare，不需要在路由器或 macOS 防火墙开放入站端口。
- 仪表盘服务只监听 `127.0.0.1:8000`，局域网和公网不能绕过 Tunnel 直连。
- 建议在 Cloudflare Access 中为 `/admin` 增加邮箱或一次性验证码认证。
- 原有 `cloudflare_ipv6_ddns.py` 仅保留给需要 IPv6 直连的场景，使用 Tunnel 时不要启用对应 LaunchAgent。
