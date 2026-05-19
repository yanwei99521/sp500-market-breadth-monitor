interface AdminTab {
  key: string;
  label: string;
  icon: string;
}

interface Props {
  tabs: AdminTab[];
  active: string;
  onChange: (key: string) => void;
}

export default function AdminTabs({ tabs, active, onChange }: Props) {
  return (
    <nav className="flex gap-1 border-b border-zinc-200 bg-white rounded-xl border px-2 pt-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2
            ${active === tab.key
              ? "text-zinc-900 border-zinc-900 bg-zinc-50"
              : "text-zinc-400 border-transparent hover:text-zinc-600 hover:bg-zinc-50"
            }`}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
