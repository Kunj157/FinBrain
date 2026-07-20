import { useState } from 'react';
import { Brain, Loader2, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

interface ExplainViewButtonProps {
  viewName: string;
  contextData?: Record<string, unknown>;
}

export function ExplainViewButton({ viewName, contextData }: ExplainViewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExplain = async () => {
    if (loading) return;
    setLoading(true);
    setExplanation('');
    try {
      const message = `Explain my ${viewName} data. What are the key trends and what should I pay attention to?${contextData ? `\n\nCurrent view data: ${JSON.stringify(contextData).slice(0, 1000)}` : ''}`;
      const res = await api.post('/advisor/chat', { message });
      setExplanation(res.data.data.reply);
    } catch {
      setExplanation('Unable to generate explanation. Make sure the AI advisor is configured.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-[10px] gap-1 text-emerald-400 hover:text-emerald-300"
        onClick={() => { setIsOpen(true); handleExplain(); }}
      >
        <Brain className="h-3 w-3" />
        Explain this view
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div className="w-full max-w-lg mx-4 glass rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium">AI Explanation — {viewName}</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-white/[0.04]">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              <span className="text-sm text-muted-foreground ml-2">Analyzing your data...</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {explanation}
            </div>
          )}
        </div>
        <div className="flex justify-end p-4 border-t border-white/[0.06]">
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
