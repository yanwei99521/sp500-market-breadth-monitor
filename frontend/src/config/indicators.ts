import type { IndicatorConfig, IndicatorType, IndicatorZone } from "../types/indicator";

export const INDICATORS: IndicatorConfig[] = [
  {
    id: "breadth-ma50",
    name: "MA50 市场宽度",
    shortName: "MA50",
    description: "标普500成份股高于50日均线的比例",
    type: "buy",
    threshold: 0.07,
    thresholdDirection: "below",
    thresholdColor: "#ef4444",
    chartColor: "#374151",
    variant: "breadth",
    valueFormat: "percent",
    apiParams: { ma: 50 },
    unit: "%",
    usage: {
      what:
        "衡量标普500成份股短期动量的广度指标。计算方法：当日收盘价高于其50日移动均线的股票数量 ÷ 全部有效成份股数量，结果以百分比表示。正常牛市中该值通常在 50%～80% 之间波动。",
      signal:
        "当该比例跌破 7%，意味着超过 93% 的标普500成份股已经跌破短期均线，市场陷入极端恐慌性抛售。历史上每次触及这一极值，都对应着重大事件引发的恐慌底部（如关税冲击、疫情崩盘等）。",
      howToUse: [
        "信号触发后，可以开始分批买入风险资产，如标普500指数ETF（SPY/VOO）、纳指ETF（QQQ）或比特币（BTC）。",
        "不要等待市场止跌才入场——历史显示最低点通常只持续 1～3 天，信号触发后的第一周往往是最佳窗口。",
        "建议分 3～5 批建仓，每隔 1～2 天投入一笔，平滑入场成本。",
        "可设置当该值跌破 10% 时开始关注、跌破 7% 时开始买入、跌破 5% 时重仓的三档策略。",
        "买入后持有 3～6 个月，该指标本身不适合用于判断卖出时机。",
      ],
      caution:
        "该指标为短期超卖信号，并不预测下跌是否结束——市场可能在触发后继续下跌数天。请结合 MA200 宽度同步判断，两者同时触发时买入信号最强。",
    },
  },
  {
    id: "breadth-ma200",
    name: "MA200 市场宽度",
    shortName: "MA200",
    description: "标普500成份股高于200日均线的比例",
    type: "buy",
    threshold: 0.30,
    thresholdDirection: "below",
    thresholdColor: "#f97316",
    chartColor: "#374151",
    variant: "breadth",
    valueFormat: "percent",
    apiParams: { ma: 200 },
    unit: "%",
    usage: {
      what:
        "衡量标普500成份股长期趋势的广度指标。计算方法与 MA50 宽度相同，但使用 200 日均线作为基准。200 日均线被视为区分牛熊市的分水岭，该指标反映整个市场长期上升趋势的健康程度。正常牛市中该值通常在 55%～85% 之间，熊市中降至 30%～50%。",
      signal:
        "当该比例跌破 30%，意味着超过 70% 的标普500成份股已经跌破长期均线，市场进入结构性熊市底部区域。这一信号极为罕见，自 2010 年以来仅出现数次，每次都标志着重大买入机会的到来（如 2020 年 3 月、2022 年 10 月熊市底、2025 年 4 月关税底部）。",
      howToUse: [
        "该信号适合长期资产配置，触发后可大幅增加股票仓位比例，持有周期建议 12～24 个月。",
        "优先考虑宽基指数基金（标普500、全球市场ETF），而非个股，因为此时市场整体处于低估状态。",
        "若同时 MA50 宽度也触发买入信号（双重确认），可以在历史最低点附近全仓买入，此类机会十年一遇。",
        "比特币在历次双重确认信号后的 6 个月内均有 50%+ 以上涨幅，可作为进攻性仓位配置。",
        "该信号触发后，市场可能还会继续震荡数周——无需等待反转确认，分批入场即可。",
      ],
      caution:
        "MA200 宽度下跌至 30% 以下通常伴随重大宏观事件（经济衰退、地缘冲突、政策冲击），需做好持仓回撤 10%～20% 的心理准备。长期视角下，每一次触发都是买入机会，但短期内仍可能下跌。",
    },
  },
  {
    id: "vix",
    name: "VIX 恐慌指数",
    shortName: "VIX",
    description: "CBOE 波动率指数 — 四档恐慌仓位信号",
    type: "buy",
    threshold: 30,
    thresholdDirection: "above",
    thresholdColor: "#2563eb",
    chartColor: "#374151",
    variant: "vix",
    valueFormat: "decimal",
    unit: "",
    isSentiment: true,
    usage: {
      what:
        'VIX（CBOE Volatility Index）衡量标普500指数未来30天的隐含波动率，俗称"恐慌指数"。VIX 越高，代表市场参与者越恐慌，通常对应重大下跌事件。正常市场 VIX 在 12～20 之间；20～30 为警觉区；30 以上为高度恐慌；40 以上为极度恐慌。',
      signal:
        "VIX ≥ 40（极度恐慌）→ 重仓买入；VIX ≥ 30（高度恐慌）→ 分批买入；VIX 14～30 → 正常观察；VIX ≤ 14（极度平静）→ 减仓/止盈。",
      howToUse: [
        "VIX ≥ 40（极度恐慌）：重仓买入。",
        "VIX ≥ 30（高度恐慌）：分批买入。",
        "VIX 14-30：正常观察。",
        "VIX ≤ 14（极度平静）：减仓/止盈。",
        "结合 MA50/MA200 宽度指标：宽度极端超卖 + VIX 高企，是最强的双重确认买入信号。",
      ],
      caution:
        "VIX 高企不代表下跌结束，市场可能继续下行数日甚至数周。建议分批入场，而非一次性全仓。VIX 每日更新（美股交易日），节假日无数据。",
    },
  },
  {
    id: "fng",
    name: "Fear & Greed Index",
    shortName: "F&G",
    description: "CNN 恐惧贪婪指数 — 五档情绪仓位信号",
    type: "buy",
    threshold: 25,
    thresholdDirection: "below",
    thresholdColor: "#ef4444",
    chartColor: "#8b5cf6",
    variant: "fng",
    valueFormat: "decimal",
    unit: "",
    isSentiment: true,
    usage: {
      what:
        'CNN Fear & Greed Index 是一个综合7个市场情绪指标的合成指数（0-100），0代表极度恐慌，100代表极度贪婪。7个子指标包括：股票动量、股票强弱宽度、股票期权偏斜、垃圾债需求、安全避险需求、市场波动率（VIX）和安全资产需求。每日更新，是华尔街最广泛引用的情绪指标之一。',
      signal:
        "≤25（极度恐慌）→ 重仓买入；26-44（恐慌）→ 观察/轻仓；45-54（中性）→ 持仓观望；55-74（贪婪）→ 谨慎/减少买入；≥75（极度贪婪）→ 减仓/止盈。",
      howToUse: [
        "≤25（极度恐慌）：重仓买入。",
        "26-44（恐慌）：观察/轻仓。",
        "45-54（中性）：持仓观望。",
        "55-74（贪婪）：谨慎/减少买入。",
        "≥75（极度贪婪）：减仓/止盈。",
        "结合 VIX 和 MA50/MA200 宽度多重确认：三者同时极端时，是历史最强信号叠加。",
      ],
      caution:
        "F&G 指数为情绪指标，不直接反映基本面。极端区域时市场仍可能惯性运行数日，建议分批操作而非一次性重仓或清仓。数据来自 CNN，节假日可能无更新。",
    },
  },
  {
    id: "call-skew-qqq",
    name: "QQQ 看涨偏斜",
    shortName: "QQQ偏斜",
    description: "QQQ 3个月25-delta看涨期权 vs 平值期权隐含波动率之比",
    type: "buy",
    threshold: 0.90,
    thresholdDirection: "above",
    thresholdColor: "#f59e0b",
    chartColor: "#60a5fa",
    variant: "call-skew",
    valueFormat: "decimal",
    unit: "",
    usage: {
      what:
        "衡量市场对纳斯达克100指数（QQQ）未来3个月上涨的押注强度。计算方式：到期日约90天的25-delta看涨期权隐含波动率 ÷ 平值期权隐含波动率。正常区间在 0.85～0.90，数值越高代表市场对上涨的看涨期权需求越旺盛。",
      signal:
        "当偏斜率突破 0.90 创阶段新高，说明期权市场参与者正在大量溢价购买看涨期权，反映出强烈的看多情绪。2026年4月底至5月初触及 0.94，创下至少两年新高，对应市场从关税恐慌底部的快速修复。",
      howToUse: [
        "该指标适合作为趋势确认信号而非逆势指标——偏斜率上升表明市场动能偏多，可持有或增加多头仓位。",
        "结合 MA50/MA200 宽度使用：若宽度已从极端超卖回升、同时偏斜率也快速上行，是趋势反转确认的强信号。",
        "偏斜率过高（>0.95）时需警惕短期过热风险，可能触发回调，宜适当减少激进买入。",
        "每日更新（美股开盘后 9:02 CST 获取），适合用于短期到中期（1～4周）的仓位决策参考。",
      ],
      caution:
        "该指标基于 yfinance 实时期权链数据，节假日或市场休市时无法更新。偏斜率本身是情绪指标，不反映基本面，请勿单独作为买卖决策依据。",
    },
  },
  {
    id: "cape-percentile",
    name: "CAPE 分位",
    shortName: "CAPE",
    description: "Shiller CAPE 历史分位 — <20%低估 / >70%高估 / >85%泡沫",
    type: "buy",
    threshold: 0.20,
    thresholdDirection: "below",
    thresholdColor: "#16a34a",
    chartColor: "#dc2626",
    variant: "cape",
    valueFormat: "percent",
    unit: "%",
    usage: {
      what:
        "CAPE 分位衡量当前 Shiller CAPE 在长期历史中的相对位置。分位越高，估值越贵；分位越低，长期估值越便宜。",
      signal:
        "CAPE 分位低于 20% → 估值便宜，计入低位信号；高于 70% → 估值偏高；高于 85% → 泡沫警戒区。",
      howToUse: [
        "低于 20% 时，说明估值进入历史低位，可配合 QQQ 回撤和 VIX 恐慌做大底判断。",
        "高于 70% 且指数贴近高点时，不追高，新增资金可以留在弹药仓。",
        "高于 85% 时进入泡沫警戒区，适合逐步降低 TQQQ 暴露。",
      ],
      caution:
        "CAPE 是慢变量，不适合单独做短线择时。它更适合作为估值背景，与回撤和恐慌信号共同使用。",
    },
  },
  {
    id: "qqq-drawdown",
    name: "QQQ 回撤",
    shortName: "QQQ回撤",
    description: "QQQ 距历史高点回撤 — ≤-20%深度超跌 / 25日≤-12%快崩预警",
    type: "buy",
    threshold: -0.20,
    thresholdDirection: "below",
    thresholdColor: "#16a34a",
    chartColor: "#2563eb",
    variant: "qqq-drawdown",
    valueFormat: "percent",
    unit: "%",
    usage: {
      what:
        "QQQ 回撤衡量纳指 ETF 当前价格距离历史高点的跌幅，同时跟踪 25 个交易日内的快速下跌幅度。",
      signal:
        "距历史高点回撤超过 20% → 深度超跌，计入低位信号；25 日内急跌超过 12% → 快崩预警，用于降低杠杆。",
      howToUse: [
        "回撤超过 20% 时，说明趋势和价格已进入深跌状态，可配合 CAPE 低估和 VIX 恐慌做加仓判断。",
        "25 日急跌超过 12% 但未形成低位共振时，优先当作风控信号，降低 TQQQ 暴露。",
        "回撤小于 5% 时说明指数贴近高点，若 CAPE 同时偏高，应避免追高。",
      ],
      caution:
        "回撤指标反映价格状态，不代表下跌已经结束。真正的大底信号需要 CAPE、回撤、VIX 至少两项共振。",
    },
  },
];

export function getIndicatorById(id: string): IndicatorConfig | undefined {
  return INDICATORS.find((c) => c.id === id);
}

/** Card border / text color based on indicator type and current zone. */
export function getZoneColor(type: IndicatorType, zone: IndicatorZone): string {
  if (zone === "danger") return "border-red-400";
  if (zone === "warning") return "border-amber-400";
  if (zone === "near_high") return "border-zinc-200";
  if (zone !== "active") return "border-zinc-200";
  return type === "buy" ? "border-green-500" : "border-red-500";
}

export function getZoneBg(type: IndicatorType, zone: IndicatorZone): string {
  if (zone === "danger") return "bg-red-50";
  if (zone === "warning") return "bg-amber-50";
  if (zone === "near_high") return "bg-zinc-50";
  if (zone !== "active") return "bg-white";
  return type === "buy" ? "bg-green-50" : "bg-red-50";
}

export function getZoneTextColor(type: IndicatorType, zone: IndicatorZone): string {
  if (zone === "danger") return "text-red-600";
  if (zone === "warning") return "text-amber-700";
  if (zone === "near_high") return "text-zinc-800";
  if (zone !== "active") return "text-zinc-800";
  return type === "buy" ? "text-green-700" : "text-red-700";
}

export function getZoneLabel(type: IndicatorType, zone: IndicatorZone): string {
  if (zone !== "active") return "正常";
  return type === "buy" ? "买入信号" : "卖出信号";
}

export function getZoneDotColor(type: IndicatorType, zone: IndicatorZone): string {
  if (zone !== "active") return "bg-zinc-400";
  return type === "buy" ? "bg-green-500" : "bg-red-500";
}
