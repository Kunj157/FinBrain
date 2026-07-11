import { useMemo } from 'react';
import { Select } from './select';
import { Calendar } from 'lucide-react';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => {
  const y = currentYear - i;
  return { value: String(y), label: String(y) };
});

interface DOBSelectorProps {
  value: string;
  onChange: (isoDate: string) => void;
}

export function DOBSelector({ value, onChange }: DOBSelectorProps) {
  const parts = value ? value.split('-') : [];
  const year = parts[0] || '';
  const month = parts[1] || '';
  const day = parts[2] || '';

  const days = useMemo(() => {
    if (!month || !year) return [];
    const numDays = getDaysInMonth(parseInt(month), parseInt(year));
    return Array.from({ length: numDays }, (_, i) => ({
      value: String(i + 1).padStart(2, '0'),
      label: String(i + 1),
    }));
  }, [month, year]);

  const handleMonth = (m: string) => {
    const newDay = day && parseInt(day) > getDaysInMonth(parseInt(m), parseInt(year || String(currentYear)))
      ? ''
      : day;
    const iso = [year, m, newDay].filter(Boolean).join('-');
    onChange(iso || '');
  };

  const handleDay = (d: string) => {
    onChange([year, month, d].filter(Boolean).join('-'));
  };

  const handleYear = (y: string) => {
    const newDay = day && parseInt(day) > getDaysInMonth(parseInt(month || '1'), parseInt(y))
      ? ''
      : day;
    const iso = [y, month, newDay].filter(Boolean).join('-');
    onChange(iso || '');
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        Date of Birth
      </label>
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={month}
          onValueChange={handleMonth}
          options={MONTHS}
          placeholder="Month"
        />
        <Select
          value={day}
          onValueChange={handleDay}
          options={days}
          placeholder="Day"
          key={`${month}-${year}`}
        />
        <Select
          value={year}
          onValueChange={handleYear}
          options={YEARS}
          placeholder="Year"
        />
      </div>
    </div>
  );
}
