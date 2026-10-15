import { useState, useCallback, useRef } from 'react';
import { Receipt as ReceiptIcon, Store, CalendarDays, DollarSign, Loader2, FileText, X, Check, AlertCircle, ArrowLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { BorderTrail } from '@/components/motion/border-trail';
import { TextShimmer } from '@/components/motion/text-shimmer';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface OcrResult {
  text: string;
  merchant: string | null;
  amount: number | null;
  date: string | null;
  raw: { merchant: string | null; amount: number | null; date: string | null };
}

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currency = user?.currency || 'USD';
  const [dragOver, setDragOver] = useState(false);
  const [, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (selected: File) => {
    if (!selected.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    setFile(selected);
    setError(null);
    setResult(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const { data } = await api.post('/receipts/ocr', formData);
      setResult(data.data);
    } catch {
      setError('OCR processing failed. Make sure the ML service is running.');
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={ReceiptIcon}
        title="Receipt OCR"
        description="Upload a receipt image to extract transaction details"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        }
      />

      {!result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
          role="button"
          tabIndex={0}
          aria-busy={loading}
          className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-14 text-center transition-colors duration-300 ${
            dragOver
              ? 'border-primary/60 bg-primary/[0.06]'
              : 'border-border-strong bg-card/60 hover:border-primary/40 hover:bg-primary/[0.03]'
          }`}
        >
          {loading && <BorderTrail size={120} />}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border bg-card shadow-edge transition-transform duration-300 group-hover:-translate-y-1">
            <span aria-hidden className="absolute inset-0 -z-10 scale-150 rounded-full bg-primary/15 blur-2xl" />
            {loading ? (
              <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
            ) : (
              <Upload className="h-7 w-7 text-primary" aria-hidden />
            )}
          </span>
          {loading ? (
            <TextShimmer as="p" className="mt-5 text-sm font-medium">Processing receipt...</TextShimmer>
          ) : (
            <p className="mt-5 text-sm font-medium">Drop receipt image here or click to browse</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Supports PNG, JPG — text will be extracted using OCR
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-negative/20 bg-negative/10 p-3 text-sm text-negative">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Extracted Data
                </CardTitle>
                <Button variant="ghost" size="sm" aria-label="Discard result" onClick={() => { setResult(null); setFile(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div className="rounded-xl border border-input bg-surface-sunken/60 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Store className="h-4 w-4" />
                    Merchant
                  </div>
                  <p className="text-sm font-medium">{result.merchant || 'Not detected'}</p>
                </div>
                <div className="rounded-xl border border-input bg-surface-sunken/60 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    Amount
                  </div>
                  <p className="text-sm font-medium">
                    {result.amount ? formatCurrency(result.amount, currency) : 'Not detected'}
                  </p>
                </div>
                <div className="rounded-xl border border-input bg-surface-sunken/60 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <CalendarDays className="h-4 w-4" />
                    Date
                  </div>
                  <p className="text-sm font-medium">{result.date || 'Not detected'}</p>
                </div>
              </div>

              {result.text && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Raw OCR Text</p>
                  <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-surface-sunken/60 p-3 font-mono text-xs text-muted-foreground">
                    {result.text}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {result.merchant || result.amount ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Ready to Create Transaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 rounded-xl border border-input bg-surface-sunken/60 p-4">
                  <ReceiptIcon className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{result.merchant || 'Unknown merchant'}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.amount ? formatCurrency(result.amount, currency) : '?'} · {result.date || 'Unknown date'}
                    </p>
                  </div>
                  <Button size="sm" className="gap-1" onClick={() => navigate('/transactions')}>
                    <Check className="h-3 w-3" />
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Full transaction creation will be available in Phase 3. For now, you can save the receipt data.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div className="text-center">
            <Button variant="outline" onClick={() => { setResult(null); setFile(null); }}>
              <ReceiptIcon className="h-4 w-4 mr-2" />
              Scan another receipt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}