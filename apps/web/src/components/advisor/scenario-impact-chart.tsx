import { formatCurrency } from '@/lib/utils';

interface ScenarioResult {
  projectedBalance: number;
  monthlyNetFlow: number;
  emergencyFundImpact: number;
  savingsRateChange: number;
  goalDelays: Array<{ name: string; delayDays: number }>;
}

export function ScenarioImpactChart({ result }: { result: ScenarioResult }) {
  const maxVal = Math.max(
    Math.abs(result.projectedBalance),
    Math.abs(result.monthlyNetFlow * 12),
    1000,
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">12-Month Projected Balance</span>
          <span className={`font-medium ${result.projectedBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(result.projectedBalance)}
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${result.projectedBalance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, Math.abs(result.projectedBalance) / maxVal * 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Monthly Net Flow</p>
          <p className={`font-medium ${result.monthlyNetFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(result.monthlyNetFlow)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Emergency Fund</p>
          <p className={`font-medium ${result.emergencyFundImpact >= 3 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {result.emergencyFundImpact} months
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          Savings Rate: {result.savingsRateChange >= 0 ? '+' : ''}{result.savingsRateChange.toFixed(1)}%
        </p>
      </div>

      {result.goalDelays.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Goal Delays</p>
          {result.goalDelays.map((g, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{g.name}</span>
              <span className="text-yellow-400">+{g.delayDays} days</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
