import { Badge } from '@/components/ui/badge';

const confidenceStyles: Record<string, string> = {
  high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  return (
    <Badge variant="outline" className={`${confidenceStyles[confidence] || confidenceStyles.low} text-xs`}>
      {confidence} confidence
    </Badge>
  );
}
