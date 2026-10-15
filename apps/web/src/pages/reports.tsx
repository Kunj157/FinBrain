import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  FileText, Download, Printer, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Receipt, Check, Store, Waypoints,
} from 'lucide-react';
import { ExplainViewButton } from '@/components/finance/explain-view-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Segmented } from '@/components/ui/segmented';
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/finance/metric-card';
import { InView } from '@/components/motion/in-view';
import { TransitionPanel } from '@/components/motion/transition-panel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { fetchAllTransactions } from '@/lib/transactions';
import { LoadError } from '@/components/ui/load-error';
import { formatCurrency } from '@/lib/utils';
import { SankeyFlow } from '@/components/finance/sankey';
import type { Transaction, Category, Currency as SharedCurrency } from '@finbrain/shared';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'monthly' | 'quarterly' | 'annual';

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

function getPeriodLabel(type: ReportType, date: Date): string {
  if (type === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (type === 'quarterly') {
    const q = Math.floor(date.getMonth() / 3) + 1;
    return `Q${q} ${date.getFullYear()}`;
  }
  return date.getFullYear().toString();
}

function getPeriodRange(type: ReportType, date: Date): { start: Date; end: Date } {
  const year = date.getFullYear();
  const month = date.getMonth();

  if (type === 'monthly') {
    return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0, 23, 59, 59) };
  }
  if (type === 'quarterly') {
    const qStart = Math.floor(month / 3) * 3;
    return { start: new Date(year, qStart, 1), end: new Date(year, qStart + 3, 0, 23, 59, 59) };
  }
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59) };
}

function navigatePeriod(type: ReportType, date: Date, direction: 1 | -1): Date {
  const d = new Date(date);
  if (type === 'monthly') d.setMonth(d.getMonth() + direction);
  else if (type === 'quarterly') d.setMonth(d.getMonth() + direction * 3);
  else d.setFullYear(d.getFullYear() + direction);
  return d;
}

export default function Reports() {
  const { user } = useAuth();
  const currency = (user?.currency || 'USD') as SharedCurrency;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [deductibleCats, setDeductibleCats] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('finbrain-deductible-cats');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const toggleDeductible = (catId: string) => {
    const next = { ...deductibleCats, [catId]: !deductibleCats[catId] };
    setDeductibleCats(next);
    localStorage.setItem('finbrain-deductible-cats', JSON.stringify(next));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txns, catRes] = await Promise.all([
        fetchAllTransactions('', user?.currency || 'USD'),
        api.get('/categories'),
      ]);
      setTransactions(txns);
      setCategories(catRes.data.data);
      setLoadError(null);
    } catch (error) {
      console.error('Reports load failed:', error);
      setLoadError('We could not load your reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.currency]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const catMap = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  const { start, end } = useMemo(() => getPeriodRange(reportType, currentDate), [reportType, currentDate]);
  const prevRange = useMemo(() => {
    const prevDate = navigatePeriod(reportType, currentDate, -1);
    return getPeriodRange(reportType, prevDate);
  }, [reportType, currentDate]);

  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
  }, [transactions, start, end]);

  const prevPeriodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= prevRange.start && d <= prevRange.end;
    });
  }, [transactions, prevRange]);

  const report = useMemo(() => {
    const income = periodTransactions.filter((t) => t.type === 'income');
    const expense = periodTransactions.filter((t) => t.type === 'expense');

    const totalIncome = income.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalExpense = expense.reduce((s, t) => s + Math.abs(t.amount), 0);
    const net = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

    const prevIncome = prevPeriodTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
    const prevExpense = prevPeriodTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
    const expenseChange = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : 0;

    const categoryBreakdown = Object.entries(
      expense.reduce((acc, t) => {
        acc[t.categoryId] = (acc[t.categoryId] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([id, amount]) => ({
        id,
        name: catMap[id]?.name || 'Other',
        color: catMap[id]?.color || 'hsl(var(--muted-foreground))',
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topMerchants = Object.entries(
      expense.reduce((acc, t) => {
        if (t.merchant) acc[t.merchant] = (acc[t.merchant] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    return {
      totalIncome, totalExpense, net, savingsRate,
      incomeCount: income.length, expenseCount: expense.length,
      incomeChange, expenseChange,
      categoryBreakdown, topMerchants,
    };
  }, [periodTransactions, prevPeriodTransactions, catMap]);

  const exportCSV = useCallback(() => {
    const rows = [
      ['Date', 'Type', 'Category', 'Merchant', 'Description', 'Amount', 'Currency'],
      ...periodTransactions
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((t) => [
          new Date(t.date).toLocaleDateString(),
          t.type,
          catMap[t.categoryId]?.name || 'Other',
          t.merchant || '',
          t.description,
          t.amount.toString(),
          t.currency,
        ]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finbrain-report-${reportType}-${getPeriodLabel(reportType, currentDate).replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [periodTransactions, reportType, currentDate, catMap]);

  const printReport = useCallback(() => {
    window.print();
  }, []);

  const exportPDF = useCallback(() => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FinBrain Financial Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${getPeriodLabel(reportType, currentDate)}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 34, { align: 'center' });

    let y = 44;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Income: ${formatCurrency(report.totalIncome, currency)}`, 14, y);
    y += 6;
    doc.text(`Expenses: ${formatCurrency(report.totalExpense, currency)}`, 14, y);
    y += 6;
    doc.text(`Net: ${formatCurrency(report.net, currency)}`, 14, y);
    y += 6;
    doc.text(`Savings Rate: ${report.savingsRate.toFixed(1)}%`, 14, y);
    y += 6;
    doc.text(`Transactions: ${periodTransactions.length}`, 14, y);
    y += 12;

    if (report.categoryBreakdown.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Category Breakdown', 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Category', 'Amount', '%']],
        body: report.categoryBreakdown.map((c) => [
          c.name,
          formatCurrency(c.amount, currency),
          `${c.percentage.toFixed(1)}%`,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    }

    if (report.topMerchants.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Merchants', 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Merchant', 'Amount']],
        body: report.topMerchants.map((m) => [
          m.name,
          formatCurrency(m.amount, currency),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    }

    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Transactions', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Type', 'Category', 'Merchant', 'Amount']],
      body: periodTransactions
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((t) => [
          new Date(t.date).toLocaleDateString(),
          t.type,
          catMap[t.categoryId]?.name || 'Other',
          t.merchant || t.description,
          formatCurrency(Math.abs(t.amount), currency),
        ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    doc.save(`finbrain-report-${reportType}-${getPeriodLabel(reportType, currentDate).replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }, [periodTransactions, reportType, currentDate, catMap, currency, report]);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading reports">
        <div className="space-y-2"><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} lines={0} className="h-[104px]" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2"><CardSkeleton className="h-72" /><CardSkeleton className="h-72" /></div>
      </div>
    );
  }

  if (loadError) {
    return <LoadError message={loadError} onRetry={fetchData} />;
  }

  const change = (value: number, lowerIsBetter = false) => {
    if (value === 0) return <span>No change vs prev</span>;
    const good = lowerIsBetter ? value < 0 : value > 0;
    return (
      <span className="inline-flex items-center gap-1">
        <span className={`inline-flex items-center gap-0.5 font-medium ${good ? 'text-positive' : 'text-negative'}`}>
          {value > 0 ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
          {Math.abs(value).toFixed(1)}%
        </span>
        vs prev
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Reports"
        description="Generate and export financial reports"
        actions={
          <>
            <ExplainViewButton viewName="Reports" />
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF}>
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={printReport}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </>
        }
      />

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Segmented
          id="report-type"
          label="Report type"
          value={reportType}
          onChange={(value) => { setReportType(value); setCurrentDate(new Date()); }}
          options={REPORT_TYPES}
        />
        <div className="flex items-center gap-1 rounded-lg border bg-card/60 p-0.5 shadow-edge">
          <Button variant="ghost" size="icon" aria-label="Previous period" onClick={() => setCurrentDate((d) => navigatePeriod(reportType, d, -1))} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[150px] text-center text-sm font-medium tabular-nums" aria-live="polite">{getPeriodLabel(reportType, currentDate)}</span>
          <Button variant="ghost" size="icon" aria-label="Next period" onClick={() => setCurrentDate((d) => navigatePeriod(reportType, d, 1))} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="h-8 text-xs">
          Today
        </Button>
      </div>

      <TransitionPanel activeKey={`${reportType}-${currentDate.toDateString()}`} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Income" value={report.totalIncome} icon={TrendingUp} tone="positive" currency={currency} footer={change(report.incomeChange)} />
        <MetricCard label="Expenses" value={report.totalExpense} icon={TrendingDown} tone="negative" currency={currency} footer={change(report.expenseChange, true)} />
        <MetricCard
          label="Net"
          value={report.net}
          icon={report.net >= 0 ? ArrowUpRight : ArrowDownRight}
          tone={report.net >= 0 ? 'positive' : 'negative'}
          valueTone={report.net >= 0 ? 'positive' : 'negative'}
          currency={currency}
          footer="Income minus expenses"
        />
        <MetricCard
          label="Transactions"
          value={periodTransactions.length}
          icon={FileText}
          tone="info"
          count
          footer={`${report.incomeCount} in / ${report.expenseCount} out`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InView index={0}>
          <Card className="h-full">
            <CardHeader><CardTitle>Category Breakdown</CardTitle><CardDescription>Where this period&apos;s spending went</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.categoryBreakdown.length === 0 ? (
                  <EmptyState icon={FileText} title="No expenses this period" className="py-6" />
                ) : report.categoryBreakdown.map((cat) => (
                  <div key={cat.id}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium tabular-nums">{formatCurrency(cat.amount, currency)}</span>
                        <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">{cat.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                      <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </InView>
        <InView index={1}>
          <Card className="h-full">
            <CardHeader><CardTitle>Top Merchants</CardTitle><CardDescription>Ranked by amount spent</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {report.topMerchants.length === 0 ? (
                  <EmptyState icon={Store} title="No merchant data this period" className="py-6" />
                ) : report.topMerchants.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-3 rounded-lg border bg-foreground/[0.02] p-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground/[0.05] font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                    <p className="min-w-0 flex-1 truncate text-xs font-medium">{m.name}</p>
                    <span className="text-xs font-medium tabular-nums">{formatCurrency(m.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </InView>
      </div>

      <InView index={2}>
        <Card>
          <CardHeader><CardTitle>Money Flow</CardTitle><CardDescription>How income moved into each kind of spending</CardDescription></CardHeader>
          <CardContent>
            {report.categoryBreakdown.length > 0 ? (
              <SankeyFlow
                income={[
                  { name: 'Income', amount: report.totalIncome },
                ]}
                expenses={report.categoryBreakdown.map((c) => ({
                  name: c.name,
                  amount: c.amount,
                  color: c.color,
                }))}
                currency={currency}
              />
            ) : (
              <EmptyState icon={Waypoints} title="No data to visualize" className="py-10" />
            )}
          </CardContent>
        </Card>
      </InView>

      <InView index={3}>
        <Card>
          <CardHeader><CardTitle>Transaction Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border bg-foreground/[0.02] p-3">
                <p className="stat-label">Period</p>
                <p className="mt-1 text-sm font-medium">
                  {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="rounded-lg border bg-foreground/[0.02] p-3">
                <p className="stat-label">Savings Rate</p>
                <p className={`mt-1 text-sm font-medium tabular-nums ${report.savingsRate >= 20 ? 'text-positive' : report.savingsRate >= 0 ? 'text-warning' : 'text-negative'}`}>
                  {report.savingsRate.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg border bg-foreground/[0.02] p-3">
                <p className="stat-label">Avg Transaction</p>
                <p className="mt-1 text-sm font-medium tabular-nums">
                  {periodTransactions.length > 0
                    ? formatCurrency(periodTransactions.reduce((s, t) => s + t.amount, 0) / periodTransactions.length, currency)
                    : formatCurrency(0, currency)}
                </p>
              </div>
              <div className="rounded-lg border bg-foreground/[0.02] p-3">
                <p className="stat-label">Categories Used</p>
                <p className="mt-1 text-sm font-medium tabular-nums">{report.categoryBreakdown.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </InView>
      </TransitionPanel>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" aria-hidden />
            Tax Summary — {taxYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="icon" aria-label="Previous tax year" onClick={() => setTaxYear((y) => y - 1)} className="h-7 w-7">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm font-medium">{taxYear}</span>
            <Button variant="ghost" size="icon" aria-label="Next tax year" onClick={() => setTaxYear((y) => y + 1)} className="h-7 w-7">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {(() => {
            const taxTxns = transactions.filter((t) => {
              const d = new Date(t.date);
              return t.type === 'expense' && d.getFullYear() === taxYear;
            });
            const byCategory = Object.entries(
              taxTxns.reduce((acc, t) => {
                acc[t.categoryId] = (acc[t.categoryId] || 0) + Math.abs(t.amount);
                return acc;
              }, {} as Record<string, number>)
            )
              .map(([id, amount]) => ({
                id, name: catMap[id]?.name || 'Other',
                amount, color: catMap[id]?.color || 'hsl(var(--muted-foreground))',
                deductible: !!deductibleCats[id],
              }))
              .sort((a, b) => b.amount - a.amount);

            const totalDeductible = byCategory.filter((c) => c.deductible).reduce((s, c) => s + c.amount, 0);
            const totalExpenses = byCategory.reduce((s, c) => s + c.amount, 0);

            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="rounded-lg border bg-foreground/[0.02] p-2.5">
                    <p className="text-[10px] text-muted-foreground">Total Expenses</p>
                    <p className="text-sm font-medium">{formatCurrency(totalExpenses, currency)}</p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Deductible</p>
                    <p className="text-sm font-medium text-primary">{formatCurrency(totalDeductible, currency)}</p>
                  </div>
                  <div className="rounded-lg border bg-foreground/[0.02] p-2.5">
                    <p className="text-[10px] text-muted-foreground">Transactions</p>
                    <p className="text-sm font-medium">{taxTxns.length}</p>
                  </div>
                  <div className="rounded-lg border bg-foreground/[0.02] p-2.5">
                    <p className="text-[10px] text-muted-foreground">Categories</p>
                    <p className="text-sm font-medium">{byCategory.length}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Mark categories as tax deductible by clicking the checkbox:
                </p>
                {byCategory.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-foreground/[0.04]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleDeductible(c.id)}
                        role="checkbox"
                        aria-checked={c.deductible}
                        aria-label={`${c.name} is tax deductible`}
                        className="flex-shrink-0 rounded"
                      >
                        <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${c.deductible ? 'border-primary bg-primary' : 'border-border-strong'}`}>
                          {c.deductible && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} aria-hidden />}
                        </div>
                      </button>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-xs">{c.name}</span>
                    </div>
                    <span className="text-xs font-medium tabular-nums">{formatCurrency(c.amount, currency)}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
