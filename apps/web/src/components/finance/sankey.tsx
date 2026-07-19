import { useMemo } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';

interface SankeyFlowProps {
  income: { name: string; amount: number }[];
  expenses: { name: string; amount: number; color: string }[];
  currency: string;
}

export function SankeyFlow({ income, expenses, currency }: SankeyFlowProps) {
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
  nodeColors['Total Income'] = '#34d399';
  for (const i of income) {
    nodeColors[i.name] = '#6ee7b7';
  }

  return (
    <div className="h-[400px] w-full">
      <ResponsiveSankey
        data={data}
        margin={{ top: 10, right: 100, bottom: 10, left: 100 }}
        colors={(node: { id: string }) => nodeColors[node.id] || '#64748b'}
        nodeBorderWidth={0}
        nodeOpacity={1}
        linkOpacity={0.35}
        linkHoverOpacity={0.6}
        labelTextColor={{ from: 'color', modifiers: [['brighter', 1.5]] }}
        label={(node: { id: string }) => node.id}
        theme={{
          text: { fill: '#94a3b8', fontSize: 11 },
          tooltip: {
            container: {
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '12px',
            },
          },
        }}
      />
    </div>
  );
}
