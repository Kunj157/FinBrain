import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, TrendingUp, TrendingDown, Plus, Loader2, X, Info,
  ArrowUpRight, ArrowDownRight, Minus, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';

type CreditScoreEntry = {
  id: string;
  score: number;
  provider: string;
  factors: string[];
  notes: string | null;
  date: string;
  createdAt: string;
};

type LatestScore = CreditScoreEntry & {
  change: number;
  previousScore: number | null;
};

type ScoreStats = {
  current: number | null;
  highest: number | null;
  lowest: number | null;
  average: number | null;
  count: number;
  trend: Array<{ score: number; date: string; provider: string }>;
};

function getScoreRange(score: number) {
  if (score >= 800) return { label: 'Excellent', color: '#10b981', textColor: 'text-emerald-400' };
  if (score >= 740) return { label: 'Very Good', color: '#34d399', textColor: 'text-emerald-300' };
  if (score >= 670) return { label: 'Good', color: '#fbbf24', textColor: 'text-amber-400' };
  if (score >= 580) return { label: 'Fair', color: '#f97316', textColor: 'text-orange-400' };
  return { label: 'Poor', color: '#ef4444', textColor: 'text-red-400' };
}

function ScoreGauge({ score }: { score: number }) {
  const range = getScoreRange(score);
  const min = 300;
  const max = 850;
  const normalized = (score - min) / (max - min);
  const angle = -135 + normalized * 270;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="240" height="140" viewBox="0 0 240 140">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="75%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path
          d="M 30 130 A 90 90 0 0 1 210 130"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 30 130 A 90 90 0 0 1 210 130"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <line
          x1="120"
          y1="130"
          x2={120 + 65 * Math.cos((angle * Math.PI) / 180)}
          y2={130 + 65 * Math.sin((angle * Math.PI) / 180)}
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          cx={120 + 65 * Math.cos((angle * Math.PI) / 180)}
          cy={130 + 65 * Math.sin((angle * Math.PI) / 180)}
          r="5"
          fill="white"
        />
      </svg>
      <div className="text-center -mt-2">
        <div className="text-5xl font-bold text-white">{score}</div>
        <div className={`text-sm font-medium ${range.textColor} mt-1`}>{range.label}</div>
      </div>
    </div>
  );
}

function ScoreTimeline({ trend }: { trend: ScoreStats['trend'] }) {
  if (trend.length < 2) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Add at least 2 entries to see your score trend</p>
      </div>
    );
  }

  const minScore = Math.min(...trend.map((t) => t.score)) - 20;
  const maxScore = Math.max(...trend.map((t) => t.score)) + 20;
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = trend.map((t, i) => ({
    x: padding.left + (i / (trend.length - 1)) * chartW,
    y: padding.top + (1 - (t.score - minScore) / (maxScore - minScore)) * chartH,
    score: t.score,
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    Math.round(minScore + ((maxScore - minScore) / (yTicks - 1)) * i)
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {yTickValues.map((val) => {
        const y = padding.top + (1 - (val - minScore) / (maxScore - minScore)) * chartH;
        return (
          <g key={val}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.05)" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="10">
              {val}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="rgba(16, 185, 129, 0.1)" />
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
          <text x={p.x} y={padding.top + chartH + 16} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
            {p.date}
          </text>
          <text x={p.x} y={p.y - 10} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontWeight="600">
            {p.score}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function CreditScorePage() {
  const { user } = useAuth();
  const [latest, setLatest] = useState<LatestScore | null>(null);
  const [stats, setStats] = useState<ScoreStats | null>(null);
  const [history, setHistory] = useState<CreditScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    score: '',
    provider: 'manual',
    factors: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [latestRes, statsRes, historyRes] = await Promise.all([
        api.get('/credit-score/latest'),
        api.get('/credit-score/stats'),
        api.get('/credit-score'),
      ]);
      setLatest(latestRes.data.data);
      setStats(statsRes.data.data);
      setHistory(historyRes.data.data);
    } catch (err) {
      console.error('Failed to load credit score data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    const score = parseInt(formData.score, 10);
    if (score < 300 || score > 850) return;

    setSubmitting(true);
    try {
      await api.post('/credit-score', {
        score,
        provider: formData.provider || 'manual',
        factors: formData.factors.split(',').map((f) => f.trim()).filter(Boolean),
        notes: formData.notes || undefined,
      });
      setFormData({ score: '', provider: 'manual', factors: '', notes: '' });
      setShowAdd(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to add credit score:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/credit-score/${id}`);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete credit score:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Credit Score</h1>
          <p className="text-sm text-muted-foreground">Track and monitor your credit score over time</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Score
        </Button>
      </div>

      {/* Current Score + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass lg:col-span-1">
          <CardContent className="p-6 flex flex-col items-center">
            {latest ? (
              <ScoreGauge score={latest.score} />
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No credit score recorded yet</p>
                <Button onClick={() => setShowAdd(true)} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                  Add Your First Score
                </Button>
              </div>
            )}
            {latest && latest.change !== 0 && (
              <div className={`flex items-center gap-1 mt-3 text-sm font-medium ${latest.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {latest.change > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {latest.change > 0 ? '+' : ''}{latest.change} from last
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Current</div>
              <div className="text-2xl font-bold text-white mt-1">{stats?.current ?? '—'}</div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Highest</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{stats?.highest ?? '—'}</div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Lowest</div>
              <div className="text-2xl font-bold text-red-400 mt-1">{stats?.lowest ?? '—'}</div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Average</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{stats?.average ?? '—'}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Score Timeline */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Score History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats && <ScoreTimeline trend={stats.trend} />}
        </CardContent>
      </Card>

      {/* Score Ranges Legend */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Info className="h-5 w-5" />
            Score Ranges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {[
              { range: '300–579', label: 'Poor', color: 'bg-red-500' },
              { range: '580–669', label: 'Fair', color: 'bg-orange-500' },
              { range: '670–739', label: 'Good', color: 'bg-amber-500' },
              { range: '740–799', label: 'Very Good', color: 'bg-emerald-400' },
              { range: '800–850', label: 'Excellent', color: 'bg-emerald-500' },
            ].map((r) => (
              <div key={r.label} className="text-center">
                <div className={`h-2 rounded-full ${r.color} mb-2`} />
                <div className="text-xs font-medium text-white">{r.label}</div>
                <div className="text-[10px] text-muted-foreground">{r.range}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      {history.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-white">All Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((entry) => {
                const range = getScoreRange(entry.score);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`text-lg font-bold ${range.textColor}`}>{entry.score}</div>
                      <div>
                        <div className="text-sm text-white">{range.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {entry.provider !== 'manual' && ` · ${entry.provider}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {entry.notes && (
                        <div className="text-xs text-muted-foreground max-w-[200px] truncate">{entry.notes}</div>
                      )}
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Add Credit Score</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Score (300–850)</label>
                <input
                  type="number"
                  min={300}
                  max={850}
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 720"
                />
                {formData.score && (
                  <div className="mt-1 text-xs">
                    {(() => {
                      const s = parseInt(formData.score, 10);
                      if (s >= 300 && s <= 850) {
                        const range = getScoreRange(s);
                        return <span className={range.textColor}>{range.label}</span>;
                      }
                      return <span className="text-red-400">Must be between 300 and 850</span>;
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Provider</label>
                <input
                  type="text"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Experian, Credit Karma"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Factors (comma separated)</label>
                <input
                  type="text"
                  value={formData.factors}
                  onChange={(e) => setFormData({ ...formData, factors: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. payment history, credit utilization"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                  rows={2}
                  placeholder="Any additional notes"
                />
              </div>

              <Button
                onClick={handleAdd}
                disabled={!formData.score || parseInt(formData.score, 10) < 300 || parseInt(formData.score, 10) > 850 || submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Score
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
