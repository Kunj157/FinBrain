import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const PRESETS = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '12m', label: 'Last 12 Months' },
  { value: 'this-year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
] as const;

function getPresetRange(preset: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];

  switch (preset) {
    case 'this-month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], end };
    case 'last-month': {
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: last.toISOString().split('T')[0], end: lastEnd.toISOString().split('T')[0] };
    }
    case '3m':
      return { start: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0], end };
    case '6m':
      return { start: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0], end };
    case '12m':
      return { start: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0], end };
    case 'this-year':
      return { start: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0], end };
    default:
      return { start: '', end };
  }
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: { start: string; end: string };
  onChange: (range: { start: string; end: string }) => void;
}) {
  const [preset, setPreset] = useState<string>(() => {
    if (!value.start) return 'this-month';
    return 'custom';
  });

  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      onChange(getPresetRange(newPreset));
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Calendar className="h-4 w-4" />
      </div>
      <Select
        value={preset}
        onValueChange={handlePresetChange}
        options={PRESETS.map((p) => ({ value: p.value, label: p.label }))}
      />
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={value.start}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, start: e.target.value })}
            className="w-auto"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={value.end}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, end: e.target.value })}
            className="w-auto"
          />
        </div>
      )}
    </div>
  );
}

export { getPresetRange };
