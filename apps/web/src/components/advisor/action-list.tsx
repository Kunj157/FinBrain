import { CheckCircle2, AlertTriangle, Target, Shield } from 'lucide-react';

interface Action {
  icon?: 'check' | 'warning' | 'target' | 'shield';
  text: string;
  onClick?: () => void;
}

const iconMap = {
  check: CheckCircle2,
  warning: AlertTriangle,
  target: Target,
  shield: Shield,
};

export function ActionList({ actions }: { actions: Action[] }) {
  return (
    <div className="space-y-2">
      {actions.map((action, i) => {
        const Icon = iconMap[action.icon || 'check'];
        return (
          <div
            key={i}
            onClick={action.onClick}
            className={`flex items-start gap-2 text-sm ${action.onClick ? 'cursor-pointer hover:text-emerald-400' : ''}`}
          >
            <Icon className="h-3.5 w-3.5 mt-0.5 text-emerald-400 flex-shrink-0" />
            <span>{action.text}</span>
          </div>
        );
      })}
    </div>
  );
}
