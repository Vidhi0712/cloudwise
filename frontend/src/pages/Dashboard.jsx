import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { api } from '../api';
import { formatCurrency, formatCurrencyFull, getSeverityBadge, Loader } from '../utils';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getForecast()])
      .then(([dash, fc]) => {
        setData(dash);
        setForecast(fc);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <p className="text-surface-400">Failed to load dashboard data.</p>;

  const costTrend = data.cost_trend.map(d => ({
    date: d.date.slice(5),
    cost: Math.round(d.total_cost),
  }));

  const serviceCosts = data.service_costs.map(d => ({
    service: d.service,
    cost: Math.round(d.total_cost),
  }));

  const forecastData = forecast ? [
    ...forecast.historical.slice(-30).map(d => ({ date: d.date.slice(5), cost: Math.round(d.cost), forecast: null })),
    ...forecast.forecast.map(d => ({ date: d.date.slice(5), cost: null, forecast: Math.round(d.cost) })),
  ] : [];

  // Bridge: connect last historical to first forecast
  if (forecastData.length > 0 && forecast) {
    const lastHist = forecast.historical[forecast.historical.length - 1];
    const bridgeIdx = forecastData.findIndex(d => d.forecast !== null);
    if (bridgeIdx > 0) {
      forecastData[bridgeIdx - 1].forecast = forecastData[bridgeIdx - 1].cost;
    }
  }

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">Cloud cost overview & intelligence</p>
        </div>
        <span className="badge badge-info">Simulated Data</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="kpi-card blue">
          <p className="text-surface-400 text-xs font-semibold uppercase tracking-wider">Total Cloud Cost</p>
          <p className="text-3xl font-bold text-white mt-2">{formatCurrency(data.total_cost)}</p>
          <p className="text-surface-500 text-xs mt-1">60-day observation period</p>
        </div>
        <div className="kpi-card green">
          <p className="text-surface-400 text-xs font-semibold uppercase tracking-wider">Potential Savings</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{formatCurrencyFull(data.potential_savings)}/mo</p>
          <p className="text-surface-500 text-xs mt-1">{data.top_recommendations.length} optimization opportunities</p>
        </div>
        <div className="kpi-card purple">
          <p className="text-surface-400 text-xs font-semibold uppercase tracking-wider">Active Resources</p>
          <p className="text-3xl font-bold text-white mt-2">{data.active_resources}</p>
          <p className="text-surface-500 text-xs mt-1">Across EC2, RDS, S3, Lambda</p>
        </div>
        <div className="kpi-card red">
          <p className="text-surface-400 text-xs font-semibold uppercase tracking-wider">Anomalies Detected</p>
          <p className="text-3xl font-bold text-red-400 mt-2">{data.anomaly_count}</p>
          <p className="text-surface-500 text-xs mt-1">Unusual spending patterns</p>
        </div>
      </div>

      {/* Insights */}
      {data.insights && data.insights.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500"></span>
            CloudWise Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/30">
                <span className="text-xl mt-0.5">{insight.icon}</span>
                <p className="text-sm text-surface-200 leading-relaxed">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Cost Trend */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Daily Cost Trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={costTrend}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '12px', fontSize: '13px' }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Cost']}
              />
              <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2} fill="url(#costGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by Service */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Cost by Service</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={serviceCosts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="service" type="category" stroke="#64748b" fontSize={12} tickLine={false} width={60} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '12px', fontSize: '13px' }}
                formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Total Cost']}
              />
              <Bar dataKey="cost" radius={[0, 8, 8, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast */}
      {forecast && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">14-Day Cost Forecast</h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-primary-500 rounded"></span>
                <span className="text-surface-400">Historical</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-400 rounded" style={{ borderStyle: 'dashed' }}></span>
                <span className="text-surface-400">Forecast</span>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 rounded-xl bg-surface-800/50">
              <p className="text-xs text-surface-400">Current Monthly</p>
              <p className="text-lg font-bold text-white">{formatCurrencyFull(forecast.current_monthly_cost)}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-800/50">
              <p className="text-xs text-surface-400">Predicted Monthly</p>
              <p className="text-lg font-bold text-white">{formatCurrencyFull(forecast.predicted_monthly_cost)}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-800/50">
              <p className="text-xs text-surface-400">Expected Change</p>
              <p className={`text-lg font-bold ${forecast.pct_change > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {forecast.pct_change > 0 ? '+' : ''}{forecast.pct_change}%
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface-800/50">
              <p className="text-xs text-surface-400">Trend</p>
              <p className="text-sm text-surface-200 mt-1">{forecast.explanation}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '12px', fontSize: '13px' }}
                formatter={(v, name) => [v ? `₹${v.toLocaleString('en-IN')}` : '-', name === 'cost' ? 'Historical' : 'Forecast']}
              />
              <Line type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="forecast" stroke="#34d399" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Anomalies + Top Recommendations */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Recent Anomalies</h2>
          {data.recent_anomalies.length === 0 ? (
            <p className="text-surface-500 text-sm">No anomalies detected.</p>
          ) : (
            <div className="space-y-3">
              {data.recent_anomalies.map((a, i) => (
                <div key={i} className="p-3 rounded-xl bg-surface-800/50 border border-surface-700/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{a.resource_name}</span>
                    <span className={`badge ${getSeverityBadge(a.severity)}`}>{a.severity}</span>
                  </div>
                  <p className="text-xs text-surface-400">{a.service} · {a.date}</p>
                  <p className="text-xs text-surface-300 mt-1">
                    Cost: ₹{a.actual_cost.toLocaleString('en-IN')} (avg: ₹{a.expected_cost.toLocaleString('en-IN')}) · {a.deviation_pct > 0 ? '+' : ''}{a.deviation_pct}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Top Optimization Opportunities</h2>
          {data.top_recommendations.length === 0 ? (
            <p className="text-surface-500 text-sm">No recommendations.</p>
          ) : (
            <div className="space-y-3">
              {data.top_recommendations.map((r, i) => (
                <div key={i} className="p-3 rounded-xl bg-surface-800/50 border border-surface-700/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{r.resource_name}</span>
                    <span className="text-emerald-400 text-sm font-semibold">₹{r.estimated_saving.toLocaleString('en-IN')}/mo</span>
                  </div>
                  <p className="text-xs text-surface-400">{r.service} · {r.problem}</p>
                  <p className="text-xs text-surface-300 mt-1">Confidence: {r.confidence}% · Risk: {r.risk}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
