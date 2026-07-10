import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { triggerUpdate, useAdminLogs, useAdminStatus, useMarketRules } from "../hooks/useAdmin";
import AdminTabs from "../components/AdminTabs";
import LogPanel from "../components/LogPanel";
import type { MarketRule, MarketRuleCreate } from "../types";

// ── Auth gate ─────────────────────────────────────────────────────────────────

function AuthGate({ onAuth }: { onAuth: (token: string) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Optimistic: we'll detect 401 on first real request
    if (pw.trim()) {
      sessionStorage.setItem("admin_token", pw.trim());
      onAuth(pw.trim());
    } else {
      setError(true);
    }
  };

  return (
    <main className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">管理后台</h2>
          <p className="text-sm text-zinc-500 mt-1">请输入管理员密码继续</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            placeholder="管理员密码"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(false); }}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400
              ${error ? "border-red-400 bg-red-50" : "border-zinc-300 bg-white"}`}
            autoFocus
          />
          {error && <p className="text-xs text-red-500">请输入密码</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-zinc-900 text-white py-2.5 text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            登录
          </button>
        </form>
        <p className="text-xs text-zinc-400 text-center">
          默认密码：<code className="bg-zinc-100 px-1 rounded">stock-admin</code>
          &nbsp;（可通过环境变量 ADMIN_TOKEN 修改）
        </p>
      </div>
    </main>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "data", label: "数据更新", icon: "📊" },
  { key: "logs", label: "运行日志", icon: "📋" },
  { key: "rules", label: "市场规律", icon: "📖" },
];

// Resolve active tab from URL hash, fallback to "data"
function resolveTab(): string {
  const hash = window.location.hash.slice(1); // e.g. "#logs" -> "logs"
  if (hash && TABS.some((t) => t.key === hash)) return hash;
  return "data";
}

// ── Data status section ───────────────────────────────────────────────────────

const UPDATE_SOURCES = [
  { id: "breadth", label: "MA宽度" },
  { id: "call-skew", label: "Call Skew" },
  { id: "vix", label: "VIX" },
  { id: "fng", label: "Fear & Greed" },
  { id: "three-signals", label: "三信号" },
];

function StatusSection({ token, onUnauth, onSwitchTab }: { token: string; onUnauth: () => void; onSwitchTab: (tab: string) => void }) {
  const { data, loading, error, refresh } = useAdminStatus(token);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateMsg, setUpdateMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  if (error?.includes("UNAUTHORIZED")) {
    onUnauth();
    return null;
  }

  const handleUpdate = async (sourceId: string) => {
    setUpdating(sourceId);
    setUpdateMsg(null);
    try {
      const res = await triggerUpdate(sourceId, token);
      setUpdateMsg({ id: sourceId, msg: res.message, ok: true });
      refresh();
    } catch (e: unknown) {
      setUpdateMsg({
        id: sourceId,
        msg: e instanceof Error ? e.message : "更新失败",
        ok: false,
      });
    } finally {
      setUpdating(null);
    }
    // After update completes, switch to logs tab
    onSwitchTab("logs");
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-zinc-400 uppercase tracking-wider">数据状态与手工更新</h2>
        <button
          onClick={refresh}
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          刷新
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 animate-pulse">
              <div className="h-3 bg-zinc-100 rounded w-24 mb-3" />
              <div className="h-5 bg-zinc-100 rounded w-20 mb-2" />
              <div className="h-3 bg-zinc-100 rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.sources.map((src) => {
            const updatable = UPDATE_SOURCES.find((u) => u.id === src.id);
            const isUpdating = updating === src.id;
            const msg = updateMsg?.id === src.id ? updateMsg : null;

            return (
              <div key={src.id} className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
                <div className="text-xs text-zinc-400 font-medium truncate">{src.name}</div>
                <div className="text-base font-semibold text-zinc-800 tabular-nums">
                  {src.last_date ?? "—"}
                </div>
                <div className="text-xs text-zinc-400">
                  {src.row_count.toLocaleString()} 条记录
                </div>
                {updatable && (
                  <button
                    onClick={() => handleUpdate(src.id)}
                    disabled={isUpdating || updating !== null}
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors
                      ${isUpdating
                        ? "border-zinc-200 text-zinc-400 cursor-wait"
                        : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-400"
                      }`}
                  >
                    {isUpdating ? "更新中…" : "立即更新"}
                  </button>
                )}
                {msg && (
                  <p className={`text-xs ${msg.ok ? "text-green-600" : "text-red-500"}`}>
                    {msg.msg}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Rule form ─────────────────────────────────────────────────────────────────

const CATEGORIES = ["历史统计", "技术分析", "资金流向", "情绪指标", "宏观规律", "general"];

interface RuleFormProps {
  initial?: MarketRule;
  onSave: (data: MarketRuleCreate) => Promise<void>;
  onCancel: () => void;
}

function RuleForm({ initial, onSave, onCancel }: RuleFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? "历史统计");
  const [source, setSource] = useState(initial?.source ?? "");
  const [tagsRaw, setTagsRaw] = useState((initial?.tags ?? []).join("，"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("标题和内容不能为空");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        category,
        source: source.trim(),
        tags: tagsRaw
          .split(/[，,、\s]+/)
          .map((t) => t.trim())
          .filter(Boolean),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存失败");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 bg-zinc-50 rounded-xl border border-zinc-200 p-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs text-zinc-500">标题 *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
            placeholder="规律名称"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">分类</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-zinc-500">内容 *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
          placeholder="详细描述这条规律或经验…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">来源</label>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
            placeholder="X 博主 / 高盛报告 / 自研…"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">标签（逗号分隔）</label>
          <input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
            placeholder="S&P500，均线，历史统计"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </form>
  );
}

// ── Rules section ─────────────────────────────────────────────────────────────

function RulesSection({ token }: { token: string }) {
  const { rules, loading, createRule, updateRule, deleteRule } = useMarketRules(token);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleCreate = useCallback(
    async (data: MarketRuleCreate) => {
      await createRule(data);
      setShowForm(false);
    },
    [createRule],
  );

  const handleUpdate = useCallback(
    async (id: number, data: MarketRuleCreate) => {
      await updateRule(id, data);
      setEditingId(null);
    },
    [updateRule],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteRule(id);
      setConfirmDeleteId(null);
    },
    [deleteRule],
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-zinc-400 uppercase tracking-wider">
          市场规律 &amp; 经验
          <span className="ml-2 text-zinc-300 font-normal normal-case">
            （{rules.length} 条）
          </span>
        </h2>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); }}
            className="rounded-lg bg-zinc-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 transition-colors"
          >
            + 新增
          </button>
        )}
      </div>

      {showForm && (
        <RuleForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 animate-pulse">
              <div className="h-4 bg-zinc-100 rounded w-48 mb-2" />
              <div className="h-3 bg-zinc-100 rounded w-full mb-1" />
              <div className="h-3 bg-zinc-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {!loading && rules.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-400">
          暂无规律记录，点击「+ 新增」开始录入
        </div>
      )}

      <div className="space-y-2">
        {rules.map((rule) =>
          editingId === rule.id ? (
            <RuleForm
              key={rule.id}
              initial={rule}
              onSave={(data) => handleUpdate(rule.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => { setEditingId(rule.id); setShowForm(false); }}
              onDelete={() => setConfirmDeleteId(rule.id)}
              confirmDelete={confirmDeleteId === rule.id}
              onConfirmDelete={() => handleDelete(rule.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
            />
          ),
        )}
      </div>
    </section>
  );
}

// ── Rule card ─────────────────────────────────────────────────────────────────

interface RuleCardProps {
  rule: MarketRule;
  onEdit: () => void;
  onDelete: () => void;
  confirmDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function RuleCard({
  rule, onEdit, onDelete, confirmDelete, onConfirmDelete, onCancelDelete,
}: RuleCardProps) {
  return (
    <div className={`rounded-xl border bg-white p-4 space-y-2 transition-colors
      ${!rule.is_active ? "opacity-50 border-zinc-100" : "border-zinc-200"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-zinc-900 text-sm">{rule.title}</span>
            <span className="rounded-full bg-zinc-100 text-zinc-500 px-2 py-0.5 text-xs">
              {rule.category}
            </span>
            {!rule.is_active && (
              <span className="rounded-full bg-zinc-200 text-zinc-400 px-2 py-0.5 text-xs">已停用</span>
            )}
          </div>
          <p className="text-sm text-zinc-700 mt-1.5 leading-relaxed">{rule.content}</p>
        </div>

        {!confirmDelete ? (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              编辑
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-400 hover:text-red-500 hover:border-red-200 transition-colors"
            >
              删除
            </button>
          </div>
        ) : (
          <div className="flex gap-1 shrink-0 items-center">
            <span className="text-xs text-red-500 mr-1">确认删除？</span>
            <button
              onClick={onConfirmDelete}
              className="rounded-lg bg-red-500 text-white px-2.5 py-1 text-xs hover:bg-red-600 transition-colors"
            >
              删除
            </button>
            <button
              onClick={onCancelDelete}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        {rule.source && <span>来源：{rule.source}</span>}
        {rule.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {rule.tags.map((t) => (
              <span key={t} className="bg-zinc-100 rounded px-1.5 py-0.5">{t}</span>
            ))}
          </div>
        )}
        <span className="ml-auto">{rule.updated_at.slice(0, 10)}</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState<string>(
    () => sessionStorage.getItem("admin_token") ?? "",
  );
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeTab, setActiveTab] = useState(resolveTab);
  const { data: logs, loading: logsLoading, filterLevel, setFilterLevel, refresh: refreshLogs } = useAdminLogs(token, activeTab === "logs");

  const handleAuth = (t: string) => {
    setToken(t);
    setUnauthorized(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setToken("");
    setUnauthorized(false);
  };

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  // Sync hash changes
  useEffect(() => {
    const onHash = () => setActiveTab(resolveTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (!token || unauthorized) {
    return <AuthGate onAuth={handleAuth} />;
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          ← 返回仪表盘
        </Link>
        <button
          onClick={handleLogout}
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          退出管理后台
        </button>
      </div>

      {/* Tab navigation */}
      <AdminTabs tabs={TABS} active={activeTab} onChange={switchTab} />

      {/* Tab content */}
      {activeTab === "data" && (
        <StatusSection token={token} onUnauth={() => setUnauthorized(true)} onSwitchTab={switchTab} />
      )}

      {activeTab === "logs" && (
        <LogPanel
          entries={logs}
          loading={logsLoading}
          filterLevel={filterLevel}
          onFilterChange={setFilterLevel}
          onRefresh={refreshLogs}
          totalCount={logs.length}
        />
      )}

      {activeTab === "rules" && <RulesSection token={token} />}
    </main>
  );
}
