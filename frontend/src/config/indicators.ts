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
    description: "CBOE 波动率指数 — ≥40重仓买入 / ≥30买入 / ≤14减仓",
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
        "VIX ≥ 40：历史上每次触及 40 以上后的 12 个月均录得正收益，可配置 50%～80% 仓位，是最强买入窗口。",
        "VIX ≥ 30：开始分批买入标普500 ETF（SPY/VOO）或纳指 ETF（QQQ），可配置 20%～30% 仓位。",
        "VIX ≤ 14：市场极度平静，考虑将股票仓位降至保守水平（30%～50%），分批锁定利润。",
        "结合 MA50/MA200 宽度指标：宽度极端超卖 + VIX 高企，是最强的双重确认买入信号。",
      ],
      caution:
        "VIX 高企不代表下跌结束，市场可能继续下行数日甚至数周。建议分批入场，而非一次性全仓。VIX 每日更新（美股交易日），节假日无数据。",
    },
  },
  {
    id: "cot-sp500",
    name: "CTA 净持仓",
    shortName: "CTA仓位",
    description: "标普500期货：杠杆基金净多仓（CFTC TFF报告）",
    type: "buy",
    threshold: -200000,
    thresholdDirection: "below",
    thresholdColor: "#f59e0b",
    chartColor: "#2563eb",
    variant: "cot",
    valueFormat: "thousands",
    unit: "k",
    usage: {
      what:
        "来源于 CFTC（美国商品期货交易委员会）每周发布的 Traders in Financial Futures（TFF）报告，反映杠杆基金（包含 CTA 趋势跟踪基金、CPO 商品池运营商）在 E-mini S&P 500 期货上的净多仓合约数（多仓 − 空仓）。该数据每周二截止、周五下午对外公布。",
      signal:
        "当净多仓降至 -10 万张合约以下（约合 -275 亿美元），说明 CTA 系统性资金已积累大量空头仓位。高盛历史数据显示，在此极端空头背景下，任何正向价格动量均会触发 CTA 自动补仓/平空，形成「逼空式」上涨，如 2025年4月关税底部后的 +86 亿美元单周买入潮。",
      howToUse: [
        "将该指标与 MA50/MA200 宽度结合：宽度极端超卖 + CTA 极端空头同时出现，是历史上最强的多重确认买入信号。",
        "CTA 净空头本身不直接做多，而是看做「弹簧压缩」——一旦市场止跌反弹，CTA 算法将被迫平空并翻多，产生额外的机械性买盘。",
        "CFTC 数据有 3 天滞后（周二截止、周五发布），建议作为中期背景判断而非短期择时工具。",
        "参考高盛 Prime Brokerage 的 CTA 定位模型（以美元规模计），本图以合约数近似，趋势方向一致。",
      ],
      caution:
        "数据来源为 CFTC 期货持仓，不含股票现货多空对冲等其他 CTA 策略。单位为千张合约，每张合约约 27.5 万美元（S&P ~5500）。数据每周更新一次，非实时。",
    },
  },
  {
    id: "fng",
    name: "Fear & Greed Index",
    shortName: "F&G",
    description: "CNN 恐惧贪婪指数 — ≤25极度恐慌买入 / ≥75极度贪婪减仓",
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
        "指数 ≤ 25（极度恐慌）：开始分批买入，此时往往是中短期底部区域，可配置 20%～40% 仓位。",
        "指数 ≤ 15（历史极端低位）：考虑重仓买入，历史上每次触及此水平后12个月均录得强劲正收益。",
        "指数 ≥ 75（极度贪婪）：考虑将仓位降至中性水平（30%～50%），分批锁定利润。",
        "指数 ≥ 90：大幅减仓至保守水平，历史上此类高点后通常有 10%-30% 以上回调。",
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
];

export function getIndicatorById(id: string): IndicatorConfig | undefined {
  return INDICATORS.find((c) => c.id === id);
}

/** Card border / text color based on indicator type and current zone. */
export function getZoneColor(type: IndicatorType, zone: IndicatorZone): string {
  if (zone !== "active") return "border-zinc-200";
  return type === "buy" ? "border-green-500" : "border-red-500";
}

export function getZoneBg(type: IndicatorType, zone: IndicatorZone): string {
  if (zone !== "active") return "bg-white";
  return type === "buy" ? "bg-green-50" : "bg-red-50";
}

export function getZoneTextColor(type: IndicatorType, zone: IndicatorZone): string {
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
