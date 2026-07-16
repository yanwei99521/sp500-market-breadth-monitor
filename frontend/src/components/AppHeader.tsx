import { Link, NavLink } from "react-router-dom";
import BullLogo from "./BullLogo";

export default function AppHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
        >
          <BullLogo className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold leading-tight text-zinc-900">
              美股量化指标
            </h1>
            <p className="mt-0.5 hidden truncate text-xs text-zinc-500 sm:block">
              US Equity Quantitative Indicators — 量化分析平台
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-3 sm:flex">
            <NavLink to="/" end className={({ isActive }) => `text-xs transition ${isActive ? "font-semibold text-zinc-900" : "text-zinc-400 hover:text-zinc-700"}`}>
              交易台
            </NavLink>
            <NavLink to="/research" className={({ isActive }) => `text-xs transition ${isActive ? "font-semibold text-zinc-900" : "text-zinc-400 hover:text-zinc-700"}`}>
              研究中心
            </NavLink>
          </nav>
          <span className="hidden text-xs text-zinc-400 md:inline">每日 07:00 自动更新</span>
          <Link to="/admin" className="shrink-0 whitespace-nowrap text-xs text-zinc-300 transition-colors hover:text-zinc-500">
            管理
          </Link>
        </div>
      </div>
    </header>
  );
}
