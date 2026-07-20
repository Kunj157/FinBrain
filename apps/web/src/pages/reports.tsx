import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  FileText, Download, Printer, ChevronLeft, ChevronRight, Loader2,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Receipt,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
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
      const [txnRes, catRes] = await Promise.all([
        api.get('/transactions?limit=5000'),
        api.get('/categories'),
      ]);
      setTransactions(txnRes.data.data.data);
      setCategories(catRes.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

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
        color: catMap[id]?.color || '#64748b',
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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and export financial reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={printReport}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex gap-1 p-1 rounded-lg bg-white/5">
          {REPORT_TYPES.map((rt) => (
            <Button
              key={rt.value}
              variant={reportType === rt.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setReportType(rt.value); setCurrentDate(new Date()); }}
              className="h-7 text-xs"
            >
              {rt.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate((d) => navigatePeriod(reportType, d, -1))} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[160px] text-center">{getPeriodLabel(reportType, currentDate)}</span>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate((d) => navigatePeriod(reportType, d, 1))} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="h-7 text-xs ml-2">
            Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(report.totalIncome, currency)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {report.incomeChange !== 0 && (
                    <>
                      {report.incomeChange > 0 ? <ArrowUpRight className="h-3 w-3 text-emerald-400" /> : <ArrowDownRight className="h-3 w-3 text-rose-400" />}
                      <span className={`text-[10px] ${report.incomeChange > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {Math.abs(report.incomeChange).toFixed(1)}%
                      </span>
                    </>
                  )}
                  <span className="text-[10px] text-muted-foreground">vs prev</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
                <TrendingDown className="h-5 w-5 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-bold text-rose-400">{formatCurrency(report.totalExpense, currency)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {report.expenseChange !== 0 && (
                    <>
                      {report.expenseChange > 0 ? <ArrowUpRight className="h-3 w-3 text-rose-400" /> : <ArrowDownRight className="h-3 w-3 text-emerald-400" />}
                      <span className={`text-[10px] ${report.expenseChange > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {Math.abs(report.expenseChange).toFixed(1)}%
                      </span>
                    </>
                  )}
                  <span className="text-[10px] text-muted-foreground">vs prev</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${report.net >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                {report.net >= 0 ? <ArrowUpRight className="h-5 w-5 text-emerald-400" /> : <ArrowDownRight className="h-5 w-5 text-rose-400" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net</p>
                <p className={`text-lg font-bold ${report.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(report.net, currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-lg font-bold">{periodTransactions.length}</p>
                <p className="text-[10px] text-muted-foreground">{report.incomeCount} in / {report.expenseCount} out</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.categoryBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No expenses this period</p>
              ) : report.categoryBreakdown.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs font-medium">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{formatCurrency(cat.amount, currency)}</span>
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{cat.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.topMerchants.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No merchant data this period</p>
              ) : report.topMerchants.map((m, i) => (
                <div key={m.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                  <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{m.name}</p>
                  </div>
                  <span className="text-xs font-medium">{formatCurrency(m.amount, currency)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="stat-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Money Flow</CardTitle>
        </CardHeader>
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
            <p className="text-xs text-muted-foreground text-center py-12">No data to visualize</p>
          )}
        </CardContent>
      </Card>

      <Card className="stat-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Transaction Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-white/[0.02]">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Period</p>
              <p className="text-sm font-medium mt-0.5">
                {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02]">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Savings Rate</p>
              <p className={`text-sm font-medium mt-0.5 ${report.savingsRate >= 20 ? 'text-emerald-400' : report.savingsRate >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {report.savingsRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02]">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Transaction</p>
              <p className="text-sm font-medium mt-0.5">
                {periodTransactions.length > 0
                  ? formatCurrency(periodTransactions.reduce((s, t) => s + t.amount, 0) / periodTransactions.length, currency)
                  : formatCurrency(0, currency)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02]">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Categories Used</p>
              <p className="text-sm font-medium mt-0.5">{report.categoryBreakdown.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="stat-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Tax Summary — {taxYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setTaxYear((y) => y - 1)} className="h-7 w-7 p-0">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm font-medium">{taxYear}</span>
            <Button variant="ghost" size="sm" onClick={() => setTaxYear((y) => y + 1)} className="h-7 w-7 p-0">
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
                amount, color: catMap[id]?.color || '#64748b',
                deductible: !!deductibleCats[id],
              }))
              .sort((a, b) => b.amount - a.amount);

            const totalDeductible = byCategory.filter((c) => c.deductible).reduce((s, c) => s + c.amount, 0);
            const totalExpenses = byCategory.reduce((s, c) => s + c.amount, 0);

            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <p className="text-[10px] text-muted-foreground">Total Expenses</p>
                    <p className="text-sm font-medium">{formatCurrency(totalExpenses, currency)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/5">
                    <p className="text-[10px] text-muted-foreground">Deductible</p>
                    <p className="text-sm font-medium text-emerald-400">{formatCurrency(totalDeductible, currency)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <p className="text-[10px] text-muted-foreground">Transactions</p>
                    <p className="text-sm font-medium">{taxTxns.length}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02]">
                    <p className="text-[10px] text-muted-foreground">Categories</p>
                    <p className="text-sm font-medium">{byCategory.length}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Mark categories as tax deductible by clicking the checkbox:
                </p>
                {byCategory.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleDeductible(c.id)} className="flex-shrink-0">
                        <div className={`w-4 h-4 rounded border ${c.deductible ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'} flex items-center justify-center`}>
                          {c.deductible && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-xs">{c.name}</span>
                    </div>
                    <span className="text-xs font-medium">{formatCurrency(c.amount, currency)}</span>
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
