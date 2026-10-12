const API_BASE = '/api';

async function fetchJSON(url) {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getDashboard: () => fetchJSON('/dashboard'),
  getResources: () => fetchJSON('/resources'),
  getResource: (id) => fetchJSON(`/resources/${id}`),
  getCosts: () => fetchJSON('/costs'),
  getAnomalies: () => fetchJSON('/anomalies'),
  getRecommendations: () => fetchJSON('/recommendations'),
  getForecast: () => fetchJSON('/forecast'),
  getInsights: () => fetchJSON('/insights'),
};
