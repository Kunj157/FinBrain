import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Calendar, Shield, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

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
  const { user, updateCurrency, signOut } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const birthDateDisplay = user?.birthDate
    ? new Date(user.birthDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await api.delete('/auth/profile');
      signOut();
    } catch {
      setDeleting(false);
      setConfirmText('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.04]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-lg font-semibold">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground">@{user?.username || 'not set'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Password</p>
                <p className="text-sm">••••••••</p>
              </div>
            </div>
            {birthDateDisplay && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="text-sm">{birthDateDisplay}</p>
                </div>
              </div>
            )}
            {memberSince && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Member Since</p>
                  <p className="text-sm">{memberSince}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
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

      {/* Delete Account */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-400">
            <Trash2 className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data (transactions, budgets, goals, etc.). This action cannot be undone.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="flex-1 h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/30 transition-all"
            />
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || deleting}
              className="gap-2"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
