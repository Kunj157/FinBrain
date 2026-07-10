import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, File, Check, X, AlertCircle, Loader2, CopyX } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { findDuplicates } from '@/lib/duplicate-detection';
import type { Transaction } from '@finbrain/shared';

interface StatementImportProps {
  onComplete?: () => void;
}

type PreviewRow = {
  date: string;
  amount: number;
  description: string;
  merchant: string;
  category: string;
  categoryId?: string | null;
  type: string;
};

export function CsvImport({ onComplete }: StatementImportProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const currency = user?.currency || 'USD';
  const [existingTxns, setExistingTxns] = useState<Transaction[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/transactions?limit=10000');
        setExistingTxns(data.data.data);
      } catch {
        // silent
      }
    })();
  }, []);

  const duplicates = useMemo(() => {
    if (!preview) return new Map();
    return findDuplicates(
      preview.map((r) => ({ merchant: r.merchant, amount: Math.abs(r.amount), date: r.date })),
      existingTxns,
    );
  }, [preview, existingTxns]);

  const filteredPreview = useMemo(() => {
    if (!preview || !skipDuplicates) return preview;
    return preview.filter((_, i) => !duplicates.has(i));
  }, [preview, skipDuplicates, duplicates]);

  const handleFile = useCallback(async (selected: File) => {
    const name = selected.name.toLowerCase();
    const isCsv = name.endsWith('.csv');
    const isPdf = name.endsWith('.pdf');
    if (!isCsv && !isPdf) {
      setError('Please upload a CSV or PDF file');
      return;
    }
    setFile(selected);
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const { data } = await api.post('/import/parse', formData);
      setPreview(data.data.preview);
    } catch (err) {
      const detail = (err as any)?.response?.data?.error || (err as any)?.message || 'Unknown error';
      const status = (err as any)?.response?.status || '';
      console.error('Import error:', status, detail, err);
      setError(`Failed to parse file (${status}: ${detail}). Check the format and try again.`);
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile],
  );

  return (
    <div className="space-y-4">
      {!preview && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${
            dragOver
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {loading ? (
            <Loader2 className="h-10 w-10 mx-auto text-muted-foreground animate-spin" />
          ) : (
            <Upload className="h-10 w-10 mx-auto text-muted-foreground/50" />
          )}
          <p className="mt-4 text-sm font-medium">
            {loading ? 'Parsing your file...' : 'Upload your bank statement or receipt'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports CSV, PDF bank statements and receipt images
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {preview && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {file?.name.toLowerCase().endsWith('.pdf') ? (
                <File className="h-5 w-5 text-rose-400" />
              ) : (
                <FileText className="h-5 w-5 text-emerald-400" />
              )}
              <div>
                <p className="text-sm font-medium">{file?.name}</p>
                <p className="text-xs text-muted-foreground">{preview.length} transactions detected</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setPreview(null); setFile(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {duplicates.size > 0 && (
            <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
              <div className="flex items-start gap-2">
                <CopyX className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-400 font-medium">
                    {duplicates.size} duplicate{duplicates.size > 1 ? 's' : ''} detected
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    These transactions appear to already exist in your account.
                  </p>
                  <label className="flex items-center gap-2 mt-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded border-white/[0.08] bg-white/[0.02]"
                    />
                    Skip duplicates during import
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Merchant</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Description</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Amount</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Category</th>
                </tr>
              </thead>
              <tbody>
                {(skipDuplicates ? filteredPreview! : preview!).map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    <td className="py-2 px-3">{row.date}</td>
                    <td className="py-2 px-3">{row.merchant || '-'}</td>
                    <td className="py-2 px-3 text-muted-foreground">{row.description}</td>
                    <td className={`py-2 px-3 text-right font-medium ${
                      row.type === 'income' ? 'text-emerald-400' : ''
                    }`}>
                      {row.type === 'income' ? '+' : ''}{formatCurrency(Math.abs(row.amount), currency)}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        row.categoryId ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/[0.04] text-muted-foreground'
                      }`}>
                        {row.category}{row.categoryId ? ' ✓' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
            <p className="text-xs text-muted-foreground">
              {skipDuplicates && duplicates.size > 0 && filteredPreview && preview
                ? `Importing ${filteredPreview.length} of ${preview.length} transactions (${duplicates.size} skipped)`
                : preview ? `Showing all ${preview.length} transactions` : ''}
            </p>
            <Button className="gap-2" disabled={importing} onClick={async () => {
              if (!filteredPreview) return;
              setImporting(true);
              try {
                await api.post('/transactions/bulk', { items: filteredPreview });
              } catch {
                // silent
              }
              setImporting(false);
              onComplete?.();
            }}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {importing ? 'Importing...' : `Import ${filteredPreview?.length || 0} transaction${filteredPreview?.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
