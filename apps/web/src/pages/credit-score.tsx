import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler,
} from 'chart.js';
import { TrendingUp, Plus, Loader2, Trash2, Info } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

interface CreditEntry {
  id: string;
  score: number;
  provider: string;
  date: string;
  factors: Record<string, unknown> | null;
}

export default function CreditScorePage() {
  const [scores, setScores] = useState<CreditEntry[]>([]);
  const [latest, setLatest] = useState<CreditEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [newScore, setNewScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { loadScores(); }, []);

  function show(type: 'success' | 'error', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  }

  async function loadScores() {
    try {
      const res = await api.get('/credit-score');
      setScores(res.data.data.scores);
      setLatest(res.data.data.latest);
    } catch { /* empty */ }
    setLoading(false);
  }

  async function addScore() {
    const score = parseInt(newScore);
    if (isNaN(score) || score < 300 || score > 900) {
      show('error', 'Score must be between 300 and 900');
      return;
    }
    setSaving(true);
    try {
      await api.post('/credit-score', { score, provider: 'manual', date: new Date().toISOString() });
      setNewScore('');
      show('success', 'Score recorded!');
      loadScores();
    } catch (e: unknown) {
      const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save';
      show('error', err);
    }
    setSaving(false);
  }

  async function deleteScore(id: string) {
    try {
      await api.delete(`/credit-score/${id}`);
      loadScores();
    } catch { /* ignore */ }
  }

  function getRating(score: number): { label: string; color: string } {
    if (score >= 750) return { label: 'Excellent', color: '#22c55e' };
    if (score >= 700) return { label: 'Good', color: '#3b82f6' };
    if (score >= 650) return { label: 'Fair', color: '#f59e0b' };
    if (score >= 600) return { label: 'Poor', color: '#f97316' };
    return { label: 'Bad', color: '#ef4444' };
  }

  const chartData = {
    labels: [...scores].reverse().map((s) => new Date(s.date).toLocaleDateString()),
    datasets: [{
      label: 'Credit Score',
      data: [...scores].reverse().map((s) => s.score),
      fill: true,
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      tension: 0.4,
      pointBackgroundColor: '#22c55e',
      pointBorderColor: '#166534',
      pointRadius: 4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 300,
        max: 900,
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(107, 114, 128, 0.1)' },
      },
      x: {
        ticks: { color: '#6b7280', maxRotation: 45 },
        grid: { color: 'rgba(107, 114, 128, 0.1)' },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-7 w-7 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white">Credit Score</h1>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {msg.text}
        </div>
      )}

      {latest && (
        <Card className="p-6 bg-gray-900/60 border-gray-800 text-center">
          <div className="text-5xl font-bold mb-1" style={{ color: getRating(latest.score).color }}>
            {latest.score}
          </div>
          <div className="text-sm font-medium" style={{ color: getRating(latest.score).color }}>
            {getRating(latest.score).label}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Last updated {new Date(latest.date).toLocaleDateString()}
          </p>
        </Card>
      )}

      <Card className="p-6 bg-gray-900/60 border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Record Score</h2>
        <div className="flex gap-3">
          <Input
            type="number"
            value={newScore}
            onChange={(e) => setNewScore(e.target.value)}
            placeholder="Enter score (300-900)"
            min={300}
            max={900}
            className="bg-gray-800 border-gray-700 text-white"
          />
          <Button onClick={addScore} disabled={saving || !newScore}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Record
          </Button>
        </div>
      </Card>

      {scores.length > 1 && (
        <Card className="p-6 bg-gray-900/60 border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">Trend</h2>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </Card>
      )}

      <Card className="p-6 bg-gray-900/60 border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Score History</h2>
        {scores.length === 0 ? (
          <p className="text-sm text-gray-500">No scores recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {scores.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getRating(s.score).color }}
                  />
                  <div>
                    <span className="text-white font-medium">{s.score}</span>
                    <span className="text-xs text-gray-400 ml-2">{getRating(s.score).label}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(s.date).toLocaleDateString()}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteScore(s.id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 bg-gray-900/60 border-gray-800">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-white mb-1">About Credit Score Ranges</h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li><span className="text-emerald-400">750-900</span> Excellent</li>
              <li><span className="text-blue-400">700-749</span> Good</li>
              <li><span className="text-amber-400">650-699</span> Fair</li>
              <li><span className="text-orange-400">600-649</span> Poor</li>
              <li><span className="text-red-400">300-599</span> Bad</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              Scores are manually entered. Connect to a credit monitoring service for automatic updates.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
