import { useMemo } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { token, useChartTheme } from '@/lib/chart-theme';

interface SankeyFlowProps {
  income: { name: string; amount: number }[];
  expenses: { name: string; amount: number; color: string }[];
  currency: string;
}

export function SankeyFlow({ income, expenses }: SankeyFlowProps) {
  // Re-read the tokens when the theme changes.
  const chart = useChartTheme();
  const data = useMemo(() => {
    if (income.length === 0 || expenses.length === 0) return null;

    const totalIncome = income.reduce((s, i) => s + i.amount, 0);
    if (totalIncome === 0) return null;

    const nodes = [
      ...income.map((i) => ({ id: i.name })),
      { id: 'Total Income' },
      ...expenses.map((e) => ({ id: e.name })),
    ];

    const links: Array<{ source: string; target: string; value: number }> = [];

    for (const i of income) {
      links.push({ source: i.name, target: 'Total Income', value: Math.round(i.amount * 100) / 100 });
    }

    for (const e of expenses) {
      links.push({
        source: 'Total Income',
        target: e.name,
        value: Math.round(e.amount * 100) / 100,
      });
    }

    return { nodes, links };
  }, [income, expenses]);

  if (!data) return null;

  const nodeColors: Record<string, string> = {};
  for (const e of expenses) {
    nodeColors[e.name] = e.color;
  }
  nodeColors['Total Income'] = chart.positive;
  for (const i of income) {
    nodeColors[i.name] = token('positive', 0.7);
  }

  return (
    <div className="h-[400px] w-full">
      <ResponsiveSankey
        data={data}
        margin={{ top: 10, right: 100, bottom: 10, left: 100 }}
        colors={(node: { id: string }) => nodeColors[node.id] || chart.ink}
        nodeThickness={14}
        nodeSpacing={18}
        nodeInnerPadding={2}
        nodeBorderWidth={0}
        nodeBorderRadius={4}
        nodeOpacity={1}
        linkOpacity={0.28}
        linkHoverOpacity={0.55}
        linkBlendMode="normal"
        enableLinkGradient
        labelTextColor={chart.ink}
        label={(node: { id: string }) => node.id}
        theme={{
          text: { fill: chart.ink, fontSize: 11, fontFamily: 'Geist, Inter, system-ui, sans-serif' },
          tooltip: {
            container: {
              background: token('popover', 0.96),
              border: `1px solid ${token('border-strong')}`,
              borderRadius: '10px',
              color: token('foreground'),
              fontSize: '12px',
              boxShadow: 'var(--shadow-float)',
            },
          },
        }}
      />
    </div>
  );
}
