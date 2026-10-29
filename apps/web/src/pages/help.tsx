import { useState } from 'react';
import {
  HelpCircle, ChevronDown, ExternalLink, Banknote, Upload, Tags,
  PiggyBank, Target, Sparkles, FileText, ShieldCheck, Plus,
  LifeBuoy, ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: 'How do I connect my bank account?',
    answer: 'Go to Settings → Bank Connections and click "Connect Bank". You can connect through Plaid. Once connected, transactions are synced automatically.',
    icon: Banknote,
  },
  {
    question: 'How do I import transactions from a file?',
    answer: 'Go to the Transactions page and click "Import". You can upload CSV files or PDF bank statements. The system auto-detects the format and categorizes transactions. Preview the data before saving.',
    icon: Upload,
  },
  {
    question: 'How do categories work?',
    answer: 'Categories help organize your transactions. Default categories (Food, Transport, Rent, etc.) are created automatically. You can add, edit, or delete categories in the Categories page. Each category has an icon and color for easy identification.',
    icon: Tags,
  },
  {
    question: 'How do I set up a budget?',
    answer: 'Navigate to Budgets and click "Add Budget". Select a category, set a spending limit, and choose the period (weekly, monthly, or yearly). The dashboard will show your progress and alert you when you\'re nearing the limit.',
    icon: PiggyBank,
  },
  {
    question: 'How do I create savings goals?',
    answer: 'Go to Goals and click "Add Goal". Enter a name, target amount, select a goal type (Emergency Fund, Vacation, etc.), pick an icon, and set an optional deadline. Track your progress by adding contributions as you save.',
    icon: Target,
  },
  {
    question: 'What is the AI Insights page?',
    answer: 'The AI Insights page analyzes your financial data to provide a health score (0-100), smart recommendations, and spending alerts. Use the "Ask FinBrain" chat to ask questions about your spending patterns, budgets, and goals.',
    icon: Sparkles,
  },
  {
    question: 'How do I export reports?',
    answer: 'Go to Reports, select a report type (Monthly, Quarterly, or Annual), and use the navigation arrows to pick a period. Click "Export CSV" to download the data or "Print" to save as PDF.',
    icon: FileText,
  },
  {
    question: 'How is my financial health score calculated?',
    answer: 'Your Financial Health Score (0-100) is based on four factors: savings rate (35%), budget adherence (25%), spending consistency (20%), and goal progress (20%). A score above 70 is considered good.',
    icon: ShieldCheck,
  },
];

const quickStartSteps = [
  {
    title: 'Add transactions',
    description: 'Import CSV files, connect your bank, or add transactions manually.',
    link: '/transactions',
  },
  {
    title: 'Organize with categories',
    description: 'Customize categories to match your spending habits.',
    link: '/categories',
  },
  {
    title: 'Set budgets',
    description: 'Create spending limits for each category.',
    link: '/budgets',
  },
  {
    title: 'Track goals',
    description: 'Set savings targets and monitor your progress.',
    link: '/goals',
  },
  {
    title: 'Analyze insights',
    description: 'Get AI-powered analysis of your financial health.',
    link: '/insights',
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader icon={LifeBuoy} title="Help & Support" description="Everything you need to get started" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Quick Start Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {quickStartSteps.map((step, i) => (
                  <a
                    key={step.title}
                    href={step.link}
                    className="group block rounded-xl border bg-surface-sunken/40 p-3.5 transition-[border-color,background-color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.04]"
                  >
                    <span className="mb-2.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary ring-1 ring-inset ring-primary/20">
                      {i + 1}
                    </span>
                    <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold">{step.title}<ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden /></p>
                    <p className="text-[11px] text-muted-foreground">{step.description}</p>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {faqs.map((faq) => {
                const Icon = faq.icon;
                const isOpen = openFaq === faq.question;
                return (
                  <div key={faq.question} className="border-b last:border-0">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : faq.question)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-3 rounded-lg py-3 text-left transition-colors hover:text-foreground"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm flex-1 font-medium">{faq.question}</span>
                      <ChevronDown className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform flex-shrink-0',
                        isOpen && 'rotate-180'
                      )} />
                    </button>
                    {isOpen && (
                      <p className="animate-in fade-in-0 slide-in-from-top-1 pb-3 pl-7 text-xs leading-relaxed text-muted-foreground duration-200">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Need More Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                If you can't find what you're looking for, check the documentation or file an issue.
              </p>
              <a
                href="https://github.com/Kunj157/FinBrain/issues/new"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs h-9">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Report an Issue
                </Button>
              </a>
              <div className="border-t pt-3">
                <p className="text-[11px] text-muted-foreground mb-2">Keyboard Shortcuts</p>
                <div className="space-y-1.5">
                  {[
                    { keys: 'G + D', action: 'Go to Dashboard' },
                    { keys: 'G + T', action: 'Go to Transactions' },
                    { keys: '?', action: 'Toggle this help' },
                  ].map((shortcut) => (
                    <div key={shortcut.keys} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{shortcut.action}</span>
                      <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-edge">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
