import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface PreviewRow {
  date: string;
  amount: number;
  description: string;
  merchant: string;
  category: string;
  type: string;
}

interface CsvImportProps {
  onComplete?: () => void;
}

export function CsvImport({ onComplete }: CsvImportProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (selected: File) => {
    if (!selected.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }
    setFile(selected);
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const { data } = await api.post('/import/csv', formData);
      setPreview(data.data.preview);
    } catch {
      setError('Failed to parse file. Check the format and try again.');
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
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {loading ? (
            <Loader2 className="h-10 w-10 mx-auto text-muted-foreground animate-spin" />
          ) : (
            <Upload className="h-10 w-10 mx-auto text-muted-foreground/50" />
          )}
          <p className="mt-4 text-sm font-medium">
            {loading ? 'Parsing your file...' : 'Drop your bank CSV here or click to browse'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports CSV exports from Chase, Bank of America, Mint, YNAB, and more
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
              <FileText className="h-5 w-5 text-emerald-400" />
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
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    <td className="py-2 px-3">{row.date}</td>
                    <td className="py-2 px-3">{row.merchant || '-'}</td>
                    <td className="py-2 px-3 text-muted-foreground">{row.description}</td>
                    <td className={`py-2 px-3 text-right font-medium ${
                      row.type === 'income' ? 'text-emerald-400' : ''
                    }`}>
                      {row.type === 'income' ? '+' : ''}${Math.abs(row.amount).toFixed(2)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-xs">{row.category}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
            <p className="text-xs text-muted-foreground">
              Showing first {preview.length} of {preview.length} transactions
            </p>
            <Button className="gap-2" onClick={onComplete}>
              <Check className="h-4 w-4" />
              Import {preview.length} transactions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
