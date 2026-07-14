import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Calendar, Shield, Trash2, Loader2, Download, AlertTriangle, FileText, PiggyBank, Target, Building2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import type { Currency } from '@finbrain/shared';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
];

const DATA_ITEMS = [
  { icon: FileText, label: 'Transactions', description: 'All transaction history and notes' },
  { icon: PiggyBank, label: 'Budgets', description: 'All budget categories and limits' },
  { icon: Target, label: 'Goals', description: 'Savings goals and progress' },
  { icon: Building2, label: 'Accounts', description: 'Connected accounts and balances' },
  { icon: Receipt, label: 'Receipts', description: 'Uploaded receipt images' },
];

export default function SettingsPage() {
  const { user, updateCurrency, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [exporting, setExporting] = useState(false);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const birthDateDisplay = user?.birthDate
    ? new Date(user.birthDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const handleExportData = async () => {
    setExporting(true);
    try {
      const [txnsRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/accounts'),
      ]);

      const txns = txnsRes.data.data || [];

      const csvHeader = 'Date,Description,Amount,Category,Account';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const csvRows = txns.map((t: any) =>
        [t.date, `"${(t.description || '').replace(/"/g, '""')}"`, t.amount, t.categoryName || '', t.accountName || ''].join(',')
      );
      const csv = [csvHeader, ...csvRows].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finbrain-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmEmail !== user?.email) return;
    setDeleting(true);
    try {
      await api.delete('/auth/profile');
      signOut();
      navigate('/');
    } catch {
      setDeleting(false);
      setConfirmEmail('');
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
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
                <p className="text-sm">{'••••••••'}</p>
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
              onValueChange={(value) => updateCurrency(value as Currency)}
              options={CURRENCY_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-3">
              <Download className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Export Your Data</p>
                <p className="text-xs text-muted-foreground">Download all transactions as a CSV file before making changes</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData} disabled={exporting} className="gap-2">
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-400">
            <Trash2 className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action is irreversible and cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setConfirmEmail(''); }}>
        <DialogClose onClose={() => { setShowDeleteModal(false); setConfirmEmail(''); }} />
        <DialogHeader>
          <DialogTitle className="text-red-400">Delete Account</DialogTitle>
          <DialogDescription>
            This will permanently delete your FinBrain account and all associated data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogContent className="space-y-4">
          <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">You will lose access to:</p>
                <ul className="mt-2 space-y-1.5">
                  {DATA_ITEMS.map((item) => (
                    <li key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <item.icon className="h-3.5 w-3.5 text-red-400/60" />
                      <span><span className="font-medium text-foreground">{item.label}</span> — {item.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type your email (<span className="text-muted-foreground">{user?.email}</span>) to confirm:
            </label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/30 transition-all"
            />
          </div>
        </DialogContent>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { setShowDeleteModal(false); setConfirmEmail(''); }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmEmail !== user?.email || deleting}
            className="gap-2"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? 'Deleting...' : 'Permanently Delete'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
