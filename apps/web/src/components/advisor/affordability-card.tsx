import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface AffordabilityDecision {
  decision: string;
  confidence: number;
  summary: string;
  assumedPurchaseAmount: number;
  currentCashAvailable: number;
  impact: {
    emergencyFundMonthsBefore: number;
    emergencyFundMonthsAfter: number;
    savingsRateBefore: number;
    savingsRateAfter: number;
    goalDelays: Array<{ name: string; delayDays: number }>;
  };
  reasons: string[];
  alternatives: string[];
}

const decisionConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  recommended: { color: 'text-emerald-400', icon: CheckCircle2, label: 'Recommended' },
  reasonable: { color: 'text-blue-400', icon: CheckCircle2, label: 'Reasonable' },
  caution: { color: 'text-yellow-400', icon: AlertTriangle, label: 'Caution' },
  not_recommended: { color: 'text-red-400', icon: XCircle, label: 'Not Recommended' },
  insufficient_data: { color: 'text-gray-400', icon: AlertTriangle, label: 'Insufficient Data' },
};

export function AffordabilityCard({ decision }: { decision: AffordabilityDecision }) {
  const config = decisionConfig[decision.decision] || decisionConfig.insufficient_data;
  const Icon = config.icon;

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <CardTitle className={`text-base ${config.color}`}>{config.label}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {Math.round(decision.confidence * 100)}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Purchase Amount</p>
            <p className="text-lg font-semibold">{formatCurrency(decision.assumedPurchaseAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current Cash</p>
            <p className="text-lg font-semibold">{formatCurrency(decision.currentCashAvailable)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Emergency Fund</p>
            <p className={`font-medium ${decision.impact.emergencyFundMonthsAfter >= 3 ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {decision.impact.emergencyFundMonthsBefore} → {decision.impact.emergencyFundMonthsAfter} months
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Savings Rate</p>
            <p className={`font-medium ${decision.impact.savingsRateAfter >= 20 ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {decision.impact.savingsRateBefore.toFixed(1)}% → {decision.impact.savingsRateAfter.toFixed(1)}%
            </p>
          </div>
        </div>

        {decision.reasons.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">Reasons</p>
            {decision.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-3 w-3 mt-1 text-yellow-400 flex-shrink-0" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        )}

        {decision.impact.goalDelays.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">Goal Impact</p>
            {decision.impact.goalDelays.map((g, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-blue-400">•</span>
                <span>"{g.name}" delayed by {g.delayDays} days</span>
              </div>
            ))}
          </div>
        )}

        {decision.alternatives.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">Alternatives</p>
            {decision.alternatives.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-emerald-400">→</span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
