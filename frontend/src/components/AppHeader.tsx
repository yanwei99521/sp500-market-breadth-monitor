import { Link } from "react-router-dom";
import BullLogo from "./BullLogo";

export default function AppHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <BullLogo className="w-10 h-10" />
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 leading-tight">
              美股量化指标
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              US Equity Quantitative Indicators — 量化分析平台
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-400">每日 09:02 自动更新</span>
          <Link
            to="/admin"
            className="text-xs text-zinc-300 hover:text-zinc-500 transition-colors"
          >
            管理
          </Link>
        </div>
      </div>
    </header>
  );
}
