import { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

interface DataQualitySummary {
  score: number;
  confidence: string;
  transactionCount: number;
  categorizedPercent: number;
  issues: Array<{
    type: string;
    severity: string;
    description: string;
    count: number;
  }>;
  recommendations: string[];
}

function getQualityLevel(score: number) {
  if (score >= 80) return { label: 'Excellent', color: 'text-emerald-400', icon: ShieldCheck, bg: 'bg-emerald-500/10' };
  if (score >= 60) return { label: 'Good', color: 'text-blue-400', icon: ShieldCheck, bg: 'bg-blue-500/10' };
  if (score >= 40) return { label: 'Fair', color: 'text-amber-400', icon: ShieldAlert, bg: 'bg-amber-500/10' };
  return { label: 'Needs Work', color: 'text-rose-400', icon: ShieldX, bg: 'bg-rose-500/10' };
}

export function DataQualityWidget() {
  const [quality, setQuality] = useState<DataQualitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuality = async () => {
      try {
        const res = await api.get('/data-quality/summary');
        setQuality(res.data.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchQuality();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!quality) return null;

  const level = getQualityLevel(quality.score);
  const LevelIcon = level.icon;
  const highIssues = quality.issues.filter((i) => i.severity === 'high');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Data Quality
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${level.bg}`}>
            <LevelIcon className={`h-6 w-6 ${level.color}`} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{quality.score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <p className={`text-xs font-medium ${level.color}`}>{level.label}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Transactions</span>
            <span className="text-xs font-medium">{quality.transactionCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Categorized</span>
            <span className="text-xs font-medium">{Math.round(quality.categorizedPercent)}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                quality.categorizedPercent >= 80 ? 'bg-emerald-400' :
                quality.categorizedPercent >= 50 ? 'bg-amber-400' : 'bg-rose-400'
              }`}
              style={{ width: `${quality.categorizedPercent}%` }}
            />
          </div>
        </div>

        {highIssues.length > 0 && (
          <div className="space-y-1.5">
            {highIssues.slice(0, 2).map((issue, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-rose-500/5 border border-rose-500/10 p-2">
                <AlertTriangle className="h-3 w-3 text-rose-400 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">{issue.description}</p>
              </div>
            ))}
          </div>
        )}

        {quality.recommendations.length > 0 && (
          <div className="space-y-1.5">
            {quality.recommendations.slice(0, 2).map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
