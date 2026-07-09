import { ArrowRightLeft } from 'lucide-react';

export default function Transactions() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <ArrowRightLeft className="h-12 w-12 text-muted-foreground/30 mx-auto" />
        <h2 className="mt-4 text-lg font-medium">Transactions</h2>
        <p className="text-sm text-muted-foreground mt-1">Coming in Phase 3</p>
      </div>
    </div>
  );
}
