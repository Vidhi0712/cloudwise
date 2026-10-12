import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatCurrencyFull, Loader } from '../utils';

function getRiskColor(risk) {
  if (risk === 'Low') return 'text-emerald-400';
  if (risk === 'Medium') return 'text-yellow-400';
  return 'text-red-400';
}

function getRiskBg(risk) {
  if (risk === 'Low') return 'bg-emerald-500/10 border-emerald-500/20';
  if (risk === 'Medium') return 'bg-yellow-500/10 border-yellow-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

function ConfidenceBar({ value }) {
  const color = value >= 85 ? '#10b981' : value >= 70 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }}></div>
      </div>
      <span className="text-sm font-medium text-surface-300">{value}%</span>
    </div>
  );
}

export default function Recommendations() {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRecommendations().then(setRecs).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const totalSavings = recs.reduce((s, r) => s + r.estimated_saving, 0);

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Explainable Recommendations</h1>
          <p className="text-surface-400 text-sm mt-1">AI-powered cost optimization with human-readable explanations</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-emerald-400 font-bold text-lg">{formatCurrencyFull(totalSavings)}/mo</span>
          <span className="text-surface-400 text-sm ml-2">total potential savings</span>
        </div>
      </div>

      {recs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-surface-300 text-lg font-medium">No optimization opportunities found</p>
          <p className="text-surface-500 text-sm mt-1">Your cloud resources appear to be well-optimized</p>
        </div>
      ) : (
        <div className="space-y-5">
          {recs.map((r, i) => (
            <div key={i} className="glass-card p-6 hover:border-primary-500/20 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center text-lg">
                    💡
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{r.resource_name}</h3>
                    <p className="text-xs text-surface-400">{r.service} · {r.resource_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">{formatCurrencyFull(r.estimated_saving)}</p>
                  <p className="text-xs text-surface-400">monthly savings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Problem */}
                <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-400">⚠️</span>
                    <p className="text-xs text-surface-400 font-semibold uppercase tracking-wider">Problem</p>
                  </div>
                  <p className="text-sm text-white font-medium">{r.problem}</p>
                </div>

                {/* Recommendation */}
                <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-400">✅</span>
                    <p className="text-xs text-surface-400 font-semibold uppercase tracking-wider">Recommendation</p>
                  </div>
                  <p className="text-sm text-surface-200">{r.recommendation}</p>
                </div>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 rounded-xl bg-surface-800/30">
                  <p className="text-xs text-surface-400 mb-1">Risk Level</p>
                  <div className={`inline-flex px-3 py-1 rounded-lg border ${getRiskBg(r.risk)}`}>
                    <span className={`text-sm font-semibold ${getRiskColor(r.risk)}`}>{r.risk}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface-800/30">
                  <p className="text-xs text-surface-400 mb-1">Confidence</p>
                  <ConfidenceBar value={r.confidence} />
                </div>
                <div className="p-3 rounded-xl bg-surface-800/30">
                  <p className="text-xs text-surface-400 mb-1">Est. Annual Saving</p>
                  <p className="text-sm font-bold text-emerald-400">{formatCurrencyFull(r.estimated_saving * 12)}</p>
                </div>
              </div>

              {/* Explanation */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary-600/10 to-primary-500/5 border border-primary-500/15">
                <div className="flex items-center gap-2 mb-2">
                  <span>🔍</span>
                  <p className="text-xs text-primary-300 font-semibold uppercase tracking-wider">Why was this detected?</p>
                </div>
                <p className="text-sm text-surface-200 leading-relaxed italic">"{r.reason}"</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
