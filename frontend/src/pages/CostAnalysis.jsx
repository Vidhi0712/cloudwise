import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../api';
import { formatCurrencyFull, Loader } from '../utils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function CostAnalysis() {
  const [costs, setCosts] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getCosts(), api.getForecast()])
      .then(([c, f]) => { setCosts(c); setForecast(f); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!costs) return <p className="text-surface-400">Failed to load cost data.</p>;

  const dailyTotals = costs.daily_totals.map(d => ({
    date: d.date.slice(5),
    cost: Math.round(d.total_cost),
  }));

  const serviceCosts = costs.service_costs.map((d, i) => ({
    ...d,
    cost: Math.round(d.total_cost),
    fill: COLORS[i % COLORS.length],
  }));

  const totalCost = serviceCosts.reduce((sum, s) => sum + s.cost, 0);

  // Service daily breakdown
  const serviceDaily = {};
  costs.cost_data.forEach(d => {
    const key = d.date.slice(5);
    if (!serviceDaily[key]) serviceDaily[key] = { date: key };
    if (!serviceDaily[key][d.service]) serviceDaily[key][d.service] = 0;
    serviceDaily[key][d.service] += d.daily_cost;
  });
  const serviceDailyArr = Object.values(serviceDaily).map(d => {
    const result = { date: d.date };
    Object.keys(d).forEach(k => {
      if (k !== 'date') result[k] = Math.round(d[k]);
    });
    return result;
  });
  const serviceNames = [...new Set(costs.cost_data.map(d => d.service))];

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Cost Analysis</h1>
        <p className="text-surface-400 text-sm mt-1">Deep dive into cloud spending patterns</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card blue">
          <p className="text-surface-400 text-xs font-semibold uppercase tracking-wider">Total Spend (60 days)</p>
          <p className="text-3xl font-bold text-white mt-2">{formatCurrencyFull(totalCost)}</p>
        </div>
        <div className="kpi-card green">
          <p className="text-surface-400 text-xs font-semibold uppercase tracking-wider">Avg Daily Spend</p>
          <p className="text-3xl font-bold text-white mt-2">{formatCurrencyFull(Math.round(totalCost / 60))}</p>
        </div>
        {forecast && (
          <div className="kpi-card purple">
            <p className="text-surface-400 text-xs font-semibold uppercase tracking-wider">Predicted Change</p>
            <p className={`text-3xl font-bold mt-2 ${forecast.pct_change > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {forecast.pct_change > 0 ? '+' : ''}{forecast.pct_change}%
            </p>
          </div>
        )}
      </div>

      {/* Daily Total Trend */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Daily Spending Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dailyTotals}>
            <defs>
              <linearGradient id="costAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} interval="preserveStartEnd" />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '12px' }}
              formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Total Cost']}
            />
            <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2} fill="url(#costAreaGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Cost by Service Pie */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Cost Distribution by Service</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={serviceCosts}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="cost"
                nameKey="service"
                label={({ service, percent }) => `${service} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {serviceCosts.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '12px' }}
                formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Cost']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Service Breakdown Stacked Area */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Daily Cost by Service</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={serviceDailyArr}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '12px' }}
                formatter={(v) => [`₹${v.toLocaleString('en-IN')}`]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              {serviceNames.map((name, i) => (
                <Area key={name} type="monotone" dataKey={name} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.4} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top spending resources */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Top Spending Resources</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Service</th>
                <th>Total Spend (60d)</th>
                <th>Avg Daily</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const byResource = {};
                costs.cost_data.forEach(d => {
                  if (!byResource[d.resource_id]) byResource[d.resource_id] = { name: d.name, service: d.service, total: 0, count: 0 };
                  byResource[d.resource_id].total += d.daily_cost;
                  byResource[d.resource_id].count++;
                });
                return Object.entries(byResource)
                  .sort((a, b) => b[1].total - a[1].total)
                  .slice(0, 10)
                  .map(([id, r]) => (
                    <tr key={id}>
                      <td>
                        <p className="font-medium text-white">{r.name}</p>
                        <p className="text-xs text-surface-500">{id}</p>
                      </td>
                      <td><span className="badge badge-info">{r.service}</span></td>
                      <td className="font-medium text-white">{formatCurrencyFull(Math.round(r.total))}</td>
                      <td className="text-surface-300">{formatCurrencyFull(Math.round(r.total / r.count))}</td>
                    </tr>
                  ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
