import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { ActiveHighlight } from '@/components/motion/animated-background';
import { cn } from '@/lib/utils';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Calendar, Shield, Trash2, Loader2, Download, AlertTriangle, FileText, PiggyBank, Target, Building2, Receipt, ScrollText, Code, Bell, Globe, Settings as SettingsIcon, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import type { Currency } from '@finbrain/shared';
import { RulesSection } from '@/components/settings/rules-section';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
];

const DATA_TYPES = [
  { key: 'transactions', icon: FileText, label: 'Transactions', endpoint: '/transactions?limit=10000', filename: 'transactions', fields: ['date', 'description', 'amount', 'type', 'categoryName', 'accountName', 'merchant'] },
  { key: 'budgets', icon: PiggyBank, label: 'Budgets', endpoint: '/budgets', filename: 'budgets', fields: ['categoryName', 'amount', 'spent', 'period', 'startDate'] },
  { key: 'goals', icon: Target, label: 'Goals', endpoint: '/goals', filename: 'goals', fields: ['name', 'targetAmount', 'currentAmount', 'deadline', 'categoryName'] },
  { key: 'accounts', icon: Building2, label: 'Accounts', endpoint: '/accounts', filename: 'accounts', fields: ['name', 'type', 'balance', 'currency', 'institution'] },
  { key: 'receipts', icon: Receipt, label: 'Receipts', endpoint: '/transactions?limit=10000&hasReceipts=true', filename: 'receipts', fields: ['date', 'description', 'amount', 'receiptUrl'] },
];

function downloadCSV(data: Record<string, unknown>[], fields: string[], filename: string) {
  const header = fields.join(',');
  const rows = data.map((row) =>
    fields.map((f) => `"${String(row[f] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const { user, updateCurrency, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('finbrain-notif-prefs');
      return saved ? JSON.parse(saved) : {
        budget_alerts: true,
        goal_milestones: true,
        weekly_summary: false,
        unusual_activity: true,
        tips: false,
      };
    } catch { return {}; }
  });

  const updateNotifPref = (key: string, value: boolean) => {
    const next = { ...notifPrefs, [key]: value };
    setNotifPrefs(next);
    try { localStorage.setItem('finbrain-notif-prefs', JSON.stringify(next)); } catch { /* ignore */ }
  };

  const NOTIF_TYPES = [
    { key: 'budget_alerts', label: 'Budget Alerts', desc: 'When budgets reach 50%, 75%, 90%, or 100% utilization' },
    { key: 'goal_milestones', label: 'Goal Milestones', desc: 'When goals reach key progress points' },
    { key: 'unusual_activity', label: 'Unusual Activity', desc: 'Unusual spending patterns or large transactions' },
    { key: 'weekly_summary', label: 'Weekly Summary', desc: 'Weekly financial summary and insights' },
    { key: 'tips', label: 'Financial Tips', desc: 'Personalized tips to improve your finances' },
  ];

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const birthDateDisplay = user?.birthDate
    ? new Date(user.birthDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const handleExport = async (key: string, format: 'csv' | 'json') => {
    setExportingKey(key);
    try {
      const dt = DATA_TYPES.find((d) => d.key === key);
      if (!dt) return;
      const res = await api.get(dt.endpoint);
      let items: Record<string, unknown>[] = [];
      const d = res.data.data;
      if (Array.isArray(d)) {
        items = d;
      } else if (d?.data && Array.isArray(d.data)) {
        items = d.data;
      }
      if (format === 'csv') {
        downloadCSV(items, dt.fields, dt.filename);
      } else {
        downloadJSON(items, dt.filename);
      }
    } catch {
      // silent
    } finally {
      setExportingKey(null);
    }
  };

  const handleDelete = async () => {
    if (confirmEmail !== user?.email) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete('/auth/profile');
      signOut();
      navigate('/');
    } catch (e: unknown) {
      const msg = (e instanceof Error && 'response' in e)
        ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setDeleteError(msg || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Manage your account and preferences"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <SectionNav />

        <div className="min-w-0 max-w-3xl space-y-6">
      {/* Profile */}
      <Section id="profile" icon={User} title="Profile" description="Your identity across FinBrain">
          <div className="flex items-center gap-4 border-b pb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 to-accent/20 text-xl font-semibold text-primary shadow-edge">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{user?.name || 'User'}</p>
              <p className="truncate text-sm text-muted-foreground">@{user?.username || 'not set'}</p>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
            <Field icon={Mail} label="Email" value={user?.email} />
            <Field icon={Shield} label="Password" value={'••••••••'} />
            {birthDateDisplay && <Field icon={Calendar} label="Date of Birth" value={birthDateDisplay} />}
            {memberSince && <Field icon={Calendar} label="Member Since" value={memberSince} />}
          </dl>
      </Section>

      {/* Preferences */}
      <Section id="preferences" icon={Globe} title="Preferences" description="How figures are shown to you">
            <label className="mb-1 block text-sm font-medium">Preferred Currency</label>
            <p className="mb-3 text-xs text-muted-foreground">
              All amounts will be displayed in this currency.
            </p>
            <Select
              value={user?.currency || 'USD'}
              onValueChange={(value) => updateCurrency(value as Currency)}
              options={CURRENCY_OPTIONS}
              className="sm:max-w-xs"
            />
      </Section>

      {/* Notifications */}
      <Section id="notifications" icon={Bell} title="Notifications" description="Choose what FinBrain tells you about">
        <div className="divide-y overflow-hidden rounded-xl border">
          {NOTIF_TYPES.map((nt) => (
            <div key={nt.key} className="flex items-center justify-between gap-4 bg-surface-sunken/40 px-4 py-3.5 transition-colors hover:bg-foreground/[0.025]">
              <div className="min-w-0">
                <p id={`notif-${nt.key}`} className="text-sm font-medium">{nt.label}</p>
                <p className="text-xs text-muted-foreground">{nt.desc}</p>
              </div>
              <Switch
                checked={!!notifPrefs[nt.key]}
                onChange={(value) => updateNotifPref(nt.key, value)}
                labelledBy={`notif-${nt.key}`}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Rules */}
      <Section id="rules" icon={ScrollText} title="Rules" description="Categorize matching transactions automatically">
        <RulesSection />
      </Section>

      {/* Export Data */}
      <Section id="export" icon={Download} title="Export Data" description="Download a copy of everything you have stored">
        <div className="grid gap-3 sm:grid-cols-2">
          {DATA_TYPES.map((dt) => {
            const Icon = dt.icon;
            const isExporting = exportingKey === dt.key;
            return (
              <div key={dt.key} className="flex items-center justify-between gap-3 rounded-xl border bg-surface-sunken/40 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] ring-1 ring-inset ring-border">
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </span>
                  <span className="truncate text-sm font-medium">{dt.label}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExport(dt.key, 'csv')}
                    disabled={isExporting}
                    className="h-8 gap-1.5 px-2.5 text-xs"
                  >
                    {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                    CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExport(dt.key, 'json')}
                    disabled={isExporting}
                    className="h-8 gap-1.5 px-2.5 text-xs"
                  >
                    {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Code className="h-3 w-3" />}
                    JSON
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Scheduled Reports */}
      <Section id="reports" icon={FileText} title="Scheduled Reports" description="Set up automatic report delivery to your email.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="email"
              placeholder="your@email.com"
              aria-label="Report email"
              defaultValue={user?.email || ''}
              className="flex-1"
            />
            <select aria-label="Report frequency" className="h-10 rounded-lg border border-input bg-surface-sunken/60 px-3 text-sm text-foreground transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
            <Button onClick={() => { api.post('/scheduled-reports', { reportType: 'monthly', email: user?.email || '' }).then(() => alert('Report scheduled!')).catch(() => {}); }}>
              Schedule
            </Button>
          </div>
      </Section>

      {/* Security */}
      <Section id="danger" icon={Trash2} title="Danger Zone" description="Irreversible actions" danger>
          <div className="flex flex-col gap-4 rounded-xl border border-negative/20 bg-negative/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action is irreversible and cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
              className="shrink-0 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </div>
      </Section>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setConfirmEmail(''); setDeleteError(''); }}>
        <DialogClose onClose={() => { setShowDeleteModal(false); setConfirmEmail(''); setDeleteError(''); }} />
        <DialogHeader>
          <DialogTitle className="text-negative">Delete Account</DialogTitle>
          <DialogDescription>
            This will permanently delete your FinBrain account and all associated data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogContent className="space-y-4">
          <div className="rounded-lg bg-negative/5 border border-negative/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-negative mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-negative">You will lose access to:</p>
                <ul className="mt-2 space-y-1.5">
                  {DATA_TYPES.map((item) => (
                    <li key={item.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <item.icon className="h-3.5 w-3.5 text-negative/60" />
                      <span>{item.label}</span>
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
              className="h-10 w-full rounded-lg border border-input bg-surface-sunken/60 px-3 text-sm text-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-negative/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-negative/15"
            />
          </div>
          {deleteError && (
            <div className="rounded-lg bg-negative/10 border border-negative/20 p-3">
              <p className="text-sm text-negative">{deleteError}</p>
            </div>
          )}
        </DialogContent>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { setShowDeleteModal(false); setConfirmEmail(''); setDeleteError(''); }}
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

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'rules', label: 'Rules' },
  { id: 'export', label: 'Export Data' },
  { id: 'reports', label: 'Scheduled Reports' },
  { id: 'danger', label: 'Danger Zone' },
];

/** In-page navigation; the highlight follows whichever section is in view. */
function SectionNav() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -60% 0px' },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Settings sections" className="hidden lg:block">
      <ul className="sticky top-6 space-y-0.5">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              onClick={(e) => {
                e.preventDefault();
                setActive(section.id);
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              aria-current={active === section.id ? 'true' : undefined}
              className={cn(
                'relative isolate block rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                active === section.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                section.id === 'danger' && active !== section.id && 'hover:text-negative',
              )}
            >
              {active === section.id && (
                <ActiveHighlight layoutId="settings-section" className="rounded-lg border bg-foreground/[0.05] shadow-edge" />
              )}
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  description,
  danger = false,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <Card id={id} className={cn('scroll-mt-6 p-6', danger && 'border-negative/25')}>
      <div className="mb-5 flex items-start gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
            danger ? 'bg-negative/10 text-negative ring-negative/20' : 'bg-primary/10 text-primary ring-primary/20',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className={cn('text-base font-semibold tracking-tight', danger && 'text-negative')}>{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function Field({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-surface-sunken/40 px-3.5 py-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm">{value}</dd>
      </div>
    </div>
  );
}

/** An accessible on/off switch drawn with tokens. */
function Switch({ checked, onChange, labelledBy }: { checked: boolean; onChange: (value: boolean) => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200',
        checked ? 'border-primary/40 bg-primary' : 'border-border-strong bg-muted',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow-raised ring-1 ring-black/5 transition-transform duration-200 ease-out',
          checked ? 'translate-x-[21px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
