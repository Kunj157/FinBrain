import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { areaFill, useChartTheme } from '@/lib/chart-theme';
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
  const chart = useChartTheme();

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
    if (score >= 750) return { label: 'Excellent', color: 'hsl(var(--positive))' };
    if (score >= 700) return { label: 'Good', color: 'hsl(var(--info))' };
    if (score >= 650) return { label: 'Fair', color: 'hsl(var(--warning))' };
    if (score >= 600) return { label: 'Poor', color: 'hsl(var(--warning))' };
    return { label: 'Bad', color: 'hsl(var(--negative))' };
  }

  const chartData = {
    labels: [...scores].reverse().map((s) => new Date(s.date).toLocaleDateString()),
    datasets: [{
      label: 'Credit Score',
      data: [...scores].reverse().map((s) => s.score),
      fill: true,
      borderColor: chart.positive,
      backgroundColor: areaFill('positive'),
      tension: 0.4,
      borderWidth: 2,
      pointBackgroundColor: chart.positive,
      pointBorderColor: chart.surface,
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: chart.axes.x,
      y: { ...chart.axes.y, min: 300, max: 900 },
    },
    plugins: {
      legend: { display: false },
      tooltip: chart.tooltip,
    },
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6" aria-busy="true" aria-label="Loading credit score">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]"><CardSkeleton lines={4} /><CardSkeleton lines={2} /></div>
        <CardSkeleton lines={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader icon={TrendingUp} title="Credit Score" description="Record your score and watch the trend over time" />

      {msg && (
        <div role="status" className={`rounded-xl border p-3 text-sm ${msg.type === 'success' ? 'border-positive/20 bg-positive/10 text-positive' : 'border-negative/20 bg-negative/10 text-negative'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        {latest ? (
          <Card className="flex flex-col items-center p-6 text-center">
            <ScoreGauge score={latest.score} color={getRating(latest.score).color} />
            <div className="-mt-14 text-5xl font-semibold tabular-nums tracking-tight" style={{ color: getRating(latest.score).color }}>
              <AnimatedNumber value={latest.score} from={300} />
            </div>
            <Badge variant="outline" className="mt-2" >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getRating(latest.score).color }} aria-hidden />
              {getRating(latest.score).label}
            </Badge>
            <p className="mt-3 text-xs text-muted-foreground">
              Last updated {new Date(latest.date).toLocaleDateString()}
            </p>
          </Card>
        ) : (
          <Card>
            <EmptyState icon={TrendingUp} title="No score yet" description="Record your first score to start tracking it." />
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-base font-semibold tracking-tight">Record Score</h2>
          <p className="mb-4 mt-1 text-xs text-muted-foreground">Between 300 and 900, from any provider.</p>
          <div className="flex gap-3">
            <Input
              type="number"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              placeholder="Enter score (300-900)"
              aria-label="Credit score"
              min={300}
              max={900}
            />
            <Button onClick={addScore} disabled={saving || !newScore}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Record
            </Button>
          </div>
          <ul className="mt-5 space-y-1.5 text-xs text-muted-foreground">
            {[['750-900', 'Excellent', 'bg-positive'], ['700-749', 'Good', 'bg-info'], ['650-699', 'Fair', 'bg-warning'], ['600-649', 'Poor', 'bg-warning/60'], ['300-599', 'Bad', 'bg-negative']].map(([range, label, dot]) => (
              <li key={range} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
                <span className="w-16 tabular-nums text-foreground">{range}</span>
                {label}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {scores.length > 1 && (
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold tracking-tight">Trend</h2>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold tracking-tight">Score History</h2>
        {scores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scores recorded yet.</p>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border">
            {scores.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-surface-sunken/40 px-4 py-3 transition-colors hover:bg-foreground/[0.025]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getRating(s.score).color }}
                  />
                  <div>
                    <span className="font-semibold tabular-nums">{s.score}</span>
                    <span className="text-xs text-muted-foreground ml-2">{getRating(s.score).label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.date).toLocaleDateString()}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteScore(s.id)} aria-label={`Delete score ${s.score}`}>
                  <Trash2 className="h-4 w-4 text-negative" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" aria-hidden />
        Scores are manually entered. Connect to a credit monitoring service for automatic updates.
      </p>
    </div>
  );
}

/** A half-circle gauge from 300 to 900 with the score's arc lit. */
function ScoreGauge({ score, color }: { score: number; color: string }) {
  const fraction = Math.min(1, Math.max(0, (score - 300) / 600));
  const r = 80;
  const length = Math.PI * r;
  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[260px] overflow-visible" aria-hidden>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round" />
      <path
        d="M20 100 A80 80 0 0 1 180 100"
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - fraction)}
        className="transition-[stroke-dashoffset] duration-1000 ease-out"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
}
