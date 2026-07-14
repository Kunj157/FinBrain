import { useState, useCallback, useRef } from 'react';
import { Upload, Receipt as ReceiptIcon, Store, CalendarDays, DollarSign, Loader2, FileText, X, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [file, setFile] = useState<File | null>(null);
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
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Receipt OCR</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload a receipt image to extract transaction details</p>
        </div>
      </div>

      {!result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-14 text-center transition-all ${
            dragOver
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {loading ? (
            <Loader2 className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
          ) : (
            <ReceiptIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
          )}
          <p className="mt-4 text-sm font-medium">
            {loading ? 'Processing receipt...' : 'Drop receipt image here or click to browse'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports PNG, JPG — text will be extracted using OCR
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
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
                  <FileText className="h-4 w-4 text-emerald-400" />
                  Extracted Data
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setResult(null); setFile(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Store className="h-4 w-4" />
                    Merchant
                  </div>
                  <p className="text-sm font-medium">{result.merchant || 'Not detected'}</p>
                </div>
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    Amount
                  </div>
                  <p className="text-sm font-medium">
                    {result.amount ? formatCurrency(result.amount, currency) : 'Not detected'}
                  </p>
                </div>
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
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
                  <pre className="text-xs text-muted-foreground bg-white/[0.02] rounded-lg p-3 border border-white/[0.06] whitespace-pre-wrap max-h-40 overflow-y-auto">
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
                  <Check className="h-4 w-4 text-emerald-400" />
                  Ready to Create Transaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                  <ReceiptIcon className="h-8 w-8 text-emerald-400" />
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