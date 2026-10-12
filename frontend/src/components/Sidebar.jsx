import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/resources', label: 'Resources', icon: '🖥️' },
  { path: '/costs', label: 'Cost Analysis', icon: '💰' },
  { path: '/anomalies', label: 'Anomalies', icon: '🚨' },
  { path: '/recommendations', label: 'Recommendations', icon: '💡' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 sticky top-0 h-screen bg-surface-900/95 backdrop-blur-xl border-r border-surface-800 flex flex-col z-30 select-none">
      <div className="p-4 border-b border-surface-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary-500/20">
            C
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">CloudWise</h1>
            <p className="text-[10px] text-surface-400 font-medium mt-0.5">Cost Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary-600/25 text-primary-300 font-semibold shadow-sm border border-primary-500/30'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-surface-800">
        <div className="glass-card p-2.5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-surface-400 font-semibold">Simulated AWS Data</p>
          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Demo Mode Active
          </div>
        </div>
      </div>
    </aside>
  );
}
