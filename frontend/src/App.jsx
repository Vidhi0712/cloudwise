import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import CostAnalysis from './pages/CostAnalysis';
import Anomalies from './pages/Anomalies';
import Recommendations from './pages/Recommendations';
import './index.css';

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-surface-950 text-surface-100">
        <Sidebar />
        <main className="flex-1 min-w-0 p-6 overflow-y-auto max-w-[1600px]">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/costs" element={<CostAnalysis />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/recommendations" element={<Recommendations />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
