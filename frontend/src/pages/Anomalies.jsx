import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatCurrencyFull, getSeverityBadge, Loader } from '../utils';

export default function Anomalies() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');

  useEffect(() => {
    api.getAnomalies().then(setAnomalies).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const severities = ['All', ...new Set(anomalies.map(a => a.severity))];
  const services = ['All', ...new Set(anomalies.map(a => a.service))];

  const filtered = anomalies.filter(a => {
    if (severityFilter !== 'All' && a.severity !== severityFilter) return false;
    if (serviceFilter !== 'All' && a.service !== serviceFilter) return false;
    return true;
  });

  const criticalCount = anomalies.filter(a => a.severity === 'Critical').length;
  const highCount = anomalies.filter(a => a.severity === 'High').length;

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cost Anomalies</h1>
          <p className="text-surface-400 text-sm mt-1">AI-detected unusual spending patterns using Isolation Forest</p>
        </div>
        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="pulse-dot bg-red-500"></div>
              <span className="text-red-400 text-sm font-medium">{criticalCount} Critical</span>
            </div>
          )}
          {highCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <span className="text-orange-400 text-sm font-medium">{highCount} High</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-200 text-sm focus:outline-none focus:border-primary-500/50">
          {severities.map(s => <option key={s} value={s}>{s === 'All' ? 'All Severities' : s}</option>)}
        </select>
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-200 text-sm focus:outline-none focus:border-primary-500/50">
          {services.map(s => <option key={s} value={s}>{s === 'All' ? 'All Services' : s}</option>)}
        </select>
        <span className="flex items-center text-sm text-surface-400 ml-auto">{filtered.length} anomalies found</span>
      </div>

      {/* Anomaly Cards */}
      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-surface-300 text-lg font-medium">No anomalies found</p>
          <p className="text-surface-500 text-sm mt-1">All spending patterns appear normal</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a, i) => (
            <div key={i} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚨</span>
                  <div>
                    <h3 className="text-base font-semibold text-white">{a.resource_name}</h3>
                    <p className="text-xs text-surface-400">{a.service} · {a.resource_id}</p>
                  </div>
                </div>
                <span className={`badge ${getSeverityBadge(a.severity)}`}>{a.severity}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-surface-800/50">
                  <p className="text-xs text-surface-400">Date</p>
                  <p className="text-sm font-medium text-white">{a.date}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-800/50">
                  <p className="text-xs text-surface-400">Actual Cost</p>
                  <p className="text-sm font-bold text-red-400">{formatCurrencyFull(Math.round(a.actual_cost))}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-800/50">
                  <p className="text-xs text-surface-400">Historical Average</p>
                  <p className="text-sm font-medium text-surface-200">{formatCurrencyFull(Math.round(a.expected_cost))}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-800/50">
                  <p className="text-xs text-surface-400">Deviation</p>
                  <p className={`text-sm font-bold ${a.deviation_pct > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {a.deviation_pct > 0 ? '+' : ''}{a.deviation_pct}%
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-800/30 border border-surface-700/20">
                <p className="text-xs text-surface-400 font-semibold uppercase tracking-wider mb-1">Explanation</p>
                <p className="text-sm text-surface-200 leading-relaxed">{a.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
