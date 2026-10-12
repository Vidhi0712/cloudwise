export function formatCurrency(amount) {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatCurrencyFull(amount) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function getSeverityBadge(severity) {
  const map = {
    Critical: 'badge-danger',
    High: 'badge-danger',
    Medium: 'badge-warning',
    Low: 'badge-info',
  };
  return map[severity] || 'badge-info';
}

export function getStatusBadge(status) {
  const map = {
    Healthy: 'badge-success',
    Underutilized: 'badge-warning',
    Anomaly: 'badge-danger',
    'Optimization Available': 'badge-info',
    Unknown: 'badge-info',
  };
  return map[status] || 'badge-info';
}

export function Loader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-surface-400 text-sm">Loading data...</p>
      </div>
    </div>
  );
}
