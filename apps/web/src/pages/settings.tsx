import { useAuth } from '@/hooks/use-auth';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { localStore } from '@/lib/store';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
];

export default function SettingsPage() {
  const { user, updateCurrency } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your preferences</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div>
            <label className="text-sm font-medium block mb-1.5">Preferred Currency</label>
            <p className="text-xs text-muted-foreground mb-2">
              All amounts will be displayed in this currency.
            </p>
            <Select
              value={user?.currency || 'USD'}
              onValueChange={(value) => updateCurrency(value as any)}
              options={CURRENCY_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Clear all locally stored data and start fresh.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                localStore.clear();
                navigate('/');
              }
            }}
          >
            Clear All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}