import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRightLeft,
  Tags,
  Building2,
  PiggyBank,
  Target,
  X,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  amount?: number;
  type?: string;
  color?: string;
  navigateTo: string;
}

interface SearchResults {
  transactions: SearchResult[];
  categories: SearchResult[];
  accounts: SearchResult[];
  budgets: SearchResult[];
  goals: SearchResult[];
}

const SECTION_CONFIG = [
  { key: 'transactions' as const, label: 'Transactions', icon: ArrowRightLeft, color: 'text-emerald-400' },
  { key: 'categories' as const, label: 'Categories', icon: Tags, color: 'text-violet-400' },
  { key: 'accounts' as const, label: 'Accounts', icon: Building2, color: 'text-blue-400' },
  { key: 'budgets' as const, label: 'Budgets', icon: PiggyBank, color: 'text-amber-400' },
  { key: 'goals' as const, label: 'Goals', icon: Target, color: 'text-rose-400' },
];

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const allResults = results
    ? SECTION_CONFIG.flatMap((s) =>
        (results[s.key] || []).map((r) => ({ ...r, section: s.key, icon: s.icon, color: s.color })),
      )
    : [];

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/search', { params: { q } });
      setResults(res.data.data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchResults(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setQuery('');
      setResults(null);
      setSelectedIndex(0);
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault();
      navigate(allResults[selectedIndex].navigateTo);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Tab') {
      onClose();
    }
  };

  useEffect(() => {
    if (selectedIndex > 0 && listRef.current) {
      const item = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] md:pt-[15vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="w-full max-w-lg mx-2 md:mx-4 glass rounded-xl overflow-hidden shadow-2xl md:max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, categories, accounts..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            aria-label="Search"
            role="combobox"
            aria-expanded={allResults.length > 0}
            aria-controls="search-results"
          />
          {loading && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" aria-hidden="true" />}
          <button onClick={onClose} className="p-1 rounded hover:bg-white/[0.06] text-muted-foreground" aria-label="Close search">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={listRef} id="search-results" className="max-h-[50vh] overflow-y-auto" role="listbox" aria-label="Search results">
          {query.length < 2 ? (
            <div className="py-8 text-center text-sm text-muted-foreground/50">
              Type at least 2 characters to search
            </div>
          ) : allResults.length === 0 && !loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground/50">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            SECTION_CONFIG.map((section) => {
              const items = results?.[section.key] || [];
              if (items.length === 0) return null;
              const SectionIcon = section.icon;

              return (
                <div key={section.key} role="group" aria-label={section.label}>
                  <div className="px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <SectionIcon className={`h-3 w-3 ${section.color}`} aria-hidden="true" />
                    {section.label}
                  </div>
                  {items.map((item) => {
                    flatIndex++;
                    const idx = flatIndex;
                    return (
                      <button
                        key={item.id}
                        data-index={idx}
                        role="option"
                        aria-selected={idx === selectedIndex}
                        onClick={() => { navigate(item.navigateTo); onClose(); }}
                        className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                          idx === selectedIndex ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        {item.color ? (
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} aria-hidden="true" />
                        ) : (
                          <SectionIcon className={`h-4 w-4 flex-shrink-0 ${section.color}`} aria-hidden="true" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>
                        </div>
                        {item.amount !== undefined && (
                          <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
                            {formatCurrency(item.amount)}
                          </span>
                        )}
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
