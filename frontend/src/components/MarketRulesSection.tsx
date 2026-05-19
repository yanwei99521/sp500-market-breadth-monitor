import { useState, useMemo } from "react";
import { useMarketRules } from "../hooks/useBreadth";
import type { MarketRule } from "../types";

const INITIAL_DISPLAY_COUNT = 5;

function RuleCard({ rule }: { rule: MarketRule }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-zinc-200 rounded-lg bg-white hover:border-zinc-300 transition-colors">
      <button
        type="button"
        className="w-full text-left px-4 py-3 flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-zinc-400 mt-0.5 shrink-0">
          {expanded ? "−" : "+"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-zinc-800">{rule.title}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
              {rule.category}
            </span>
          </div>
          {!expanded && (
            <p className="text-sm text-zinc-500 mt-1 line-clamp-1">
              {rule.content}
            </p>
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pl-10">
          <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
            {rule.content}
          </p>
          {rule.tags.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {rule.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {rule.source && (
            <p className="text-xs text-zinc-400 mt-2">来源：{rule.source}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MarketRulesSection() {
  const { rules, loading, error } = useMarketRules();
  const [showAll, setShowAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(rules.map((r) => r.category));
    return Array.from(cats).sort();
  }, [rules]);

  const filteredRules = useMemo(() => {
    if (!selectedCategory) return rules;
    return rules.filter((r) => r.category === selectedCategory);
  }, [rules, selectedCategory]);

  const displayedRules = showAll
    ? filteredRules
    : filteredRules.slice(0, INITIAL_DISPLAY_COUNT);

  const hasMore = filteredRules.length > INITIAL_DISPLAY_COUNT;

  if (error) return null;

  if (loading) {
    return (
      <section>
        <h2 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
          市场规律 & 经验
        </h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-zinc-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (rules.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs text-zinc-400 uppercase tracking-wider">
          市场规律 & 经验
        </h2>
        <span className="text-xs text-zinc-400">{rules.length} 条</span>
      </div>

      {categories.length > 1 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              selectedCategory === null
                ? "bg-zinc-800 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                selectedCategory === cat
                  ? "bg-zinc-800 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {displayedRules.map((rule) => (
          <RuleCard key={rule.id} rule={rule} />
        ))}
      </div>

      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700"
        >
          查看更多（共 {filteredRules.length} 条）
        </button>
      )}

      {showAll && hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="mt-3 text-sm text-zinc-500 hover:text-zinc-600"
        >
          收起
        </button>
      )}
    </section>
  );
}
