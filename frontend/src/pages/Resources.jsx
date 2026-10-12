import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { api } from '../api';
import { formatCurrencyFull, getStatusBadge, Loader } from '../utils';

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getResources().then(setResources).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected) {
      api.getResource(selected).then(setDetail).catch(console.error);
    } else {
      setDetail(null);
    }
  }, [selected]);

  if (loading) return <Loader />;

  const services = ['All', ...new Set(resources.map(r => r.service))];
  const statuses = ['All', ...new Set(resources.map(r => r.utilization_status))];

  const filtered = resources.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (serviceFilter !== 'All' && r.service !== serviceFilter) return false;
    if (statusFilter !== 'All' && r.utilization_status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Resource Intelligence</h1>
        <p className="text-surface-400 text-sm mt-1">Monitor and analyze cloud resource utilization</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search resources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-200 text-sm placeholder:text-surface-500 focus:outline-none focus:border-primary-500/50 w-64"
        />
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-200 text-sm focus:outline-none focus:border-primary-500/50">
          {services.map(s => <option key={s} value={s}>{s === 'All' ? 'All Services' : s}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-200 text-sm focus:outline-none focus:border-primary-500/50">
          {statuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
        </select>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Table */}
        <div className={`glass-card overflow-hidden min-w-0 ${detail ? 'w-full xl:flex-1' : 'w-full'}`}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Service</th>
                  <th>Type</th>
                  <th>Region</th>
                  <th>Monthly Cost</th>
                  <th>Utilization</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className={`clickable ${selected === r.id ? 'bg-primary-600/10' : ''}`}
                    onClick={() => setSelected(selected === r.id ? null : r.id)}>
                    <td>
                      <div>
                        <p className="font-medium text-white">{r.name}</p>
                        <p className="text-xs text-surface-500">{r.id}</p>
                      </div>
                    </td>
                    <td><span className="badge badge-info">{r.service}</span></td>
                    <td className="text-surface-300">{r.type}</td>
                    <td className="text-surface-400">{r.region}</td>
                    <td className="font-medium text-white">{formatCurrencyFull(r.monthly_cost)}</td>
                    <td className="text-surface-300">
                      {r.avg_cpu != null ? `${r.avg_cpu}% CPU` :
                       r.avg_access_count != null ? `${r.avg_access_count} acc/day` :
                       r.avg_requests != null ? `${r.avg_requests.toLocaleString()} req/day` : '-'}
                    </td>
                    <td><span className={`badge ${getStatusBadge(r.utilization_status)}`}>{r.utilization_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {detail && (
          <div className="w-full xl:w-[380px] shrink-0 glass-card p-5 space-y-5 max-h-[calc(100vh-140px)] overflow-y-auto fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{detail.name}</h3>
              <button onClick={() => setSelected(null)} className="text-surface-400 hover:text-white text-xl">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-800/50">
                <p className="text-xs text-surface-400">Service</p>
                <p className="text-sm font-medium text-white">{detail.service}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-800/50">
                <p className="text-xs text-surface-400">Type</p>
                <p className="text-sm font-medium text-white">{detail.type}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-800/50">
                <p className="text-xs text-surface-400">Monthly Cost</p>
                <p className="text-sm font-bold text-white">{formatCurrencyFull(detail.monthly_cost)}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-800/50">
                <p className="text-xs text-surface-400">Avg CPU</p>
                <p className="text-sm font-medium text-white">{detail.avg_cpu != null ? `${detail.avg_cpu}%` : 'N/A'}</p>
              </div>
            </div>

            {/* Cost History Chart */}
            {detail.cost_history && detail.cost_history.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Cost History</h4>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={detail.cost_history.map(c => ({ date: c.date.slice(5), cost: Math.round(c.daily_cost) }))}>
                    <defs>
                      <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={v => `₹${v}`} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(v) => [`₹${v}`, 'Cost']}
                    />
                    <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2} fill="url(#detailGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Usage History Chart */}
            {detail.usage_history && detail.usage_history.length > 0 && detail.usage_history[0].cpu_utilization != null && (
              <div>
                <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">CPU Utilization</h4>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={detail.usage_history.map(u => ({ date: u.date.slice(5), cpu: u.cpu_utilization }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="cpu" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recommendation */}
            {detail.recommendation && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">💡 Recommendation</h4>
                <p className="text-sm text-white font-medium mb-1">{detail.recommendation.problem}</p>
                <p className="text-sm text-surface-300 mb-2">{detail.recommendation.recommendation}</p>
                <div className="flex items-center gap-3 text-xs text-surface-400">
                  <span className="text-emerald-400 font-semibold">Save ₹{detail.recommendation.estimated_saving.toLocaleString('en-IN')}/mo</span>
                  <span>·</span>
                  <span>Confidence: {detail.recommendation.confidence}%</span>
                  <span>·</span>
                  <span>Risk: {detail.recommendation.risk}</span>
                </div>
                <p className="text-xs text-surface-400 mt-2 italic">{detail.recommendation.reason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
